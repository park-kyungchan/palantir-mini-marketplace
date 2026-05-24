// palantir-mini v3.3.0 — pm-plugin-self-check codegen header check (B.3)
// Extracted from pm-plugin-self-check.ts. Rule 11: generated files must carry
// the @generated header (or "DO NOT EDIT" marker).

import * as fs from "fs";
import * as path from "path";
import type { PmPluginSelfCheckResult } from "./types";

export function checkCodegenHeaders(projectPath: string | undefined): PmPluginSelfCheckResult["codegenHeadersResult"] {
  if (!projectPath) {
    return {
      status: "skipped",
      details: "no projectPath provided; codegen header check requires a project path (pass projectPath arg to enable)",
    };
  }
  try {
    const generatedDir = path.join(projectPath, "src", "generated");
    if (!fs.existsSync(generatedDir)) {
      return {
        status: "skipped",
        details: `src/generated/ not found at ${projectPath}; codegen not applicable`,
      };
    }
    const files = fs.readdirSync(generatedDir).filter((f) => f.endsWith(".ts"));
    if (files.length === 0) {
      return {
        status: "skipped",
        details: `src/generated/ is empty at ${projectPath}; nothing to validate`,
      };
    }
    const missing: string[] = [];
    for (const file of files) {
      const abs = path.join(generatedDir, file);
      const content = fs.readFileSync(abs, "utf8");
      if (!content.includes("@generated") && !content.includes("DO NOT EDIT")) {
        missing.push(file);
      }
    }
    if (missing.length > 0) {
      return {
        status: "fail",
        details: `${missing.length}/${files.length} generated files missing @generated header: ${missing.join(", ")}`,
      };
    }
    return {
      status: "pass",
      details: `${files.length} generated file(s) all carry @generated header`,
    };
  } catch (err) {
    return {
      status: "fail",
      details: `codegen header check error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
