/**
 * @stable — SourceExecutor primitive (prim-action-08, v1.40.0)
 *
 * Discriminated union over the 5 executor kinds Workflow Lineage tracks
 * (Palantir docs verbatim §A): Foundry functions, ontology actions,
 * automations, AIP Logic functions, and AIP agents. Each kind binds to a
 * different ontology surface; this primitive is the typed handle Workflow
 * Lineage uses to render the provenance graph nodes.
 *
 * D/L/A domain: ACTION (each variant is an executable surface — the
 * declaration records what kind of executor produced an outcome and where
 * to look it up).
 *
 * Authority chain:
 *   research/palantir-foundry/aip/
 *     workflow-lineage-and-aip-observability-2026-03-03.md §A
 *     ↓
 *   schemas/ontology/primitives/source-executor.ts (this file)
 *     ↓
 *   shared-core re-export
 *     ↓
 *   palantir-mini bridge: workflow-lineage-graph nodes, replay handlers
 *
 * Rule cross-refs: rule 10 v2.1.0 §The 5 dimensions (executor referenced
 * by `byWhom.agent` + indirectly by `throughWhich.tool`).
 *
 * @owner palantirkc-ontology
 * @purpose Typed executor union for Workflow Lineage source provenance
 */

import type { ActionTypeRid } from "./action-type";
import type { AIPAgentRid } from "./aip-agent";
import type { AIPLogicFunctionRid } from "./aip-logic-function";
import type { AutomationRid } from "./automation-declaration";

/**
 * Kind tag — one per executor variant. Discriminator field is `kind`.
 */
export type SourceExecutorKind =
  | "function"
  | "action"
  | "automation"
  | "aip-logic"
  | "aip-agent";

/**
 * Foundry function (TypeScript v1, Python). The function reference is a
 * stable name — we intentionally do NOT introduce a separate
 * FoundryFunctionRid because TS/Python functions live outside the typed
 * RID surface (registered at deploy time, not declared in ontology).
 */
export interface SourceExecutorFunction {
  readonly kind: "function";
  readonly executorRid: string;
  readonly displayName: string;
  /** Function signature for grouping in lineage graphs. */
  readonly signature: string;
}

export interface SourceExecutorAction {
  readonly kind: "action";
  readonly executorRid: string;
  readonly displayName: string;
  readonly actionTypeRid: ActionTypeRid;
}

export interface SourceExecutorAutomation {
  readonly kind: "automation";
  readonly executorRid: string;
  readonly displayName: string;
  readonly automationRid: AutomationRid;
}

export interface SourceExecutorAIPLogic {
  readonly kind: "aip-logic";
  readonly executorRid: string;
  readonly displayName: string;
  readonly aipLogicFunctionRid: AIPLogicFunctionRid;
}

export interface SourceExecutorAIPAgent {
  readonly kind: "aip-agent";
  readonly executorRid: string;
  readonly displayName: string;
  readonly aipAgentRid: AIPAgentRid;
}

export type SourceExecutor =
  | SourceExecutorFunction
  | SourceExecutorAction
  | SourceExecutorAutomation
  | SourceExecutorAIPLogic
  | SourceExecutorAIPAgent;

export const SOURCE_EXECUTOR_KINDS: readonly SourceExecutorKind[] = [
  "function",
  "action",
  "automation",
  "aip-logic",
  "aip-agent",
] as const;

export function isSourceExecutorKind(s: string): s is SourceExecutorKind {
  return (SOURCE_EXECUTOR_KINDS as readonly string[]).includes(s);
}

export function isSourceExecutorFunction(x: SourceExecutor): x is SourceExecutorFunction {
  return x.kind === "function";
}

export function isSourceExecutorAction(x: SourceExecutor): x is SourceExecutorAction {
  return x.kind === "action";
}

export function isSourceExecutorAutomation(
  x: SourceExecutor,
): x is SourceExecutorAutomation {
  return x.kind === "automation";
}

export function isSourceExecutorAIPLogic(x: SourceExecutor): x is SourceExecutorAIPLogic {
  return x.kind === "aip-logic";
}

export function isSourceExecutorAIPAgent(
  x: SourceExecutor,
): x is SourceExecutorAIPAgent {
  return x.kind === "aip-agent";
}

export function isSourceExecutor(x: unknown): x is SourceExecutor {
  if (typeof x !== "object" || x === null) return false;
  const e = x as SourceExecutor;
  if (typeof e.kind !== "string" || !isSourceExecutorKind(e.kind)) return false;
  if (typeof e.executorRid !== "string" || e.executorRid.length === 0) return false;
  if (typeof e.displayName !== "string" || e.displayName.length === 0) return false;
  switch (e.kind) {
    case "function":
      return typeof (e as SourceExecutorFunction).signature === "string";
    case "action":
      return typeof (e as SourceExecutorAction).actionTypeRid === "string";
    case "automation":
      return typeof (e as SourceExecutorAutomation).automationRid === "string";
    case "aip-logic":
      return typeof (e as SourceExecutorAIPLogic).aipLogicFunctionRid === "string";
    case "aip-agent":
      return typeof (e as SourceExecutorAIPAgent).aipAgentRid === "string";
  }
}

export class SourceExecutorRegistry {
  private readonly executors = new Map<string, SourceExecutor>();

  register(decl: SourceExecutor): void {
    this.executors.set(decl.executorRid, decl);
  }

  get(rid: string): SourceExecutor | undefined {
    return this.executors.get(rid);
  }

  byKind(kind: SourceExecutorKind): SourceExecutor[] {
    return [...this.executors.values()].filter((e) => e.kind === kind);
  }

  list(): SourceExecutor[] {
    return [...this.executors.values()];
  }
}

export const SOURCE_EXECUTOR_REGISTRY = new SourceExecutorRegistry();

// --- Foundry equivalence (R5-F14 / S3, refined R5-F3 sprint-060 W2.1) ---
//
// The discriminated-union shape covering action / automation / aip-logic /
// aip-agent variants is fully equivalent to Foundry's Workflow Lineage
// SourceExecutor 5-kind union. However, the `function` variant
// (`SourceExecutorFunction`) uses a stable-name reference (`executorRid:
// string + signature: string`) rather than a typed RID brand because
// Foundry TS/Python functions are registered at deploy time and do not
// have a typed schema RID surface in palantir-mini's ontology layer (see
// source-executor.ts lines 50-58 design comment).
//
// This is a documented design choice — Foundry functions are opaque
// executor handles in our ontology — but it means the per-variant
// equivalence is uneven: 4 kinds map equivalent, 1 kind (function) maps
// partial. Marking `partial` overall captures this asymmetry honestly for
// audit / migration tooling instead of overstating with `equivalent`.
//
// Cross-ref: architecture review §5.G.3 R5-F3 Minor (Function primitive
// stable-name only, no full Foundry-TS signature surface).
import type { FoundryEquivalence } from "./category-foundry-equivalent";
const categoryFoundryEquivalent: FoundryEquivalence = {
  kind: "partial",
  foundryType: "SourceExecutor (Workflow Lineage 5-kind union)",
  gaps: [
    "SourceExecutorFunction uses stable-name `executorRid: string + signature: string` (no typed FoundryFunctionRid brand)",
    "EditFunction (referenced as `editFunctionName: string` in action-type.ts:60-61) is not registered as a primitive — same opaque-handle pattern",
  ],
};
export { categoryFoundryEquivalent as sourceExecutorFoundryEquivalent };
