// Production runtime shape validator for the event-log envelope (ledger row
// P540, ADR-006), against `contracts/event-envelope.contract.json`. This is
// the structural (malformed-row) half of `event-reader.ts`'s read seam,
// run BEFORE the upcaster chain on every row.
//
// Deliberately independent of `tests/support/schema-validate.ts` (test-only
// infrastructure) and re-implements the same small JSON-Schema-subset
// engine `src/governance/envelope-validate.ts` (P430),
// `src/memory/second-brain-validate.ts` (P520), and
// `src/altitude2/binding-validate.ts` already establish as this codebase's
// production-validator precedent -- one hand-rolled copy per domain, reading
// its own contract file directly at runtime, no shared abstraction, no
// dependency on `tests/**` (`boundary:check`'s one-way-dependency spirit).

import schema from "../../contracts/event-envelope.contract.json";

export interface EventEnvelopeValidationResult {
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
    const actual = typeOf(data);
    const actualOk = expected.includes(actual) || (expected.includes("integer") && actual === "number" && Number.isInteger(data as number));
    if (!actualOk) {
      errors.push(`${path}: expected type ${expected.join("|")}, got ${actual}`);
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

  if (typeof data === "number") {
    if (node.minimum !== undefined && data < node.minimum) {
      errors.push(`${path}: ${data} < minimum ${node.minimum}`);
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
 * Structural (schema-shape) validation of a candidate raw event-log row
 * against `contracts/event-envelope.contract.json`. Does NOT check
 * `envelopeRev` compatibility (that is `upcaster-chain.ts`'s job, run only
 * after this structural check passes) -- a row can be shape-valid at an old
 * `envelopeRev` and still need upcasting.
 */
export function validateEventEnvelopeShape(value: unknown): EventEnvelopeValidationResult {
  const errors: string[] = [];
  validateNode(schema, value, "$", errors);
  return { valid: errors.length === 0, errors };
}
