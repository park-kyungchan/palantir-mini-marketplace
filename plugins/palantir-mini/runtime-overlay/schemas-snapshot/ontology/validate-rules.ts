/**
 * Structural Rule Validation
 *
 * Aggregates STRUCTURAL_RULES from all 4 domain schemas into a single
 * validation entry point. Validates API names and structural conventions
 * across DATA, LOGIC, ACTION, SECURITY domains.
 *
 * Renamed from codegen.ts (2026-03-16) — was never code generation,
 * always structural rule validation. See CHANGELOG.md for history.
 *
 * Usage:
 *   import { validateOntologyFile, ALL_STRUCTURAL_RULES } from "./validate-rules";
 *   const result = validateOntologyFile(content, "data");
 */

import type { StructuralRule } from "./types";
import { validateApiName, type ValidationResult } from "./helpers";

import { STRUCTURAL_RULES as DATA_RULES } from "./data/schema";
import { STRUCTURAL_RULES as LOGIC_RULES } from "./logic/schema";
import { STRUCTURAL_RULES as ACTION_RULES } from "./action/schema";
import { STRUCTURAL_RULES as SECURITY_RULES } from "./security/schema";

// =========================================================================
// Aggregated Rules
// =========================================================================

/**
 * 4-value domain identifier for structural rule validation.
 * Equivalent to DomainOrOverlay (semantics.ts) and OntologyDomain (types.ts).
 * Includes "security" because security has its own structural rules.
 * See TERMINOLOGY_CHARTER in semantics.ts for local normalization details.
 */
export type DomainId = "data" | "logic" | "action" | "security";

export const DOMAIN_RULE_MAP: Readonly<Record<DomainId, readonly StructuralRule[]>> = {
  data: DATA_RULES,
  logic: LOGIC_RULES,
  action: ACTION_RULES,
  security: SECURITY_RULES,
} as const;

/** All structural rules across all domains (5+5+5+4 = 19). */
export const ALL_STRUCTURAL_RULES: readonly StructuralRule[] = [
  ...DATA_RULES,
  ...LOGIC_RULES,
  ...ACTION_RULES,
  ...SECURITY_RULES,
] as const;

// =========================================================================
// File Validation
// =========================================================================

export interface FileValidationResult {
  readonly domain: DomainId;
  readonly names: readonly NameCheckResult[];
  readonly valid: boolean;
  readonly errorCount: number;
}

export interface NameCheckResult {
  readonly name: string;
  readonly target: string;
  readonly result: ValidationResult;
}

/**
 * Validate an array of {name, target} pairs against a domain's structural rules.
 *
 * @param entries - Array of API names and their targets (e.g., "Entity (ObjectType) API name")
 * @param domain - Which domain's rules to validate against
 * @returns FileValidationResult with per-entry details
 */
export function validateOntologyFile(
  entries: readonly { name: string; target: string }[],
  domain: DomainId,
): FileValidationResult {
  const rules = DOMAIN_RULE_MAP[domain];
  const names: NameCheckResult[] = [];

  for (const entry of entries) {
    const result = validateApiName(entry.name, rules, entry.target);
    names.push({ name: entry.name, target: entry.target, result });
  }

  const errorCount = names.filter((n) => !n.result.valid).length;

  return {
    domain,
    names,
    valid: errorCount === 0,
    errorCount,
  };
}

/**
 * Validate entries against ALL domains' rules (cross-domain check).
 * Useful for detecting naming collisions across domain boundaries.
 */
export function validateAcrossDomains(
  entries: readonly { name: string; target: string }[],
): readonly FileValidationResult[] {
  const domains: DomainId[] = ["data", "logic", "action", "security"];
  return domains.map((d) => validateOntologyFile(entries, d));
}

/**
 * Get all unique targets across all domains.
 */
export function getAllTargets(): readonly string[] {
  return [...new Set(ALL_STRUCTURAL_RULES.map((r) => r.target))];
}

/**
 * Find which domain owns a given target string.
 * Returns undefined if no domain has rules for that target.
 */
export function findDomainForTarget(target: string): DomainId | undefined {
  for (const [domain, rules] of Object.entries(DOMAIN_RULE_MAP)) {
    if (rules.some((r) => r.target === target)) {
      return domain as DomainId;
    }
  }
  return undefined;
}
