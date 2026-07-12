/**
 * palantir-mini pm auth-friction closure — G-RPLY-M end-to-end regression.
 *
 * Reproduces BOTH live refusals reported in the session that motivated this fix and
 * proves the design (prompt-origin-classifier + current-user-authored pointer +
 * session-standing delivery grant + revocation) resolves them:
 *
 *   Refusal 1: a `pm_authorize_delivery` re-mint anchored at the kickoff approval
 *   envelope was refused after several notification-shaped turns slid the
 *   approval-anchoring pointer window past it.
 *   Refusal 2: a Lead-direct `gh pr create`/`gh pr merge` was hard-blocked with no
 *   valid re-mint anchor, since every recent envelope was a notification.
 *
 * Scenario: (1) capture a genuine approving user turn; (2) `pm_authorize_delivery`
 * mints a grant; (3) simulate ~10 interleaved system-notification-shaped
 * UserPromptSubmit captures (via the `<system-reminder>`-only shape) advancing the
 * general `current` pointer but NOT the user-authored one; (4) a delivery-classified
 * PreToolUse call (`gh pr merge`) with NO userApproval* fields on tool_input still
 * passes via the live standing grant; (5) the grant survives `nowMs` advanced past
 * the OLD 30-min boundary but within the new 24h safety net; (6) a subsequent
 * user-authored turn containing a revoke phrase kills the grant, and the SAME
 * delivery call now correctly falls through to the unauthorized/advisory path.
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import promptFrontDoorCapture from "../../hooks/prompt-front-door-capture";
import promptDtcEnforcementGate from "../../hooks/gates/prompt-dtc-enforcement-gate.impl";
import pmAuthorizeDelivery from "../../bridge/handlers/pm-authorize-delivery";
import { issueDeliveryGrant, readDeliveryGrant } from "../../lib/prompt-front-door/delivery-grant-store";

const tmpDirs: string[] = [];
const savedEnv: Record<string, string | undefined> = {};

const SAVED_ENV_KEYS = [
  "PALANTIR_MINI_PROMPT_DTC_GATE_MODE",
  "PALANTIR_MINI_PROMPT_DTC_GATE_BYPASS",
  "PALANTIR_MINI_EVENTS_FILE",
  "PALANTIR_MINI_PROJECT",
  "PALANTIR_MINI_HOST_RUNTIME",
  "PALANTIR_MINI_GLOBAL_STATE_DIR",
] as const;

const SESSION_ID = "session-standing-grant-replay";
const RUNTIME = "claude" as const;
const APPROVING_DELIVERY_PROMPT = "Go ahead and merge the PR — I approve shipping it.";

function git(dir: string, args: string): void {
  execSync(`git ${args}`, { cwd: dir, stdio: ["ignore", "ignore", "ignore"] });
}

/** G-GATE-J fake `gh` PATH shim: echoes a fixed non-ontology diff for `gh pr diff --name-only`. */
async function withFakeGhOnPath<T>(paths: string[], fn: () => Promise<T>): Promise<T> {
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), "dtc-gate-standing-replay-fake-gh-"));
  tmpDirs.push(binDir);
  const script = `#!/bin/sh\n${paths.map((p) => `echo "${p}"`).join("\n")}\n`;
  fs.writeFileSync(path.join(binDir, "gh"), script, { mode: 0o755 });
  const savedPath = process.env.PATH;
  process.env.PATH = `${binDir}:${savedPath ?? ""}`;
  try {
    return await fn();
  } finally {
    process.env.PATH = savedPath;
  }
}

function makeTmpProject(label: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `dtc-gate-standing-replay-${label}-`));
  tmpDirs.push(dir);
  fs.mkdirSync(path.join(dir, ".palantir-mini", "session"), { recursive: true });
  fs.writeFileSync(path.join(dir, "package.json"), '{"name":"dtc-gate-standing-replay-test"}\n');

  git(dir, "init -q");
  git(dir, "config user.email standing-replay-test@example.com");
  git(dir, "config user.name standing-replay-test");
  git(dir, "config commit.gpgsign false");
  fs.writeFileSync(path.join(dir, "README.md"), "# base\n");
  git(dir, "add README.md");
  git(dir, "commit -q -m base");
  git(dir, "update-ref refs/remotes/origin/main HEAD");
  fs.writeFileSync(path.join(dir, "docs.md"), "non-ontology change\n");
  git(dir, "add docs.md");
  git(dir, 'commit -q -m "non-ontology delivery change"');
  return dir;
}

function makeTmpGlobalStateDir(label: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `pm-standing-replay-global-${label}-`));
  tmpDirs.push(dir);
  return dir;
}

/** Read emitted events.jsonl rows (PALANTIR_MINI_EVENTS_FILE override), same pattern as tests/hooks/bypass-budget-monitor.test.ts. */
function readEmittedEvents(eventsPath: string): Array<{ type?: string; payload?: Record<string, unknown> }> {
  if (!fs.existsSync(eventsPath)) return [];
  return fs
    .readFileSync(eventsPath, "utf8")
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter((row): row is { type?: string; payload?: Record<string, unknown> } => Boolean(row));
}

function deliveryPayload(project: string, overrides: Record<string, unknown> = {}) {
  return {
    cwd: project,
    session_id: SESSION_ID,
    tool_name: "Bash",
    tool_input: {
      command: "gh pr merge 123 --squash",
      sessionId: SESSION_ID,
      runtime: RUNTIME,
      ...overrides,
    },
  };
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

describe("prompt-dtc-enforcement-gate: G-RPLY-M standing-grant replay regression", () => {
  test("full narrative: mint survives notification interleaving + old-TTL boundary, then dies on revoke", async () => {
    const project = makeTmpProject("main");
    process.env.PALANTIR_MINI_GLOBAL_STATE_DIR = makeTmpGlobalStateDir("main");
    process.env.PALANTIR_MINI_PROJECT = project;
    process.env.PALANTIR_MINI_HOST_RUNTIME = RUNTIME;
    const eventsPath = path.join(project, ".palantir-mini", "session", "events.jsonl");
    process.env.PALANTIR_MINI_EVENTS_FILE = eventsPath;

    // (1) Capture a genuine approving user turn.
    await promptFrontDoorCapture({
      hook_event_name: "UserPromptSubmit",
      session_id: SESSION_ID,
      cwd: project,
      prompt: APPROVING_DELIVERY_PROMPT,
    });

    // (2) pm_authorize_delivery mints a grant from that captured turn.
    const mintResult = await pmAuthorizeDelivery({
      project,
      sessionId: SESSION_ID,
      runtime: RUNTIME,
      userApprovalQuote: "merge the PR",
    });
    expect(mintResult.authorized).toBe(true);
    expect(await readDeliveryGrant(RUNTIME, SESSION_ID)).not.toBeNull();

    // (3) ~10 interleaved system-notification-shaped UserPromptSubmit captures:
    // entirely wrapped in <system-reminder> blocks, so classifyPromptOrigin marks
    // them "system-notification" and the user-authored pointer stays parked at the
    // approval turn, while the GENERAL current pointer keeps advancing.
    for (let i = 0; i < 10; i += 1) {
      await promptFrontDoorCapture({
        hook_event_name: "UserPromptSubmit",
        session_id: SESSION_ID,
        cwd: project,
        prompt: `<system-reminder>background task ${i} finished</system-reminder>`,
      });
    }

    // (4) A delivery-classified PreToolUse call with NO userApproval* re-issue
    // fields still passes — the live standing grant authorizes it directly
    // (reproduces refusal 2's resolution).
    const afterInterleaving = await withFakeGhOnPath(["README.md", "docs.md"], () =>
      promptDtcEnforcementGate(deliveryPayload(project)),
    );
    expect(afterInterleaving.decision).toBeUndefined();
    expect(afterInterleaving.message).toBe("palantir-mini: prompt-DTC gate OK");

    // (5) The grant survives past the OLD 30-min TTL boundary but stays within the
    // new 24h safety net: mint one artificially 31 minutes old and confirm it is
    // still live under the new semantics.
    const thirtyOneMinutesAgo = Date.now() - 31 * 60 * 1000;
    await issueDeliveryGrant({
      runtime: RUNTIME,
      sessionId: SESSION_ID,
      projectRoot: project,
      promptId: "prompt-standing-replay-old",
      promptHash: "sha256:standing-replay-old",
      nowMs: thirtyOneMinutesAgo,
    });
    expect(await readDeliveryGrant(RUNTIME, SESSION_ID)).not.toBeNull();
    const pastOldTtlBoundary = await withFakeGhOnPath(["README.md", "docs.md"], () =>
      promptDtcEnforcementGate(deliveryPayload(project)),
    );
    expect(pastOldTtlBoundary.decision).toBeUndefined();
    expect(pastOldTtlBoundary.message).toBe("palantir-mini: prompt-DTC gate OK");

    // (6) A subsequent user-authored turn containing a revoke phrase kills the
    // grant immediately (best-effort revocation wired into the capture hook).
    await promptFrontDoorCapture({
      hook_event_name: "UserPromptSubmit",
      session_id: SESSION_ID,
      cwd: project,
      prompt: "Please revoke the delivery approval now.",
    });
    expect(await readDeliveryGrant(RUNTIME, SESSION_ID)).toBeNull();

    // Revocation leaves an audit row (mirrors the mint/consume audit trail) — the
    // finding this covers: revocation was previously silent (grant deleted with
    // no adjacent emit()).
    const revocationEvents = readEmittedEvents(eventsPath).filter(
      (e) => e.payload?.errorClass === "delivery_grant_revoked_by_user",
    );
    expect(revocationEvents.length).toBeGreaterThanOrEqual(1);
    expect(revocationEvents[revocationEvents.length - 1]?.payload?.revoked).toBe(true);

    // The SAME delivery call (no grant, no re-issue fields) now correctly falls
    // through to the unauthorized/advisory path.
    const afterRevoke = await withFakeGhOnPath(["README.md", "docs.md"], () =>
      promptDtcEnforcementGate(deliveryPayload(project)),
    );
    expect(afterRevoke.message).not.toBe("palantir-mini: prompt-DTC gate OK");
    expect(afterRevoke.reason ?? afterRevoke.hookSpecificOutput?.additionalContext ?? "").toContain(
      "pm_authorize_delivery",
    );
  });
});
