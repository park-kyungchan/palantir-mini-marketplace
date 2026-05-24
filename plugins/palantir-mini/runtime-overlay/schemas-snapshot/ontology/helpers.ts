/**
 * Ontology Pipeline — Shared Naming & Validation Utilities
 *
 * Minimal helpers re-exported by frontend/helpers.ts.
 * Extended with schema validation functions for codegen bridge.
 */

import type { StructuralRule, BilingualDesc } from "./types";

// =========================================================================
// Naming Utilities (original)
// =========================================================================

export function isPascalCase(s: string): boolean {
  return /^[A-Z][a-zA-Z0-9]*$/.test(s);
}

export function isCamelCase(s: string): boolean {
  return /^[a-z][a-zA-Z0-9]*$/.test(s);
}

export function isValidPlural(singular: string, plural: string): boolean {
  const lower = singular.toLowerCase();
  if (
    lower.endsWith("s") ||
    lower.endsWith("sh") ||
    lower.endsWith("ch") ||
    lower.endsWith("x") ||
    lower.endsWith("z")
  ) {
    return plural === singular + "es";
  }
  if (lower.endsWith("y") && !/[aeiou]y$/i.test(singular)) {
    return plural === singular.slice(0, -1) + "ies";
  }
  return plural === singular + "s";
}

// =========================================================================
// Schema Validation Utilities
// =========================================================================

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

/** Apply a StructuralRule against a name, return {valid, errors[]}. */
export function validateApiName(
  name: string,
  rules: readonly StructuralRule[],
  target: string,
): ValidationResult {
  const errors: string[] = [];
  const matchingRules = rules.filter((r) => r.target === target);

  if (matchingRules.length === 0) {
    return { valid: true, errors: [] };
  }

  for (const rule of matchingRules) {
    const regex = new RegExp(rule.pattern);
    if (!regex.test(name)) {
      errors.push(`"${name}" does not match ${rule.casing} pattern (${rule.pattern}) for ${rule.target}`);
    }
    if (rule.minLength !== undefined && name.length < rule.minLength) {
      errors.push(`"${name}" is too short (min ${rule.minLength}) for ${rule.target}`);
    }
    if (rule.maxLength !== undefined && name.length > rule.maxLength) {
      errors.push(`"${name}" is too long (max ${rule.maxLength}) for ${rule.target}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/** Validate a BilingualDesc has non-empty ko and en fields. */
export function validateBilingualDesc(desc: BilingualDesc): ValidationResult {
  const errors: string[] = [];
  if (!desc.ko || desc.ko.trim().length === 0) {
    errors.push("BilingualDesc.ko is empty");
  }
  if (!desc.en || desc.en.trim().length === 0) {
    errors.push("BilingualDesc.en is empty");
  }
  return { valid: errors.length === 0, errors };
}

/** Validate a hard constraint ID matches HC-{DOMAIN}-NN format. */
export function validateHardConstraintId(
  id: string,
  domain: string,
): ValidationResult {
  const errors: string[] = [];
  const pattern = new RegExp(`^HC-${domain.toUpperCase()}-\\d{2}$`);
  if (!pattern.test(id)) {
    errors.push(`"${id}" does not match HC-${domain.toUpperCase()}-NN format`);
  }
  return { valid: errors.length === 0, errors };
}

/** Validate a heuristic ID matches DH-{DOMAIN}-NN format. */
export function validateHeuristicId(
  id: string,
  domain: string,
): ValidationResult {
  const errors: string[] = [];
  const pattern = new RegExp(`^DH-${domain.toUpperCase()}-\\d{2}$`);
  if (!pattern.test(id)) {
    errors.push(`"${id}" does not match DH-${domain.toUpperCase()}-NN format`);
  }
  return { valid: errors.length === 0, errors };
}

/** Schema stats shape. */
export interface SchemaStats {
  readonly domains: number;
  readonly conceptTypes: number;
  readonly heuristics: { data: number; logic: number; action: number; security: number };
  readonly hardConstraints: { data: number; logic: number; action: number; security: number };
  readonly structuralRules: { data: number; logic: number; action: number; security: number };
}

/** Aggregate counts across all domains. Accepts raw counts to avoid circular imports. */
export function generateSchemaStats(counts: {
  dataHeuristics: number;
  logicHeuristics: number;
  actionHeuristics: number;
  securityHeuristics: number;
  dataHC: number;
  logicHC: number;
  actionHC: number;
  securityHC: number;
  dataRules: number;
  logicRules: number;
  actionRules: number;
  securityRules: number;
}): SchemaStats {
  return {
    domains: 3, // 3 semantic domains (LOCAL NORMALIZATION). SECURITY is governance overlay, not a 4th semantic domain — see TERMINOLOGY_CHARTER + SECURITY_OVERLAY in semantics.ts
    conceptTypes: 20,
    heuristics: {
      data: counts.dataHeuristics,
      logic: counts.logicHeuristics,
      action: counts.actionHeuristics,
      security: counts.securityHeuristics,
    },
    hardConstraints: {
      data: counts.dataHC,
      logic: counts.logicHC,
      action: counts.actionHC,
      security: counts.securityHC,
    },
    structuralRules: {
      data: counts.dataRules,
      logic: counts.logicRules,
      action: counts.actionRules,
      security: counts.securityRules,
    },
  };
}
