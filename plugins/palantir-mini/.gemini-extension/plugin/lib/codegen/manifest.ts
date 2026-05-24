/**
 * palantir-mini v1 — Codegen deterministic header contract
 * @owner palantirkc-plugin-codegen
 * @purpose palantir-mini v1 — Codegen deterministic header contract
 */
// palantir-mini v1 — Codegen deterministic header contract
// Domain: LOGIC (prim-logic-08 ValidationPhaseEvaluator) + ACTION (prim-action-05 CodegenRun)
//
// Defines write/verify helpers for the deterministic codegen header block.
// Every generated file MUST start with this header for byte-identical regeneration checks.
//
// Header format:
//   // @generated {
//   //   schema: v1.0.0
//   //   ontology-hash: <sha256 of source ontology content>
//   //   generator: pm-codegen@<semver>
//   //   timestamp: <ISO 8601>
//   // }
//
// pm-verify Phase 4 (Post-Write) calls verifyCodegenHeader() to enforce this contract.
//
// Authority: research/palantir/validation/ → schemas/ontology/primitives/
//   → lib/validation/post-write.ts → lib/codegen/manifest.ts

import * as fs from "fs";
import * as path from "path";
import { createHash } from "crypto";

export const CODEGEN_GENERATOR_VERSION = "pm-codegen@1.0.0";
export const CODEGEN_SCHEMA_VERSION    = "v1.0.0";

export interface CodegenHeaderParams {
  schemaVersion:  string;
  ontologyHash:   string;
  generatorVersion: string;
  timestamp:      string;
}

export interface CodegenHeaderVerifyResult {
  file:    string;
  valid:   boolean;
  reason?: string;
  header?: CodegenHeaderParams;
}

/** Build the deterministic header comment block. */
export function buildCodegenHeader(params: CodegenHeaderParams): string {
  return [
    "// @generated {",
    `//   schema: ${params.schemaVersion}`,
    `//   ontology-hash: ${params.ontologyHash}`,
    `//   generator: ${params.generatorVersion}`,
    `//   timestamp: ${params.timestamp}`,
    "// }",
    "",
  ].join("\n");
}

/** Prepend the deterministic header to generated file content. */
export function writeCodegenHeader(content: string, params: Omit<CodegenHeaderParams, "timestamp"> & { timestamp?: string }): string {
  const fullParams: CodegenHeaderParams = {
    ...params,
    timestamp: params.timestamp ?? new Date().toISOString(),
  };
  return buildCodegenHeader(fullParams) + content;
}

/** Parse the deterministic header from a source string. Returns null if not present. */
export function parseCodegenHeader(source: string): CodegenHeaderParams | null {
  const lines = source.split("\n");
  if (!lines[0]?.startsWith("// @generated {")) return null;

  const header: Partial<CodegenHeaderParams> = {};
  for (const line of lines.slice(1)) {
    if (line.trimStart().startsWith("// }")) break;
    const stripped = line.replace(/^\/\/\s*/, "").trim();
    if (stripped.startsWith("schema: "))          header.schemaVersion    = stripped.slice("schema: ".length);
    if (stripped.startsWith("ontology-hash: "))    header.ontologyHash     = stripped.slice("ontology-hash: ".length);
    if (stripped.startsWith("generator: "))        header.generatorVersion = stripped.slice("generator: ".length);
    if (stripped.startsWith("timestamp: "))        header.timestamp        = stripped.slice("timestamp: ".length);
  }

  if (header.schemaVersion && header.ontologyHash && header.generatorVersion && header.timestamp) {
    return header as CodegenHeaderParams;
  }
  return null;
}

/** Compute SHA-256 of a string (hex). Used for ontologyHash in headers. */
export function computeOntologyHash(ontologySource: string): string {
  return createHash("sha256").update(ontologySource, "utf8").digest("hex");
}

/** Compute the combined ontology hash from a directory of .ts files. */
export function computeOntologyHashFromDir(dir: string): string {
  if (!fs.existsSync(dir)) return "no-ontology";
  const files: string[] = [];
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile() && full.endsWith(".ts")) files.push(full);
    }
  }
  files.sort(); // deterministic ordering
  const combined = files.map((f) => fs.readFileSync(f, "utf8")).join("\n");
  return computeOntologyHash(combined);
}

/**
 * Verify codegen headers on all .ts files under a directory.
 * Returns one result per file found.
 */
export function verifyCodegenHeader(generatedRoot: string): CodegenHeaderVerifyResult[] {
  if (!fs.existsSync(generatedRoot)) return [];

  const results: CodegenHeaderVerifyResult[] = [];
  const stack = [generatedRoot];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { stack.push(full); continue; }
      if (!entry.isFile() || !full.endsWith(".ts")) continue;

      try {
        const source = fs.readFileSync(full, "utf8");
        const header = parseCodegenHeader(source);
        if (!header) {
          results.push({ file: full, valid: false, reason: "missing @generated header block" });
          continue;
        }
        // Validate header fields are non-empty
        if (!header.schemaVersion)    { results.push({ file: full, valid: false, reason: "header missing schema version",    header }); continue; }
        if (!header.ontologyHash)     { results.push({ file: full, valid: false, reason: "header missing ontology-hash",     header }); continue; }
        if (!header.generatorVersion) { results.push({ file: full, valid: false, reason: "header missing generator version", header }); continue; }
        if (!header.timestamp)        { results.push({ file: full, valid: false, reason: "header missing timestamp",         header }); continue; }
        results.push({ file: full, valid: true, header });
      } catch (e) {
        results.push({ file: full, valid: false, reason: `read error: ${(e as Error).message}` });
      }
    }
  }
  return results;
}
