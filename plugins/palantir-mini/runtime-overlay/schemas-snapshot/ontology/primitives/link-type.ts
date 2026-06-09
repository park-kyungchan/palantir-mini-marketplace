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
