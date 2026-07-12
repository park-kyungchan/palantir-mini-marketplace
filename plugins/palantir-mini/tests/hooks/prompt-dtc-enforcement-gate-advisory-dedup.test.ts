/**
 * G-ADV-N (pm auth-friction closure, slice 2) — advisory boilerplate token diet.
 *
 * hooks/gates/prompt-dtc-enforcement-gate.impl.ts re-emits several byte-identical
 * filler lines ("Allowed while pending: ...", "Pass condition: ...", the plain
 * "Escape: PALANTIR_MINI_PROMPT_DTC_GATE_MODE=off ..." line) on EVERY matching
 * mutating call, with no per-session dedup — this collapses them to a <=10-token
 * marker after the first occurrence per (runtime, sessionId, boilerplateClass),
 * via lib/prompt-front-door/advisory-shown-store.ts.
 *
 * Reachable branches (see collapsibleBoilerplateLines call sites): the bottom
 * generic/delivery-blocking section is exercised via two mutation classes —
 * `external-command` (a Bash call not matching any git/gh/publish/release/deploy
 * pattern) selects the "generic-blocking" class (plain MODE=off escape); any
 * class in AUTHORIZED_DELIVERY_CLASSES (e.g. `generic-mutation` from an ordinary
 * Edit, or `pull-request` from `gh pr merge`) selects "delivery-blocking" (the
 * pm_authorize_delivery paragraph, which per §2.4 must NEVER be collapsed).
 *
 * Cases:
 *   1. First matching call in a fresh session -> full boilerplate text.
 *   2. Second call, same session, same class -> assessment.reason still present,
 *      filler lines replaced by the marker.
 *   3. A DIFFERENT class in the SAME session, first occurrence -> full text
 *      (per-class independence, not a global session-wide flag).
 *   4. A brand-new sessionId -> full text again (no cross-session leakage).
 *   5. Delivery-blocking: second occurrence still contains the FULL
 *      pm_authorize_delivery paragraph verbatim (the one assertion this fix must
 *      never regress).
 *   6. Store-read failure (corrupt advisory-shown file) -> falls open to the full
 *      text, never silently swallows a genuine blocker.
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import promptDtcEnforcementGate from "../../hooks/gates/prompt-dtc-enforcement-gate.impl";
import { PromptFrontDoorStore, createPromptEnvelope } from "../../lib/prompt-front-door";
import { advisoryShownStoreRootDir } from "../../lib/prompt-front-door/advisory-shown-store";

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

const RUNTIME = "claude" as const;

function makeTmpGlobalStateDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-advisory-dedup-global-"));
  tmpDirs.push(dir);
  return dir;
}

function makeTmpProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prompt-dtc-advisory-dedup-"));
  tmpDirs.push(dir);
  fs.mkdirSync(path.join(dir, ".palantir-mini", "session"), { recursive: true });
  fs.writeFileSync(path.join(dir, "package.json"), '{"name":"prompt-dtc-advisory-dedup-test"}\n');
  return dir;
}

async function capturedPrompt(project: string, sessionId: string) {
  const store = new PromptFrontDoorStore({ projectRoot: project });
  const envelope = createPromptEnvelope({
    rawPrompt: "Do an ordinary edit.",
    sessionId,
    runtime: RUNTIME,
    projectRoot: project,
    capturedAt: "2026-07-12T00:00:00.000Z",
    sequence: 1,
  });
  await store.saveEnvelope(envelope);
  await store.writeCurrentPointer(envelope);
  return envelope;
}

/** Selects mutationClass "external-command" -> the non-delivery "generic-blocking" class. */
function genericBlockingPayload(project: string, sessionId: string) {
  return {
    cwd: project,
    session_id: sessionId,
    tool_name: "Bash",
    tool_input: { command: "npm install left-pad" },
  };
}

/** Selects mutationClass "generic-mutation" (in AUTHORIZED_DELIVERY_CLASSES) -> "delivery-blocking". */
function deliveryBlockingPayload(project: string, sessionId: string) {
  return {
    cwd: project,
    session_id: sessionId,
    tool_name: "Edit",
    tool_input: { file_path: "src/ordinary.ts" },
  };
}

beforeEach(() => {
  for (const key of SAVED_ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
  process.env.PALANTIR_MINI_GLOBAL_STATE_DIR = makeTmpGlobalStateDir();
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

describe("prompt-dtc-enforcement-gate: G-ADV-N advisory boilerplate dedup", () => {
  test("1. first matching call in a fresh session gets the full boilerplate text", async () => {
    const project = makeTmpProject();
    const sessionId = "session-dedup-first";
    await capturedPrompt(project, sessionId);

    const result = await promptDtcEnforcementGate(genericBlockingPayload(project, sessionId));

    expect(result.additionalContext).toContain(
      "Allowed while pending: read-only inspection, pm_semantic_intent_gate, contract approval/completion tools, and emit_event.",
    );
    expect(result.additionalContext).toContain(
      "Pass condition: current prompt envelope state digital_twin_approved",
    );
    expect(result.additionalContext).toContain(
      "Escape: PALANTIR_MINI_PROMPT_DTC_GATE_MODE=off disables only this prompt-DTC gate.",
    );
    expect(result.additionalContext).not.toContain("[boilerplate: see earlier this session]");
  });

  test("2. second call, same session + same class, collapses filler to the marker (reason stays present)", async () => {
    const project = makeTmpProject();
    const sessionId = "session-dedup-second";
    await capturedPrompt(project, sessionId);

    const first = await promptDtcEnforcementGate(genericBlockingPayload(project, sessionId));
    expect(first.additionalContext).toContain("Allowed while pending");

    const second = await promptDtcEnforcementGate(genericBlockingPayload(project, sessionId));
    expect(second.additionalContext).toContain("[boilerplate: see earlier this session]");
    expect(second.additionalContext).not.toContain("Allowed while pending");
    expect(second.additionalContext).not.toContain("Pass condition");
    // assessment.reason (call-varying diagnostic) still survives every call.
    expect(second.additionalContext).toContain(
      "Current prompt has no SemanticIntentContract ref",
    );
  });

  test("3. a different class in the same session, first occurrence, still gets full text", async () => {
    const project = makeTmpProject();
    const sessionId = "session-dedup-per-class";
    await capturedPrompt(project, sessionId);

    // First: generic-blocking class.
    const genericFirst = await promptDtcEnforcementGate(genericBlockingPayload(project, sessionId));
    expect(genericFirst.additionalContext).toContain("Allowed while pending");

    // Second call same session, but a DIFFERENT class (delivery-blocking) —
    // must still be a first occurrence for ITS class.
    const deliveryFirst = await promptDtcEnforcementGate(deliveryBlockingPayload(project, sessionId));
    expect(deliveryFirst.additionalContext).toContain("Allowed while pending");
    expect(deliveryFirst.additionalContext).toContain("Authorize delivery: call the pm_authorize_delivery");
    expect(deliveryFirst.additionalContext).not.toContain("[boilerplate: see earlier this session]");
  });

  test("4. a brand-new sessionId gets full text again (no cross-session leakage)", async () => {
    const project = makeTmpProject();
    await capturedPrompt(project, "session-dedup-a");
    await promptDtcEnforcementGate(genericBlockingPayload(project, "session-dedup-a"));

    await capturedPrompt(project, "session-dedup-b");
    const result = await promptDtcEnforcementGate(genericBlockingPayload(project, "session-dedup-b"));

    expect(result.additionalContext).toContain("Allowed while pending");
    expect(result.additionalContext).not.toContain("[boilerplate: see earlier this session]");
  });

  test("5. delivery-blocking: second occurrence still contains the FULL pm_authorize_delivery paragraph verbatim", async () => {
    const project = makeTmpProject();
    const sessionId = "session-dedup-delivery-full";
    await capturedPrompt(project, sessionId);

    const first = await promptDtcEnforcementGate(deliveryBlockingPayload(project, sessionId));
    const second = await promptDtcEnforcementGate(deliveryBlockingPayload(project, sessionId));

    const paragraph =
      "Authorize delivery: call the pm_authorize_delivery MCP tool with userApprovalQuote " +
      "(a verbatim substring of your approving turn — e.g. \"merge the PR\") + " +
      "userApprovalPromptId/userApprovalPromptHash. On success it mints a session-standing " +
      "delivery grant (persists until you revoke it or a 24h safety-net expiry; re-verified " +
      "fail-closed against the hook-captured prompt, honored across any project root sharing " +
      "this session); a blunt MODE=off does NOT clear a delivery action. Runtimes without an " +
      "MCP surface (e.g. Codex) can instead re-issue this tool call with the same " +
      "userApprovalQuote/userApprovalPromptId/userApprovalPromptHash fields on tool_input " +
      "(15-min TTL, this turn only).";

    expect(first.additionalContext).toContain(paragraph);
    expect(second.additionalContext).toContain(paragraph);
    // The dedup DID collapse the filler lines on the second call — proves this
    // is the fix in action, not merely "dedup never engaged."
    expect(second.additionalContext).toContain("[boilerplate: see earlier this session]");
    expect(second.additionalContext).not.toContain("Allowed while pending");
  });

  test("6. a corrupt advisory-shown-store file fails open to the full text", async () => {
    const project = makeTmpProject();
    const sessionId = "session-dedup-corrupt";
    await capturedPrompt(project, sessionId);

    const root = advisoryShownStoreRootDir();
    fs.mkdirSync(root, { recursive: true });
    fs.writeFileSync(path.join(root, `${RUNTIME}-${sessionId}.json`), "{ not valid json", "utf8");

    const result = await promptDtcEnforcementGate(genericBlockingPayload(project, sessionId));

    expect(result.additionalContext).toContain("Allowed while pending");
    expect(result.additionalContext).not.toContain("[boilerplate: see earlier this session]");
  });
});
