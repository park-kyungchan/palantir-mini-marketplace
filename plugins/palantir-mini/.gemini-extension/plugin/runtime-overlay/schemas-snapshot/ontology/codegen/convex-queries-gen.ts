/**
 * Ontology → Convex Queries Generator
 *
 * Compiles ontology/logic.ts OntologyQuery[] into convex/queries.ts exports.
 *
 * ForwardPropagation:
 *   ontology/logic.ts (SSoT) → convex/queries.ts (compiled artifact)
 *
 * Query patterns by queryType:
 *   getById  → .withIndex("by_{pk}").eq(pk, args.pk).unique()
 *   filter   → .withIndex("by_{fk}").eq(fk, args.fk).first()  or .collect()
 *   list     → .order("desc").take(100)
 *   search   → .withSearchIndex(...).search(...)
  * @owner palantirkc-ontology
 * @purpose Ontology → Convex Queries Generator
 */

import type { OntologyData, OntologyLogic, OntologyQuery, ObjectType } from "../types";
import { deriveTableName } from "./type-mapping";

interface QuerySpec {
  exportName: string;
  tableName: string;
  entityApiName: string;
  queryType: string;
  args: Array<{ name: string; validator: string; optional: boolean }>;
  handlerBody: string;
}

/**
 * Resolve the Convex table name for an entity.
 */
function resolveTableName(entityApiName: string, entities: readonly ObjectType[]): string {
  const entity = entities.find((e) => e.apiName === entityApiName);
  if (entity) return deriveTableName(entity.pluralName);
  // Fallback: camelCase the apiName + "s"
  const lower = entityApiName.charAt(0).toLowerCase() + entityApiName.slice(1);
  return lower + "s";
}

/**
 * Find the primary key property name for an entity.
 */
function resolvePrimaryKey(entityApiName: string, entities: readonly ObjectType[]): string {
  const entity = entities.find((e) => e.apiName === entityApiName);
  return entity?.primaryKey ?? "id";
}

/**
 * Infer the filter field from query apiName.
 * "getSolutionByProblem" → "problemId"
 * "getTeachingConfigByProblem" → "problemId"
 * "getLectureSteps" (filter by lectureId) → look at query parameters
 */
function inferFilterField(query: OntologyQuery, entities: readonly ObjectType[]): string {
  // Check if parameters provide the field
  if (query.parameters && query.parameters.length > 0) {
    const firstRequired = query.parameters.find((p) => p.required !== false);
    if (firstRequired) return firstRequired.name;
  }

  // Infer from name: "getXByY" → "yId"
  const byMatch = query.apiName.match(/By(\w+)$/);
  if (byMatch) {
    const suffix = byMatch[1];
    return suffix.charAt(0).toLowerCase() + suffix.slice(1) + "Id";
  }

  // Default to the entity's primary key
  return resolvePrimaryKey(query.entityApiName, entities);
}

/**
 * Build handler body based on queryType.
 */
function buildHandler(query: OntologyQuery, tableName: string, entities: readonly ObjectType[]): string {
  const pk = resolvePrimaryKey(query.entityApiName, entities);

  switch (query.queryType) {
    case "getById": {
      const field = query.parameters?.[0]?.name ?? pk;
      return [
        `    return await ctx.db`,
        `      .query("${tableName}")`,
        `      .withIndex("by_${field}", (q) => q.eq("${field}", args.${field}))`,
        `      .unique();`,
      ].join("\n");
    }

    case "filter": {
      const filterField = inferFilterField(query, entities);
      const resultMethod = query.apiName.startsWith("list") ? "take(100)" : "first()";
      const orderClause = query.apiName.startsWith("list") ? '\n      .order("desc")' : "";
      return [
        `    return await ctx.db`,
        `      .query("${tableName}")`,
        `      .withIndex("by_${filterField}", (q) => q.eq("${filterField}", args.${filterField}))${orderClause}`,
        `      .${resultMethod};`,
      ].join("\n");
    }

    case "list": {
      return [
        `    return await ctx.db`,
        `      .query("${tableName}")`,
        `      .order("desc")`,
        `      .take(100);`,
      ].join("\n");
    }

    default:
      return `    // TODO: Implement ${query.queryType} query pattern\n    throw new Error("Not implemented");`;
  }
}

/**
 * Build args declaration for a query.
 */
function buildArgs(query: OntologyQuery, entities: readonly ObjectType[]): QuerySpec["args"] {
  if (query.parameters && query.parameters.length > 0) {
    return query.parameters.map((p) => ({
      name: p.name,
      validator: "v.string()",  // Convex queries typically take string IDs
      optional: p.required === false,
    }));
  }

  // For getById: infer from entity PK
  if (query.queryType === "getById") {
    const pk = resolvePrimaryKey(query.entityApiName, entities);
    return [{ name: pk, validator: "v.string()", optional: false }];
  }

  // For filter: infer from name
  if (query.queryType === "filter") {
    const field = inferFilterField(query, entities);
    return [{ name: field, validator: "v.string()", optional: false }];
  }

  // For list: no args
  return [];
}

function queryToSpec(query: OntologyQuery, entities: readonly ObjectType[]): QuerySpec {
  const tableName = resolveTableName(query.entityApiName, entities);
  const args = buildArgs(query, entities);
  const handlerBody = buildHandler(query, tableName, entities);

  return {
    exportName: query.apiName,
    tableName,
    entityApiName: query.entityApiName,
    queryType: query.queryType,
    args,
    handlerBody,
  };
}

function renderQuery(spec: QuerySpec): string {
  const lines: string[] = [];

  lines.push(`export const ${spec.exportName} = query({`);

  // Args
  if (spec.args.length === 0) {
    lines.push("  args: {},");
  } else {
    lines.push("  args: {");
    for (const arg of spec.args) {
      const validator = arg.optional ? `v.optional(${arg.validator})` : arg.validator;
      lines.push(`    ${arg.name}: ${validator},`);
    }
    lines.push("  },");
  }

  // Handler
  lines.push("  handler: async (ctx, args) => {");
  lines.push(spec.handlerBody);
  lines.push("  },");
  lines.push("});");

  return lines.join("\n");
}

export interface GenerateQueriesOptions {
  data: OntologyData;
  logic: OntologyLogic;
}

/**
 * Generate the complete convex/queries.ts file content from ontology declarations.
 */
export function generateConvexQueries(opts: GenerateQueriesOptions): string {
  const specs = opts.logic.queries.map((q) => queryToSpec(q, opts.data.objectTypes));

  const body = specs.map(renderQuery).join("\n\n");

  return [
    "/**",
    " * palantir-math - Convex Queries",
    " *",
    " * AUTO-GENERATED from ontology/logic.ts",
    " * Do not edit manually. Run: bun run ontology:gen",
    " */",
    "",
    'import { v } from "convex/values";',
    'import { query } from "./_generated/server";',
    "",
    body,
    "",
  ].join("\n");
}
