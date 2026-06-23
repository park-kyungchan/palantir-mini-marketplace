// palantir-mini v4.12.0 — pm-plugin-self-check mcp-tools-registration-consistency check
// sprint-060 W2.2 R6-F2: Dead-handler regression check.
//
// Sprint-057 W2 (PR #321) registered 3 previously-implemented-but-unregistered handlers.
// This check ensures public TOOLS entries in mcp-server.ts have handler module
// mappings. Handler inventory count is reported separately because many
// top-level handler files are skill-only, legacy, or internal support surfaces.
//
// Logic:
//   1. Count *.ts handler files in bridge/handlers/ (excluding subdirs, _project-event.ts,
//      and any types/index files).
//   2. Count public TOOLS and HANDLER_MODULES entries from bridge/mcp-server.ts.
//   3. FAIL only when a public MCP tool lacks a handler mapping.
//   4. Report inventory-only handlers as advisory details, not release blockers.
//
// Cross-ref: bridge/mcp-server.ts TOOLS array, architecture review §5.I.5 (R6-F2).

import * as fs from "fs";
import * as path from "path";
import { HANDLER_MODULES, TOOLS } from "../../mcp-server";
import { classifyUnregisteredHandler } from "../_deprecation-map";
import { PLUGIN_ROOT } from "./types";

/** Files in handlers/ that are not independent tool handlers. */
const EXCLUDED_NAMES = new Set([
  "_project-event.ts",
  "index.ts",
  "types.ts",
]);

export interface McpRegistrationCheckResult {
  status:              "pass" | "fail" | "skipped";
  details:             string;
  handlerFileCount:    number;
  registeredToolCount: number;
  gap:                 number;
  registeredHandlerModules: number;
  missingHandlerModules: string[];
  missingMetadataFields: string[];
  unregisteredTopLevelHandlers: string[];
  /**
   * P2-5 (task #15): every unregistered handler split by
   * _deprecation-map.ts UNREGISTERED_HANDLER_CLASSIFICATION (internal vs dead).
   * `unclassifiedUnregisteredHandlers` should stay empty — a non-empty list means
   * a new unregistered handler was added without a classification record, which
   * is what previously hid behind the gap<=10 tolerance.
   */
  internalUnregisteredHandlers: string[];
  deadUnregisteredHandlers: string[];
  unclassifiedUnregisteredHandlers: string[];
}

const REQUIRED_TOOL_METADATA = [
  "category",
  "audience",
  "lifecycle",
  "ownerModule",
] as const;

/**
 * Count *.ts handler files directly in bridge/handlers/ (not in subdirectories).
 * Sub-module directories (e.g. pm-plugin-self-check/) are counted as 1 entry each
 * since they correspond to a single MCP tool.
 */
function listHandlerEntries(handlersDir: string): string[] {
  if (!fs.existsSync(handlersDir)) return [];

  const entries = fs.readdirSync(handlersDir, { withFileTypes: true });
  const names: string[] = [];
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith(".ts") && !EXCLUDED_NAMES.has(entry.name)) {
      names.push(entry.name.replace(/\.ts$/, ""));
    } else if (entry.isDirectory() && !entry.name.startsWith(".")) {
      // Sub-module directories count as 1 (they implement a single tool)
      names.push(entry.name);
    }
  }
  return names.sort((left, right) => left.localeCompare(right));
}

export function checkMcpRegistration(): McpRegistrationCheckResult {
  const handlersDir = path.join(PLUGIN_ROOT, "bridge", "handlers");
  const mcpServerPath = path.join(PLUGIN_ROOT, "bridge", "mcp-server.ts");

  if (!fs.existsSync(handlersDir) || !fs.existsSync(mcpServerPath)) {
    return {
      status:              "skipped",
      details:             `bridge/handlers/ or bridge/mcp-server.ts not found at ${PLUGIN_ROOT}`,
      handlerFileCount:    0,
      registeredToolCount: 0,
      gap:                 0,
      registeredHandlerModules: 0,
      missingHandlerModules: [],
      missingMetadataFields: [],
      unregisteredTopLevelHandlers: [],
      internalUnregisteredHandlers: [],
      deadUnregisteredHandlers: [],
      unclassifiedUnregisteredHandlers: [],
    };
  }

  const handlerEntries = listHandlerEntries(handlersDir);
  const handlerFileCount = handlerEntries.length;
  const registeredToolCount = TOOLS.length;
  const handlerModules = Object.values(HANDLER_MODULES);
  const registeredHandlerModules = handlerModules.length;
  const gap = handlerFileCount - registeredToolCount;
  const missingHandlerModules = TOOLS
    .map((tool) => tool.name)
    .filter((toolName) => typeof HANDLER_MODULES[toolName] !== "string")
    .sort((left, right) => left.localeCompare(right));
  const missingMetadataFields = TOOLS.flatMap((tool) =>
    REQUIRED_TOOL_METADATA.flatMap((field) =>
      typeof tool[field] === "string" && tool[field].length > 0
        ? []
        : [`Tool '${tool.name}' missing required ToolSpec.${field}; see plan §W1.A`],
    ),
  );
  const registeredHandlerEntryNames = new Set(
    handlerModules
      .map((modulePath) => path.basename(modulePath))
      .sort((left, right) => left.localeCompare(right)),
  );
  const unregisteredTopLevelHandlers = handlerEntries.filter(
    (entry) => !registeredHandlerEntryNames.has(entry),
  );

  // P2-5 (task #15): classify each unregistered handler against the
  // _deprecation-map.ts record. The infra file `_deprecation-map` itself is not
  // a handler surface, so it is excluded from the classification requirement.
  const classifiableUnregistered = unregisteredTopLevelHandlers.filter(
    (entry) => entry !== "_deprecation-map",
  );
  const internalUnregisteredHandlers: string[] = [];
  const deadUnregisteredHandlers: string[] = [];
  const unclassifiedUnregisteredHandlers: string[] = [];
  for (const entry of classifiableUnregistered) {
    const row = classifyUnregisteredHandler(entry);
    if (row === undefined) {
      unclassifiedUnregisteredHandlers.push(entry);
    } else if (row.classification === "internal") {
      internalUnregisteredHandlers.push(entry);
    } else {
      deadUnregisteredHandlers.push(entry);
    }
  }

  const inventoryFields = {
    handlerFileCount,
    registeredToolCount,
    gap,
    registeredHandlerModules,
    missingHandlerModules,
    missingMetadataFields,
    unregisteredTopLevelHandlers,
    internalUnregisteredHandlers,
    deadUnregisteredHandlers,
    unclassifiedUnregisteredHandlers,
  };

  if (missingHandlerModules.length > 0) {
    return {
      status:              "fail",
      details:             `Public MCP tools missing handler module mapping: ${missingHandlerModules.join(", ")}.`,
      ...inventoryFields,
    };
  }

  if (missingMetadataFields.length > 0) {
    return {
      status:              "fail",
      details:             missingMetadataFields.join("; "),
      ...inventoryFields,
    };
  }

  return {
    status:              "pass",
    details:             `Public MCP registration consistent: ${registeredToolCount} public tools, ${registeredHandlerModules} handler module mappings, ${handlerFileCount} top-level handler inventory entries (${internalUnregisteredHandlers.length} internal + ${deadUnregisteredHandlers.length} dead unregistered, classified in bridge/handlers/_deprecation-map.ts; ${unclassifiedUnregisteredHandlers.length} unclassified). Inventory-only handlers are reported separately, not treated as registration drift.`,
    ...inventoryFields,
  };
}
