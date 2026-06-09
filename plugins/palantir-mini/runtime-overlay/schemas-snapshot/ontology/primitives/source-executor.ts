/**
 * @stable — SourceExecutor primitive (prim-action-08, v1.40.0)
 *
 * Discriminated union over the executor kinds Workflow Lineage tracks
 * (Palantir docs verbatim §A): Foundry functions, ontology actions,
 * automations, and AIP Logic functions. Each kind binds to a
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
import type { AIPLogicFunctionRid } from "./aip-logic-function";
import type { AutomationRid } from "./automation-declaration";

/**
 * Kind tag — one per executor variant. Discriminator field is `kind`.
 */
export type SourceExecutorKind =
  | "function"
  | "action"
  | "automation"
  | "aip-logic";

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

export type SourceExecutor =
  | SourceExecutorFunction
  | SourceExecutorAction
  | SourceExecutorAutomation
  | SourceExecutorAIPLogic;

export const SOURCE_EXECUTOR_KINDS: readonly SourceExecutorKind[] = [
  "function",
  "action",
  "automation",
  "aip-logic",
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
