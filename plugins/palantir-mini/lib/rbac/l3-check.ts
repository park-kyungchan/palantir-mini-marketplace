/**
 * palantir-mini v1 — L3 RBAC: MarkingDeclaration sensitivity enforcement
 * @owner palantirkc-plugin-rbac
 * @purpose palantir-mini v1 — L3 RBAC: MarkingDeclaration sensitivity enforcement
 */
// palantir-mini v1 — L3 RBAC: MarkingDeclaration sensitivity enforcement
// Domain: SECURITY (prim-security-03 MarkingDeclaration)
//
// Checks cell/column-scoped reads against the MarkingDeclaration registry.
// Blocks access when a column or cell is marked with a sensitivity level
// that exceeds the current session's clearance.
//
// Called by managed-settings.d/50-palantir-mini.json L3 rules.
//
// Sensitivity levels (ordered):
//   public < internal < confidential < restricted
//
// Authority: research/palantir/security/ → schemas/ontology/primitives/marking-declaration.ts
//   → lib/rbac/l3-check.ts → managed-settings.d/50-palantir-mini.json

import * as fs from "fs";
import * as path from "path";
import { resolvePalantirMiniRoot } from "../config/root";

export type SensitivityLevel = "public" | "internal" | "confidential" | "restricted";

const SENSITIVITY_ORDER: SensitivityLevel[] = ["public", "internal", "confidential", "restricted"];

export interface MarkingEntry {
  columnOrCell: string;
  sensitivity:  SensitivityLevel;
  reason?:      string;
}

export interface L3CheckInput {
  columnOrCell: string;
  sessionClearance?: SensitivityLevel;
  markingRegistryPath?: string;
}

export interface L3CheckResult {
  allow:       boolean;
  sensitivity?: SensitivityLevel;
  reason?:     string;
}

function sensitivityRank(level: SensitivityLevel): number {
  return SENSITIVITY_ORDER.indexOf(level);
}

function loadMarkingRegistry(registryPath: string): MarkingEntry[] {
  if (!fs.existsSync(registryPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(registryPath, "utf8")) as MarkingEntry[];
  } catch {
    return [];
  }
}

function defaultRegistryPath(): string {
  return path.join(resolvePalantirMiniRoot(), "runtime-overlay", "schemas-snapshot", "ontology", "primitives", "marking-declaration.ts");
}

export function l3Check(input: L3CheckInput): L3CheckResult {
  const registryPath = input.markingRegistryPath ?? defaultRegistryPath();
  const registry = loadMarkingRegistry(registryPath);

  const entry = registry.find((e) => e.columnOrCell === input.columnOrCell);
  if (!entry) {
    // No marking declared — allow (public by default)
    return { allow: true, sensitivity: "public" };
  }

  const clearance: SensitivityLevel = input.sessionClearance ?? "internal";
  const required  = sensitivityRank(entry.sensitivity);
  const granted   = sensitivityRank(clearance);

  if (granted < required) {
    return {
      allow:       false,
      sensitivity: entry.sensitivity,
      reason:      `L3: column/cell "${input.columnOrCell}" requires ${entry.sensitivity} clearance; session has ${clearance}`,
    };
  }

  return { allow: true, sensitivity: entry.sensitivity };
}

// CLI entry point for use by managed-settings rules
// Usage: bun run lib/rbac/l3-check.ts <column-or-cell> [clearance-level]
if (import.meta.main) {
  const [, , columnOrCell, clearance] = process.argv;
  if (!columnOrCell) {
    console.error("usage: bun run lib/rbac/l3-check.ts <column-or-cell> [clearance-level]");
    process.exit(1);
  }
  const result = l3Check({
    columnOrCell,
    sessionClearance: (clearance ?? "internal") as SensitivityLevel,
  });
  process.stdout.write(JSON.stringify(result) + "\n");
  process.exit(result.allow ? 0 : 1);
}
