// palantir-mini v3.7.0 — hooks/semantic-frontmatter-validate/validator.ts
// Aggregate validator + content resolver.
// Extracted from semantic-frontmatter-validate.ts during A.1 decomposition.

import * as fs from "fs";
import { checkJsDocForm, checkYamlCommentForm } from "./formatters";
import type { FrontmatterValidationResult } from "./types";

/**
 * Validate a file's content for semantic frontmatter.
 * Checks Form A (JSDoc) first, then Form B (YAML-in-comment).
 */
export function validateSemanticFrontmatter(content: string): FrontmatterValidationResult {
  const jsDoc = checkJsDocForm(content);
  if (jsDoc.found) {
    return {
      valid:         jsDoc.missingFields.length === 0,
      form:          "jsdoc",
      missingFields: jsDoc.missingFields,
    };
  }

  const yaml = checkYamlCommentForm(content);
  if (yaml.found) {
    return {
      valid:         yaml.missingFields.length === 0,
      form:          "yaml-comment",
      missingFields: yaml.missingFields,
    };
  }

  return {
    valid:         false,
    form:          "none",
    missingFields: ["@owner", "@purpose"],
  };
}

/**
 * Read file content from disk, or fall back to the tool_input content
 * (for PreToolUse where the file may not yet exist on disk).
 */
export function resolveContent(filePath: string, toolInputContent?: string): string {
  if (fs.existsSync(filePath)) {
    try {
      return fs.readFileSync(filePath, "utf8");
    } catch {
      // fall through to tool_input content
    }
  }
  return toolInputContent ?? "";
}
