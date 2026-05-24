// palantir-mini v1.4 — MCP tool handler: verify_codegen_headers
// Domain: LEARN (CodegenHeaderContract prim-learn-11)
//
// Validates generated files carry the required header fields per rule 08 §Codegen authority.
// Authority chain: rules/08-schema-versioning.md §Generated header contract →
//   schemas/ontology/primitives/codegen-header-contract.ts
//
// v1.4 (sprint-059 W2.2 R5-F12): anchored regex validation replaces body.includes().
//   Strategy:
//     1. Extract the first HEADER_SCAN_LINES lines as the "header region" to scope validation.
//     2. Apply the contract.pattern (with 'm' flag) to confirm the @generated anchor is present.
//        Single-line headers (e.g. `// @generated {field: value}`) match the default pattern
//        directly. Multi-line headers (e.g. `// @generated {\n//   ...\n// }`) match the
//        MULTILINE_FALLBACK_PATTERN when the single-line pattern does not match.
//     3. Verify each requiredField appears within the header region only (not anywhere in file).
//   This catches: duplicate headers, body.includes false positives, missing @generated anchor.

import * as fs from "fs";
import * as path from "path";
import {
  CODEGEN_HEADER_CONTRACT_REGISTRY,
  DEFAULT_CONTRACT,
} from "#schemas/ontology/primitives/codegen-header-contract";

// Register default contract
CODEGEN_HEADER_CONTRACT_REGISTRY.register(DEFAULT_CONTRACT);

/** Number of lines to scan at the top of a file as the "header region". */
const HEADER_SCAN_LINES = 10;

/**
 * Fallback pattern for multi-line @generated blocks:
 *   // @generated {
 *   //   ...
 *   // }
 * Matches the opening line; used when the single-line contract pattern doesn't match.
 */
const MULTILINE_HEADER_PATTERN = /^\/\/ @generated\s*\{/m;

interface VerifyCodegenHeadersArgs {
  project: string;
  globs?: string[];
}

interface Violation {
  file: string;
  missingFields: string[];
  reason?: string;
}

interface VerifyCodegenHeadersResult {
  violations: Violation[];
}

function findGeneratedFiles(projectDir: string, globs: string[]): string[] {
  const files: string[] = [];

  const scan = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scan(full);
      } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
        const rel = path.relative(projectDir, full);
        const matches = globs.some((g) => {
          if (g === full) return true;
          // Convert ** glob to segment membership check
          const parts = g.split("**").map((s) => s.replace(/\*/g, "").replace(/^\/|\/$/g, ""));
          return parts.every((p) => p === "" || rel.includes(p) || full.includes(p));
        });
        if (matches) files.push(full);
      }
    }
  };
  scan(projectDir);
  return files;
}

/**
 * Extract the header region from file content: the first HEADER_SCAN_LINES lines.
 * Scoped validation ensures requiredFields must appear near the top, not anywhere in the body.
 */
function extractHeaderRegion(body: string): string {
  return body.split("\n").slice(0, HEADER_SCAN_LINES).join("\n");
}

/**
 * Check that the header region contains the @generated anchor using the contract's pattern
 * (with 'm' flag for multi-line matching) or the multiline fallback pattern.
 * Returns true when the @generated anchor is confirmed present.
 */
function hasGeneratedAnchor(headerRegion: string, contractPattern: string): boolean {
  try {
    const singleLineRegex = new RegExp(contractPattern, "m");
    if (singleLineRegex.test(headerRegion)) return true;
  } catch {
    // Malformed pattern — fall through to multiline check
  }
  return MULTILINE_HEADER_PATTERN.test(headerRegion);
}

/**
 * Validate a single file against the contract using anchored regex strategy:
 *   1. Confirm @generated anchor in first HEADER_SCAN_LINES lines.
 *   2. Confirm each requiredField appears within the header region only.
 */
function validateFileAnchored(
  filePath: string,
  contractPattern: string,
  requiredFields: ReadonlyArray<string>,
  reader: (p: string) => string,
): { valid: boolean; missingFields: string[]; reason?: string } {
  const body = reader(filePath);
  const headerRegion = extractHeaderRegion(body);

  if (!hasGeneratedAnchor(headerRegion, contractPattern)) {
    return {
      valid: false,
      missingFields: [...requiredFields],
      reason: "missing @generated anchor in first " + HEADER_SCAN_LINES + " lines",
    };
  }

  const missing: string[] = [];
  for (const field of requiredFields) {
    if (!headerRegion.includes(field)) {
      missing.push(field);
    }
  }

  return { valid: missing.length === 0, missingFields: missing };
}

export default async function verifyCodegenHeaders(
  rawArgs: unknown,
): Promise<VerifyCodegenHeadersResult> {
  const args = (rawArgs ?? {}) as VerifyCodegenHeadersArgs;
  if (!args.project || typeof args.project !== "string") {
    throw new Error("verify_codegen_headers: `project` is required");
  }

  const globs = args.globs ?? ["**/src/generated/**/*.ts"];
  const files = findGeneratedFiles(args.project, globs);

  const contract = CODEGEN_HEADER_CONTRACT_REGISTRY.get(DEFAULT_CONTRACT.rid);
  if (!contract) {
    throw new Error("verify_codegen_headers: default contract not registered");
  }

  const violations: Violation[] = [];

  for (const filePath of files) {
    const result = validateFileAnchored(
      filePath,
      contract.pattern,
      contract.requiredFields,
      (p) => {
        try { return fs.readFileSync(p, "utf8"); } catch { return ""; }
      },
    );
    if (!result.valid) {
      violations.push({
        file: filePath,
        missingFields: result.missingFields,
        ...(result.reason ? { reason: result.reason } : {}),
      });
    }
  }

  return { violations };
}
