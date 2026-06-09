/**
 * @stable — MarkingDeclaration primitive (prim-security-03, v1.0)
 *
 * Cell- and column-level data classification (Palantir Markings analog). Declares
 * the sensitivity level for a named marking and which field paths it applies to.
 * palantir-mini v1.0 L3 enforcement uses this to gate access to classified fields.
 *
 * Authority chain:
 *   research/palantir/security/ → schemas/ontology/primitives/marking-declaration.ts (this file)
 *   → home-ontology/shared-core → per-project ontology/ → palantir-mini L3 enforcement
 *
 * D/L/A domain: SECURITY L2/L3 (cell/column classification; governs data
 * visibility, not a stored data fact or logic derivation)
  * @owner palantirkc-ontology
 * @purpose @stable — MarkingDeclaration primitive (prim-security-03, v1.0)
 */

export type MarkingRid = string & { readonly __brand: "MarkingRid" };

export const markingRid = (s: string): MarkingRid => s as MarkingRid;

export type SensitivityLevel = "public" | "internal" | "confidential" | "restricted";

export interface MarkingDeclaration {
  readonly markingId: MarkingRid;
  readonly sensitivity: SensitivityLevel;
  /** JSON path expressions for fields this marking classifies (e.g. "user.ssn", "payment.*") */
  readonly applicableFieldPaths: ReadonlyArray<string>;
  readonly description?: string;
}

export class MarkingDeclarationRegistry {
  private readonly items = new Map<MarkingRid, MarkingDeclaration>();

  register(decl: MarkingDeclaration): void {
    this.items.set(decl.markingId, decl);
  }

  get(rid: MarkingRid): MarkingDeclaration | undefined {
    return this.items.get(rid);
  }

  keys(): IterableIterator<MarkingRid> {
    return this.items.keys();
  }

  list(): MarkingDeclaration[] {
    return [...this.items.values()];
  }
}

export const MARKING_DECLARATION_REGISTRY = new MarkingDeclarationRegistry();
