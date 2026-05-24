/**
 * Ontology → Convex Type Mapping
 *
 * Deterministic mapping from BasePropertyType + ValueConstraint to Convex v.*() validators.
 * This is the core compilation bridge: ontology type declarations produce Convex schema code.
 *
 * Authority: ~/.claude/schemas/ontology/types.ts (BasePropertyType, ValueConstraint)
 * Target:    convex/values (v.string(), v.number(), v.boolean(), v.union(), v.optional(), etc.)
  * @owner palantirkc-ontology
 * @purpose Ontology → Convex Type Mapping
 */

import type { BasePropertyType, Property, ValueConstraint } from "../types";

/** Convex validator expression as a string (e.g. 'v.string()', 'v.optional(v.number())') */
export type ConvexValidatorExpr = string;

/**
 * Map a single BasePropertyType to its Convex validator expression.
 * This is the leaf-level mapping — modifiers (optional, enum) are applied separately.
 */
export function mapBaseType(baseType: BasePropertyType): ConvexValidatorExpr {
  switch (baseType) {
    case "string":         return "v.string()";
    case "integer":        return "v.number()";
    case "long":           return "v.number()";
    case "float":          return "v.number()";
    case "double":         return "v.number()";
    case "boolean":        return "v.boolean()";
    case "date":           return "v.string()";     // ISO 8601 date
    case "timestamp":      return "v.string()";     // ISO 8601 timestamp
    case "geopoint":       return "v.string()";     // JSON serialized
    case "geoshape":       return "v.string()";     // JSON serialized
    case "attachment":     return "v.string()";     // URL or reference
    case "mediaReference": return "v.string()";     // URL or reference
    case "timeseries":     return "v.string()";     // JSON serialized
    case "cipher":         return "v.string()";     // encrypted string
    case "struct":         return "v.string()";     // JSON serialized
    case "vector":         return "v.array(v.number())";
    case "marking":        return "v.string()";     // marking ID
    case "FK":             return "v.string()";     // foreign key as string
    case "BrandedType":    return "v.string()";     // branded → string at runtime
    default: {
      const _exhaustive: never = baseType;
      return "v.string()";
    }
  }
}

/**
 * Extract enum values from constraints, if any.
 * Returns null if no enum constraint is found.
 */
function extractEnumValues(constraints: readonly ValueConstraint[] | undefined): readonly string[] | null {
  if (!constraints) return null;
  const enumConstraint = constraints.find((c): c is Extract<ValueConstraint, { kind: "enum" }> => c.kind === "enum");
  return enumConstraint?.values ?? null;
}

/**
 * Build a Convex v.union(v.literal(...), ...) expression from enum values.
 */
function buildEnumUnion(values: readonly string[]): ConvexValidatorExpr {
  if (values.length === 0) return "v.string()";
  if (values.length === 1) return `v.literal(${JSON.stringify(values[0])})`;
  return `v.union(\n      ${values.map((val) => `v.literal(${JSON.stringify(val)})`).join(",\n      ")},\n    )`;
}

/**
 * Compile a single ontology Property into a Convex validator expression.
 * Handles: base type mapping, enum constraints, optional wrapping, array wrapping.
 */
export function compileProperty(prop: Property): ConvexValidatorExpr {
  const enumValues = extractEnumValues(prop.constraints);

  // Start with base type or enum union
  let expr: ConvexValidatorExpr;
  if (enumValues) {
    expr = buildEnumUnion(enumValues);
  } else if (prop.isArray) {
    expr = `v.array(${mapBaseType(prop.baseType)})`;
  } else {
    expr = mapBaseType(prop.baseType);
  }

  // Wrap in optional if not required
  if (!prop.required) {
    expr = `v.optional(${expr})`;
  }

  return expr;
}

/**
 * Derive Convex table name from entity pluralName.
 * "Math Problems" → "mathProblems"
 * "SeqEditRecords" → "seqEditRecords" (already camelCase)
 */
export function deriveTableName(pluralName: string): string {
  // Split on spaces, capitalize each word except first, join
  const words = pluralName.split(/\s+/);
  return words.map((word, i) => {
    const lower = word.charAt(0).toLowerCase() + word.slice(1);
    if (i === 0) return lower;
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join("");
}
