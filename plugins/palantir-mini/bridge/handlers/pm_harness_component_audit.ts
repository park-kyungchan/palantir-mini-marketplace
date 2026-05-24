// palantir-mini v2.21.0 — W5 Component Audit
// Domain: LEARN (audit metadata; BackwardProp input)
//
// Closes cheeky-wandering-yeti.md Gap 1 (Rajasekaran §1: "every component
// encodes an assumption ... worth stress testing"). Given a componentId,
// returns the seed declaration + last audit result. When caller passes
// `canaryRubricRid` and `canaryArtifacts`, emits a
// harness_component_audit_emitted event recording the verdict.
//
// This release does NOT execute the canary — it ships the substrate so
// future audits can be recorded. Actual A/B canary runs (component
// enabled vs simpleVariant) are performed externally (e.g. palantir-math
// sprint-003 W5 dogfood) and then reported via this handler.
//
// Authority: ~/.claude/schemas/ontology/primitives/harness-component.ts

import { emit, projectRoot as resolveProjectRoot } from "../../scripts/log";

export type ComponentAuditResult =
  | "load-bearing"
  | "remove-candidate"
  | "needs-rework"
  | "never-audited";

export interface PmHarnessComponentAuditArgs {
  componentId: string;
  /** Optional audit verdict to record (when the caller has executed a canary externally). */
  verdict?: "load-bearing" | "remove-candidate" | "needs-rework";
  scoreDelta?: number;
  rationale?: string;
  canaryRubricRid?: string;
  canaryArtifacts?: readonly string[];
  projectPath?: string;
  agentName?: string;
}

export interface HarnessComponentSeed {
  readonly componentId: string;
  readonly assumptionEncoded: string;
  readonly simpleVariant: { description: string; enabledBy: string };
  readonly canaryRubricRidDefault: string;
  readonly priorityRank: number;
}

export const SEED_COMPONENTS: readonly HarnessComponentSeed[] = [
  {
    componentId: "sprint-construct",
    assumptionEncoded:
      "Generator cannot sustain multi-feature coherence without sprint-level decomposition.",
    simpleVariant: {
      description: "Single multi-feature run end-to-end, end-only evaluator.",
      enabledBy: "no-sprint-single-pass",
    },
    canaryRubricRidDefault: "rubric.frontend.4-criteria-craft",
    priorityRank: 1,
  },
  {
    componentId: "per-sprint-evaluator",
    assumptionEncoded:
      "Per-iteration live-artifact QA prevents divergence accumulation.",
    simpleVariant: {
      description: "Single end-of-run evaluator pass.",
      enabledBy: "end-only-evaluator",
    },
    canaryRubricRidDefault: "rubric.frontend.4-criteria-craft",
    priorityRank: 2,
  },
  {
    componentId: "context-reset",
    assumptionEncoded:
      "Long sessions cause Generator context anxiety that resets recover from.",
    simpleVariant: {
      description: "Continuous session + Claude Agent SDK auto compaction.",
      enabledBy: "continuous-session",
    },
    canaryRubricRidDefault: "rubric.frontend.4-criteria-craft",
    priorityRank: 3,
  },
  {
    componentId: "planner",
    assumptionEncoded:
      "1-4 sentence briefs under-scope without a Planner expansion pass.",
    simpleVariant: {
      description: "Generator reads the brief directly without Planner expansion.",
      enabledBy: "brief-direct",
    },
    canaryRubricRidDefault: "rubric.frontend.4-criteria-craft",
    priorityRank: 4,
  },
  {
    componentId: "harness-analyzer",
    assumptionEncoded:
      "Lead cannot re-spec between iterations without a synthesis specialist.",
    simpleVariant: {
      description: "Lead manually re-specs between iterations.",
      enabledBy: "lead-respec",
    },
    canaryRubricRidDefault: "rubric.harness.analyzer-quality",
    priorityRank: 5,
  },
  {
    componentId: "file-ipc-feedback",
    assumptionEncoded:
      "Direct messaging between Generator and Evaluator damages audit trail.",
    simpleVariant: {
      description: "Append-only event log IPC only; no feedback-NNN.md files.",
      enabledBy: "event-only-ipc",
    },
    canaryRubricRidDefault: "rubric.harness.audit-integrity",
    priorityRank: 6,
  },
  {
    componentId: "sprint-contract-negotiation",
    assumptionEncoded:
      "Generator drifts without a bound contract negotiated up-front.",
    simpleVariant: {
      description: "Planner spec as read-only contract; no negotiation rounds.",
      enabledBy: "planner-only-spec",
    },
    canaryRubricRidDefault: "rubric.frontend.4-criteria-craft",
    priorityRank: 7,
  },
];

export interface PmHarnessComponentAuditResult {
  componentId: string;
  seed: HarnessComponentSeed | null;
  verdict: ComponentAuditResult;
  scoreDelta: number;
  rationale: string;
  emittedEvent: boolean;
}

export async function pmHarnessComponentAudit(
  args: PmHarnessComponentAuditArgs,
): Promise<PmHarnessComponentAuditResult> {
  if (!args.componentId) {
    throw new Error("pm_harness_component_audit: componentId required");
  }
  const project = args.projectPath ?? resolveProjectRoot();
  const seed = SEED_COMPONENTS.find((c) => c.componentId === args.componentId) ?? null;

  // If caller supplied a verdict, record it. Otherwise return the seed's
  // last-audit stub (never-audited on first call).
  if (args.verdict) {
    const rationale =
      args.rationale ??
      `component=${args.componentId} verdict=${args.verdict} scoreDelta=${args.scoreDelta ?? 0}`;
    await emit({
      type: "harness_component_audit_emitted",
      payload: {
        componentId: args.componentId,
        verdict: args.verdict,
        scoreDelta: args.scoreDelta ?? 0,
        rationale,
        baselineRubricRid: args.canaryRubricRid ?? seed?.canaryRubricRidDefault ?? "rubric.unset",
        canaryArtifacts: args.canaryArtifacts ?? [],
      },
      toolName: "pm_harness_component_audit",
      cwd: project,
      agentName: args.agentName,
      reasoning: rationale,
      hypothesis:
        "Recording component audit verdict preserves BackwardProp evidence for removal decisions at the next MAJOR bump.",
    });
    return {
      componentId: args.componentId,
      seed,
      verdict: args.verdict,
      scoreDelta: args.scoreDelta ?? 0,
      rationale,
      emittedEvent: true,
    };
  }

  // No verdict supplied — return current state only.
  return {
    componentId: args.componentId,
    seed,
    verdict: "never-audited",
    scoreDelta: 0,
    rationale: seed
      ? `component=${args.componentId} has seed declaration; no audit run yet. Pass { verdict, scoreDelta, canaryArtifacts } to record.`
      : `component=${args.componentId} has no seed declaration; register first or use a seed id from pm_harness_component_audit --list.`,
    emittedEvent: false,
  };
}

export default async function pmHarnessComponentAuditHandler(
  rawArgs: unknown,
): Promise<PmHarnessComponentAuditResult> {
  return pmHarnessComponentAudit((rawArgs ?? {}) as PmHarnessComponentAuditArgs);
}
