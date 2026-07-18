// Production runtime shape validator for the ontology-binding record
// (ledger row P440). Mirrors `src/governance/envelope-validate.ts`'s exact
// design: independent of `tests/support/schema-validate.ts` (production
// code under `src/**` must not depend on `tests/**`), re-implementing the
// same small JSON-Schema-subset engine against
// `contracts/ontology-binding.contract.json` read directly at runtime — the
// same "read the contract file directly, no generated-index dependency"
// precedent `reason-codes.ts`/`fingerprint.ts`/`envelope-validate.ts`
// already set. This is the FIRST check `consumer-binding.ts` runs on any
// caller-presented binding request, before any consumer-resolution lookup.

import schema from "../../contracts/ontology-binding.contract.json";

export interface BindingValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

const DATE_TIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function typeOf(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function validateNode(node: any, data: unknown, path: string, errors: string[]): void {
  if (node === undefined || node === null) return;

  if (node.enum !== undefined) {
    const allowed: unknown[] = node.enum;
    if (!allowed.some((v) => JSON.stringify(v) === JSON.stringify(data))) {
      errors.push(`${path}: value ${JSON.stringify(data)} not in enum ${JSON.stringify(allowed)}`);
      return;
    }
  }

  if (node.type !== undefined) {
    const expected: string[] = Array.isArray(node.type) ? node.type : [node.type];
    if (!expected.includes(typeOf(data))) {
      errors.push(`${path}: expected type ${expected.join("|")}, got ${typeOf(data)}`);
      return;
    }
  }

  if (typeof data === "string") {
    if (node.minLength !== undefined && data.length < node.minLength) {
      errors.push(`${path}: string length ${data.length} < minLength ${node.minLength}`);
    }
    if (node.pattern !== undefined && !new RegExp(node.pattern).test(data)) {
      errors.push(`${path}: value ${JSON.stringify(data)} does not match pattern ${node.pattern}`);
    }
    if (node.format === "date-time" && !DATE_TIME_RE.test(data)) {
      errors.push(`${path}: value ${JSON.stringify(data)} is not a valid date-time`);
    }
  }

  if (typeOf(data) === "object" && node.type === "object") {
    const obj = data as Record<string, unknown>;
    const required: string[] = node.required ?? [];
    for (const key of required) {
      if (!(key in obj)) {
        errors.push(`${path}: missing required field "${key}"`);
      }
    }
    const knownProps: Record<string, any> = node.properties ?? {};
    for (const [key, val] of Object.entries(obj)) {
      if (knownProps[key] !== undefined) {
        validateNode(knownProps[key], val, `${path}.${key}`, errors);
      } else if (node.additionalProperties === false) {
        errors.push(`${path}: unexpected additional property "${key}"`);
      }
    }
  }
}

/**
 * Structural (schema-shape) validation of a candidate binding against
 * `contracts/ontology-binding.contract.json`. Does NOT check anything about
 * live state (whether the consumer project actually resolves) — that is
 * `consumer-binding.ts`'s job, run only after this structural check passes.
 */
export function validateBindingShape(value: unknown): BindingValidationResult {
  const errors: string[] = [];
  validateNode(schema, value, "$", errors);
  return { valid: errors.length === 0, errors };
}
