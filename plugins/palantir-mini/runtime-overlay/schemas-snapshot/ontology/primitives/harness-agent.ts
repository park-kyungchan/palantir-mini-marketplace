/**
 * @stable — HarnessAgent primitive (prim-learn-11, v1.14.0)
 *
 * Role-bound agent in a 3-agent harness (Planner / Generator / Evaluator /
 * Orchestrator + AIP Evals 4-grader specializations). Authority merges:
 *   - Prithvi Rajasekaran's GAN-inspired harness (Anthropic Labs blog,
 *     research/claude-code/features.md §Managed Agents reference)
 *   - Palantir AIP Agent Studio core-concepts (research/palantir-foundry/aip/
 *     agent-studio-core-concepts.md)
 *   - Claude Code Lead Protocol v2 §3 subagent frontmatter spec
 *     (research/claude-code/lead-system-v2.md)
 *
 * Authority chain:
 *   research/palantir-foundry/aip/ + research/claude-code/ →
 *   schemas/ontology/primitives/harness-agent.ts (this file) →
 *   home-ontology/shared-core → per-project ontology/ →
 *   palantir-mini/agents/*.md (agent roster)
 *
 * D/L/A domain: LEARN (agent lifecycle + role binding are evaluation/
 * orchestration surface, not stored data, not direct mutation)
 * @owner palantirkc-ontology
 * @purpose 3-agent harness role primitive (AIP-aligned)
 */

export type HarnessAgentRid = string & { readonly __brand: "HarnessAgentRid" };

export const harnessAgentRid = (s: string): HarnessAgentRid => s as HarnessAgentRid;

/**
 * Role of the agent in the harness.
 *   planner       — Product spec author (1-4 sentence brief → full spec.md)
 *   generator     — Implementer; self-evaluation forbidden
 *   evaluator     — Rubric scorer + Playwright MCP operator
 *   orchestrator  — FeedbackLoop coordinator; hard-threshold arbiter
 *   grader_code   — AIP Evals: deterministic assertion (regex/shell/API)
 *   grader_rule   — AIP Evals: JSONSchema/regex rule match
 *   grader_model  — AIP Evals: LLM judge with rubric prompt
 *   grader_human  — AIP Evals: manual review marker (not an agent instance)
 */
export type HarnessAgentRole =
  | "planner"
  | "generator"
  | "evaluator"
  | "orchestrator"
  | "grader_code"
  | "grader_rule"
  | "grader_model"
  | "grader_human";

/**
 * Phase at which the agent is invoked.
 *   planning    — spec authoring (before any sprint)
 *   sprint      — generator+evaluator iteration loop
 *   evaluation  — standalone rubric scoring (post-sprint or ad-hoc)
 *   synthesis   — cross-sprint orchestration (by orchestrator role)
 */
export type HarnessAgentPhase = "planning" | "sprint" | "evaluation" | "synthesis";

/**
 * Model anchor per Lead Protocol v2 §Model policy. Frontmatter is single SoT.
 * Lead MUST NOT override at spawn time (Phase A defect #2,
 * research/claude-code/lead-system-v2.md §6).
 */
export type HarnessAgentModel = "haiku" | "sonnet" | "opus";

export interface HarnessAgentBinding {
  /** Optional binding to a SprintContract — set when agent is scoped to a sprint */
  readonly sprintContractRid?: string;
  /** Optional binding to a FeedbackLoop — set mid-loop for generator/evaluator */
  readonly feedbackLoopRid?: string;
}

export interface HarnessAgentDeclaration {
  readonly agentId: HarnessAgentRid;
  readonly role: HarnessAgentRole;
  readonly phase: HarnessAgentPhase;
  readonly modelRef: HarnessAgentModel;
  /**
   * Explicit tool allowlist — surfaces as frontmatter `tools` field in the
   * agent's .md file. Follows Claude Code allowlist syntax:
   *   ["Read", "Edit", "Bash(bunx tsc *)", "mcp__palantir-mini__*"]
   */
  readonly toolsAllowlist: readonly string[];
  /**
   * Path (relative to plugin root) to output contract schema. SubagentStop
   * hook validates agent's final output file against this contract
   * (research/claude-code/lead-system-v2.md §5.5 phase-gate contract).
   */
  readonly outputContract: string;
  /**
   * Upper turn bound for graceful degradation. Paired with a SubagentStop
   * hook that enforces checkpoint-on-exit. Recommended values:
   *   planner: 30, generator: 100, evaluator: 15, orchestrator: 50
   */
  readonly maxTurns: number;
  /** Optional sprint/loop binding — null at declaration, set mid-execution */
  readonly binding?: HarnessAgentBinding;
  readonly description?: string;
}

export class HarnessAgentRegistry {
  private readonly items = new Map<HarnessAgentRid, HarnessAgentDeclaration>();

  register(decl: HarnessAgentDeclaration): void {
    this.items.set(decl.agentId, decl);
  }

  get(rid: HarnessAgentRid): HarnessAgentDeclaration | undefined {
    return this.items.get(rid);
  }

  byRole(role: HarnessAgentRole): HarnessAgentDeclaration[] {
    return [...this.items.values()].filter((a) => a.role === role);
  }

  byPhase(phase: HarnessAgentPhase): HarnessAgentDeclaration[] {
    return [...this.items.values()].filter((a) => a.phase === phase);
  }

  keys(): IterableIterator<HarnessAgentRid> {
    return this.items.keys();
  }

  list(): HarnessAgentDeclaration[] {
    return [...this.items.values()];
  }
}

export const HARNESS_AGENT_REGISTRY = new HarnessAgentRegistry();
