/**
 * Security Governance Overlay Semantics
 *
 * Split from legacy semantics.ts v1.13.1 (D1, 2026-04-19).
 * Security is a governance overlay, NOT a 4th semantic domain. See
 * TERMINOLOGY_CHARTER in semantics-core for the full rationale.
 *
 * Consumers MUST import from the parent barrel: `from "../semantics"`.
 */

// =========================================================================
// Section 3.5: Security Governance Overlay
// =========================================================================

/**
 * Security governance overlay semantics.
 * Security is NOT a 4th semantic domain — it does not own ConceptTypes.
 * It is a governance layer that controls access, permissions, classification,
 * and visibility ACROSS all three semantic domains.
 */
export interface GovernanceOverlaySemantics {
  /** Governance overlay identifier. */
  readonly overlay: "security";
  /** What this overlay governs. */
  readonly realWorldRole: string;
  /** The semantic question for governance concerns. */
  readonly semanticQuestion: string;
  /** Description of governance scope. */
  readonly description: string;
  /** Three-layer security model. */
  readonly layers: readonly {
    readonly name: string;
    readonly mechanism: string;
    readonly scope: string;
  }[];
}

/** Typed security governance overlay — NOT a semantic domain. */
export const SECURITY_OVERLAY: GovernanceOverlaySemantics = {
  overlay: "security",
  realWorldRole: "Controls who can access, modify, or view ontology resources across all domains",
  semanticQuestion: "Does this control access, permissions, classification, or visibility?",
  description:
    "Security is a governance overlay that operates across DATA, LOGIC, and ACTION. "
    + "It does not own ConceptTypes (ObjectType, LinkType, etc.) — instead, it governs "
    + "access to them. A security policy does not describe what EXISTS (DATA), how to "
    + "REASON (LOGIC), or how to CHANGE reality (ACTION). It controls WHO is allowed to "
    + "do those things. This is why security is a cross-cutting overlay, not a 4th domain.",
  layers: [
    {
      name: "RBAC (Role-Based Access Control)",
      mechanism: "Ontology Roles define broad permission categories across resource types",
      scope: "Coarsest access control — which users can see which object types and which actions they can perform",
    },
    {
      name: "Marking-Based Access (Classification)",
      mechanism: "Classification labels (Public, Internal, Confidential, Secret) attached to individual data items",
      scope: "Data sensitivity — ensures sensitive information is only accessible to properly cleared users",
    },
    {
      name: "Object-Level Security (Row/Column)",
      mechanism: "Row-level security (individual object policies) and column-level security (restricted views)",
      scope: "Fine-grained — individual objects and properties can have distinct access policies",
    },
    {
      name: "Cell-Level Security (Object + Property Policies)",
      mechanism: "Object security policies guard per-instance view permissions via mandatory control properties; property security policies guard specific field visibility — unauthorized users see null values. Combined, they enable per-cell granularity independent of backing datasource permissions.",
      scope: "Most granular — per-object-instance × per-property access decisions. If user fails object policy the row is hidden; if user passes object policy but fails property policy the value is null. Datasource Viewer permissions are NOT required when policies are configured.",
    },
  ],
} as const;

