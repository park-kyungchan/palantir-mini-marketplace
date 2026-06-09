/**
 * palantir-mini — Role primitive (prim-security-NN)
 *
 * GOVERNANCE/ACTORS gap closure: the existing RBAC primitives
 * (marking-declaration, object-security-policy, property-security-policy,
 * capability-token) cover row/column/cell/object security and the grant
 * ARTIFACT, but NONE expresses a principal -> permission grant directly. Role
 * is that binding: a named principal (agent / runtime / capability-token) is
 * bound to a set of granted resource RIDs plus the permission verbs it may
 * exercise over them.
 *
 * NON-OVERLAP with CapabilityToken (prim-security-02): the two are deliberately
 * disjoint.
 *   - CapabilityToken = the grant ARTIFACT — an issued, signed, expiring token
 *     held by a holder carrying opaque scope strings. It is the bearer
 *     credential that proves a grant exists.
 *   - Role = the principal-permission BINDING — the directory statement that
 *     "principal P may exercise verbs V over resources R". It is the policy
 *     that a token may be minted FROM, not the token itself. Role has no
 *     signature / issuedAt / expiry and is not bearer-presented.
 * A CapabilityToken answers "what does the bearer of this credential hold?";
 * a Role answers "which principal is granted which permission over which
 * resource?". Tokens are issued; Roles are declared.
 *
 * Authority chain: schemas/ontology/primitives/role.ts (this)
 *   -> palantir-mini RBAC (managed-settings.d fragments + agent-ownership-validate hook)
 *
 * D/L/A domain: SECURITY L2 (principal->permission grant; governs who may
 * perform which verbs over which resources — not a stored data fact, not a
 * logic derivation).
 *
 * @owner palantirkc-ontology
 * @purpose Role primitive (principal -> resource grant; GOVERNANCE/ACTORS gap)
 */

export type RoleRid = string & { readonly __brand: "RoleRid" };

export const roleRid = (s: string): RoleRid => s as RoleRid;

/** Kind of principal a Role binds permissions to. */
export type RolePrincipalKind = "agent" | "runtime" | "capability-token";

/** Permission verb a Role grants over its resources. */
export type PermissionVerb = "read" | "write" | "register" | "execute" | "admin";

/** The principal a Role grants permissions to (typed, not free-form). */
export interface RolePrincipal {
  readonly kind: RolePrincipalKind;
  /** Stable identifier for the principal within its kind (e.g. "hook-builder"). */
  readonly id: string;
}

/**
 * Role — binds a single principal to the resource RIDs it is granted and the
 * permission verbs it may exercise over them. The principal->permission grant
 * the prior RBAC surface lacked.
 */
export interface RoleDeclaration {
  readonly rid: RoleRid;
  readonly name: string;
  readonly description?: string;
  /** The principal this grant binds (agent / runtime / capability-token). */
  readonly principal: RolePrincipal;
  /** Resource RIDs (paths / object-type RIDs / handler RIDs) the principal is granted. */
  readonly grantedResourceRids: ReadonlyArray<string>;
  /** Permission verbs the principal may exercise over the granted resources. */
  readonly permissions: ReadonlyArray<PermissionVerb>;
}

export class RoleRegistry {
  private readonly roles = new Map<RoleRid, RoleDeclaration>();
  register(decl: RoleDeclaration): void { this.roles.set(decl.rid, decl); }
  get(rid: RoleRid): RoleDeclaration | undefined { return this.roles.get(rid); }
  list(): RoleDeclaration[] { return [...this.roles.values()]; }
}

export const ROLE_REGISTRY = new RoleRegistry();
