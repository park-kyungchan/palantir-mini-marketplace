/**
 * @stable — AutomationDeclaration primitive (prim-action-03, v1.0)
 *
 * Scheduled or trigger-driven automation metadata (Palantir Automation analog).
 * Declares what action type fires, on what schedule or trigger event, and whether
 * the automation is currently enabled. Execution infrastructure is downstream.
 *
 * Authority chain:
 *   research/palantir/action/ → schemas/ontology/primitives/automation-declaration.ts (this file)
 *   → home-ontology/shared-core → per-project ontology/ → codegen
 *
 * D/L/A domain: ACTION (automation drives mutations; the declaration itself is a
 * stored fact about scheduled mutations, owned by the action layer)
  * @owner palantirkc-ontology
 * @purpose @stable — AutomationDeclaration primitive (prim-action-03, v1.0)
 */

export type AutomationRid = string & { readonly __brand: "AutomationRid" };

export const automationRid = (s: string): AutomationRid => s as AutomationRid;

export interface AutomationDeclaration {
  readonly automationId: AutomationRid;
  /**
   * Cron expression (e.g. "0 9 * * 1-5") for time-based automations, or a
   * trigger-event reference string (e.g. "event:edit_committed") for reactive
   * automations. Mutually exclusive within a single declaration.
   */
  readonly schedule: string;
  /** RID of the ActionType (or EditFunction) to invoke */
  readonly actionTypeRid: string;
  readonly enabled: boolean;
  readonly description?: string;
}

export class AutomationDeclarationRegistry {
  private readonly items = new Map<AutomationRid, AutomationDeclaration>();

  register(decl: AutomationDeclaration): void {
    this.items.set(decl.automationId, decl);
  }

  get(rid: AutomationRid): AutomationDeclaration | undefined {
    return this.items.get(rid);
  }

  keys(): IterableIterator<AutomationRid> {
    return this.items.keys();
  }

  list(): AutomationDeclaration[] {
    return [...this.items.values()];
  }
}

export const AUTOMATION_DECLARATION_REGISTRY = new AutomationDeclarationRegistry();
