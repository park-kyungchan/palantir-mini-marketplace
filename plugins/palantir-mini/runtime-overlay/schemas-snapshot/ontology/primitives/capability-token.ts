/**
 * @stable — CapabilityToken primitive (prim-security-02, v1.0)
 *
 * L2 RBAC capability token. Issued to a holder (agent, user, or service RID)
 * with a scoped list of capability names, an expiry, and an opaque signature.
 * Used by palantir-mini v1.0 pre-flight checks before ship-merge, schema-write,
 * and ontology-register operations.
 *
 * Authority chain:
 *   research/palantir/security/ → schemas/ontology/primitives/capability-token.ts (this file)
 *   → home-ontology/shared-core → per-project ontology/ → palantir-mini RBAC
 *
 * D/L/A domain: SECURITY L2 (capability-based access control token; not a stored
 * data fact, not a logic derivation — governs who may perform which actions)
  * @owner palantirkc-ontology
 * @purpose @stable — CapabilityToken primitive (prim-security-02, v1.0)
 */

export type CapabilityTokenRid = string & { readonly __brand: "CapabilityTokenRid" };

export const capabilityTokenRid = (s: string): CapabilityTokenRid => s as CapabilityTokenRid;

export interface CapabilityTokenDeclaration {
  readonly rid: CapabilityTokenRid;
  /** Holder identity — agent RID, user RID, or opaque service identifier string */
  readonly holder: string;
  /** Capability names granted by this token (e.g. "schema-write", "ontology-register") */
  readonly scope: ReadonlyArray<string>;
  /** ISO 8601 timestamp when the token was issued */
  readonly issuedAt: string;
  /** ISO 8601 timestamp when the token expires */
  readonly expiresAt: string;
  /** Opaque signature — implementation details determined by issuer */
  readonly signature: string;
}

export class CapabilityTokenRegistry {
  private readonly items = new Map<CapabilityTokenRid, CapabilityTokenDeclaration>();

  register(decl: CapabilityTokenDeclaration): void {
    this.items.set(decl.rid, decl);
  }

  get(rid: CapabilityTokenRid): CapabilityTokenDeclaration | undefined {
    return this.items.get(rid);
  }

  keys(): IterableIterator<CapabilityTokenRid> {
    return this.items.keys();
  }

  list(): CapabilityTokenDeclaration[] {
    return [...this.items.values()];
  }
}

export const CAPABILITY_TOKEN_REGISTRY = new CapabilityTokenRegistry();
