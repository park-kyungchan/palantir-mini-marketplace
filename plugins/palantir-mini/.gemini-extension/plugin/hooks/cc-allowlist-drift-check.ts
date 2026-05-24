// palantir-mini v1.7.1 — cc-allowlist-drift-check hook handler
// Fires on: SessionStart (async: true, non-blocking)
//
// Retrospective deferred item (plan §5.3, 2026-04-21) — detects when the
// installed Claude Code runtime version has drifted past the hardcoded
// CANONICAL_ALLOWLIST.forCCVersion in bridge/handlers/validate-hook-event-allowlist.ts.
//
// Root cause this warns on — PR #98 v2.1.0 merged 2026-04-20 with a
// TaskUpdate top-level hook event key that was invalid against CC
// v2.1.114's event allowlist. If the allowlist pin lags installed CC,
// future hooks.json edits could introduce other invalid event keys
// without the validator catching them.
//
// Non-blocking by design — emits additionalContext warning; never fails.

import { execSync } from "child_process";
import { compareClaudeCodeVersions } from "#schemas/ontology/primitives/claude-code-version";

// Keep in sync with bridge/handlers/validate-hook-event-allowlist.ts
// CANONICAL_ALLOWLIST.forCCVersion. Intentional manual pin — if you update
// one, update the other. See rules/07 agent file-ownership table: the
// allowlist handler is plugin-runtime code (hook-builder scope); this pin
// is a cross-reference, not a source of truth.
const ALLOWLIST_PIN_VERSION = "2.1.114";

interface DriftResult {
  message:           string;
  additionalContext?: string;
}

/**
 * Detect installed Claude Code runtime version via `claude --version`.
 * Returns null on any failure (non-blocking).
 */
export function detectInstalledVersion(): string | null {
  try {
    const out = execSync("claude --version 2>/dev/null", { timeout: 3000 }).toString().trim();
    const m = /(\d+\.\d+\.\d+)/.exec(out);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * Compare installed CC version against allowlist pin.
 * Returns drift description if installed > pin, null otherwise.
 */
export function checkDrift(
  installedVersion: string | null,
  pinVersion: string,
): string | null {
  if (!installedVersion) return null;
  const cmp = compareClaudeCodeVersions(installedVersion, pinVersion);
  if (cmp <= 0) return null; // installed <= pin — no drift

  return [
    `[palantir-mini] CC allowlist pin lag detected:`,
    `  installed CC version: ${installedVersion}`,
    `  allowlist pin (validate-hook-event-allowlist.ts): ${pinVersion}`,
    `  action — if CC introduced new hook events, update VALID_EVENTS_V2 + forCCVersion in`,
    `           bridge/handlers/validate-hook-event-allowlist.ts, then regenerate any stale`,
    `           research/claude-code/hook-events-v2.md citations.`,
  ].join("\n");
}

export default async function ccAllowlistDriftCheck(_payload: unknown): Promise<DriftResult> {
  const installed = detectInstalledVersion();
  const drift = checkDrift(installed, ALLOWLIST_PIN_VERSION);

  if (drift === null) {
    return { message: `palantir-mini: cc-allowlist pin ${ALLOWLIST_PIN_VERSION} ok (installed=${installed ?? "unknown"})` };
  }

  return {
    message:           `palantir-mini: cc-allowlist drift WARN (installed=${installed}, pin=${ALLOWLIST_PIN_VERSION})`,
    additionalContext: drift,
  };
}
