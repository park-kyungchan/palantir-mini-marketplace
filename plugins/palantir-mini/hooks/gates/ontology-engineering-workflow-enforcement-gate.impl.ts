// palantir-mini — PreToolUse hook: ontology-engineering-workflow-enforcement-gate
// (heavy impl — dynamically imported by the thin entry file at
// hooks/ontology-engineering-workflow-enforcement-gate.ts when its fast path does
// not apply. See hooks/gates/pretool-fast-path-constants.ts for the shared
// LEGACY_RUNTIME_UI_TOKENS / ONTOLOGY_ENGINEERING_MARKERS constants.)
//
// Blocking policy for Ontology Engineering control-plane work:
// 1. Runtime-native question widgets are ADVISORY-only in the Ontology Engineering
//    path: detection still fires, but the verdict CONTINUES (suggest-only) and
//    points at the plugin-owned WorkflowContract turn-card / UserDecisionRecord path.
// 2. SIC/DTC authoring and routing for Ontology Engineering require prior FDE workflow provenance.
// 3. Mutations to Ontology Engineering workflow surfaces require mutationAuthorized=true.
//
// Authority: the former turn-fan-out policy v1.0.0, the former Lead-Protocol policy lead protocol, the former sprint-harness policy work contract binding.

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { classifyHookTool } from "../../lib/hooks/tool-classifier";
import { readCurrentFDEOntologyEngineeringSession } from "../../lib/fde-ontology-engineering/session-store";
import {
  readCurrentOntologyEngineeringWorkflowState,
  reverifySourceMutationApprovalAgainstEnvelope,
  type SourceMutationApprovalRecord,
} from "../../lib/ontology-engineering-workflow";
import { assessPmSelfEngineeringExempt } from "../../lib/ontology-engineering-workflow/pm-self-engineering-exempt";
import { PromptFrontDoorStore } from "../../lib/prompt-front-door/store";
import { buildOntologyEngineeringResponseTemplateContext } from "../../lib/ontology-engineering-response-template";
import { pathIsProjectOntologyClass } from "../../lib/project/ontology-path-class";
import { emit } from "../../scripts/log";
import { LEGACY_RUNTIME_UI_TOKENS, ONTOLOGY_ENGINEERING_MARKERS } from "./pretool-fast-path-constants";

interface HookPayload {
  readonly cwd?: string;
  readonly session_id?: string;
  readonly tool_name?: string;
  readonly tool_input?: Record<string, unknown>;
}

interface HookResult {
  readonly message: string;
  readonly decision?: "continue" | "block";
  readonly permissionDecision?: "allow" | "deny";
  readonly reason?: string;
  readonly additionalContext?: string;
  readonly hookSpecificOutput?: {
    readonly hookEventName?: "PreToolUse";
    readonly permissionDecision?: "allow" | "deny";
    readonly permissionDecisionReason?: string;
    readonly additionalContext?: string;
  };
}

interface WorkflowProbe {
  readonly projectRoot: string;
  readonly hasFdeProvenance: boolean;
  readonly mutationAuthorized: boolean;
  readonly provenanceReason: string;
}

/**
 * Improvement #2 — result of the READ-TIME re-verification of any persisted
 * developer/source-mutation fast-path approval against the hook-captured
 * PromptEnvelope. Computed asynchronously (the re-verify helper re-loads the
 * envelope) BEFORE the synchronous assessment runs, and passed in. `undefined`
 * (the default for sync callers / existing tests) means the fast-path cannot
 * fire — the assessment behaves exactly as before.
 */
interface SourceMutationFastPath {
  /** True ONLY if a persisted approval re-verified against the envelope this turn. */
  readonly authorized: boolean;
  /** First-checked reason (grant rationale, or the rejection cause). */
  readonly reason: string;
  /** The unforgeable approval ref kind/promptId surfaced in additionalContext. */
  readonly approvalRefSummary?: string;
}

const PROTECTED_SURFACE_MARKERS = [
  "palantir-mini/hooks/",
  "palantir-mini/hooks/hooks.json",
  "palantir-mini/bridge/handlers/pm-semantic-intent-gate.ts",
  "palantir-mini/bridge/handlers/pm-intent-router.ts",
  "palantir-mini/bridge/handlers/pm-ontology-engineering-workflow.ts",
  "palantir-mini/bridge/handlers/pm-plugin-self-check/",
  "palantir-mini/lib/ontology-engineering-workflow/",
  "palantir-mini/lib/fde-ontology-engineering/",
  "palantir-mini/lib/lead-intent/",
  "palantir-mini/lib/context-engineering/",
  "palantir-mini/skills/",
  "palantir-mini/managed-settings.d/",
  ".claude/plugins/palantir-mini/hooks/",
  ".claude/plugins/palantir-mini/hooks/hooks.json",
  ".claude/plugins/palantir-mini/bridge/handlers/pm-semantic-intent-gate.ts",
  ".claude/plugins/palantir-mini/bridge/handlers/pm-intent-router.ts",
  ".claude/plugins/palantir-mini/bridge/handlers/pm-ontology-engineering-workflow.ts",
  ".claude/plugins/palantir-mini/bridge/handlers/pm-plugin-self-check/",
  ".claude/plugins/palantir-mini/lib/ontology-engineering-workflow/",
  ".claude/plugins/palantir-mini/lib/fde-ontology-engineering/",
  ".claude/plugins/palantir-mini/lib/lead-intent/",
  ".claude/plugins/palantir-mini/lib/context-engineering/",
  ".claude/plugins/palantir-mini/skills/",
  ".claude/plugins/palantir-mini/managed-settings.d/",
  ".claude/managed-settings.d/50-palantir-mini.json",
] as const;

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return "";
  }
}

function normalize(value: string): string {
  return value.replace(/\\/g, "/").toLowerCase();
}

function stringField(input: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = input?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function walkProjectRoot(start: string): string | null {
  let cur = path.resolve(start);
  const root = path.parse(cur).root;
  while (cur !== root) {
    if (fs.existsSync(path.join(cur, ".palantir-mini"))) return cur;
    cur = path.dirname(cur);
  }
  return null;
}

function resolveProjectRoot(payload: HookPayload): string {
  const input = payload.tool_input;
  const explicit =
    stringField(input, "project") ??
    stringField(input, "projectRoot") ??
    stringField(input, "cwd");
  if (explicit !== undefined) return path.resolve(explicit);
  const cwd = payload.cwd ?? process.cwd();
  return walkProjectRoot(cwd) ?? path.resolve(cwd);
}

// Actions that self-provision their FDE session (source-ingest ingests first,
// elevate ingests before linting), so they must run BEFORE provenance exists.
// Exempting them at the early-return un-blocks only the PRE-gate call; the
// handler's own approval gate (elevate.ts) still governs whether a register
// proceeds. Preserves the existing undefined-action allowance.
const PROVENANCE_EXEMPT_WORKFLOW_ACTIONS = new Set([
  "start",
  "status",
  "ingest",
  "elevate",
]);

function isProvenanceExemptWorkflowAction(payload: HookPayload): boolean {
  const toolName = normalize(payload.tool_name ?? "");
  if (!toolName.includes("pm_ontology_engineering_workflow")) return false;
  const action = stringField(payload.tool_input, "action")?.toLowerCase();
  return action === undefined || PROVENANCE_EXEMPT_WORKFLOW_ACTIONS.has(action);
}

function hasLegacyRuntimeUi(payload: HookPayload): boolean {
  const haystack = `${payload.tool_name ?? ""}\n${safeJson(payload.tool_input)}`;
  return LEGACY_RUNTIME_UI_TOKENS.some((token) => haystack.includes(token));
}

function toolNameIsLegacyRuntimeUi(payload: HookPayload): boolean {
  const toolName = payload.tool_name ?? "";
  return LEGACY_RUNTIME_UI_TOKENS.some((token) => toolName.includes(token));
}

function containsOntologyEngineeringMarker(payload: HookPayload): boolean {
  const haystack = normalize(`${payload.tool_name ?? ""}\n${safeJson(payload.tool_input)}`);
  return ONTOLOGY_ENGINEERING_MARKERS.some((marker) => haystack.includes(marker));
}

// Resolve the ACTUAL write-target path set for this tool call. Keys are restricted
// to host write-tool target fields (NEVER free-text command/prompt/content/intent
// bodies). Mirrors write-scope-runtime-enforce#extractTargetPaths and
// prompt-dtc#collectTargetFiles. Returns ABSOLUTE, normalized paths so a relative
// or ~-prefixed target still matches PROTECTED_SURFACE_MARKERS / path-class segments.
//
// This is the load-bearing surface-text-vs-state fix: the block decision is made on
// the RESOLVED write target, not on the VOCABULARY of free-text adapter fields.
function resolveWriteTargetPaths(payload: HookPayload, lowercase = true): string[] {
  const input = payload.tool_input ?? {};
  const raw = new Set<string>();

  // Write / Edit single-target file_path + NotebookEdit notebook_path.
  for (const key of ["file_path", "notebook_path"] as const) {
    const value = input[key];
    if (typeof value === "string" && value.length > 0) raw.add(value);
  }

  // MultiEdit.edits[].file_path
  if (Array.isArray(input.edits)) {
    for (const edit of input.edits) {
      const fp = (edit as { file_path?: unknown } | null)?.file_path;
      if (typeof fp === "string" && fp.length > 0) raw.add(fp);
    }
  }

  // Bash MUTATING-write target. A Bash `command` is NOT a free-text adapter field
  // here: we extract ONLY the RESOLVED write-target token(s) (redirect destination,
  // tee FILE, sed/perl -i FILE, mv/cp/install DEST, dd of=FILE, truncate FILE) —
  // never the whole command string. A read-only Bash (no write operator) yields no
  // token ⇒ empty set ⇒ the over-block relaxation is preserved; a write whose target
  // is OUTSIDE the protected tree resolves to that out-of-tree path and PASSES.
  if (normalize(payload.tool_name ?? "") === "bash" || typeof input.command === "string") {
    const command = typeof input.command === "string" ? input.command : "";
    for (const token of extractBashWriteTargets(command)) raw.add(token);
  }

  // Resolve abs under the live cwd / project root so relative + ~ forms still match.
  const cwd = payload.cwd ?? process.cwd();
  return [...raw].map((p) => resolveWriteTargetAbs(p, cwd, lowercase));
}

// Parse the RESOLVED write-target token(s) from a Bash command. Mirrors the
// write-operator denylist shapes in lib/hooks/tool-classifier.ts#isReadOnlyBashCommand
// (the authoritative "does-this-write" signal) but, instead of a boolean, returns the
// actual destination filename(s) so the gate can resolve+match them. Read-only
// commands (no write operator) return []. A path MENTIONED but not written (e.g. a
// grep pattern, or the source of `echo "palantir-mini/hooks" > /tmp/note`) is NOT a
// write target and is never returned.
function extractBashWriteTargets(command: string): string[] {
  const targets: string[] = [];
  const trimmed = command.trim();
  if (trimmed.length === 0) return targets;

  const addToken = (raw: string | undefined): void => {
    if (raw === undefined) return;
    // Strip surrounding quotes and any trailing shell punctuation.
    let token = raw.trim().replace(/^['"]|['"]$/g, "");
    token = token.replace(/[;&|)]+$/g, "");
    if (token.length === 0 || token === "-") return;
    // A redirect to a fd (e.g. `2>&1`) or a `/dev/*` sink is not a file write-target.
    if (token.startsWith("&")) return;
    targets.push(token);
  };

  // Output redirect destinations: > , >> , &> , >| , 1> , 2> (with or without space,
  // and `>|file`). The destination is the first whitespace-delimited token after the
  // operator. `[^<]` before guards against `<(...)`/`<<` heredoc reads.
  const redirectRe = /(?:^|[^<>&0-9])(?:&|[0-9])?>{1,2}\|?\s*(['"]?)([^\s'"|&;()<>]+)\1/g;
  for (let m = redirectRe.exec(trimmed); m !== null; m = redirectRe.exec(trimmed)) {
    addToken(m[2]);
  }

  // tee [-a] FILE...  (every non-flag arg until a pipe/terminator is a write-target).
  const teeRe = /\btee\b((?:\s+-{1,2}[A-Za-z-]+)*)\s+([^|&;<>\n]+)/g;
  for (let m = teeRe.exec(trimmed); m !== null; m = teeRe.exec(trimmed)) {
    for (const arg of (m[2] ?? "").trim().split(/\s+/)) {
      if (!arg.startsWith("-")) addToken(arg);
    }
  }

  // sed -i[suffix] ... FILE   and   perl -i... FILE  (trailing positional file arg(s)).
  const inplaceRe = /\b(?:sed|perl)\b\s+(-[A-Za-z]*i[A-Za-z0-9.]*\b[^|&;<>\n]*)/g;
  for (let m = inplaceRe.exec(trimmed); m !== null; m = inplaceRe.exec(trimmed)) {
    const rest = (m[1] ?? "").trim().split(/\s+/);
    // The trailing arg(s) after the script are files; take every non-flag, non-script
    // trailing token (a sed script is typically quoted or starts with a command letter).
    for (let i = rest.length - 1; i >= 1; i -= 1) {
      const arg = rest[i];
      if (arg === undefined || arg.startsWith("-")) break;
      // Stop at the script token (quoted, or an -e expression value).
      if (/^['"]/.test(arg) || /[*{}]/.test(arg)) break;
      addToken(arg);
    }
  }

  // mv / cp / install  ... DEST  (the LAST positional arg is the destination).
  const moveRe = /\b(?:mv|cp|install)\b\s+([^|&;<>\n]+)/g;
  for (let m = moveRe.exec(trimmed); m !== null; m = moveRe.exec(trimmed)) {
    const args = (m[1] ?? "").trim().split(/\s+/).filter((a) => !a.startsWith("-"));
    if (args.length >= 1) addToken(args[args.length - 1]);
  }

  // dd of=FILE
  const ddRe = /\bdd\b[^|&;<>\n]*\bof=(['"]?)([^\s'"|&;()<>]+)\1/g;
  for (let m = ddRe.exec(trimmed); m !== null; m = ddRe.exec(trimmed)) {
    addToken(m[2]);
  }

  // truncate ... FILE   and   touch/ln FILE  (trailing positional file arg(s)).
  const trailingFileRe = /\b(?:truncate|touch|ln)\b\s+([^|&;<>\n]+)/g;
  for (let m = trailingFileRe.exec(trimmed); m !== null; m = trailingFileRe.exec(trimmed)) {
    for (const arg of (m[1] ?? "").trim().split(/\s+/)) {
      if (!arg.startsWith("-")) addToken(arg);
    }
  }

  return targets;
}

function resolveWriteTargetAbs(filePath: string, cwd: string, lowercase = true): string {
  const home = process.env.HOME ?? os.homedir();
  let abs = filePath;
  if (filePath.startsWith("~/")) abs = path.resolve(home, filePath.slice(2));
  else if (!path.isAbsolute(filePath)) abs = path.resolve(cwd, filePath);
  // Default: normalize() = backslash->slash + lowercase (for the substring marker /
  // path-class string matches). lowercase=false preserves the ON-DISK case so the
  // caller can perform filesystem reads (bd-015 content-anchored .ssot-authority walk)
  // on a case-sensitive filesystem.
  return lowercase ? normalize(abs) : abs.replace(/\\/g, "/");
}

function targetsProtectedSurface(payload: HookPayload): boolean {
  const targets = resolveWriteTargetPaths(payload);
  return targets.some((t) => PROTECTED_SURFACE_MARKERS.some((marker) => t.includes(marker)));
}

// OE-3 — project-ontology path-CLASS membership. Unlike PROTECTED_SURFACE_MARKERS
// (pm-self surfaces, matched by literal substring) the path-class predicate names a
// PROJECT'S ontology source — a structural ontology mutation regardless of which
// project owns it and regardless of any OE-marker string in the payload. Path-class
// is unforgeable by the adapter; OE-marker strings are. A raw Edit/Write/MultiEdit to
// e.g. `projects/foo/ontology/object-type/bar.ts` trips here even with no
// `ontology-engineering`/`SemanticIntentContract` marker present. The predicate is
// shared with pre-edit-ontology via lib/project/ontology-path-class (bd-006 de-hardcode).
//
// NEVER-CLOSE: matching here only routes the call into the SAME
// `protectedSurfaceMutation && !mutationAuthorized` branch the pm-self markers use —
// the envelope-bound source-mutation fast-path stays reachable; this adds NO blanket
// deny and weakens no allow.
function targetsProjectOntologyPathClass(payload: HookPayload): boolean {
  return resolveWriteTargetPaths(payload) // already normalized abs paths
    .some((value) => pathIsProjectOntologyClass(value));
}

function isSemanticOrRouterTool(payload: HookPayload): boolean {
  const name = normalize(payload.tool_name ?? "");
  return name.includes("pm_semantic_intent_gate") || name.includes("pm_intent_router");
}

function hasInlineFdeRef(payload: HookPayload): boolean {
  const input = payload.tool_input ?? {};
  const directRefs = [
    stringField(input, "fdeOntologyEngineeringSessionRef"),
    stringField(input, "fdeSessionRef"),
    stringField(input, "workflowContractRef"),
  ];
  return directRefs.some((value) => value !== undefined);
}

function readWorkflowProbe(projectRoot: string, payload: HookPayload): WorkflowProbe {
  let workflowState: ReturnType<typeof readCurrentOntologyEngineeringWorkflowState> = null;
  let fdeSession: ReturnType<typeof readCurrentFDEOntologyEngineeringSession> = null;

  try {
    workflowState = readCurrentOntologyEngineeringWorkflowState(projectRoot);
  } catch {
    workflowState = null;
  }
  try {
    fdeSession = readCurrentFDEOntologyEngineeringSession(projectRoot);
  } catch {
    fdeSession = null;
  }

  const inlineFde = hasInlineFdeRef(payload);
  const hasFdeProvenance =
    inlineFde ||
    typeof workflowState?.fdeSessionRef === "string" ||
    typeof workflowState?.fdeSessionId === "string" ||
    fdeSession !== null;

  const mutationAuthorized = workflowState?.mutationAuthorized === true;
  let provenanceReason = "missing";
  if (inlineFde) provenanceReason = "inline-fde-ref";
  else if (workflowState?.fdeSessionRef || workflowState?.fdeSessionId) provenanceReason = "workflow-state";
  else if (fdeSession !== null) provenanceReason = "current-fde-session";

  return {
    projectRoot,
    hasFdeProvenance,
    mutationAuthorized,
    provenanceReason,
  };
}

/**
 * Improvement #2 — compute the developer/source-mutation fast-path for THIS call.
 *
 * Loads the persisted `sourceMutationApprovals[]` from the current workflow state
 * and, for the protected path-like values this tool call touches, asks the
 * backend's READ-TIME re-verifier to confirm each candidate against the
 * hook-captured PromptEnvelope. The persisted record is NEVER trusted on its own:
 * `reverifySourceMutationApprovalAgainstEnvelope` re-loads the envelope and
 * re-checks promptHash + userQuote-substring + approval-verb/surface co-occurrence
 * + current/just-prior pointer + 15-min TTL + unconsumed + full scope coverage.
 * The first record that re-verifies authorizes the call.
 *
 * Async because it re-reads the envelope; called from `runFromPayload` before the
 * synchronous assessment. Returns `{ authorized: false }` (never throws) so a
 * failure to read state can only DENY, never open.
 */
async function computeSourceMutationFastPath(
  projectRoot: string,
  payload: HookPayload,
  nowMs: number = Date.now(),
): Promise<SourceMutationFastPath> {
  let approvals: readonly SourceMutationApprovalRecord[] = [];
  try {
    const workflowState = readCurrentOntologyEngineeringWorkflowState(projectRoot);
    approvals = workflowState?.sourceMutationApprovals ?? [];
  } catch {
    return { authorized: false, reason: "could not read workflow state for source-mutation fast-path" };
  }
  if (approvals.length === 0) {
    return { authorized: false, reason: "no source-mutation approvals persisted" };
  }

  const touchedPaths = resolveWriteTargetPaths(payload);
  const store = new PromptFrontDoorStore({ projectRoot });

  let lastReason = "no persisted approval re-verified against the captured envelope";
  for (const record of approvals) {
    try {
      const verdict = await reverifySourceMutationApprovalAgainstEnvelope(
        record,
        store,
        touchedPaths,
        nowMs,
      );
      if (verdict.authorized) {
        return {
          authorized: true,
          reason: verdict.reason,
          approvalRefSummary: `${record.kind} promptId=${record.approvedAtPromptId} scope=[${record.approvedSourcePaths.join(", ")}]`,
        };
      }
      lastReason = verdict.reason;
    } catch {
      lastReason = "source-mutation re-verification threw (failed closed)";
    }
  }
  return { authorized: false, reason: lastReason };
}

/**
 * OE-12 — instrument the OE-3 deny branch so an enforcement DENIAL produces
 * valuable data (rule 10 / rule 26 / audit D4-6). The hook's `assess...` is
 * synchronous, so the emit is FIRE-AND-FORGET (`void`, never awaited, swallowed
 * on failure) — the deny RESULT is returned synchronously unchanged. The
 * `errorClass` is pinned to the ONE governed provenance vocabulary
 * (`fde_provenance_required`, matching `pm-intent-router`) on the provenance
 * deny, and to `oe_workflow_mutation_unauthorized` on the protected-surface
 * mutation deny. NEVER-CLOSE: the envelope-bound source-mutation fast-path
 * returns BEFORE this branch, so the express-lane is untouched.
 */
function deny(
  reason: string,
  additionalContext: string,
  errorClass: string,
  payload?: HookPayload,
): HookResult {
  if (payload !== undefined) {
    try {
      void emit({
        type: "validation_phase_completed",
        payload: {
          passed: false,
          errorClass,
          phase: "runtime",
          tool: payload.tool_name ?? "unknown",
          decision: "block",
          advisory: false,
        } as Record<string, unknown>,
        toolName: "ontology-engineering-workflow-enforcement-gate",
        cwd: resolveProjectRoot(payload),
        sessionId: payload.session_id,
        reasoning:
          `ontology-engineering workflow gate DENIED (${errorClass}): ${reason} ` +
          `[tool=${payload.tool_name ?? "unknown"}]`,
        refinementTarget: {
          kind: "other",
          filePathOrRid: "ontology-engineering-workflow-enforcement-gate",
          description:
            `Ontology-engineering enforcement gate denied a control-plane call (${errorClass}); ` +
            `route the FDE/SIC/DTC provenance or approved mutation state before retrying.`,
          confidenceLevel: "high",
        },
        memoryLayers: ["semantic", "procedural"],
      }).catch(() => {
        // Best-effort — emit failure never blocks the deny verdict.
      });
    } catch {
      // Best-effort — synchronous throw never blocks the deny verdict.
    }
  }
  return {
    message: `palantir-mini: ontology-engineering workflow gate BLOCKED - ${reason}`,
    decision: "block",
    permissionDecision: "deny",
    reason,
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
      additionalContext,
    },
  };
}

function responseTemplateContext(payload: HookPayload): string {
  return buildOntologyEngineeringResponseTemplateContext({
    runtime: process.env.PALANTIR_MINI_HOST_RUNTIME ?? "unknown",
    enforcementSurface: `PreToolUse:${payload.tool_name ?? "unknown"}`,
  });
}

export function assessOntologyEngineeringWorkflowHook(
  payload: HookPayload,
  /**
   * Improvement #2 — the READ-TIME re-verified developer/source-mutation
   * fast-path for this call (computed async in `runFromPayload` via
   * `computeSourceMutationFastPath`). `undefined` (sync callers / existing tests)
   * means the fast-path cannot fire and behavior is byte-identical to before.
   */
  sourceMutationFastPath?: SourceMutationFastPath,
): HookResult {
  const classification = classifyHookTool(payload);
  const legacyRuntimeUi = hasLegacyRuntimeUi(payload);

  if (legacyRuntimeUi && (toolNameIsLegacyRuntimeUi(payload) || !classification.isReadOnly)) {
    // ADVISORY (suggest-only): detection still fires, but runtime-native question
    // UI is no longer hard-denied for Ontology Engineering turns. We CONTINUE and
    // suggest the plugin-owned turn-card decision path; the call proceeds.
    return {
      message: "palantir-mini: ontology-engineering workflow gate ADVISORY - runtime-native question UI detected (suggest-only)",
      decision: "continue",
      additionalContext:
        "Advisory: prefer the plugin-owned WorkflowContract turn-card decision queue and UserDecisionRecord path over runtime-specific UI widgets or legacy question payload fields. This is a suggestion, not a block.",
    };
  }

  if (isProvenanceExemptWorkflowAction(payload)) {
    return {
      message: "palantir-mini: ontology-engineering workflow gate OK - provenance-exempt self-provisioning action allowed",
      decision: "continue",
      additionalContext: responseTemplateContext(payload),
    };
  }

  const ontologyEngineeringContext = containsOntologyEngineeringMarker(payload);
  // OE-3 — a protected mutation is one to a pm-self protected surface OR to a
  // PROJECT-ontology path-class. The path-class trip is INDEPENDENT of any
  // OE-marker (`!ontologyEngineeringContext` no longer skips it), closing the
  // raw-edit front-door hole (OP-1/D4-1): a silent no-signal structural ontology
  // edit now routes through the same mutationAuthorized gate. NEVER-CLOSE: it lands
  // in the existing `protectedSurfaceMutation && !mutationAuthorized` branch, so the
  // envelope-bound source-mutation fast-path still authorizes.
  const protectedSurfaceMutation =
    classification.isProtectedMutation &&
    (targetsProtectedSurface(payload) || targetsProjectOntologyPathClass(payload));
  const semanticOrRouterOntologyCall =
    isSemanticOrRouterTool(payload) && ontologyEngineeringContext;
  const workflowToolCall = normalize(payload.tool_name ?? "").includes("pm_ontology_engineering_workflow");

  if (!ontologyEngineeringContext && !protectedSurfaceMutation && !workflowToolCall) {
    return {
      message: "palantir-mini: ontology-engineering workflow gate skipped",
      decision: "continue",
    };
  }

  const probe = readWorkflowProbe(resolveProjectRoot(payload), payload);

  if ((semanticOrRouterOntologyCall || workflowToolCall || protectedSurfaceMutation) && !probe.hasFdeProvenance) {
    return deny(
      "FDE workflow provenance is required before Ontology Engineering SIC/DTC authoring, routing, or mutation",
      "Start the plugin-owned Ontology Engineering workflow first, then carry the FDE session reference into SIC/DTC and routing calls. This removes model-specific interpretation before contracts exist.\n" +
        "Runbook: docs/altitude1-runtime-guide/BROWSE.md (match your blocker string -> read ONE slice). For this blocker: Stage 01 (fde-provenance) + Stage 00 (start).",
      "fde_provenance_required",
      payload,
    );
  }

  if (protectedSurfaceMutation && !probe.mutationAuthorized) {
    // Improvement #2 — ADDITIVE developer/source-mutation fast-path. Fires ONLY
    // when a persisted approval RE-VERIFIED against the hook-captured
    // PromptEnvelope this turn (HOLE-1: the persisted record is never trusted
    // alone — `computeSourceMutationFastPath` re-loaded the envelope and the
    // backend re-checked promptHash + userQuote-substring + pointer-freshness +
    // TTL + scope + unconsumed). This branch only ALLOWS; it weakens no deny.
    if (sourceMutationFastPath?.authorized === true) {
      return {
        message: "palantir-mini: ontology-engineering workflow gate OK - user-approved source-mutation fast-path (re-verified against captured envelope)",
        decision: "continue",
        additionalContext: [
          `sourceMutationFastPath=granted in lieu of SIC/DTC; ${sourceMutationFastPath.reason}`,
          sourceMutationFastPath.approvalRefSummary ?? "",
          responseTemplateContext(payload),
        ].filter((part) => part.length > 0).join("\n\n"),
      };
    }

    // bd-015 variant-(i) — ADDITIVE pm-self-engineering exemption. Fires ONLY when
    // engineering pm ON ITS OWN SOURCE (every target under the SAME content-anchored
    // pm-plugin ROOT — `.ssot-authority.json` kind=palantir-mini-workflow-authority),
    // with NO ontology surface among the targets (no /ontology/ path-class, nothing
    // under a `.palantir-mini/` ontology-state dir), AND an EXPLICIT per-session
    // structured opt-in active (NOT a prompt substring — bd-004 avoided). Allow-only;
    // fails closed — any read/walk error ⇒ exempt:false ⇒ the deny below stands. The
    // ontology write-back boundary (ssot/palantir approval-and-lineage two-layer
    // Security; ActionType-sole-commit-gate) is UNTOUCHED: genuine ontology mutations
    // never reach here (clause B excludes them) and keep going through the DTC gate.
    // Case-PRESERVING abs targets (lowercase=false): the predicate does filesystem
    // reads (the content-anchored .ssot-authority walk + opt-in marker) which must
    // use the on-disk case on a case-sensitive filesystem. Its string-class checks
    // lowercase internally, so substring matching is unaffected.
    const selfEngineering = assessPmSelfEngineeringExempt(
      resolveWriteTargetPaths(payload, /* lowercase */ false),
      payload.session_id,
    );
    if (selfEngineering.exempt) {
      try {
        void emit({
          type: "validation_phase_completed",
          payload: {
            passed: true,
            advisory: true,
            exemptKind: "pm_self_engineering_exempt",
            phase: "runtime",
            tool: payload.tool_name ?? "unknown",
            decision: "continue",
            pmRoot: selfEngineering.pmRoot,
            targets: selfEngineering.targets,
          } as Record<string, unknown>,
          toolName: "ontology-engineering-workflow-enforcement-gate",
          cwd: resolveProjectRoot(payload),
          sessionId: payload.session_id,
          reasoning:
            `pm-self-engineering exemption FIRED (pm_self_engineering_exempt): ${selfEngineering.reason} ` +
            `[pmRoot=${selfEngineering.pmRoot ?? "?"}; targets=${selfEngineering.targets.join(", ")}; tool=${payload.tool_name ?? "unknown"}]`,
          memoryLayers: ["semantic", "procedural"],
        }).catch(() => {
          // Best-effort — audit emit failure never changes the allow verdict.
        });
      } catch {
        // Best-effort — synchronous throw never changes the allow verdict.
      }
      return {
        message: "palantir-mini: ontology-engineering workflow gate OK - pm-self-engineering exemption (non-ontology pm-source edit, explicit per-session opt-in)",
        decision: "continue",
        additionalContext: [
          `pmSelfEngineeringExempt=granted; ${selfEngineering.reason}`,
          `pmRoot=${selfEngineering.pmRoot ?? "?"}; targets=[${selfEngineering.targets.join(", ")}]`,
          responseTemplateContext(payload),
        ].join("\n\n"),
      };
    }

    return deny(
      "Ontology Engineering workflow mutation requires approved SIC and DTC workflow state",
      "The current workflow state must have mutationAuthorized=true before edits to hooks, gate/router handlers, workflow libraries, skills, or managed-settings surfaces proceed.\n" +
        "This deny ALSO covers the engineer-pm / pm-self-engineering lane (editing pm's OWN source with pm OFF): a non-ontology pm-source edit is exempted ONLY with the explicit per-session pm-self-engineering opt-in marker present; ANY ontology surface (/ontology/ path-class or a .palantir-mini/ state path) stays blocked here regardless of opt-in and must go through SIC/DTC.\n" +
        "Runbook: docs/altitude1-runtime-guide/BROWSE.md (match your blocker string -> read ONE slice). For this blocker: Stage 05 (dtc-fill) -> Stage 06 (envelope-advance); for the pm-self-engineering lane, set the opt-in marker first.",
      "oe_workflow_mutation_unauthorized",
      payload,
    );
  }

  return {
    message: `palantir-mini: ontology-engineering workflow gate OK - ${probe.provenanceReason}`,
    decision: "continue",
    additionalContext: [
      `projectRoot=${probe.projectRoot}; mutationAuthorized=${String(probe.mutationAuthorized)}`,
      responseTemplateContext(payload),
    ].join("\n\n"),
  };
}

/**
 * Gate-split refactor — exported so the thin entry file (which owns stdin/stdout
 * I/O) can dynamically `import()` this impl module and delegate to exactly the
 * current (former) `main()` logic, minus the stdin read / stdout write. Mirrors
 * `main()` byte-for-byte: computes the source-mutation fast-path (fail-closed on
 * throw) BEFORE the synchronous assessment, then returns the HookResult (does not
 * write to stdout).
 */
export async function runFromPayload(payload: unknown): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;
  // Improvement #2 — re-verify any persisted source-mutation approval against the
  // hook-captured envelope BEFORE the synchronous assessment (HOLE-1). Failures
  // fail closed (authorized:false), so this can only ALLOW, never open.
  let sourceMutationFastPath: SourceMutationFastPath | undefined;
  try {
    sourceMutationFastPath = await computeSourceMutationFastPath(
      resolveProjectRoot(p),
      p,
    );
  } catch {
    sourceMutationFastPath = { authorized: false, reason: "source-mutation fast-path computation threw (failed closed)" };
  }
  return assessOntologyEngineeringWorkflowHook(p, sourceMutationFastPath);
}
