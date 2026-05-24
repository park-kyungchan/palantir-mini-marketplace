/**
 * Ontology → Typed Function Contracts Generator
 *
 * Compiles ontology/logic.ts OntologyFunction[] into typed Function-interface
 * contracts. Emits a declaration file surface — not Convex runtime code.
 *
 * ForwardPropagation:
 *   ontology/logic.ts (SSoT) → src/generated/typed-functions.generated.ts
 *
 * Each OntologyFunction produces:
 *   - <ApiName>Spec interface — structural contract for the function
 *   - declare const <ApiName> — typed reference to the implementation
  * @owner palantirkc-ontology
 * @purpose Ontology → Typed Function Contracts Generator
 */

import type { OntologyData, OntologyLogic, OntologyFunction } from "../types";
import type { GeneratorId } from "./manifest";
import { generatedFileHeader } from "./manifest";

// =========================================================================
// TS Type Mapping
// =========================================================================

/**
 * Map an ontology parameter/return type string to a TypeScript type string.
 * Parameter.type is a plain string — covers BasePropertyType members plus
 * common ontology shorthands used in logic declarations.
 */
function mapToTsType(ontologyType: string): string {
  switch (ontologyType) {
    case "string":         return "string";
    case "integer":
    case "long":
    case "float":
    case "double":
    case "number":         return "number";
    case "boolean":        return "boolean";
    case "date":           return "string";        // ISO 8601 date string
    case "timestamp":      return "string";        // ISO 8601 timestamp string
    case "geopoint":       return "string";        // JSON-serialised GeoPoint
    case "geoshape":       return "string";        // JSON-serialised GeoShape
    case "attachment":     return "string";        // URL or reference
    case "mediaReference": return "string";        // URL or reference
    case "timeseries":     return "string";        // JSON-serialised timeseries
    case "cipher":         return "string";        // encrypted string
    case "struct":         return "Record<string, unknown>";
    case "vector":         return "number[]";
    case "marking":        return "string";        // marking ID
    case "FK":             return "string";        // foreign key
    case "BrandedType":    return "string";        // branded → string at TS level
    case "void":           return "void";
    case "unknown":        return "unknown";
    default:
      // Treat unknown types as opaque string (safe fallback)
      return "string";
  }
}

// =========================================================================
// Spec Rendering
// =========================================================================

/**
 * Render the params block for a <ApiName>Spec interface.
 * Each parameter becomes a readonly property at the appropriate TS type.
 * Optional parameters (required === false) are emitted with `?`.
 */
function renderParamsBlock(fn: OntologyFunction): string {
  if (fn.parameters.length === 0) {
    return "    readonly params: Record<string, never>;";
  }

  const lines: string[] = ["    readonly params: {"];
  for (const param of fn.parameters) {
    const tsType = mapToTsType(param.type);
    const optional = param.required === false ? "?" : "";
    lines.push(`      readonly ${param.name}${optional}: ${tsType};`);
  }
  lines.push("    };");
  return lines.join("\n");
}

/**
 * Render a single OntologyFunction as a pair of declarations:
 *   - export interface <ApiName>Spec { ... }
 *   - export declare const <ApiName>: <ApiName>Spec;
 */
function renderFunction(fn: OntologyFunction): string {
  const specName = `${fn.apiName}Spec`;
  const returnTs = mapToTsType(fn.returnType);
  // toolExposure is declared as boolean in OntologyFunction (optional, defaults false).
  // Narrow the emitted TS type: if the ontology pins it true, emit literal `true`; otherwise `boolean`.
  const toolExposureTsType = fn.toolExposure === true ? "true" : "boolean";

  const lines: string[] = [];

  lines.push(`export interface ${specName} {`);
  lines.push(`  readonly apiName: string;`);
  lines.push(renderParamsBlock(fn));
  lines.push(`  readonly returns: ${returnTs};`);
  lines.push(`  readonly toolExposure: ${toolExposureTsType};`);

  if (fn.functionVersion !== undefined) {
    lines.push(`  readonly functionVersion?: string;`);
  }

  lines.push(`}`);
  lines.push(`export declare const ${fn.apiName}: ${specName};`);

  return lines.join("\n");
}

// =========================================================================
// Public API
// =========================================================================

export interface GenerateTypedFunctionsArgs {
  data: OntologyData;
  logic: OntologyLogic;
}

/**
 * Generate the complete typed-functions contract file content from ontology
 * logic declarations.
 *
 * Returns a TypeScript source string intended for:
 *   src/generated/typed-functions.generated.ts
 */
export function generateTypedFunctions(args: GenerateTypedFunctionsArgs): string {
  const { logic } = args;

  const header = generatedFileHeader({
    generatorId: "typed-functions" as GeneratorId,
    generatorVersion: "1.0.0",
    schemaVersion: "1.13.1",
    ontologyHash: "unknown",
    timestamp: new Date().toISOString(),
  });

  if (logic.functions.length === 0) {
    return [
      header,
      "// No functions declared in ontology logic.",
      "",
    ].join("\n");
  }

  const body = logic.functions.map(renderFunction).join("\n\n");

  return [
    header,
    body,
    "",
  ].join("\n");
}
