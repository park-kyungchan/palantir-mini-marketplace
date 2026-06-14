/**
 * palantir-mini — LinkType / Object-Backed LinkType primitive (prim-logic-03)
 *
 * Relationship between ObjectTypes. Plain LinkType when the relationship
 * carries no properties; Object-Backed LinkType when it does.
 *
 * Transition-zone reclassification: LinkType is LOGIC, not DATA, because it
 * enables reasoning/traversal rather than stored fact. Apply SH-01:
 *   "Delete the relationship — does the OBJECT still describe reality?"
 *     YES -> the relationship is LOGIC (not core data)
 *     NO  -> the relationship is DATA (inherent to the object identity)
 *
 * Authority chain: schemas/ontology/primitives/link-type.ts (this)
 *   -> palantir-mini/lib/codegen/descender-gen.ts
 *   -> <project>/src/generated/links.d.ts
  * @owner palantirkc-ontology
 * @purpose LinkType / Object-Backed LinkType primitive (prim-logic-03)
 */

import type { ObjectTypeRid } from "./object-type";

export type LinkTypeRid = string & { readonly __brand: "LinkTypeRid" };

export const linkTypeRid = (s: string): LinkTypeRid => s as LinkTypeRid;

export type Cardinality = "one" | "many";

/**
 * How a LinkType is BACKED at the data layer (OE-11 / ARCH-5):
 *   - "fk-property": the relationship is carried by a foreign-key PROPERTY on the
 *     many-side ObjectType (the Foundry "FK on the many side" pattern for 1:M / M:1).
 *   - "join-datasource": the relationship is carried by a separate JOIN datasource
 *     (the Foundry many-to-many pattern — an M:N link needs a join table, never an FK).
 * Optional + additive: legacy declarations that don't model their backing omit it.
 */
export type LinkBacking =
  | { readonly kind: "fk-property"; readonly fkProperty: string; readonly onSide: "src" | "dst" }
  | { readonly kind: "join-datasource"; readonly joinDatasource: string };

/**
 * Cross-ontology link boundary marker (PF-3 / OE-11). When a LinkType's endpoints
 * live in DIFFERENT ontologies, the link crosses an ontology boundary and is only
 * traversable through an explicitly-declared shared/import boundary. Absent ⇒ the
 * link is intra-ontology (the common case). Additive — legacy declarations omit it.
 */
export interface CrossOntologyBoundary {
  readonly srcOntology: string;
  readonly dstOntology: string;
}

/** Plain LinkType — no properties on the link itself */
export interface PlainLinkTypeDeclaration {
  readonly kind: "plain";
  readonly rid: LinkTypeRid;
  readonly name: string;
  readonly description?: string;
  readonly src: ObjectTypeRid;
  readonly dst: ObjectTypeRid;
  readonly srcCardinality: Cardinality;
  readonly dstCardinality: Cardinality;
  /** How the relationship is backed at the data layer (OE-11). Optional, additive. */
  readonly backing?: LinkBacking;
  /** Set only when the link crosses an ontology boundary (PF-3). Optional, additive. */
  readonly crossOntologyBoundary?: CrossOntologyBoundary;
}

/** Object-Backed LinkType — link carries its own properties */
export interface ObjectBackedLinkTypeDeclaration {
  readonly kind: "object-backed";
  readonly rid: LinkTypeRid;
  readonly name: string;
  readonly description?: string;
  readonly src: ObjectTypeRid;
  readonly dst: ObjectTypeRid;
  readonly srcCardinality: Cardinality;
  readonly dstCardinality: Cardinality;
  /** How the relationship is backed at the data layer (OE-11). Optional, additive. */
  readonly backing?: LinkBacking;
  /** Set only when the link crosses an ontology boundary (PF-3). Optional, additive. */
  readonly crossOntologyBoundary?: CrossOntologyBoundary;
  readonly properties: ReadonlyArray<{
    readonly name: string;
    readonly type: string;
    readonly optional?: boolean;
  }>;
}

export type LinkTypeDeclaration =
  | PlainLinkTypeDeclaration
  | ObjectBackedLinkTypeDeclaration;

export class LinkTypeRegistry {
  private readonly types = new Map<LinkTypeRid, LinkTypeDeclaration>();
  register(decl: LinkTypeDeclaration): void { this.types.set(decl.rid, decl); }
  get(rid: LinkTypeRid): LinkTypeDeclaration | undefined { return this.types.get(rid); }
  list(): LinkTypeDeclaration[] { return [...this.types.values()]; }
}

export const LINK_TYPE_REGISTRY = new LinkTypeRegistry();
