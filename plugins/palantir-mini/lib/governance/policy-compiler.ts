// palantir-mini PR-11 — PreMutationGovernance policy compiler v1.
//
// Active decision function consumed by hooks/prompt-dtc-enforcement-gate.ts
// and hooks/commit-edits-precondition.ts (and PR-13's merged hook).
// Passive decision-record builder lives at ./pre-mutation-governance.ts.
//
// Plan: ~/.claude/plans/foamy-giggling-kettle.md lines 791-828.
// Sprint-097 W3 dtc-T3: two new rules (11 + 12) for DTC fill governance.

import type {
  DigitalTwinChangeContract,
  SemanticIntentContract,
} from "../lead-intent/contracts";
import type { DtcWithFillFields } from "../semantic-intent/dtc-fill-sequence";
import type { ProjectScopeDefinition } from "../project-scope/types";
import type { KnownIssue } from "../issues/known-issue";
import type { OntologyWorkflowTrace } from "../ontology-workflow-trace/trace";
import { classifyHookTool } from "../hooks/tool-classifier";
import {
  actionTypeRefMatchesAction,
  extractActionTypeRid,
  extractDtcMutationSurfacePolicy,
  mcpToolRefMatchesTool,
  projectSurfaceRefMatchesTarget,
  surfaceRefMatchesTarget,
} from "./dtc-surface-policy";

// ─── Inputs ───────────────────────────────────────────────────────────────────

export interface CompilePreMutationPolicyInput {
  /** Tool being invoked (Edit, Write, MultiEdit, Bash, commit_edits, etc.). */
  readonly toolName: string;
  /** Files being mutated (resolved absolute paths). */
  readonly targetFiles: readonly string[];
  /** Raw tool input for typed surface checks (commit_edits.actionTypeRid, etc.). */
  readonly toolInput?: Record<string, unknown>;

  /** Approved DigitalTwinChangeContract for the prompt (if any). */
  readonly dtc?: DigitalTwinChangeContract;
  /** Approved SemanticIntentContract (informational; not load-bearing for rules). */
  readonly sic?: SemanticIntentContract;

  /** Project scope definition (writableRoot, forbiddenPatterns, lanes). */
  readonly projectScope?: ProjectScopeDefinition;
  /** Project ontology index entries (optional, surfaces lookup). */
  readonly projectOntologyIndex?: ReadonlyArray<{ readonly entryId: string }>;

  /** Active known issues for affected surfaces. */
  readonly knownIssues?: readonly KnownIssue[];

  /** Validation packs required by lane/surface match. */
  readonly validationPacks?: {
    readonly required: readonly string[];
    /** Recent green pack runs (last 24h, by packId). */
    readonly recentGreen: readonly string[];
  };

  /** Active workflow trace (PR-10) — gate rule 9 enforces mode="implementation". */
  readonly activeWorkflowTrace?: OntologyWorkflowTrace;

  /** Whether tool is a protected mutation surface (Edit/Write/MultiEdit/commit_edits). */
  readonly isProtectedMutation?: boolean;

  /**
   * DTC extended with fill-sequence verdict + fill sequence step count.
   * When present, used by Rule 11 to check fill completeness.
   * Callers may pass dtcWithFill alongside (or instead of) dtc when the
   * fill session is active — the compiler uses dtcWithFill for Rule 11
   * and dtc for Rules 5-9.
   */
  readonly dtcWithFill?: DtcWithFillFields;

  /**
   * Number of completed DTC fill turns (0-7).
   * Provided by the caller from DtcFillSequenceSession.completedTurns.length.
   * Used by Rule 11 isFillComplete boundary check.
   * If absent but dtcWithFill is present, defaults to dtcFillSequence?.length ?? 0.
   */
  readonly dtcCompletedTurnCount?: number;

  /**
   * Surfaces touched by the current intent (e.g. affectedSurfaces from SIC).
   * Used by Rule 12 to detect ontology-affecting intent.
   * When absent, Rule 12 falls through (not triggered).
   */
  readonly touchedSurfaces?: readonly string[];
}

// ─── Outputs ──────────────────────────────────────────────────────────────────

export type PolicyRuleId =
  | "read-only-allow"
  | "generated-file-direct-edit-forbidden"
  | "outside-writable-root"
  | "forbidden-pattern"
  | "missing-digital-twin-change-contract"
  | "outside-dtc-change-boundary"
  | "blocking-known-issue-unmitigated"
  | "validation-pack-missing"
  | "workflow-trace-not-opened"
  | "dtc-fill-incomplete"
  | "ontology-affecting-intent-without-dtc-ref"
  | "default-allow";

export interface CompilePreMutationPolicyResult {
  readonly allowed: boolean;
  readonly reason: PolicyRuleId;
  readonly humanReason: string;
  readonly refs: {
    readonly semanticIntentContractRef?: string;
    readonly digitalTwinChangeContractRef?: string;
    readonly workflowTraceId?: string;
    /**
     * Which DTC fill turn the decision refers to.
     * -1 when N/A; 0-6 when a fill-sequence check was triggered.
     */
    readonly dtcFillSequenceStep?: number;
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const READ_ONLY_ALLOWLIST = new Set<string>([
  "Read", "Grep", "Glob", "NotebookRead",
  "pm_rule_query", "pm_rule_audit", "pm_recap", "pm_retro_query", "pm_learn_query",
  "pm_substrate_query", "pm_health_audit", "pm_agent_lineage_export",
  "get_ontology", "ontology_schema_get", "impact_query", "pre_edit_impact",
  "ontology_context_query", "pm_semantic_intent_gate", "pm_plugin_self_check",
  "pm_lead_brief", "pm_intent_router",
]);

const GENERATED_FILE_PATTERNS: readonly RegExp[] = [
  /\/src\/generated\//,
  /\/generated\//,
];

// ─── The 10-rule compiler ────────────────────────────────────────────────────

export function compilePreMutationPolicy(
  input: CompilePreMutationPolicyInput,
): CompilePreMutationPolicyResult {
  const toolClassification = classifyHookTool({ tool_name: input.toolName });
  const isProtectedMutation =
    input.isProtectedMutation ?? toolClassification.isProtectedMutation;
  const refs = {
    semanticIntentContractRef: input.sic?.contractId,
    digitalTwinChangeContractRef: input.dtc?.contractId,
    workflowTraceId: input.activeWorkflowTrace?.traceId,
  };

  // Rule 1: read-only allowlist.
  if (READ_ONLY_ALLOWLIST.has(input.toolName) || toolClassification.isReadOnly) {
    return {
      allowed: true,
      reason: "read-only-allow",
      humanReason: `tool=${input.toolName} is in the read-only allowlist`,
      refs,
    };
  }

  // Non-allowlist tools that are also not protected mutations default-allow.
  if (!isProtectedMutation) {
    return {
      allowed: true,
      reason: "default-allow",
      humanReason: `tool=${input.toolName} is not a protected mutation surface`,
      refs,
    };
  }

  // Rule 2: generated-file mutation forbidden.
  for (const target of input.targetFiles) {
    if (GENERATED_FILE_PATTERNS.some((re) => re.test(target))) {
      return {
        allowed: false,
        reason: "generated-file-direct-edit-forbidden",
        humanReason: `target=${target} is generated — use pm-codegen instead`,
        refs,
      };
    }
  }

  // Rule 3: outside writable root.
  if (input.projectScope) {
    const writableRoot = input.projectScope.writableRoot;
    if (writableRoot && writableRoot.length > 0) {
      for (const target of input.targetFiles) {
        if (!target.startsWith(writableRoot)) {
          return {
            allowed: false,
            reason: "outside-writable-root",
            humanReason: `target=${target} is outside writableRoot [${writableRoot}]`,
            refs,
          };
        }
      }
    }
  }

  // Rule 4: forbidden pattern.
  if (input.projectScope) {
    const patterns = input.projectScope.forbiddenPatterns;
    if (patterns.length > 0) {
      const compiled = patterns.map((p) => new RegExp(p));
      for (const target of input.targetFiles) {
        if (compiled.some((re) => re.test(target))) {
          return {
            allowed: false,
            reason: "forbidden-pattern",
            humanReason: `target=${target} matches a project-scope forbidden pattern`,
            refs,
          };
        }
      }
    }
  }

  // Rule 5: protected mutation + no DTC.
  if (!input.dtc) {
    return {
      allowed: false,
      reason: "missing-digital-twin-change-contract",
      humanReason: `protected mutation surface but no DigitalTwinChangeContract`,
      refs,
    };
  }

  // Rule 6: outside DTC changeBoundary.
  // Prefer structured DTC FileSurface refs when present; prose changeBoundary
  // remains a fallback for legacy contracts.
  const dtcSurfacePolicy = extractDtcMutationSurfacePolicy(input.dtc);
  if (dtcSurfacePolicy.forbiddenFileSurfaceRefs.length > 0) {
    for (const target of input.targetFiles) {
      const forbiddenRef = dtcSurfacePolicy.forbiddenFileSurfaceRefs.find((ref) =>
        surfaceRefMatchesTarget(ref, target),
      );
      if (forbiddenRef !== undefined) {
        return {
          allowed: false,
          reason: "forbidden-pattern",
          humanReason: `target=${target} matches DTC forbidden mutation surface [${forbiddenRef}]`,
          refs,
        };
      }
    }
  }
  if (dtcSurfacePolicy.allowedFileSurfaceRefs.length > 0) {
    for (const target of input.targetFiles) {
      const isAllowed = dtcSurfacePolicy.allowedFileSurfaceRefs.some((ref) =>
        surfaceRefMatchesTarget(ref, target),
      );
      if (!isAllowed) {
        return {
          allowed: false,
          reason: "outside-dtc-change-boundary",
          humanReason: `target=${target} is outside DTC allowed mutation surfaces [${dtcSurfacePolicy.allowedFileSurfaceRefs.join(", ")}]`,
          refs,
        };
      }
    }
  }

  const forbiddenMcpRef = dtcSurfacePolicy.forbiddenMcpToolRefs.find((ref) =>
    mcpToolRefMatchesTool(ref, input.toolName),
  );
  if (forbiddenMcpRef !== undefined) {
    return {
      allowed: false,
      reason: "forbidden-pattern",
      humanReason: `tool=${input.toolName} matches DTC forbidden MCPTool mutation surface [${forbiddenMcpRef}]`,
      refs,
    };
  }
  if (
    dtcSurfacePolicy.allowedMcpToolRefs.length > 0 &&
    (toolClassification.isPalantirMiniMcpTool || toolClassification.mcpToolCapability !== undefined)
  ) {
    const isAllowed = dtcSurfacePolicy.allowedMcpToolRefs.some((ref) =>
      mcpToolRefMatchesTool(ref, input.toolName),
    );
    if (!isAllowed) {
      return {
        allowed: false,
        reason: "outside-dtc-change-boundary",
        humanReason: `tool=${input.toolName} is outside DTC allowed MCPTool surfaces [${dtcSurfacePolicy.allowedMcpToolRefs.join(", ")}]`,
        refs,
      };
    }
  }

  const actionTypeRid = extractActionTypeRid(input.toolInput);
  const forbiddenActionTypeRef = dtcSurfacePolicy.forbiddenActionTypeRefs.find((ref) =>
    actionTypeRefMatchesAction(ref, actionTypeRid),
  );
  if (forbiddenActionTypeRef !== undefined) {
    return {
      allowed: false,
      reason: "forbidden-pattern",
      humanReason: `actionTypeRid=${actionTypeRid} matches DTC forbidden ActionType mutation surface [${forbiddenActionTypeRef}]`,
      refs,
    };
  }
  if (toolClassification.operation === "commit_edits" && dtcSurfacePolicy.allowedActionTypeRefs.length > 0) {
    const isAllowed =
      actionTypeRid !== undefined &&
      dtcSurfacePolicy.allowedActionTypeRefs.some((ref) =>
        actionTypeRefMatchesAction(ref, actionTypeRid),
      );
    if (!isAllowed) {
      return {
        allowed: false,
        reason: "outside-dtc-change-boundary",
        humanReason: `commit_edits actionTypeRid=${actionTypeRid ?? "missing"} is outside DTC allowed ActionType surfaces [${dtcSurfacePolicy.allowedActionTypeRefs.join(", ")}]`,
        refs,
      };
    }
  }

  if (dtcSurfacePolicy.forbiddenProjectSurfaceRefs.length > 0) {
    for (const target of input.targetFiles) {
      const forbiddenProjectSurface = dtcSurfacePolicy.forbiddenProjectSurfaceRefs.find((ref) =>
        projectSurfaceRefMatchesTarget(ref, target, input.projectScope),
      );
      if (forbiddenProjectSurface !== undefined) {
        return {
          allowed: false,
          reason: "forbidden-pattern",
          humanReason: `target=${target} matches DTC forbidden ProjectSurface [${forbiddenProjectSurface}]`,
          refs,
        };
      }
    }
  }
  if (dtcSurfacePolicy.allowedProjectSurfaceRefs.length > 0) {
    for (const target of input.targetFiles) {
      const isAllowed = dtcSurfacePolicy.allowedProjectSurfaceRefs.some((ref) =>
        projectSurfaceRefMatchesTarget(ref, target, input.projectScope),
      );
      if (!isAllowed) {
        return {
          allowed: false,
          reason: "outside-dtc-change-boundary",
          humanReason: `target=${target} is outside DTC allowed ProjectSurface refs [${dtcSurfacePolicy.allowedProjectSurfaceRefs.join(", ")}]`,
          refs,
        };
      }
    }
  }

  const dataAction = toolClassification.mcpToolCapability?.dataAction;
  if (dataAction && dataAction !== "none") {
    if (dtcSurfacePolicy.forbiddenDataActions.includes(dataAction)) {
      return {
        allowed: false,
        reason: "forbidden-pattern",
        humanReason: `tool=${input.toolName} matches DTC forbidden DataAction [${dataAction}]`,
        refs,
      };
    }
    if (
      dtcSurfacePolicy.allowedDataActions.length > 0 &&
      !dtcSurfacePolicy.allowedDataActions.includes(dataAction)
    ) {
      return {
        allowed: false,
        reason: "outside-dtc-change-boundary",
        humanReason: `tool=${input.toolName} dataAction=${dataAction} is outside DTC allowed data actions [${dtcSurfacePolicy.allowedDataActions.join(", ")}]`,
        refs,
      };
    }
  }

  // changeBoundary is a plain descriptive string in v1; only check when it looks
  // like a path token (contains "/" or ".") and not a prose description.
  const changeBoundary = input.dtc.changeBoundary ?? "";
  if (changeBoundary.length > 0 && !isProseDescription(changeBoundary)) {
    for (const target of input.targetFiles) {
      if (!target.includes(changeBoundary)) {
        return {
          allowed: false,
          reason: "outside-dtc-change-boundary",
          humanReason: `target=${target} not in DTC changeBoundary [${changeBoundary}]`,
          refs,
        };
      }
    }
  }

  // Rule 7: blocking unmitigated known issue.
  if (input.knownIssues) {
    const blocker = input.knownIssues.find(
      (k) => k.severity === "blocking" && k.mitigationStatus === "unmitigated",
    );
    if (blocker) {
      return {
        allowed: false,
        reason: "blocking-known-issue-unmitigated",
        humanReason: `blocking known issue unmitigated: ${blocker.issueId ?? "unknown"}`,
        refs,
      };
    }
  }

  // Rule 8: missing validation pack.
  if (input.validationPacks && input.validationPacks.required.length > 0) {
    const missing = input.validationPacks.required.filter(
      (p) => !input.validationPacks!.recentGreen.includes(p),
    );
    if (missing.length > 0) {
      return {
        allowed: false,
        reason: "validation-pack-missing",
        humanReason: `required validation packs missing recent green run: [${missing.join(", ")}]`,
        refs,
      };
    }
  }

  // Rule 9: no active workflow-trace mode=implementation (consumes PR-10).
  // GATED: only enforce when caller explicitly opts in by providing activeWorkflowTrace
  // with a wrong mode — i.e., "trace present but not implementation or pre-mutation".
  if (
    input.activeWorkflowTrace &&
    input.activeWorkflowTrace.mode !== "implementation" &&
    input.activeWorkflowTrace.mode !== "pre-mutation"
  ) {
    return {
      allowed: false,
      reason: "workflow-trace-not-opened",
      humanReason: `active workflow trace mode=${input.activeWorkflowTrace.mode} is not implementation/pre-mutation`,
      refs,
    };
  }

  // Rule 11: DTC fill incomplete.
  // Triggers when a fill session is active (dtcWithFill provided) and fill is
  // not yet complete.  Only fires when dtcWithFill is explicitly supplied — callers
  // that have no fill session simply omit the field and Rule 11 is skipped.
  if (input.dtcWithFill !== undefined) {
    const completedTurnCount =
      input.dtcCompletedTurnCount ??
      (input.dtcWithFill.dtcFillSequence?.length ?? 0);
    if (!isFillComplete(input.dtcWithFill, completedTurnCount)) {
      const step = completedTurnCount; // next turn index = number of completed turns
      return {
        allowed: false,
        reason: "dtc-fill-incomplete",
        humanReason: `DTC fill incomplete at turn ${step} of 7`,
        refs: { ...refs, dtcFillSequenceStep: step },
      };
    }
  }

  // Rule 12: ontology-affecting intent without approved DTC ref.
  // Triggers when touchedSurfaces indicates ontology-affecting work AND no
  // approved DTC ref is present (dtc absent or dtc.approvalRef absent).
  if (
    input.touchedSurfaces &&
    input.touchedSurfaces.length > 0 &&
    isOntologyAffectingBySurfaces(input.touchedSurfaces)
  ) {
    const hasApprovedDtcRef =
      input.dtc !== undefined && input.dtc.approvalRef !== undefined;
    if (!hasApprovedDtcRef) {
      return {
        allowed: false,
        reason: "ontology-affecting-intent-without-dtc-ref",
        humanReason: `Ontology-affecting intent lacks approved DigitalTwinChangeContract ref`,
        refs,
      };
    }
  }

  // Rule 13 (renumbered from 10): default allow.
  return {
    allowed: true,
    reason: "default-allow",
    humanReason: `all rules passed`,
    refs,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns true when changeBoundary looks like prose (not a path token).
 * Path tokens contain "/" or "." and are relatively short.
 * Prose descriptions contain spaces and are typically longer.
 */
function isProseDescription(boundary: string): boolean {
  // Prose heuristic: contains at least one space, suggesting a sentence.
  return boundary.includes(" ");
}

/**
 * Returns true when the DTC fill sequence is complete.
 *
 * Completion criteria (any of):
 *   1. dtc.verdict === "dtc-filled" — all 7 turns were completed in fill session.
 *   2. dtc.verdict === "dtc-approved" — user approved the filled DTC.
 *   3. completedTurnCount >= 7 — 7 turns explicitly reported as completed.
 *
 * When none apply, fill is still in progress → isFillComplete = false.
 */
export function isFillComplete(
  dtc: DtcWithFillFields,
  completedTurnCount?: number,
): boolean {
  if (dtc.verdict === "dtc-filled" || dtc.verdict === "dtc-approved") {
    return true;
  }
  const count =
    completedTurnCount ?? (dtc.dtcFillSequence?.length ?? 0);
  return count >= 7;
}

/**
 * Returns true when touchedSurfaces indicates ontology-affecting work.
 *
 * Ontology-affecting heuristic: at least one surface contains a well-known
 * ontology surface path prefix (ontology/, schema, lib/lead-intent, bridge/handlers,
 * skills/, agents/) OR carries a semantic engineering keyword.
 * This is intentionally a substring heuristic — callers validate against project
 * ontology surfaces for precision. The policy-compiler heuristic is a safety net.
 */
export function isOntologyAffectingBySurfaces(
  surfaces: readonly string[],
): boolean {
  const ONTOLOGY_SURFACE_MARKERS = [
    "ontology/",
    "schema",
    "lib/lead-intent",
    "lib/semantic-intent",
    "bridge/handlers/",
    "skills/",
    "agents/",
    "lib/governance",
  ] as const;

  return surfaces.some((s) => {
    const lower = s.toLowerCase();
    return ONTOLOGY_SURFACE_MARKERS.some((marker) => lower.includes(marker));
  });
}
