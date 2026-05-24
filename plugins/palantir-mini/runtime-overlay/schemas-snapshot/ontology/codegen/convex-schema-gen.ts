/**
 * Ontology → Convex Schema Generator
 *
 * Compiles ontology/data.ts ObjectTypes + runtime.ts supportBindings
 * into a complete convex/schema.ts file.
 *
 * This is the ForwardPropagation bridge:
 *   ontology/data.ts (SSoT) → convex/schema.ts (compiled artifact)
 *
 * Authority chain:
 *   types.ts (ObjectType, Property) → type-mapping.ts → this file → convex/schema.ts
  * @owner palantirkc-ontology
 * @purpose Ontology → Convex Schema Generator
 */

import type {
  ObjectType,
  OntologyData,
  RuntimeOntology,
  RuntimeSupportBinding,
} from "../types";
import { compileProperty, deriveTableName } from "./type-mapping";

interface TableSpec {
  tableName: string;
  fields: Array<{ name: string; validator: string; comment?: string }>;
  indexes: Array<{ name: string; fields: string[] }>;
  source: "entity" | "support";
  entityApiName: string;
}

/**
 * Build TableSpec from an ontology ObjectType.
 */
function entityToTableSpec(entity: ObjectType): TableSpec {
  const tableName = deriveTableName(entity.pluralName);
  const fields: TableSpec["fields"] = [];
  const indexes: Array<{ name: string; fields: string[] }> = [];

  for (const prop of entity.properties) {
    // Skip readonly computed fields ONLY if they are derived/computed.
    // Readonly with required=true means "write-once at creation" — must be persisted.
    // Exempt: primaryKey, FK fields, and required readonly fields (DL 5D, identity, etc.)
    if (prop.readonly && !prop.required && prop.apiName !== entity.primaryKey && prop.baseType !== "FK") continue;

    fields.push({
      name: prop.apiName,
      validator: compileProperty(prop),
      comment: prop.description?.en,
    });
  }

  // Primary key index
  indexes.push({
    name: `by_${entity.primaryKey}`,
    fields: [entity.primaryKey],
  });

  // FK indexes: any property with baseType "FK" or targetEntity
  for (const prop of entity.properties) {
    if (prop.baseType === "FK" || prop.targetEntity) {
      const indexName = `by_${prop.apiName}`;
      if (!indexes.some((idx) => idx.name === indexName)) {
        indexes.push({ name: indexName, fields: [prop.apiName] });
      }
    }
  }

  // indexCandidate properties
  for (const candidate of entity.indexCandidates ?? []) {
    const indexName = `by_${candidate}`;
    if (!indexes.some((idx) => idx.name === indexName)) {
      indexes.push({ name: indexName, fields: [candidate] });
    }
  }

  return { tableName, fields, indexes, source: "entity", entityApiName: entity.apiName };
}

/**
 * Build TableSpec from a runtime support binding (kind="table").
 *
 * Support tables have schemas defined by their mutations, NOT by their
 * entityApiName. The entityApiName only indicates semantic ownership
 * (e.g., seqDataStore is "owned by" MathVisualization but stores
 * different data). Inheriting the entity's properties is WRONG.
 *
 * These tables are marked source="support" so the schema generator
 * emits a MANUAL marker. Their schemas must be maintained by hand
 * in convex/schema.ts after codegen runs.
 */
function supportToTableSpec(
  binding: RuntimeSupportBinding,
  _entities: readonly ObjectType[],
): TableSpec | null {
  if (binding.kind !== "table") return null;

  // Derive table name from adapterRef: "convex.schema.seqDataStore" → "seqDataStore"
  const adapterParts = binding.adapterRef.split(".");
  const tableName = adapterParts[adapterParts.length - 1];

  // Do NOT inherit entity schema. Support tables have mutation-defined schemas.
  return {
    tableName,
    fields: [],
    indexes: [],
    source: "support",
    entityApiName: binding.entityApiName ?? tableName,
  };
}

/**
 * Render a single table definition as TypeScript code.
 * Support tables with no fields emit a MANUAL marker comment.
 */
function renderTable(spec: TableSpec): string {
  // Support tables with no generated fields → MANUAL marker
  if (spec.source === "support" && spec.fields.length === 0) {
    return [
      `  // MANUAL: ${spec.tableName} — runtime support table. Schema defined by mutations, not entity.`,
      `  // Maintain this table definition by hand. See convex/mutations.ts for actual field usage.`,
    ].join("\n");
  }

  const lines: string[] = [];

  // Table definition
  lines.push(`  ${spec.tableName}: defineTable({`);
  for (const field of spec.fields) {
    const commentSuffix = field.comment ? ` // ${field.comment}` : "";
    lines.push(`    ${field.name}: ${field.validator},${commentSuffix}`);
  }
  lines.push("  })");

  // Indexes
  for (const idx of spec.indexes) {
    lines.push(`    .index("${idx.name}", [${idx.fields.map((f) => JSON.stringify(f)).join(", ")}])`);
  }

  // Close with comma
  const last = lines[lines.length - 1];
  lines[lines.length - 1] = last + ",";

  return lines.join("\n");
}

/**
 * Group tables by semantic domain for readable output.
 */
function groupByDomain(specs: TableSpec[]): Map<string, TableSpec[]> {
  const groups = new Map<string, TableSpec[]>();

  for (const spec of specs) {
    // Simple heuristic: group by entity name prefix or default to "Other"
    let domain = "Other";
    const name = spec.entityApiName;
    if (name.startsWith("Math") || name === "MathProblem" || name === "MathSolution") domain = "Math Domain";
    else if (["TeachingConfig", "TeachingScenario"].includes(name)) domain = "Teaching Domain";
    else if (["HookEvent", "AuditLog"].includes(name)) domain = "Decision Lineage Domain";
    else if (["EvaluationRecord", "OutcomeRecord", "AccuracyScore"].includes(name)) domain = "LEARN Domain";
    else if (spec.source === "support") domain = "Runtime Support";

    const list = groups.get(domain) ?? [];
    list.push(spec);
    groups.set(domain, list);
  }

  return groups;
}

export interface GenerateSchemaOptions {
  data: OntologyData;
  runtime?: RuntimeOntology;
}

/**
 * Generate the complete convex/schema.ts file content from ontology declarations.
 */
export function generateConvexSchema(opts: GenerateSchemaOptions): string {
  const specs: TableSpec[] = [];

  // 1. Entity tables from ontology/data.ts
  for (const entity of opts.data.objectTypes) {
    specs.push(entityToTableSpec(entity));
  }

  // 2. Support tables from ontology/runtime.ts
  if (opts.runtime?.supportBindings) {
    for (const binding of opts.runtime.supportBindings) {
      const supportSpec = supportToTableSpec(binding, opts.data.objectTypes);
      if (supportSpec && !specs.some((s) => s.tableName === supportSpec.tableName)) {
        specs.push(supportSpec);
      }
    }
  }

  // 3. Group and render
  const groups = groupByDomain(specs);
  const sections: string[] = [];

  for (const [domain, tables] of groups) {
    sections.push(`  // --- ${domain} ${"─".repeat(Math.max(0, 50 - domain.length))}`);
    sections.push("");
    for (const table of tables) {
      sections.push(renderTable(table));
      sections.push("");
    }
  }

  // 4. Compose final file
  return [
    "/**",
    " * palantir-math - Convex Schema",
    " *",
    " * AUTO-GENERATED from ontology/data.ts + ontology/runtime.ts",
    " * Do not edit manually. Run: bun run ontology:gen",
    " */",
    "",
    'import { defineSchema, defineTable } from "convex/server";',
    'import { v } from "convex/values";',
    "",
    "export default defineSchema({",
    sections.join("\n"),
    "});",
    "",
  ].join("\n");
}
