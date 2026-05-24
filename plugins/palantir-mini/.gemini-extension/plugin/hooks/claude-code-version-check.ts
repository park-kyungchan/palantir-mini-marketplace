// palantir-mini v4.5.0 — claude-code-version-check hook (sprint-039 W3.B)
// Fires on: SessionStart (advisory, async)
//
// Reads installed Claude Code version via `claude --version`, compares against
// the last-checked version stored in <projectRoot>/.palantir-mini/session/claude-code-version.json.
// If installed > lastChecked, emits validation_phase_completed{errorClass:"claude_code_version_drift"}
// and calls emitSkillSuggestion("pm-claude-code-version-watch").
//
// The hook NEVER writes claude-code-version.json — that is the responsibility
// of /palantir-mini:pm-claude-code-version-watch (W3.C) after user confirmation.
//
// Authority: rule 12 v3.4.0 + rule 26 §Axis E (procedural memory; surface drift detection).

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { emit } from "../scripts/log";
import { emitSkillSuggestion } from "../lib/skill-suggestion-emit";

interface HookPayload {
  cwd?: string;
  session_id?: string;
}

interface HookResult {
  message: string;
  decision?: "continue";
  additionalContext?: string;
}

interface VersionFile {
  lastCheckedVersion: string;
  lastCheckedAt: string;
}

/** Parses a semantic version string like "2.1.131" from `claude --version` output. */
function parseVersion(raw: string): string | null {
  const m = /(\d+\.\d+\.\d+)/.exec(raw);
  return m?.[1] ?? null;
}

/** Gets installed Claude Code version. Returns null if unavailable. */
function getInstalledVersion(): string | null {
  try {
    const out = execSync("claude --version 2>/dev/null", { timeout: 4000 }).toString().trim();
    return parseVersion(out);
  } catch {
    return null;
  }
}

/** Reads last-checked version file. Returns null if absent or malformed. */
function readVersionFile(filePath: string): VersionFile | null {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "lastCheckedVersion" in parsed &&
      typeof (parsed as VersionFile).lastCheckedVersion === "string"
    ) {
      return parsed as VersionFile;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Compares two semver strings numerically: major.minor.patch.
 * Returns positive if a > b, zero if equal, negative if a < b.
 */
function compareVersions(a: string, b: string): number {
  const parseParts = (v: string): [number, number, number] => {
    const parts = v.split(".").map(Number);
    return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
  };
  const [aMaj, aMin, aPat] = parseParts(a);
  const [bMaj, bMin, bPat] = parseParts(b);
  if (aMaj !== bMaj) return aMaj - bMaj;
  if (aMin !== bMin) return aMin - bMin;
  return aPat - bPat;
}

/**
 * Determines delta type (major / minor / patch) given installed and lastChecked.
 * Assumes installed > lastChecked (pre-condition checked by caller).
 */
function deltaType(installed: string, lastChecked: string): "major" | "minor" | "patch" {
  const parseParts = (v: string): [number, number, number] => {
    const parts = v.split(".").map(Number);
    return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
  };
  const [iMaj, iMin] = parseParts(installed);
  const [lMaj, lMin] = parseParts(lastChecked);
  if (iMaj !== lMaj) return "major";
  if (iMin !== lMin) return "minor";
  return "patch";
}

export default async function claudeCodeVersionCheck(
  payload: unknown,
): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();

  // Resolve project root for version file path.
  const versionFilePath = path.join(
    cwd,
    ".palantir-mini",
    "session",
    "claude-code-version.json",
  );

  // Step 1: get installed version.
  const installed = getInstalledVersion();
  if (installed === null) {
    // claude --version unavailable (e.g. PATH issue in some envs) — graceful pass.
    return {
      message: "palantir-mini: claude-code-version-check (claude unavailable; skipped)",
      decision: "continue",
    };
  }

  // Step 2: read last-checked version file.
  const versionFile = readVersionFile(versionFilePath);
  if (versionFile === null) {
    // First run: no file exists (or malformed). Silent pass.
    // W3.C skill is responsible for writing the baseline after user confirms.
    return {
      message: `palantir-mini: claude-code-version-check (first-run; baseline not yet set; installed=${installed})`,
      decision: "continue",
    };
  }

  const lastChecked = versionFile.lastCheckedVersion;
  const cmp = compareVersions(installed, lastChecked);

  if (cmp <= 0) {
    // Same or installed older than last-checked — silent pass.
    return {
      message: `palantir-mini: claude-code-version-check (no drift; installed=${installed})`,
      decision: "continue",
    };
  }

  // Drift detected: installed > lastChecked.
  const delta = deltaType(installed, lastChecked);

  // Emit 5-dim event for BackProp visibility.
  // payload is typed { phase, passed, errorClass? } — drift details go in reasoning.
  try {
    await emit({
      type: "validation_phase_completed",
      payload: {
        phase: "runtime",
        passed: false,
        errorClass: "claude_code_version_drift",
      },
      toolName: "claude-code-version-check",
      cwd,
      identity: "claude-code",
      memoryLayers: ["procedural", "semantic"],
      reasoning: `Claude Code version drift detected: v${lastChecked} → v${installed} (${delta} bump). Surface audit recommended.`,
    });
  } catch {
    // best-effort; never block the session
  }

  // Emit skill suggestion for BackProp lineage.
  await emitSkillSuggestion({
    suggestedSkillSlug: "pm-claude-code-version-watch",
    suggestedByHook: "claude-code-version-check",
    triggerCondition: `Claude Code v${lastChecked} → v${installed} (${delta})`,
    suggestionContext: `installed=${installed},lastChecked=${lastChecked},deltaType=${delta}`,
    memoryLayers: ["procedural", "semantic"],
    cwd,
  });

  const advisory = [
    `[claude-code-version-check advisory] Claude Code version drift detected:`,
    `  Installed:     v${installed}`,
    `  Last checked:  v${lastChecked}`,
    `  Delta type:    ${delta}`,
    `Run /palantir-mini:pm-claude-code-version-watch to audit affected palantir-mini surfaces and update the baseline.`,
  ].join("\n");

  return {
    message: `palantir-mini: claude-code-version-check (drift: v${lastChecked} → v${installed}; advisory)`,
    decision: "continue",
    additionalContext: advisory,
  };
}
