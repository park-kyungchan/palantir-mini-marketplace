// palantir-mini sprint-064 W4 - Prompt-to-DTC PreToolUse gate
// (THIN ENTRY — gate-split refactor. Fast top-level logic + static imports only;
// the full assessment (hooks/gates/prompt-dtc-enforcement-gate.impl.ts) is loaded
// via dynamic import() ONLY when the fast path below does not apply, so a
// read-only host tool call (Read/Grep/Glob/...) skips loading the heavy module
// graph entirely.
//
// Fast-path preconditions (ALL must hold to skip the impl — verified against the
// CURRENT gate body in hooks/gates/prompt-dtc-enforcement-gate.impl.ts before
// finalizing; see the refactor report for the line-by-line trace):
//   1. `tool_name` (lowercased) is a member of CLAUDE_TOOL_PROFILE.readOnlyTools.
//      -> classifyHookTool's isReadOnly is true (profile.readOnlyTools.has(name)),
//         so isMutatingCandidate=false and protectedMutationClassForPromptGate
//         returns undefined (mutationClass=undefined) for a plain read-only tool
//         with no `pm_intent_router`/`ontology_mutation`/`action_mutation`/
//         `function_mutation` substring in its normalized name.
//   2. PALANTIR_MINI_PROMPT_DTC_GATE_MODE is NOT one of off/advisory/
//      selective-blocking/scoped-blocking/blocking (i.e. unset or unrecognized).
//      -> gateModeFromEnv falls back to "selective-blocking" (the same effective
//         mode a valid explicit "selective-blocking" would produce), and with
//         mutationClass=undefined resolveEffectiveGateMode leaves the requested
//         mode unstrengthened, so effective mode = "selective-blocking".
//   3. PALANTIR_MINI_PROMPT_DTC_GATE_BYPASS !== "1".
//   4. findProjectRoot(cwd) resolves non-null AND !isExcludedProjectRoot(root)
//      -> guarantees promptDtcEnforcementGateImpl does not take its own
//         "off"/excluded-root early return for a DIFFERENT reason (harmless either
//         way, but keeps the traced path exact) and that project-root-dependent
//         reads (session-store) target the real project directory.
//   5. readCurrentFDEOntologyEngineeringSession(projectRoot) returns null/undefined
//      (wrapped in try/catch; any throw takes the slow path, fail-closed).
//      -> assessFDEEngineeringReadOnlySkip's session-null branch returns
//         skip:false without emitting, so the FDE-skip branch is NOT what produces
//         the verdict below; control reaches the mode === "selective-blocking"
//         branch, where isOntologyAffectingForSelectiveBlocking(payload) is false
//         for a plain read-only tool (operation is not apply_edit_function /
//         commit_edits / ontology_context_query-mutation), and mutating is false,
//         so the scoped-blocking-advisory sub-branch is skipped and the gate
//         returns EXACTLY:
//           { message: "palantir-mini: prompt-DTC gate skipped (<tool_name> is not
//             ontology-affecting; selective-blocking mode)" }
//         with NO `decision` field and NO emit(...) call anywhere on this path.
//
// If ANY precondition fails, dynamically import the impl and delegate fully to
// its fail-closed default export via `runFromPayload`.

import { CLAUDE_TOOL_PROFILE } from "../lib/runtime/tool-profile";
import { findProjectRoot, isExcludedProjectRoot } from "../lib/project/find-root";
import { readCurrentFDEOntologyEngineeringSession } from "../lib/fde-ontology-engineering/session-store";

const RECOGNIZED_GATE_MODES = new Set([
  "off",
  "advisory",
  "selective-blocking",
  "scoped-blocking",
  "blocking",
]);

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return "";
  const chunks: Buffer[] = [];
  try {
    for await (const chunk of process.stdin) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : (chunk as Buffer));
    }
  } catch {
    return "";
  }
  return Buffer.concat(chunks).toString("utf8");
}

interface EntryPayloadShape {
  readonly cwd?: string;
  readonly tool_name?: string;
}

async function main(): Promise<void> {
  const raw = await readStdin();
  let payload: unknown = {};
  if (raw.trim().length > 0) {
    try {
      payload = JSON.parse(raw);
    } catch {
      process.stdout.write(
        JSON.stringify({
          message: "palantir-mini: prompt-DTC gate skipped - malformed hook payload",
        }) + "\n",
      );
      return;
    }
  }

  const p = payload as EntryPayloadShape;
  const rawToolName = p.tool_name ?? "unknown";
  const toolName = rawToolName.toLowerCase();

  const isReadOnlyTool = CLAUDE_TOOL_PROFILE.readOnlyTools.has(toolName);

  const rawMode = process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE;
  const hasRecognizedExplicitMode = typeof rawMode === "string" && RECOGNIZED_GATE_MODES.has(rawMode);

  const bypassed = process.env.PALANTIR_MINI_PROMPT_DTC_GATE_BYPASS === "1";

  let fastPathEligible = isReadOnlyTool && !hasRecognizedExplicitMode && !bypassed;

  if (fastPathEligible) {
    const cwd = p.cwd ?? process.cwd();
    const projectRoot = findProjectRoot(cwd);
    if (projectRoot === null || isExcludedProjectRoot(projectRoot)) {
      fastPathEligible = false;
    } else {
      try {
        const session = readCurrentFDEOntologyEngineeringSession(projectRoot);
        if (session !== null && session !== undefined) {
          fastPathEligible = false;
        }
      } catch {
        // Uncertainty means slow path, not fast path (fail-closed).
        fastPathEligible = false;
      }
    }
  }

  if (fastPathEligible) {
    process.stdout.write(
      JSON.stringify({
        message: `palantir-mini: prompt-DTC gate skipped (${rawToolName} is not ontology-affecting; selective-blocking mode)`,
      }) + "\n",
    );
    return;
  }

  const mod = await import("./gates/prompt-dtc-enforcement-gate.impl");
  const result = await mod.runFromPayload(payload);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (import.meta.main) {
  void main();
}
