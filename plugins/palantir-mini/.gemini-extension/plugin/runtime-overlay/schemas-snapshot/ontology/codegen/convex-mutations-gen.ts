/**
 * Ontology → Convex Mutations Stub Generator
 *
 * Generates mutation STUBS from ontology/action.ts declarations.
 * Business logic is NOT generated — only:
 *   1. args validation (from parameters)
 *   2. requireRole() call (from reviewLevel)
 *   3. Table inserts/patches (from edits)
 *   4. // CUSTOM LOGIC markers for manual code
 *
 * ForwardPropagation:
 *   ontology/action.ts (SSoT) → convex/mutations.ts (stub scaffold)
  * @owner palantirkc-ontology
 * @purpose Ontology → Convex Mutations Stub Generator
 */

import type {
  OntologyAction,
  OntologyData,
  OntologyMutation,
  ObjectType,
  Parameter,
} from "../types";
import { deriveTableName } from "./type-mapping";

interface MutationStub {
  exportName: string;
  isInternal: boolean;
  argsCode: string;
  handlerBody: string;
  comment: string;
}

/**
 * Map ontology parameter type to Convex validator.
 */
function paramToValidator(param: Parameter, entities: readonly ObjectType[]): string {
  // Check if the type references an enum on a known entity
  const entity = entities.find((e) =>
    e.properties.some((p) => p.apiName === param.name),
  );
  if (entity) {
    const prop = entity.properties.find((p) => p.apiName === param.name);
    if (prop?.constraints) {
      const enumConstraint = prop.constraints.find((c) => c.kind === "enum");
      if (enumConstraint && enumConstraint.kind === "enum") {
        const union = enumConstraint.values
          .map((val) => `v.literal(${JSON.stringify(val)})`)
          .join(", ");
        return enumConstraint.values.length > 1 ? `v.union(${union})` : union;
      }
    }
  }

  // Simple type mapping
  switch (param.type) {
    case "string": return "v.string()";
    case "integer": return "v.number()";
    case "number": return "v.number()";
    case "double": return "v.number()";
    case "boolean": return "v.boolean()";
    default: return "v.string()";
  }
}

/**
 * Map reviewLevel to requireRole call.
 */
function reviewToRole(reviewLevel: string | undefined): string {
  switch (reviewLevel) {
    case "full-autonomy": return '"owner"';
    case "approve-then-act": return '"owner"';
    case "act-then-inform": return '"owner"';
    case "recommend": return '"owner"';
    case "monitor": return '"owner"';
    default: return '"owner"';
  }
}

/**
 * Generate handler body for a mutation stub.
 */
function buildHandler(
  mutation: OntologyMutation,
  entities: readonly ObjectType[],
): string {
  const lines: string[] = [];
  const role = reviewToRole(mutation.reviewLevel);

  // Role enforcement
  lines.push(`    requireRole(ctx, ${role});`);
  lines.push("");

  // OSDK 2.0: mutually-exclusive options guard
  lines.push(`    if (args.$validateOnly === true && args.$returnEdits === true) {`);
  lines.push(`      throw new Error("$validateOnly and $returnEdits are mutually exclusive");`);
  lines.push(`    }`);
  lines.push(`    if (args.$validateOnly === true) {`);
  lines.push(`      // run validation only; return { validationResult: "ok" | {errors} }`);
  lines.push(`      return { validateOnly: true, ok: true /* or error array from validator */ };`);
  lines.push(`    }`);
  lines.push(`    if (args.$returnEdits === true) {`);
  lines.push(`      // compute edits[] without committing; return { edits: [...] }`);
  lines.push(`      return { returnEdits: true, edits: [] /* computed but not applied */ };`);
  lines.push(`    }`);
  lines.push("");

  // Actor identity for audit
  if (mutation.sideEffects && mutation.sideEffects.length > 0) {
    lines.push(`    const actorIdentity = await getActorIdentity(ctx);`);
  }

  lines.push("");
  lines.push("    // ── CUSTOM LOGIC ──────────────────────────────────────");
  lines.push(`    // TODO: Implement ${mutation.apiName} business logic`);

  // Generate edit operations
  for (const edit of mutation.edits) {
    const entity = entities.find((e) => e.apiName === edit.target);
    const tableName = entity ? deriveTableName(entity.pluralName) : edit.target;

    lines.push("");

    switch (edit.type) {
      case "create":
        lines.push(`    // Create ${edit.target}`);
        lines.push(`    await ctx.db.insert("${tableName}", {`);
        if (edit.properties) {
          for (const prop of edit.properties) {
            lines.push(`      ${prop}: args.${prop}, // TODO: resolve value`);
          }
        }
        lines.push("    });");
        break;

      case "modify":
        lines.push(`    // Update ${edit.target}`);
        lines.push(`    // const existing = await ctx.db.query("${tableName}").withIndex(...).unique();`);
        lines.push(`    // if (existing) await ctx.db.patch(existing._id, { ... });`);
        break;

      case "delete":
        lines.push(`    // Delete ${edit.target}`);
        lines.push(`    // const docs = await ctx.db.query("${tableName}").withIndex(...).collect();`);
        lines.push(`    // for (const doc of docs) await ctx.db.delete(doc._id);`);
        break;

      case "addLink":
      case "removeLink":
        lines.push(`    // ${edit.type} on ${edit.target}`);
        break;
    }
  }

  // Validation function hints
  if (mutation.validationFns && mutation.validationFns.length > 0) {
    lines.push("");
    lines.push("    // ── VALIDATION (declared in ontology) ─────────────────");
    for (const fn of mutation.validationFns) {
      lines.push(`    // TODO: Implement ${fn}()`);
    }
  }

  lines.push("    // ── END CUSTOM LOGIC ──────────────────────────────────");

  return lines.join("\n");
}

function mutationToStub(
  mutation: OntologyMutation,
  entities: readonly ObjectType[],
): MutationStub {
  // Determine if internal
  const isInternal = mutation.reviewLevel === "monitor" ||
    mutation.apiName === "recordHookEvent" ||
    mutation.apiName === "recordRuntimeClosure";

  // Build args
  const argsLines: string[] = [];
  for (const param of mutation.parameters) {
    const validator = paramToValidator(param, entities);
    const wrapped = param.required === false ? `v.optional(${validator})` : validator;
    argsLines.push(`    ${param.name}: ${wrapped},`);
  }
  // OSDK 2.0 mutually-exclusive options
  argsLines.push(`    $validateOnly: v.optional(v.literal(true)),`);
  argsLines.push(`    $returnEdits:  v.optional(v.literal(true)),`);
  const argsCode = `  args: {\n${argsLines.join("\n")}\n  },`;

  // Build handler
  const handlerBody = buildHandler(mutation, entities);

  // Comment
  const desc = mutation.description;
  const comment = typeof desc === "object" && desc !== null
    ? (desc as { en?: string }).en ?? ""
    : String(desc ?? "");

  return {
    exportName: mutation.apiName,
    isInternal,
    argsCode,
    handlerBody,
    comment,
  };
}

function renderStub(stub: MutationStub): string {
  const mutationType = stub.isInternal ? "internalMutation" : "mutation";
  return [
    `/** ${stub.comment} */`,
    `export const ${stub.exportName} = ${mutationType}({`,
    stub.argsCode,
    "  handler: async (ctx, args) => {",
    stub.handlerBody,
    "  },",
    "});",
  ].join("\n");
}

export interface GenerateMutationsOptions {
  data: OntologyData;
  action: OntologyAction;
}

/**
 * Generate convex/mutations.ts stub file from ontology declarations.
 */
export function generateConvexMutations(opts: GenerateMutationsOptions): string {
  const stubs = opts.action.mutations.map((m) =>
    mutationToStub(m, opts.data.objectTypes),
  );

  const hasInternal = stubs.some((s) => s.isInternal);
  const body = stubs.map(renderStub).join("\n\n");

  return [
    "/**",
    " * palantir-math - Convex Mutations",
    " *",
    " * AUTO-GENERATED STUBS from ontology/action.ts",
    " * Sections marked // CUSTOM LOGIC are manually maintained.",
    " * Run: bun run ontology:gen",
    " */",
    "",
    'import { ConvexError } from "convex/values";',
    'import { v } from "convex/values";',
    `import { mutation${hasInternal ? ", internalMutation" : ""} } from "./_generated/server";`,
    hasInternal ? 'import { internal } from "./_generated/api";' : "",
    'import { getActorIdentity, requireRole } from "./model/requireRole";',
    "",
    body,
    "",
  ].filter(Boolean).join("\n");
}
