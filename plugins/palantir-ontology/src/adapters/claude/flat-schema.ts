// Flat-schema validator (ledger row A630, execution-plan.md §6.2, ADR-007):
// "public MCP input schemas must remain flat and must not use `anyOf`,
// `oneOf`, `allOf`, or `not`." R210 records Claude's own
// `schemaFlatLimits.officialRule` verdict as `unknown` — "No Claude-specific
// flat-schema or combinator restriction found in the targeted official
// MCP/plugin pages" (src/adapters/shared/capability-registry.json,
// `profiles.claude.capabilities.schemaFlatLimits`) — so this validator
// enforces the campaign's local, conservative generation policy
// (docs/architecture.md ADR-007 "Grounded evidence"), not a claimed
// official Claude requirement, the same posture A620 recorded for Codex's
// own `unknown` verdict on this same area. It is applied against every
// schema `src/adapters/claude/binding.generated.ts` actually ships (see
// `flat-schema.test.ts`), so drift is caught mechanically, not just
// hand-claimed.
//
// Colocated copy of the same logic src/adapters/codex/flat-schema.ts
// carries — never imported cross-adapter (boundary-check's
// registry-neutrality invariant: no file under src/adapters/** imports from
// a sibling adapter directory).

export const FORBIDDEN_SCHEMA_COMBINATOR_KEYS = ["anyOf", "oneOf", "allOf", "not"] as const;
export type ForbiddenSchemaCombinatorKey = (typeof FORBIDDEN_SCHEMA_COMBINATOR_KEYS)[number];

/**
 * Recursively finds every `anyOf`/`oneOf`/`allOf`/`not` key anywhere inside
 * `schema` (including nested `properties` values), returning a JSON-Pointer-
 * style path per violation. Empty result means the schema is flat.
 */
export function findSchemaCombinatorViolations(schema: unknown, path = "$"): string[] {
  if (schema === null || typeof schema !== "object") return [];

  if (Array.isArray(schema)) {
    const violations: string[] = [];
    schema.forEach((item, i) => violations.push(...findSchemaCombinatorViolations(item, `${path}[${i}]`)));
    return violations;
  }

  const obj = schema as Record<string, unknown>;
  const violations: string[] = [];
  for (const key of FORBIDDEN_SCHEMA_COMBINATOR_KEYS) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) violations.push(`${path}.${key}`);
  }
  for (const [key, value] of Object.entries(obj)) {
    violations.push(...findSchemaCombinatorViolations(value, `${path}.${key}`));
  }
  return violations;
}

/** True iff `schema` contains no `anyOf`/`oneOf`/`allOf`/`not` anywhere (top level or nested). */
export function isFlatMcpInputSchema(schema: unknown): boolean {
  return findSchemaCombinatorViolations(schema).length === 0;
}
