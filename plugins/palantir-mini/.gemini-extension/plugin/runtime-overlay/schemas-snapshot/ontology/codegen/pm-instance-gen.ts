/**
 * Generator: pm-instance-wrapper (OSDK-2.0-Instance-Wrapper pattern)
 * Emits per-ObjectType Pm.Instance<T> wrappers with $link/$as/$clone namespace.
 * Input: OntologyData (entities + properties + links).
 * Output: single TS source string.
  * @owner palantirkc-ontology
 * @purpose Generator: pm-instance-wrapper (OSDK-2.0-Instance-Wrapper pattern)
 */

import { generatedFileHeader } from "./manifest";
import type { GeneratorId } from "./manifest";
import type { OntologyData, ObjectType, OntologyLogic, LinkType } from "../types";

// =========================================================================
// Link namespace emitter
// =========================================================================

/** Reverse a cardinality value for the target side of a link. */
function reverseCardinality(cardinality: LinkType["cardinality"]): LinkType["cardinality"] {
  switch (cardinality) {
    case "1:M": return "M:1";
    case "M:1": return "1:M";
    case "1:1": return "1:1";
    case "M:N": return "M:N";
  }
}

/**
 * Emit the $link namespace for an ObjectType.
 *
 * For each link where sourceEntity === objectApiName: emit forward binding.
 * For each link where targetEntity === objectApiName AND reverseApiName is set:
 *   emit reverse binding using reverseApiName + reversed cardinality.
 * If no links apply: emit Record<string, never> (backward compat).
 */
function emitLinkNamespace(objectApiName: string, links: readonly LinkType[]): string {
  const members: string[] = [];

  for (const link of links) {
    if (link.sourceEntity === objectApiName) {
      // Forward binding
      const memberLine = emitLinkMember(link.apiName, link.targetEntity, link.cardinality);
      members.push(memberLine);
    } else if (link.targetEntity === objectApiName && link.reverseApiName) {
      // Reverse binding with reversed cardinality
      const rev = reverseCardinality(link.cardinality);
      const memberLine = emitLinkMember(link.reverseApiName, link.sourceEntity, rev);
      members.push(memberLine);
    }
  }

  if (members.length === 0) {
    return `  readonly $link: Record<string, never>;`;
  }

  const body = members.map((m) => `    ${m}`).join("\n");
  return [`  readonly $link: {`, body, `  };`].join("\n");
}

/**
 * Emit a single $link member line.
 * "1:1" | "M:1" → single-target → () => Promise<Pm_<Target>_Instance | null>
 * "1:M" | "M:N" → collection  → { fetchPage; asyncIter }
 */
function emitLinkMember(
  memberName: string,
  targetEntity: string,
  cardinality: LinkType["cardinality"],
): string {
  const targetType = `Pm_${targetEntity}_Instance`;
  if (cardinality === "1:1" || cardinality === "M:1") {
    return `readonly ${memberName}: () => Promise<${targetType} | null>;`;
  } else {
    return (
      `readonly ${memberName}: {\n` +
      `      readonly fetchPage: (args?: { cursor?: string; pageSize?: number }) => Promise<${targetType}[]>;\n` +
      `      readonly asyncIter: () => AsyncIterable<${targetType}>;\n` +
      `    };`
    );
  }
}

// =========================================================================
// Per-ObjectType wrapper emitter
// =========================================================================

/**
 * Emit the Pm_<ObjectApiName>_Instance interface for one ObjectType.
 *
 * $link members are resolved from OntologyLogic.linkTypes via emitLinkNamespace.
 * Falls back to Record<string, never> when no links reference this ObjectType.
 */
function emitInstanceInterface(entity: ObjectType, links: readonly LinkType[]): string {
  const name = entity.apiName;
  const typeName = `Pm_${name}_Instance`;

  const propertyLines = entity.properties
    .map((p) => {
      const tsType = propertyBaseTypeToTs(p.baseType, p.isArray ?? false);
      const optional = p.required ? "" : "?";
      return `  readonly ${p.apiName}${optional}: ${tsType};`;
    })
    .join("\n");

  const linkBlock = emitLinkNamespace(name, links);

  return [
    `export interface ${typeName} {`,
    `  // ── Core identity ────────────────────────────────────────`,
    `  readonly $primaryKey: string;`,
    `  readonly $rid: string; // ObjectRid`,
    `  readonly $objectType: "${name}";`,
    ``,
    `  // ── Properties ───────────────────────────────────────────`,
    propertyLines,
    ``,
    `  // ── Link traversal ───────────────────────────────────────`,
    linkBlock,
    ``,
    `  // ── Interface projection ─────────────────────────────────`,
    `  // $as<I extends string>(interfaceRid: I): typed to interface — requires`,
    `  // OntologyInterface registry; emit generic overload for now.`,
    `  readonly $as: (interfaceRid: string) => unknown;`,
    ``,
    `  // ── Clone ────────────────────────────────────────────────`,
    `  readonly $clone: () => ${typeName};`,
    `}`,
  ].join("\n");
}

/**
 * Map BasePropertyType + isArray flag to a TypeScript type string.
 * Covers the 19 BasePropertyType members.
 */
function propertyBaseTypeToTs(baseType: string, isArray: boolean): string {
  let tsType: string;
  switch (baseType) {
    case "string":        tsType = "string"; break;
    case "integer":       tsType = "number"; break;
    case "long":          tsType = "number"; break;
    case "float":         tsType = "number"; break;
    case "double":        tsType = "number"; break;
    case "boolean":       tsType = "boolean"; break;
    case "date":          tsType = "string"; break; // ISO-8601 date string
    case "timestamp":     tsType = "string"; break; // ISO-8601 timestamp string
    case "geopoint":      tsType = "{ lat: number; lon: number }"; break;
    case "geoshape":      tsType = "unknown"; break; // GeoJSON shape
    case "attachment":    tsType = "{ rid: string; name?: string }"; break;
    case "mediaReference":tsType = "{ rid: string; mimeType?: string }"; break;
    case "timeseries":    tsType = "unknown"; break; // time series reference
    case "cipher":        tsType = "string"; break; // encrypted string
    case "struct":        tsType = "Record<string, unknown>"; break;
    case "vector":        tsType = "number[]"; break;
    case "marking":       tsType = "string"; break; // marking identifier
    case "FK":            tsType = "string"; break; // foreign key
    case "BrandedType":   tsType = "string"; break; // branded primitive
    default:              tsType = "unknown"; break;
  }
  return isArray ? `${tsType}[]` : tsType;
}

// =========================================================================
// Public generator export
// =========================================================================

export interface GeneratePmInstanceWrappersArgs {
  data: OntologyData;
  /** OntologyLogic — optional for backward compat; provides linkTypes for $link namespace. */
  logic?: OntologyLogic;
  /** Generator version — bumped independently of axis version. */
  generatorVersion?: string;
  /** Schema version string (e.g. "1.12.0"). */
  schemaVersion?: string;
  /** SHA-256 hash of the ontology input (or placeholder). */
  ontologyHash?: string;
  /** ISO-8601 timestamp string. */
  timestamp?: string;
}

/**
 * Generate a single TS source string containing Pm_<ObjectApiName>_Instance
 * interfaces for every ObjectType in OntologyData.
 *
 * The output is intended to be written to a generated file (e.g.
 * `src/generated/pm-instance-wrappers.generated.ts`) by pm-codegen.
 */
export function generatePmInstanceWrappers(
  args: GeneratePmInstanceWrappersArgs,
): string {
  const {
    data,
    logic,
    generatorVersion = "0.1.0",
    schemaVersion = "1.12.0",
    ontologyHash = "0000000000000000000000000000000000000000000000000000000000000000",
    timestamp = new Date().toISOString(),
  } = args;

  const header = generatedFileHeader({
    // Cast needed: "pm-instance-wrapper" is not yet registered in CODEGEN_MANIFEST.
    // TODO(manifest-registration): add this generator to manifest.ts (task #3).
    generatorId: "pm-instance-wrapper" as unknown as GeneratorId,
    generatorVersion,
    schemaVersion,
    ontologyHash,
    timestamp,
  });

  const linkTypes = logic?.linkTypes ?? [];
  const interfaceBlocks = data.objectTypes
    .map((entity) => emitInstanceInterface(entity, linkTypes))
    .join("\n\n");

  return [
    header,
    "// ── Pm.Instance wrappers ─────────────────────────────────────────────────",
    "// One interface per ObjectType. Import from this file to get typed",
    "// OSDK-2.0-style instance shapes with $primaryKey / $rid / $link / $as / $clone.",
    "",
    interfaceBlocks,
    "",
    "// ── Convenience re-export union ──────────────────────────────────────────",
    `export type PmAnyInstance =`,
    data.objectTypes
      .map((e, i) =>
        i === 0
          ? `  | Pm_${e.apiName}_Instance`
          : `  | Pm_${e.apiName}_Instance`,
      )
      .join("\n") + ";",
    "",
  ].join("\n");
}
