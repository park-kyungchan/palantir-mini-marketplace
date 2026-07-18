// Flat-schema validator (ledger row A640, execution-plan.md §6.2, ADR-007):
// "public MCP input schemas must remain flat and must not use `anyOf`,
// `oneOf`, `allOf`, or `not`." R210 records Gemini CLI's own
// `schemaFlatLimits.primary` verdict as `supported` — Gemini CLI's own
// discovery pipeline sanitizes discovered tool declarations (strips
// `$schema`/`additionalProperties`, strips `anyOf` defaults, restricts tool
// names) — but this validator still enforces the campaign's local,
// conservative generation policy (docs/architecture.md ADR-007 "Grounded
// evidence") uniformly across all 3 runtimes, the same posture A620/A630
// recorded for Codex/Claude's own (there, `unknown`) verdicts on this area.
// It is applied against every schema
// `src/adapters/gemini/binding.generated.ts` actually ships (see
// `flat-schema.test.ts`), so drift is caught mechanically, not just
// hand-claimed.
//
// Colocated copy of the same logic src/adapters/codex/flat-schema.ts and
// src/adapters/claude/flat-schema.ts carry — never imported cross-adapter
// (boundary-check's registry-neutrality invariant: no file under
// src/adapters/** imports from a sibling adapter directory).

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
