/**
 * @stable — AIPMode + AIPSkill primitives (prim-ops-25, v1.40.0)
 *
 * Captures the AI FDE 8-mode router + agent/domain skill taxonomy as typed
 * surfaces. Modes "tell the agent what kind of task you are working on"
 * (Palantir docs §B verbatim); skills are "individual capabilities the
 * agent can use across any mode". Both are mid-task toggleable, which the
 * primitive records explicitly via `midTaskToggleable`.
 *
 * D/L/A domain: OPS (mode + skill activation governs runtime context — what
 * docs are loaded, what tools are available, how the agent approaches the
 * task; not stored fact, not action mutation).
 *
 * Authority chain:
 *   research/palantir-foundry/aip/
 *     ai-fde-overview-and-modes-skills-2026-03-12.md §B Modes (8) + §B Skills
 *     (canonical Palantir docs enumerate 8 modes; "machine-learning" is
 *     mode 6, "osdk-react" is 7, "platform-qa" is 8 — see Section B
 *     "AI FDE modes include the following (8 total)")
 *     ↓
 *   schemas/ontology/primitives/aip-mode-and-skill.ts (this file)
 *     ↓
 *   shared-core re-export
 *
 * Rule cross-refs: rule 16 v4.0.0 §Roles (harness-generator's mode/skill
 * mental model is derived from AI FDE).
 *
 * @owner palantirkc-ontology
 * @purpose AI FDE 8-mode router + agent/domain skill primitives
 */

/**
 * Canonical AI FDE mode set. Order + naming matches Palantir docs §B
 * Section B verbatim (slugged).
 */
export type AIPMode =
  | "data-integration"
  | "ontology-editing"
  | "functions-editing"
  | "exploration"
  | "governance"
  | "machine-learning"
  | "osdk-react"
  | "platform-qa";

export const AIP_MODES: readonly AIPMode[] = [
  "data-integration",
  "ontology-editing",
  "functions-editing",
  "exploration",
  "governance",
  "machine-learning",
  "osdk-react",
  "platform-qa",
] as const;

export function isAIPMode(s: string): s is AIPMode {
  return (AIP_MODES as readonly string[]).includes(s);
}

/**
 * Skill category — Palantir docs §B verbatim split.
 *
 *   agent-skill  — "how the agent manages itself and communicates"
 *                  (change-mode, request-clarification, generate-plan,
 *                   load-documentation, manage-context, manage-skills).
 *   domain-skill — "real actions that the agent can perform in Foundry"
 *                  (filesystem, notepad, solution-design, execute-actions,
 *                   etc.).
 */
export type AIPSkillCategory = "agent-skill" | "domain-skill";

/**
 * Branded RID for an AIPSkill registration.
 */
export type AIPSkillId = string & { readonly __brand: "AIPSkillId" };

export const aipSkillId = (s: string): AIPSkillId => s as AIPSkillId;

export interface AIPSkill {
  readonly skillId: AIPSkillId;
  readonly name: string;
  readonly category: AIPSkillCategory;
  /**
   * Modes this skill applies to. Empty array = applies to ALL modes.
   * Most domain-skills bind to a subset (e.g. "execute-actions" applies
   * to ontology-editing + functions-editing); most agent-skills apply
   * universally.
   */
  readonly modeEligibility: ReadonlyArray<AIPMode>;
  /**
   * Concrete tool name(s) the skill maps to (Palantir docs: "Each one
   * maps to one or more specific tools the agent can call"). Free-form
   * strings — tool naming is runtime-specific.
   */
  readonly toolBinding: ReadonlyArray<string>;
  /**
   * Whether the skill may be enabled / disabled mid-task by the
   * "Manage skills" agent skill (Palantir docs explicit).
   */
  readonly midTaskToggleable: boolean;
}

export function isAIPSkillCategory(s: string): s is AIPSkillCategory {
  return s === "agent-skill" || s === "domain-skill";
}

export function isAIPSkill(x: unknown): x is AIPSkill {
  if (typeof x !== "object" || x === null) return false;
  const s = x as AIPSkill;
  return (
    typeof s.skillId === "string" &&
    s.skillId.length > 0 &&
    typeof s.name === "string" &&
    s.name.length > 0 &&
    typeof s.category === "string" &&
    isAIPSkillCategory(s.category) &&
    Array.isArray(s.modeEligibility) &&
    s.modeEligibility.every((m) => typeof m === "string" && isAIPMode(m)) &&
    Array.isArray(s.toolBinding) &&
    typeof s.midTaskToggleable === "boolean"
  );
}

export class AIPSkillRegistry {
  private readonly skills = new Map<AIPSkillId, AIPSkill>();

  register(decl: AIPSkill): void {
    this.skills.set(decl.skillId, decl);
  }

  get(id: AIPSkillId): AIPSkill | undefined {
    return this.skills.get(id);
  }

  byCategory(c: AIPSkillCategory): AIPSkill[] {
    return [...this.skills.values()].filter((s) => s.category === c);
  }

  byMode(m: AIPMode): AIPSkill[] {
    return [...this.skills.values()].filter(
      (s) => s.modeEligibility.length === 0 || s.modeEligibility.includes(m),
    );
  }

  list(): AIPSkill[] {
    return [...this.skills.values()];
  }
}

export const AIP_SKILL_REGISTRY = new AIPSkillRegistry();

// --- Foundry equivalence (R5-F14 / S3) ---
import type { FoundryEquivalence } from "./category-foundry-equivalent";
const categoryFoundryEquivalent: FoundryEquivalence = {
  kind: "equivalent",
  foundryType: "AI FDE 8-mode router (AIPMode) + AIPSkill",
};
export { categoryFoundryEquivalent as aipModeAndSkillFoundryEquivalent };
