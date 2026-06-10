// palantir-mini v1 — MCP tool handler: ontology_schema_get
// Domain: DATA (prim-data-02 ObjectType registry lookup)
//
// Retrieves the canonical schema snapshot for a primitive RID.
// Looks up the primitive file in the plugin-owned schemas snapshot by default
// (or plugin-owned shared-core index for shared-core re-exports).
//
// Authority: research/palantir/data/ → schemas/ontology/primitives/
//   → home-ontology/shared-core → per-project ontology/

import * as fs from "fs";
import * as path from "path";
import { resolveSchemaPath } from "../../lib/runtime-overlay/schema-resolve";
import { resolveSharedCorePath } from "../../lib/runtime-overlay/shared-core-resolve";

interface OntologySchemaGetArgs {
  /** Primitive RID, e.g. "StructDeclaration" or "capability-token" */
  primitiveRid: string;
  /** Optional explicit schema root; defaults to palantir-mini runtime-overlay/schemas-snapshot */
  schemaRoot?: string;
}

interface OntologySchemaGetResult {
  primitiveRid:  string;
  found:         boolean;
  filePath?:     string;
  source?:       string;
  generatedAt:   string;
}

export default async function ontologySchemaGet(rawArgs: unknown): Promise<OntologySchemaGetResult> {
  const args = (rawArgs ?? {}) as OntologySchemaGetArgs;
  if (!args.primitiveRid || typeof args.primitiveRid !== "string") {
    throw new Error("ontology_schema_get: `primitiveRid` is required");
  }

  const schemaRoot = args.schemaRoot ?? (await resolveSchemaPath()).resolvedPath;
  const sharedCoreRoot = resolveSharedCorePath().resolvedPath;
  const primitivesDir = path.join(schemaRoot, "ontology", "primitives");
  const selfDir = path.join(schemaRoot, "ontology", "self");

  // Normalize: e.g. "CapabilityToken" → "capability-token", "capability-token" → "capability-token"
  const normalized = args.primitiveRid
    .replace(/([A-Z])/g, (m, c, i) => (i === 0 ? c.toLowerCase() : "-" + c.toLowerCase()))
    .replace(/^-/, "");

  const candidates = [
    { filePath: path.join(primitivesDir, `${normalized}.ts`), mustMention: null },
    { filePath: path.join(primitivesDir, `${args.primitiveRid}.ts`), mustMention: null },
    { filePath: path.join(selfDir, `${normalized}.objecttype.ts`), mustMention: null },
    { filePath: path.join(selfDir, `${normalized}.ts`), mustMention: null },
    { filePath: path.join(selfDir, `${normalized}.actiontype.ts`), mustMention: null },
    { filePath: path.join(sharedCoreRoot, `${normalized}.ts`), mustMention: null },
    { filePath: path.join(sharedCoreRoot, "index.ts"), mustMention: normalized },
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate.filePath)) {
      const source = fs.readFileSync(candidate.filePath, "utf8");
      if (candidate.mustMention !== null && !source.includes(candidate.mustMention)) {
        continue;
      }
      return {
        primitiveRid: args.primitiveRid,
        found:  true,
        filePath: candidate.filePath,
        source,
        generatedAt: new Date().toISOString(),
      };
    }
  }

  return {
    primitiveRid: args.primitiveRid,
    found:  false,
    generatedAt: new Date().toISOString(),
  };
}
