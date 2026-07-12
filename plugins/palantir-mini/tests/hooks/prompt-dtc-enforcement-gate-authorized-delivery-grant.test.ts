/**
 * pm authorization-flexibility slice 3 (G-DSN-E) — gate consumption of the GLOBAL
 * delivery-grant store (lib/prompt-front-door/delivery-grant-store.ts).
 *
 * Cases:
 *   (i)   a LIVE unexpired grant authorizes a delivery-classified call WITHOUT any
 *         userApproval* re-issue fields on tool_input.
 *   (ii)  an EXPIRED grant falls through UNCHANGED to the existing tool_input
 *         re-issue lane (which still passes when valid re-issue fields are supplied).
 *   (iii) an ABSENT grant (and absent re-issue fields) leaves behavior byte-identical
 *         to today's denial (same BLOCKING reason shape as the pre-existing A2 suite).
 *   (iv)  cross-lane: a grant issued under root A's envelope is honored for a gate
 *         call from root B (session-keyed, global store — no local envelope needed
 *         at B beyond what readCurrentEnvelope's own global fallback resolves).
 *
 * Reuses the git-backed tmp-project + delivery-payload conventions from
 * tests/hooks/prompt-dtc-enforcement-gate-authorized-delivery.test.ts (slice-1/A2
 * suite) and the cross-lane global-index conventions from
 * tests/hooks/prompt-dtc-enforcement-gate-cross-lane.test.ts (slice 2).
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import promptDtcEnforcementGate from "../../hooks/gates/prompt-dtc-enforcement-gate.impl";
import { createPromptEnvelope, PromptFrontDoorStore } from "../../lib/prompt-front-door";
import { writeGlobalSessionPointerSync } from "../../lib/prompt-front-door/global-session-index";
import { issueDeliveryGrant } from "../../lib/prompt-front-door/delivery-grant-store";

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

const SESSION_ID = "session-a2-delivery-grant";
const RUNTIME = "claude" as const;
const APPROVING_DELIVERY_PROMPT = "Go ahead and merge the PR — I approve shipping it.";

function git(dir: string, args: string): void {
  execSync(`git ${args}`, { cwd: dir, stdio: ["ignore", "ignore", "ignore"] });
}

/**
 * G-GATE-J — fake `gh` PATH shim (mirrors the A2 suite's helper of the same
 * name): echoes a fixed non-ontology path list for `gh pr diff --name-only`, so
 * a `gh pr merge` fixture proves its change-set via the PR's OWN diff (the new
 * ground truth for an existing-PR subcommand) instead of the local push range.
 */
async function withFakeGhOnPath<T>(paths: string[], fn: () => Promise<T>): Promise<T> {
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), "dtc-gate-grant-fake-gh-"));
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

/** Real git-backed tmp project with a non-ontology push range (mirrors the A2 suite). */
function makeTmpProject(label: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `dtc-gate-a2-grant-${label}-`));
  tmpDirs.push(dir);
  fs.mkdirSync(path.join(dir, ".palantir-mini", "session"), { recursive: true });
  fs.writeFileSync(path.join(dir, "package.json"), '{"name":"dtc-gate-a2-grant-test"}\n');

  git(dir, "init -q");
  git(dir, "config user.email a2-grant-test@example.com");
  git(dir, "config user.name a2-grant-test");
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

/**
 * A tmp project whose push range CONTAINS an ontology surface, so `gh pr merge`
 * stays at the `pull-request` BLOCKING floor instead of de-flooring to
 * scoped-blocking (mirrors the A2 suite's `makeTmpProjectOntologyRange`). Used by
 * the absent-grant/absent-re-issue DENY case, whose intent is: no grant and no
 * re-issue fields must not clear a delivery action the floor would otherwise block.
 */
function makeTmpProjectOntologyRange(label: string): string {
  const dir = makeTmpProject(label);
  const ontologyFile = path.join(dir, "projects", "foo", "ontology", "objecttypes", "student.ts");
  fs.mkdirSync(path.dirname(ontologyFile), { recursive: true });
  fs.writeFileSync(ontologyFile, "export const student = {};\n");
  git(dir, "add projects/foo/ontology/objecttypes/student.ts");
  git(dir, 'commit -q -m "ontology change in range"');
  return dir;
}

function makeTmpGlobalStateDir(label: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `pm-a2-grant-global-${label}-`));
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
    capturedAt: "2026-06-25T04:00:00.000Z",
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

function deliveryPayload(
  project: string,
  envelope: { promptId: string; promptHash: string },
  overrides: Record<string, unknown> = {},
) {
  return {
    cwd: project,
    session_id: SESSION_ID,
    tool_name: "Bash",
    tool_input: {
      command: "gh pr merge 123 --squash",
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
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

describe("prompt-dtc-enforcement-gate: A2 delivery-grant consumption (pm-flex slice 3)", () => {
  test("(i) a LIVE grant authorizes a delivery call WITHOUT any userApproval* re-issue fields", async () => {
    const project = makeTmpProject("live");
    process.env.PALANTIR_MINI_GLOBAL_STATE_DIR = makeTmpGlobalStateDir("live");
    const { envelope } = await captureDeliveryApprovalPrompt(project);

    await issueDeliveryGrant({
      runtime: RUNTIME,
      sessionId: SESSION_ID,
      projectRoot: project,
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
    });

    // No userApprovalQuote/userApprovalPromptId/userApprovalPromptHash on tool_input —
    // the grant alone must authorize this call. G-GATE-J: shim `gh` so `gh pr merge`
    // proves its change-set via `gh pr diff` (the PR's own diff), not the local push
    // range.
    const result = await withFakeGhOnPath(["README.md", "docs.md"], () =>
      promptDtcEnforcementGate(deliveryPayload(project, envelope)),
    );

    expect(result.decision).toBeUndefined();
    expect(result.message).toBe("palantir-mini: prompt-DTC gate OK");
  });

  test("(ii) an EXPIRED grant falls through UNCHANGED to the existing tool_input re-issue lane", async () => {
    const project = makeTmpProject("expired");
    process.env.PALANTIR_MINI_GLOBAL_STATE_DIR = makeTmpGlobalStateDir("expired");
    const { envelope } = await captureDeliveryApprovalPrompt(project);

    const pastNowMs = Date.parse("2020-01-01T00:00:00.000Z");
    await issueDeliveryGrant({
      runtime: RUNTIME,
      sessionId: SESSION_ID,
      projectRoot: project,
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      nowMs: pastNowMs,
    });

    // Expired grant + VALID re-issue fields: must still pass via the (unchanged)
    // tool_input re-issue lane, proving the expired grant did not break fallthrough.
    // G-GATE-J: shim `gh` so `gh pr merge` proves its change-set via `gh pr diff`.
    const result = await withFakeGhOnPath(["README.md", "docs.md"], () =>
      promptDtcEnforcementGate(
        deliveryPayload(project, envelope, {
          userApprovalQuote: "merge the PR",
          userApprovalPromptId: envelope.promptId,
          userApprovalPromptHash: envelope.promptHash,
        }),
      ),
    );

    expect(result.decision).toBeUndefined();
    expect(result.message).toBe("palantir-mini: prompt-DTC gate OK");
  });

  test("(iii) an ABSENT grant (and absent re-issue fields) leaves behavior byte-identical to today's denial", async () => {
    const project = makeTmpProjectOntologyRange("absent");
    process.env.PALANTIR_MINI_GLOBAL_STATE_DIR = makeTmpGlobalStateDir("absent");
    const { envelope } = await captureDeliveryApprovalPrompt(project);

    const result = await promptDtcEnforcementGate(deliveryPayload(project, envelope));

    expect(result.decision).toBe("block");
    expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
    expect(result.reason).toContain("pm_authorize_delivery");
  });

  test("(iv) cross-lane: a grant issued under root A's envelope is honored for a gate call from root B", async () => {
    const projectA = makeTmpProject("cross-a");
    const projectB = makeTmpProject("cross-b");
    process.env.PALANTIR_MINI_GLOBAL_STATE_DIR = makeTmpGlobalStateDir("cross");
    process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "blocking";

    const { envelope } = await captureDeliveryApprovalPrompt(projectA);
    writeGlobalSessionPointerSync(envelope.runtime, envelope.sessionId, projectA);
    await issueDeliveryGrant({
      runtime: RUNTIME,
      sessionId: SESSION_ID,
      projectRoot: projectA,
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
    });

    // No local envelope at projectB; readCurrentEnvelope must resolve it via the
    // global index redirect to projectA, and the grant lookup (session-keyed, global)
    // must find the SAME grant regardless of which project root the call originates
    // from. G-GATE-J: shim `gh` (invoked with cwd=projectB) so `gh pr merge` proves
    // its change-set via `gh pr diff`.
    const result = await withFakeGhOnPath(["README.md", "docs.md"], () =>
      promptDtcEnforcementGate(
        deliveryPayload(projectB, envelope, {
          // Explicit sessionId/runtime/promptId/promptHash so readCurrentEnvelope's
          // explicit-pair branch resolves via the redirected store (mirrors the
          // slice-2 cross-lane test's payload shape).
        }),
      ),
    );

    expect(result.decision).toBeUndefined();
    expect(result.message).toBe("palantir-mini: prompt-DTC gate OK");
  });
});
