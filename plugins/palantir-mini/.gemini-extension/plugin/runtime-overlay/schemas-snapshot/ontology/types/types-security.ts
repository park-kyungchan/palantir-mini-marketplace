/**
 * Ontology Types — SECURITY Domain Export Shapes
 *
 * Split from legacy types.ts v1.13.1 (D4, 2026-04-19). Role, Marking,
 * RLSPolicy, CLSPolicy, ObjectSecurityPolicy, PropertySecurityPolicy, and
 * the OntologySecurity barrel shape.
 *
 * Consumers MUST import from the parent barrel: `from "../types"`.
  * @owner palantirkc-ontology
 * @purpose SECURITY Domain Export Shapes
 */

import type { StructuralRule, BilingualDesc, MarkingType, CrudOperation, PermissionModel, MarkingCategoryVisibility, MandatoryControlType } from "./types-core";

// =========================================================================
// SECURITY Domain Export Shapes
// =========================================================================

export interface Role {
  readonly apiName: string;
  readonly displayName: BilingualDesc;
  readonly hierarchy?: number;
}

export interface PermissionEntry {
  readonly entityApiName: string;
  readonly roleApiName: string;
  readonly operations: readonly CrudOperation[];
}

export interface Marking {
  readonly apiName: string;
  readonly description: BilingualDesc;
  readonly markingType: MarkingType;
  readonly levels?: readonly string[];
  readonly appliedTo: readonly string[];
}

export interface RLSPolicy {
  readonly userAttribute: string;
  readonly objectProperty: string;
  readonly operator: "equals" | "contains" | "in";
}

export interface CLSPolicy {
  readonly propertyApiName: string;
  readonly readableBy: readonly string[];
  readonly writableBy: readonly string[];
}

export interface ObjectSecurityPolicy {
  readonly entityApiName: string;
  readonly description: BilingualDesc;
  readonly rls?: RLSPolicy;
  readonly cls?: readonly CLSPolicy[];
}

/**
 * Property security policy — guards visibility of specific properties.
 * Unauthorized users see null values for guarded properties, not access denied.
 * Combinable with ObjectSecurityPolicy for cell-level granularity.
 * Source: security/object-security.md §Property Security Policies
 */
export interface PropertySecurityPolicy {
  readonly entityApiName: string;
  readonly description: BilingualDesc;
  readonly guardedProperties: readonly string[];
  readonly readableBy: readonly string[];
  /** Unauthorized users see null for guarded properties. */
  readonly unauthorizedBehavior: "null";
}

export interface OntologySecurity {
  /** Permission surface for this ontology: legacy per-resource roles or Compass project membership. */
  readonly permissionModel?: PermissionModel;
  readonly roles: readonly Role[];
  readonly permissionMatrix: readonly PermissionEntry[];
  readonly markings: readonly Marking[];
  readonly objectPolicies: readonly ObjectSecurityPolicy[];
  readonly propertyPolicies?: readonly PropertySecurityPolicy[];
}

