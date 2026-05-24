/**
 * @stable — CrossProjectTeammate primitive (home-agent-01, v1.0)
 *
 * Represents an agent teammate participating across the home-repo project
 * fleet. Used by Agent Teams orchestration (/orchestrate, /ship) to track
 * which role, capabilities, and project each teammate is bound to.
 *
 * Authority chain:
 *   ~/.claude/rules/06-agent-teams.md → ~/ontology/shared-core/cross-project-teammate.ts (this file)
 *   → per-project ontology/ → agent dispatch
 *
 * D/L/A domain: LOGIC (teammate definition enables agent routing decisions;
 * not a stored data fact, not a mutation — it is traversal/reasoning infrastructure)
 */

export type TeammateRid = string & { readonly __brand: "TeammateRid" };

export const teammateRid = (s: string): TeammateRid => s as TeammateRid;

export type TeammateRole =
  | "lead"
  | "schemas-impl"
  | "home-impl"
  | "plugin-impl"
  | "migrator"
  | "skills-impl"
  | "shipper";

export interface CrossProjectTeammateDeclaration {
  readonly rid: TeammateRid;
  readonly role: TeammateRole;
  /** Capability names this teammate is authorized to perform */
  readonly capabilities: ReadonlyArray<string>;
  /** RID of the project this teammate is primarily scoped to */
  readonly project: string;
}

export class CrossProjectTeammateRegistry {
  private readonly items = new Map<TeammateRid, CrossProjectTeammateDeclaration>();

  register(decl: CrossProjectTeammateDeclaration): void {
    this.items.set(decl.rid, decl);
  }

  get(rid: TeammateRid): CrossProjectTeammateDeclaration | undefined {
    return this.items.get(rid);
  }

  keys(): IterableIterator<TeammateRid> {
    return this.items.keys();
  }

  list(): CrossProjectTeammateDeclaration[] {
    return [...this.items.values()];
  }
}

export const CROSS_PROJECT_TEAMMATE_REGISTRY = new CrossProjectTeammateRegistry();
