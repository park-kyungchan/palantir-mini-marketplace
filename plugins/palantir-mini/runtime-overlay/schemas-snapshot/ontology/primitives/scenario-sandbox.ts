/**
 * @stable — ScenarioSandbox primitive (prim-learn-03, v1.0)
 *
 * Isolated what-if analysis context (Palantir Scenario / Sandbox analog). Spawned
 * by palantir-mini scenario-create MCP tool; carries isolation level, parent
 * session reference, and arbitrary metadata. Results feed back into BackPropagation
 * via LEARN-03 outcome tracking.
 *
 * Authority chain:
 *   research/palantir/platform/ → schemas/ontology/primitives/scenario-sandbox.ts (this file)
 *   → home-ontology/shared-core → per-project ontology/ → palantir-mini scenario-create
 *
 * D/L/A domain: LEARN (sandbox enables evaluation of hypothetical states; the
 * scenario itself is a LEARN artifact tracking what-if outcomes)
  * @owner palantirkc-ontology
 * @purpose @stable — ScenarioSandbox primitive (prim-learn-03, v1.0)
 */

export type ScenarioRid = string & { readonly __brand: "ScenarioRid" };

export const scenarioRid = (s: string): ScenarioRid => s as ScenarioRid;

export type ScenarioIsolation = "full" | "shared-read";

export interface ScenarioSandboxDeclaration {
  readonly scenarioId: ScenarioRid;
  /** Session RID or session ID string this scenario was spawned from */
  readonly parentSessionId: string;
  /**
   * "full" — complete write isolation; changes are never visible outside the sandbox.
   * "shared-read" — reads from live ontology; writes are sandbox-local.
   */
  readonly isolation: ScenarioIsolation;
  /** ISO 8601 timestamp when the sandbox was created */
  readonly createdAt: string;
  readonly metadata: Record<string, unknown>;
}

export class ScenarioSandboxRegistry {
  private readonly items = new Map<ScenarioRid, ScenarioSandboxDeclaration>();

  register(decl: ScenarioSandboxDeclaration): void {
    this.items.set(decl.scenarioId, decl);
  }

  get(rid: ScenarioRid): ScenarioSandboxDeclaration | undefined {
    return this.items.get(rid);
  }

  keys(): IterableIterator<ScenarioRid> {
    return this.items.keys();
  }

  list(): ScenarioSandboxDeclaration[] {
    return [...this.items.values()];
  }
}

export const SCENARIO_SANDBOX_REGISTRY = new ScenarioSandboxRegistry();
