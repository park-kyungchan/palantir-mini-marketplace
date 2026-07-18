// Production runtime shape validator for the mutation-authority envelope
// (ledger row P430, ADR-005). This is the "envelope validation" half of
// P430's S1 deliverable and the FIRST check `commit-gate.ts` runs on any
// caller-presented envelope, before any minting-ledger lookup.
//
// Deliberately independent of `tests/support/schema-validate.ts`: that file
// is explicitly test-only infrastructure predating this one ("that is
// deterministic generator/checker territory owned by P340 (scripts/) and
// later src/governance/ (P430)" — its own header comment). Production code
// under `src/**` must not depend on anything under `tests/**`
// (`boundary:check`'s one-way-dependency spirit generalizes to this), so
// this module re-implements the same small JSON-Schema-subset engine
// (type/enum/required/properties/additionalProperties/items/minItems/
// minLength/maxLength/pattern/format:"date-time") against
// `contracts/mutation-authority.contract.json` read directly at runtime —
// the same "read the registry/contract file directly, no generated-index
// dependency" precedent `reason-codes.ts` and `fingerprint.ts` already set.

import schema from "../../contracts/mutation-authority.contract.json";

export interface EnvelopeValidationResult {
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

  if (Array.isArray(data)) {
    if (node.minItems !== undefined && data.length < node.minItems) {
      errors.push(`${path}: array length ${data.length} < minItems ${node.minItems}`);
    }
    if (node.items !== undefined) {
      data.forEach((item, i) => validateNode(node.items, item, `${path}[${i}]`, errors));
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
 * Structural (schema-shape) validation of a candidate envelope against
 * `contracts/mutation-authority.contract.json`. Does NOT check anything
 * about live state (fingerprint freshness, permission, scope, expiry,
 * nonce consumption, etc.) — those are `commit-gate.ts`'s job, run only
 * after this structural check passes.
 */
export function validateEnvelopeShape(value: unknown): EnvelopeValidationResult {
  const errors: string[] = [];
  validateNode(schema, value, "$", errors);
  return { valid: errors.length === 0, errors };
}
