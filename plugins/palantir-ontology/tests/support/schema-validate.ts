// Test-only minimal JSON Schema (draft 2020-12 subset) validator.
//
// This is NOT the production schema-validation library — that is deterministic
// generator/checker territory owned by P340 (scripts/) and later src/governance/
// (P430). This file exists solely so P330's contract tests can prove positive
// fixtures validate and negative fixtures are rejected, with zero new runtime
// dependencies (no network access assumed; no ajv or similar added to
// package.json). Supports exactly the keyword subset the eight
// contracts/*.contract.json schemas use: type, enum, const, required,
// properties, additionalProperties (boolean), items, minItems, minLength,
// maxLength, minimum, pattern, format:"date-time". No $ref (contracts are
// deliberately self-contained per ADR-004's independent-versioning
// rationale). `maxLength` added P410 (fde-session.contract.json's bounded
// turn-summary field) — additive, no prior schema declared it.

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const DATE_TIME_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function typeOf(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function validateNode(schema: any, data: unknown, path: string, errors: string[]): void {
  if (schema === undefined || schema === null) return;

  if (schema.const !== undefined) {
    if (JSON.stringify(data) !== JSON.stringify(schema.const)) {
      errors.push(`${path}: expected const ${JSON.stringify(schema.const)}, got ${JSON.stringify(data)}`);
      return;
    }
  }

  if (schema.enum !== undefined) {
    const allowed: unknown[] = schema.enum;
    if (!allowed.some((v) => JSON.stringify(v) === JSON.stringify(data))) {
      errors.push(`${path}: value ${JSON.stringify(data)} not in enum ${JSON.stringify(allowed)}`);
      return;
    }
  }

  if (schema.type !== undefined) {
    const expected: string[] = Array.isArray(schema.type) ? schema.type : [schema.type];
    const actual = typeOf(data);
    const actualOk =
      expected.includes(actual) ||
      (expected.includes("integer") && actual === "number" && Number.isInteger(data as number));
    if (!actualOk) {
      errors.push(`${path}: expected type ${expected.join("|")}, got ${actual}`);
      return;
    }
  }

  if (typeof data === "string") {
    if (schema.minLength !== undefined && data.length < schema.minLength) {
      errors.push(`${path}: string length ${data.length} < minLength ${schema.minLength}`);
    }
    if (schema.maxLength !== undefined && data.length > schema.maxLength) {
      errors.push(`${path}: string length ${data.length} > maxLength ${schema.maxLength}`);
    }
    if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(data)) {
      errors.push(`${path}: value ${JSON.stringify(data)} does not match pattern ${schema.pattern}`);
    }
    if (schema.format === "date-time" && !DATE_TIME_RE.test(data)) {
      errors.push(`${path}: value ${JSON.stringify(data)} is not a valid date-time`);
    }
  }

  if (typeof data === "number") {
    if (schema.minimum !== undefined && data < schema.minimum) {
      errors.push(`${path}: ${data} < minimum ${schema.minimum}`);
    }
  }

  if (Array.isArray(data)) {
    if (schema.minItems !== undefined && data.length < schema.minItems) {
      errors.push(`${path}: array length ${data.length} < minItems ${schema.minItems}`);
    }
    if (schema.items !== undefined) {
      data.forEach((item, i) => validateNode(schema.items, item, `${path}[${i}]`, errors));
    }
  }

  if (typeOf(data) === "object" && schema.type === "object") {
    const obj = data as Record<string, unknown>;
    const required: string[] = schema.required ?? [];
    for (const key of required) {
      if (!(key in obj)) {
        errors.push(`${path}: missing required field "${key}"`);
      }
    }
    const knownProps: Record<string, any> = schema.properties ?? {};
    for (const [key, val] of Object.entries(obj)) {
      if (knownProps[key] !== undefined) {
        validateNode(knownProps[key], val, `${path}.${key}`, errors);
      } else if (schema.additionalProperties === false) {
        errors.push(`${path}: unexpected additional property "${key}"`);
      }
    }
  }
}

export function validateContract(schema: any, data: unknown): ValidationResult {
  const errors: string[] = [];
  validateNode(schema, data, "$", errors);
  return { valid: errors.length === 0, errors };
}
