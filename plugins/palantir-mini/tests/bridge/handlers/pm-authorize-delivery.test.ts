/**
 * pm_authorize_delivery MCP handler — pm authorization-flexibility slice 3
 * (G-DSN-E structured grant mechanism, subsumes G-ENV-B resolution).
 *
 * Cases:
 *   - Schema/required-field validation: missing project / missing userApprovalQuote.
 *   - No resolvable envelope (local + global fallback both miss) -> fail-closed.
 *   - Fail-closed on wrong quote/hash: verifyDeliveryApprovalAgainstEnvelope denies,
 *     no grant is written, no event is emitted.
 *   - Success: mints a grant + emits delivery_authorization_granted with
 *     byWhom.identity "user", and the grant round-trips in the global store.
 *   - Cross-lane: resolves the current envelope via the global session index when
 *     the local per-project store misses, and mints the grant under the RESOLVED
 *     envelope's (runtime, sessionId, projectRoot) — not the caller's raw `project`.
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import pmAuthorizeDelivery from "../../../bridge/handlers/pm-authorize-delivery";
import { createPromptEnvelope, PromptFrontDoorStore } from "../../../lib/prompt-front-door";
import { writeGlobalSessionPointerSync } from "../../../lib/prompt-front-door/global-session-index";
import { readDeliveryGrant } from "../../../lib/prompt-front-door/delivery-grant-store";

const tmpDirs: string[] = [];
const savedEnv: Record<string, string | undefined> = {};

const SAVED_ENV_KEYS = [
  "PALANTIR_MINI_PROJECT",
  "PALANTIR_MINI_EVENTS_FILE",
  "PALANTIR_MINI_GLOBAL_STATE_DIR",
] as const;

const SESSION_ID = "session-authorize-delivery";
const RUNTIME = "claude" as const;
const APPROVING_DELIVERY_PROMPT = "Go ahead and merge the PR — I approve shipping it.";

function makeTmpProject(label: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `pm-authorize-delivery-${label}-`));
  tmpDirs.push(dir);
  fs.mkdirSync(path.join(dir, ".palantir-mini", "session"), { recursive: true });
  fs.writeFileSync(path.join(dir, "package.json"), '{"name":"pm-authorize-delivery-test"}\n');
  return dir;
}

function makeTmpGlobalStateDir(label: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `pm-authorize-delivery-global-${label}-`));
  tmpDirs.push(dir);
  return dir;
}

async function captureDeliveryApprovalPrompt(project: string, rawPrompt = APPROVING_DELIVERY_PROMPT) {
  const store = new PromptFrontDoorStore({ projectRoot: project });
  const envelope = createPromptEnvelope({
    rawPrompt,
    sessionId: SESSION_ID,
    runtime: RUNTIME,
    projectRoot: project,
    capturedAt: "2026-07-12T04:00:00.000Z",
    sequence: 1,
    // Adversarial-lens BLOCKER fix: this helper simulates a genuine
    // user-authored capture (see the comment below), so originClass must be
    // "user" too — verifyDeliveryApprovalAgainstEnvelope now refuses to mint
    // against an envelope whose originClass isn't "user".
    originClass: "user",
  });
  await store.saveEnvelope(envelope);
  // G-RPLY-M Fix 1a: this helper simulates a genuine user-authored capture, so it
  // must also advance the user-authored pointer (mirrors the real capture hook's
  // classifyPromptOrigin === "user" branch) — verifyDeliveryApprovalAgainstEnvelope
  // now anchors against readLastUserAuthoredPointer, not readCurrentPointer.
  await store.writeLastUserAuthoredPointer(envelope);
  return { store, envelope };
}

function readEvents(project: string): Array<{ type: string; payload?: Record<string, unknown>; byWhom?: { identity?: string } }> {
  const eventsPath = path.join(project, ".palantir-mini", "session", "events.jsonl");
  if (!fs.existsSync(eventsPath)) return [];
  return fs
    .readFileSync(eventsPath, "utf8")
    .trim()
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

beforeEach(() => {
  for (const key of SAVED_ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of SAVED_ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("pm_authorize_delivery", () => {
  test("fails closed when project is missing", async () => {
    const result = await pmAuthorizeDelivery({ userApprovalQuote: "merge the PR" });
    expect(result.authorized).toBe(false);
    expect((result as { reason: string }).reason).toContain("project is required");
  });

  test("fails closed when userApprovalQuote is missing", async () => {
    const project = makeTmpProject("missing-quote");
    const result = await pmAuthorizeDelivery({ project });
    expect(result.authorized).toBe(false);
    expect((result as { reason: string }).reason).toContain("userApprovalQuote is required");
  });

  test("fails closed when no envelope resolves locally or via global fallback", async () => {
    const project = makeTmpProject("no-envelope");
    process.env.PALANTIR_MINI_GLOBAL_STATE_DIR = makeTmpGlobalStateDir("no-envelope");
    const result = await pmAuthorizeDelivery({
      project,
      userApprovalQuote: "merge the PR",
      sessionId: "session-nonexistent",
    });
    expect(result.authorized).toBe(false);
    expect((result as { reason: string }).reason).toContain("no current prompt-front-door envelope resolves");
  });

  test("fails closed on a forged quote (never in the captured prompt); no grant is written", async () => {
    const project = makeTmpProject("forged-quote");
    process.env.PALANTIR_MINI_GLOBAL_STATE_DIR = makeTmpGlobalStateDir("forged-quote");
    const { envelope } = await captureDeliveryApprovalPrompt(project);

    const result = await pmAuthorizeDelivery({
      project,
      sessionId: SESSION_ID,
      userApprovalQuote: "I approve merging the production hotfix now",
      userApprovalPromptId: envelope.promptId,
      userApprovalPromptHash: envelope.promptHash,
    });

    expect(result.authorized).toBe(false);

    const grant = await readDeliveryGrant(RUNTIME, SESSION_ID);
    expect(grant).toBeNull();
    const granted = readEvents(project).filter((e) => e.type === "delivery_authorization_granted");
    expect(granted.length).toBe(0);
  });

  test("success: mints a grant + emits delivery_authorization_granted with byWhom.identity user", async () => {
    const project = makeTmpProject("success");
    process.env.PALANTIR_MINI_GLOBAL_STATE_DIR = makeTmpGlobalStateDir("success");
    const { envelope } = await captureDeliveryApprovalPrompt(project);

    const result = await pmAuthorizeDelivery({
      project,
      sessionId: SESSION_ID,
      userApprovalQuote: "merge the PR",
      userApprovalPromptId: envelope.promptId,
      userApprovalPromptHash: envelope.promptHash,
    });

    expect(result.authorized).toBe(true);
    const success = result as { authorized: true; grantId: string; scope: string; expiresAt: string };
    expect(success.scope).toBe("authorized-delivery");
    expect(typeof success.grantId).toBe("string");
    expect(success.grantId.length).toBeGreaterThan(0);

    const grant = await readDeliveryGrant(RUNTIME, SESSION_ID);
    expect(grant).not.toBeNull();
    expect(grant?.grantId).toBe(success.grantId);
    expect(grant?.sessionId).toBe(SESSION_ID);
    expect(grant?.projectRoot).toBe(project);

    const events = readEvents(project);
    const granted = events.find((e) => e.type === "delivery_authorization_granted");
    expect(granted).toBeDefined();
    expect(granted?.payload?.grantId).toBe(success.grantId);
    expect(granted?.payload?.scope).toBe("authorized-delivery");
    expect(granted?.byWhom?.identity).toBe("user");
  });

  test("cross-lane: resolves the envelope via the global session index and mints the grant under the RESOLVED root", async () => {
    const projectA = makeTmpProject("cross-lane-a");
    const projectB = makeTmpProject("cross-lane-b");
    process.env.PALANTIR_MINI_GLOBAL_STATE_DIR = makeTmpGlobalStateDir("cross-lane");

    const { envelope } = await captureDeliveryApprovalPrompt(projectA);
    writeGlobalSessionPointerSync(envelope.runtime, envelope.sessionId, projectA);

    // Caller supplies projectB (no local envelope there); the handler must fall back
    // to the global index and resolve the envelope captured under projectA.
    const result = await pmAuthorizeDelivery({
      project: projectB,
      sessionId: SESSION_ID,
      userApprovalQuote: "merge the PR",
      userApprovalPromptId: envelope.promptId,
      userApprovalPromptHash: envelope.promptHash,
    });

    expect(result.authorized).toBe(true);

    const grant = await readDeliveryGrant(RUNTIME, SESSION_ID);
    expect(grant).not.toBeNull();
    // Grant key MUST come from the RESOLVED envelope (projectA), never the caller's
    // raw `project` hint (projectB).
    expect(grant?.projectRoot).toBe(projectA);

    // The audit event lands in projectA's events.jsonl (envelope.projectRoot === cwd).
    const events = readEvents(projectA);
    expect(events.find((e) => e.type === "delivery_authorization_granted")).toBeDefined();
  });
});
