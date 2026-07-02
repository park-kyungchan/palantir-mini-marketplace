// palantir-mini PR-13 — Hook enforcement level
//   enforcement: blocking
//   rationale:   permissionDecision=defer + denies when domain-scope .ts files lack 6-domain classification marker; no bypass env var.
// palantir-mini v4.14.0 — ontology-domain-classification-validate hook (sprint-062 W3-α)
// Fires on: PreToolUse(Edit|Write|MultiEdit) on domain-scope .ts files — BLOCKING
//
// PURPOSE: Enforce 6-domain classification markers on TypeScript files that participate
// in the ontology, plugin logic, or shared-core layers. Every such file MUST declare:
//   // @domain: <DATA|LOGIC|ACTION|SECURITY|LEARN|UI>
// at or near the top of the file (first HEADER_SCAN_LINES lines).
//
// Scope (regex-matched against file_path):
//   - ~/.claude/schemas/.*\.ts$
//   - plugins/palantir-mini/(bridge/handlers|hooks|lib)/.*\.ts$
//   - ~/.claude/plugins/palantir-mini/(bridge/handlers|hooks|lib)/.*\.ts$ (compatibility install)
//   - ~/ontology/shared-core/.*\.ts$
//   - ~/projects/.*/ontology/.*\.ts$
//
// Logic:
//   1. Read stdin → extract file_path
//   2. If file path doesn't match the scope regex → continue (out of scope)
//   3. Synthesis path exemption: plans/**, BROWSE.md, INDEX.md, MEMORY.md → continue
//   4. Read top HEADER_SCAN_LINES lines from the target file content:
//      - For Edit/MultiEdit: read existing file on disk
//      - For Write (new file): check tool_input.content directly
//   5. Check for // @domain: <TOKEN> marker (case-insensitive; also accepts // @domain:<TOKEN>)
//   6. If absent: emit validation_phase_completed errorClass="domain_classification_missing"
//      + return permissionDecision: "deny"
//   7. Bypass: PALANTIR_MINI_DOMAIN_CLASSIFICATION_BYPASS=1 (audited)
//
// Valid domain tokens: DATA | LOGIC | ACTION | SECURITY | LEARN | UI
//
// Cross-ref: the former Lead-Protocol policy v3.10.0 + operating model §4.1 (6-domain classification)
//            sprint-062 plan §Phase 4 W3-α

// @domain: LOGIC

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { emit } from "../scripts/log";
import { resolvePalantirMiniRoot } from "../lib/config/root";

/** Number of lines from top of file to scan for the @domain marker. */
const HEADER_SCAN_LINES = 20;

/** Resolve the current home directory: $HOME env var, falling back to os.homedir() when unset.
 * Read fresh on every call (not memoized) since tests mutate process.env.HOME per-case. */
function getHome(): string {
  return process.env.HOME ?? os.homedir();
}

/** Valid domain tokens (case-insensitive). */
const VALID_DOMAINS = new Set(["DATA", "LOGIC", "ACTION", "SECURITY", "LEARN", "UI"]);

/**
 * Regex that matches @domain marker anywhere in a line, case-insensitive.
 * Accepts both `// @domain: DATA` and `// @domain:DATA` forms.
 */
const DOMAIN_MARKER_REGEX = /\/\/\s*@domain:\s*(\w+)/i;

/**
 * Scope path patterns (absolute path regexes).
 * File must match at least one to be in scope.
 */
function buildScopeRegexes(home: string): RegExp[] {
  return [
    // ~/.claude/schemas/**/*.ts
    new RegExp(`${escapeRegex(path.join(home, ".claude", "schemas"))}.*\\.ts$`),
    // plugins/palantir-mini/(bridge/handlers|hooks|lib)/**/*.ts
    new RegExp(
      `${escapeRegex(resolvePalantirMiniRoot())}/(bridge/handlers|hooks|lib)/.*\\.ts$`
    ),
    // Claude compatibility install path.
    new RegExp(
      `${escapeRegex(path.join(home, ".claude", "plugins", "palantir-mini"))}/(bridge/handlers|hooks|lib)/.*\\.ts$`
    ),
    // ~/ontology/shared-core/**/*.ts
    new RegExp(`${escapeRegex(path.join(home, "ontology", "shared-core"))}.*\\.ts$`),
    // ~/projects/*/ontology/**/*.ts
    new RegExp(`${escapeRegex(path.join(home, "projects"))}/[^/]+/ontology/.*\\.ts$`),
  ];
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Check if a file path is a synthesis path exempt from this gate.
 */
function isSynthesisPath(absPath: string): boolean {
  const plansPrefix = path.join(getHome(), ".claude", "plans") + path.sep;
  if (absPath.startsWith(plansPrefix)) return true;
  const base = path.basename(absPath);
  if (base === "BROWSE.md" || base === "INDEX.md" || base === "MEMORY.md") return true;
  // Test files are exempt (they don't need domain markers)
  if (absPath.endsWith(".test.ts")) return true;
  return false;
}

/**
 * Check whether the given text (first N lines) contains a @domain marker.
 * Returns the matched domain token if found, null if not.
 */
function extractDomainMarker(text: string): string | null {
  const lines = text.split("\n").slice(0, HEADER_SCAN_LINES);
  for (const line of lines) {
    const match = DOMAIN_MARKER_REGEX.exec(line);
    if (match && match[1]) {
      const token = match[1].toUpperCase();
      if (VALID_DOMAINS.has(token)) return token;
      // Marker present but invalid token — still block (caught by deny path)
      return `INVALID:${match[1]}`;
    }
  }
  return null;
}

/** Resolve absolute path, expanding ~ prefix */
function resolveAbsPath(filePath: string): string {
  if (filePath.startsWith("~/")) {
    return path.resolve(getHome(), filePath.slice(2));
  }
  return path.resolve(filePath);
}

interface HookPayload {
  cwd?:        string;
  session_id?: string;
  tool_name?:  string;
  tool_input?: {
    file_path?:     string;
    path?:          string;
    notebook_path?: string;
    /** Write tool: new file content */
    content?:       string;
    /** Edit tool: old text being replaced */
    old_string?:    string;
    /** Edit tool: new text */
    new_string?:    string;
  };
}

interface HookResult {
  message: string;
  hookSpecificOutput?: {
    permissionDecision?:       "deny" | "allow";
    permissionDecisionReason?: string;
  };
  additionalContext?: string;
}

export default async function ontologyDomainClassificationValidate(
  payload: unknown
): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();
  const toolName = p.tool_name ?? "unknown";
  const sessionId = p.session_id;

  try {
    // Bypass via env var (audited)
    if (process.env.PALANTIR_MINI_DOMAIN_CLASSIFICATION_BYPASS === "1") {
      try {
        await emit({
          type: "validation_phase_completed",
          payload: {
            phase:      "design",
            passed:     true,
            errorClass: "domain_classification_bypass_invoked",
          },
          toolName: "PALANTIR_MINI_DOMAIN_CLASSIFICATION_BYPASS",
          cwd,
          sessionId,
          identity:    "monitor",
          memoryLayers: ["working"],
          reasoning:   `ontology-domain-classification-validate: bypass via PALANTIR_MINI_DOMAIN_CLASSIFICATION_BYPASS=1 (tool=${toolName}). Audited per sprint-062 W3-α.`,
        });
      } catch { /* best-effort */ }
      return { message: "palantir-mini: ontology-domain-classification-validate BYPASS (env)" };
    }

    // Extract file path
    const rawFilePath =
      p.tool_input?.file_path ??
      p.tool_input?.path ??
      p.tool_input?.notebook_path;

    if (!rawFilePath || typeof rawFilePath !== "string" || rawFilePath.trim().length === 0) {
      return { message: "palantir-mini: ontology-domain-classification-validate skipped (no file_path)" };
    }

    const absFilePath = resolveAbsPath(rawFilePath);

    // Synthesis path exemption
    if (isSynthesisPath(absFilePath)) {
      return {
        message: `palantir-mini: ontology-domain-classification-validate skipped (synthesis/test path)`,
      };
    }

    // Scope check — only enforce on domain-scope TS files
    const scopeRegexes = buildScopeRegexes(getHome());
    const inScope = scopeRegexes.some((rx) => rx.test(absFilePath));
    if (!inScope) {
      return {
        message: `palantir-mini: ontology-domain-classification-validate skipped (out of scope: ${path.basename(absFilePath)})`,
      };
    }

    // Determine text to scan
    let textToScan = "";

    if (toolName === "Write" && p.tool_input?.content) {
      // New file being written — scan content directly
      textToScan = p.tool_input.content;
    } else {
      // Edit/MultiEdit — read existing file from disk
      // For Edit, also consider the new_string in case @domain is being added
      if (fs.existsSync(absFilePath)) {
        try {
          textToScan = fs.readFileSync(absFilePath, "utf8");
        } catch {
          // Can't read file — allow through (don't block on I/O errors)
          return {
            message: `palantir-mini: ontology-domain-classification-validate skipped (cannot read file)`,
          };
        }
      } else if (p.tool_input?.new_string) {
        // File doesn't exist yet and it's an Edit (unusual); check new_string
        textToScan = p.tool_input.new_string;
      } else {
        // No content available — allow through
        return {
          message: `palantir-mini: ontology-domain-classification-validate skipped (no content available)`,
        };
      }

      // For Edit hooks: if the new_string itself contains a valid @domain marker
      // being inserted, allow through (Lead is adding the marker in this very edit)
      if (toolName === "Edit" && p.tool_input?.new_string) {
        const newStringMarker = extractDomainMarker(p.tool_input.new_string);
        if (newStringMarker && !newStringMarker.startsWith("INVALID:")) {
          return {
            message: `palantir-mini: ontology-domain-classification-validate PASS (marker being added in this edit: @domain:${newStringMarker})`,
          };
        }
      }
    }

    // Check for @domain marker in the content
    const domainToken = extractDomainMarker(textToScan);

    if (domainToken && !domainToken.startsWith("INVALID:")) {
      // Marker found and valid
      return {
        message: `palantir-mini: ontology-domain-classification-validate PASS (@domain:${domainToken} found in ${path.basename(absFilePath)})`,
      };
    }

    // Missing or invalid marker — emit event and block
    const isInvalidToken = domainToken?.startsWith("INVALID:");
    const errorClass = "domain_classification_missing";
    const relPath = path.relative(cwd, absFilePath);

    try {
      await emit({
        type: "validation_phase_completed",
        payload: {
          phase:      "design",
          passed:     false,
          errorClass,
        },
        toolName,
        cwd,
        sessionId,
        identity:    "monitor",
        memoryLayers: ["procedural", "semantic"],
        reasoning:   `ontology-domain-classification-validate: BLOCKED — file ${relPath} in domain scope is missing a valid // @domain: <DATA|LOGIC|ACTION|SECURITY|LEARN|UI> marker in top ${HEADER_SCAN_LINES} lines. ${isInvalidToken ? `Found invalid token: ${domainToken}. ` : ""}Sprint-062 W3-α enforcement per operating model §4.1.`,
        refinementTarget: {
          kind:            "other",
          filePathOrRid:   relPath,
          description:     isInvalidToken
            ? `invalid @domain token: ${domainToken}; use DATA|LOGIC|ACTION|SECURITY|LEARN|UI`
            : "missing // @domain: <DATA|LOGIC|ACTION|SECURITY|LEARN|UI> marker in top of file",
          confidenceLevel: "high",
        },
      });
    } catch { /* best-effort */ }

    const denyReason = [
      `the former Lead-Protocol policy v3.10.0 + operating model §4.1: TypeScript file "${path.basename(absFilePath)}"`,
      `in ontology/plugin domain scope MUST declare a // @domain: <TOKEN> marker`,
      `within the first ${HEADER_SCAN_LINES} lines of the file.`,
      ``,
      `Valid tokens: DATA | LOGIC | ACTION | SECURITY | LEARN | UI`,
      ``,
      `Example: add near the top of the file:`,
      `  // @domain: LOGIC`,
      ``,
      isInvalidToken ? `Found token "${domainToken?.replace("INVALID:", "")}" — not in valid set.` : "",
      ``,
      `Bypass: PALANTIR_MINI_DOMAIN_CLASSIFICATION_BYPASS=1 (audited).`,
    ].filter((l) => l !== undefined).join("\n");

    return {
      message: `palantir-mini: ontology-domain-classification-validate BLOCKED (missing @domain marker in ${path.basename(absFilePath)})`,
      hookSpecificOutput: {
        permissionDecision:       "deny",
        permissionDecisionReason: denyReason,
      },
    };

  } catch (err) {
    // Never fail the hook — always allow through on unexpected error
    const errMsg = (err as Error).message ?? String(err);
    try {
      process.stderr.write(
        `[palantir-mini/ontology-domain-classification-validate] unexpected error (suppressed): ${errMsg}\n`
      );
    } catch { /* truly silent */ }
    return {
      message: `palantir-mini: ontology-domain-classification-validate error suppressed (${errMsg})`,
    };
  }
}
