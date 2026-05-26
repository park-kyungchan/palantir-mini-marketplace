// palantir-mini v4.14.0 — MCP tool handler: validate_substrate_firing
// Domain: ACTION
//
// PR validator (sprint-062 W6-β C2):
// Scans the current branch diff for new EventType definitions added in the
// plugin-contained schemas snapshot and verifies that a hook or bridge handler
// actually references/emits each new type.
//
// Why: sprint-060 P0 carry-over — new event types ship without paired firing
// infra, which means the BackProp circuit has dark event types that can never
// reach T3+. This validator surfaces that gap at PR-time.
//
// Algorithm:
//   1. git diff --unified=0 <baseBranch>...HEAD -- <schemasDir>
//   2. Parse added lines (+) for new event type string literals.
//      Patterns matched:
//        (a) type X = { type: "foo" } (EventEnvelope union discriminant)
//        (b) errorClass: "foo"  (validation_phase_completed discriminant)
//        (c) | "foo"  (union member addition)
//   3. For each candidate new type, grep hooks/**/*.ts + bridge/handlers/**/*.ts
//      for the literal string.
//   4. Unpaired types → unfiredEventTypes.
//   5. Emit validation_phase_completed errorClass="substrate_firing_validated".
//
// Authority: sprint-062 plan §Phase 7 C2 + rule 10 (events-jsonl) §Substrate invariant

import * as fs from "fs";
import * as path from "path";
import { spawnSync } from "child_process";
import { emit } from "../../scripts/log";

// ─── Paths ────────────────────────────────────────────────────────────────────

const PLUGIN_ROOT = path.resolve(__dirname, "../..");
const SCHEMAS_DIR = path.resolve(PLUGIN_ROOT, "runtime-overlay", "schemas-snapshot");
const HOOKS_DIR   = path.resolve(PLUGIN_ROOT, "hooks");
const BRIDGE_DIR  = path.resolve(PLUGIN_ROOT, "bridge/handlers");

// ─── Public types ─────────────────────────────────────────────────────────────

export interface ValidateSubstrateFiringInput {
  /** Git base branch or ref to diff against. Defaults to "main". */
  baseBranch?: string;
  /** Project root; used for cwd in git commands. Defaults to process.cwd(). */
  project?:    string;
}

export interface ValidateSubstrateFiringResult {
  ok:                boolean;
  newEventTypes:     string[];
  unfiredEventTypes: string[];
  pairedEventTypes:  string[];
  reasoning:         string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Run git diff between baseBranch and HEAD, restricted to SCHEMAS_DIR.
 * Returns the raw unified diff output.
 */
function gitDiffSchemas(baseBranch: string, cwd: string): string {
  const result = spawnSync(
    "git",
    [
      "diff",
      "--unified=0",
      `${baseBranch}...HEAD`,
      "--",
      SCHEMAS_DIR,
    ],
    { cwd, encoding: "utf8", timeout: 15_000 },
  );
  if (result.error) return "";
  return result.stdout ?? "";
}

/**
 * Parse the unified diff for added lines (+) and extract candidate event type
 * string literals.
 *
 * Recognized patterns on added lines:
 *   (a) type: "foo"          — EventEnvelope type discriminant
 *   (b) errorClass: "foo"    — validation_phase_completed errorClass
 *   (c) | "foo"              — union member addition (multi-line type union)
 *   (d) = "foo"              — string literal type alias assignment
 */
function extractNewEventTypes(diff: string): string[] {
  const candidates = new Set<string>();

  const addedLines = diff
    .split("\n")
    .filter((l) => l.startsWith("+") && !l.startsWith("+++"));

  for (const line of addedLines) {
    const content = line.slice(1); // strip the leading +

    // (a) type: "foo"
    {
      const m = content.match(/\btype\s*:\s*["']([^"']+)["']/);
      if (m) candidates.add(m[1]!);
    }

    // (b) errorClass: "foo"
    {
      const m = content.match(/\berrorClass\s*:\s*["']([^"']+)["']/);
      if (m) candidates.add(m[1]!);
    }

    // (c) | "foo" — union member in a type alias or discriminated union
    {
      const m = content.match(/\|\s*["']([a-z_][a-z0-9_]+)["']/i);
      if (m) candidates.add(m[1]!);
    }

    // (d) = "foo" — string literal type alias assignment
    {
      const m = content.match(/=\s*["']([a-z_][a-z0-9_]+)["']\s*;/i);
      if (m) candidates.add(m[1]!);
    }
  }

  return [...candidates].sort();
}

/**
 * Search for a literal string in all .ts files under a directory.
 * Returns true if found in any file.
 */
function grepDir(dir: string, literal: string): boolean {
  if (!fs.existsSync(dir)) return false;

  const result = spawnSync(
    "grep",
    ["-r", "--include=*.ts", "-l", "--", literal, dir],
    { encoding: "utf8", timeout: 10_000 },
  );

  // grep exits 0 when matches found, 1 when none found
  return result.status === 0 &&
    typeof result.stdout === "string" &&
    result.stdout.trim().length > 0;
}

/**
 * Returns true when the given event type string is referenced in at least one
 * hook or bridge handler file.
 */
function isTypeFired(eventType: string): boolean {
  return grepDir(HOOKS_DIR, eventType) || grepDir(BRIDGE_DIR, eventType);
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export default async function validateSubstrateFiring(
  rawInput: unknown,
): Promise<ValidateSubstrateFiringResult> {
  const input = (rawInput ?? {}) as ValidateSubstrateFiringInput;
  const baseBranch = input.baseBranch ?? "main";
  const cwd = input.project ?? process.env.PALANTIR_MINI_PROJECT ?? process.cwd();

  // 1. Get git diff of schemas
  const diff = gitDiffSchemas(baseBranch, cwd);

  // 2. Extract candidate new event types
  const newEventTypes = extractNewEventTypes(diff);

  // 3. Classify: paired vs unfired
  const pairedEventTypes: string[] = [];
  const unfiredEventTypes: string[] = [];

  for (const evType of newEventTypes) {
    if (isTypeFired(evType)) {
      pairedEventTypes.push(evType);
    } else {
      unfiredEventTypes.push(evType);
    }
  }

  const ok = unfiredEventTypes.length === 0;

  const reasoningParts: string[] = [
    `validate-substrate-firing: diff against ${baseBranch}...HEAD in schemas/ detected ${newEventTypes.length} candidate new event type(s).`,
  ];
  if (pairedEventTypes.length > 0) {
    reasoningParts.push(`Paired (fired by hook/handler): [${pairedEventTypes.join(", ")}].`);
  }
  if (unfiredEventTypes.length > 0) {
    reasoningParts.push(`UNFIRED (no hook/handler emits them): [${unfiredEventTypes.join(", ")}]. Add a hook or bridge handler that emits each unfired type, or the BackProp circuit will have dark event types. Sprint-062 C2 carry-over from sprint-060 P0.`);
  }
  if (newEventTypes.length === 0) {
    reasoningParts.push("No new event type definitions detected in schemas diff — substrate firing check trivially passes.");
  }
  const reasoning = reasoningParts.join(" ");

  // 4. Emit validation result
  try {
    await emit({
      type: "validation_phase_completed",
      payload: {
        phase:      "design",
        passed:     ok,
        errorClass: "substrate_firing_validated",
      },
      toolName: "validate_substrate_firing",
      cwd,
      runtime: process.env.PALANTIR_MINI_HOST_RUNTIME,
      memoryLayers: ["procedural", "semantic"],
      reasoning,
      refinementTarget: ok ? undefined : {
        kind:            "other" as const,
        filePathOrRid:   "hooks/ + bridge/handlers/",
        description:     `${unfiredEventTypes.length} unfired event type(s) need paired hook/handler: [${unfiredEventTypes.join(", ")}]`,
        confidenceLevel: "high",
      },
    });
  } catch {
    // best-effort — never block the validation result
  }

  return {
    ok,
    newEventTypes,
    unfiredEventTypes,
    pairedEventTypes,
    reasoning,
  };
}
