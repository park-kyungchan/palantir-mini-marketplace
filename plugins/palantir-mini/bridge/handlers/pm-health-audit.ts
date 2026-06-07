// palantir-mini v4.15.0 — pm_health_audit MCP handler (sprint-063 W4.A)
// Domain: LEARN (9-handler mode-dispatched health audit merger)
//
// Mode-dispatched facade that delegates to one of 10 existing audit handlers,
// plus ontology-runtime, or runs all modes sequentially when mode="all". Each delegated mode call is
// wrapped in try/catch — one failure does NOT abort mode="all".
//
// Handlers own their own validation_phase_completed emission; this facade
// does NOT double-emit. mode="all" emits a single aggregate envelope after
// all sub-audits complete.
//
// Authority:
//   ~/.claude/plans/gleaming-hopping-dijkstra.md §3 Phase 4 W4.A + §6
//   rules/10-events-jsonl.md (5-dim envelope, append-only)
//   rules/26-valuable-data-standard.md §Axis E (procedural + semantic)
//   rules/07-plugins-and-mcp.md (hook-builder scope: bridge/handlers/**)

import { emit, projectRoot as resolveProjectRoot } from "../../scripts/log";

// ─── Mode union ───────────────────────────────────────────────────────────────

export type HealthAuditMode =
  | "handler-usage"
  | "outcome-pair"
  | "memory-layer"
  | "research-citation"
  | "events-5d"
  | "strictness"
  | "doc-drift"
  | "ontology-runtime"
  | "all";

// ─── Input / Output interfaces ────────────────────────────────────────────────

export interface PmHealthAuditArgs {
  /** Absolute project root (defaults to PALANTIR_MINI_PROJECT or cwd). */
  project?: string;
  /** Which sub-audit to run. "all" runs every mode sequentially. */
  mode: HealthAuditMode;
  /**
   * Optional agent name — forwarded to handler-usage sub-audit when mode
   * is "handler-usage" or "all".
   */
  agentName?: string;
  /** Additional pass-through args forwarded to the delegated handler as-is. */
  [key: string]: unknown;
}

export interface PmHealthAuditAllResult {
  results: Record<string, unknown>;
  errors:  Record<string, string>;
  perModeDurationsMs: Record<string, number>;
}

// ─── Handler module paths (relative to this file) ────────────────────────────

const MODULE: Record<Exclude<HealthAuditMode, "all">, string> = {
  "handler-usage":     "./pm-handler-usage-audit",
  "outcome-pair":      "./pm-outcome-pair-audit",
  "memory-layer":      "./pm-memory-layer-audit",
  "research-citation": "./pm-research-citation-validate",
  "events-5d":         "./audit-events-5d-conformance",
  "strictness":        "./pm_harness_strictness_audit",
  "doc-drift":         "./pm-health-audit/doc-drift",
  "ontology-runtime":  "./pm-health-audit/ontology-runtime",
};

const ALL_MODES: Array<Exclude<HealthAuditMode, "all">> = [
  "handler-usage",
  "outcome-pair",
  "memory-layer",
  "research-citation",
  "events-5d",
  "strictness",
  "doc-drift",
  "ontology-runtime",
];

// ─── Single-mode delegation ───────────────────────────────────────────────────

async function runMode(
  mode: Exclude<HealthAuditMode, "all">,
  args: PmHealthAuditArgs,
): Promise<unknown> {
  const mod = await import(MODULE[mode]);
  const handler = mod.default as (rawArgs: unknown) => Promise<unknown>;
  return handler(args);
}

// ─── Default export ───────────────────────────────────────────────────────────

export default async function pmHealthAudit(
  rawArgs: unknown,
): Promise<unknown> {
  const args = (rawArgs ?? {}) as PmHealthAuditArgs;
  const project = args.project ?? resolveProjectRoot();
  const mode    = args.mode;

  if (!mode || typeof mode !== "string") {
    throw new Error(
      'pm_health_audit: "mode" is required. Valid values: ' +
      '"handler-usage" | "outcome-pair" | "memory-layer" | "research-citation" | "events-5d" | ' +
      '"strictness" | "doc-drift" | "ontology-runtime" | "all"',
    );
  }

  const validModes = new Set<string>([...ALL_MODES, "all"]);
  if (!validModes.has(mode)) {
    throw new Error(
      `pm_health_audit: unknown mode "${mode}". Valid values: ${[...validModes].join(" | ")}`,
    );
  }

  // ── Single-mode dispatch ───────────────────────────────────────────────────
  if (mode !== "all") {
    return runMode(mode as Exclude<HealthAuditMode, "all">, { ...args, project });
  }

  // ── mode="all": run every mode sequentially; aggregate with per-mode isolation ──
  const results: Record<string, unknown> = {};
  const errors:  Record<string, string>  = {};
  const perModeDurationsMs: Record<string, number> = {};

  for (const m of ALL_MODES) {
    const t0 = Date.now();
    try {
      results[m] = await runMode(m, { ...args, project });
    } catch (err) {
      errors[m] = err instanceof Error ? err.message : String(err);
    }
    perModeDurationsMs[m] = Date.now() - t0;
  }

  const aggregate: PmHealthAuditAllResult = { results, errors, perModeDurationsMs };

  // Emit a single aggregate envelope for mode="all"
  const totalDurationMs = Object.values(perModeDurationsMs).reduce((a, b) => a + b, 0);
  const modesWithErrors = Object.keys(errors);
  await emit({
    type: "validation_phase_completed",
    payload: {
      phase:      "post_write",
      passed:     modesWithErrors.length === 0,
      errorClass: "health_audit_all",
      modesRun:   ALL_MODES.length,
      modesSucceeded: ALL_MODES.length - modesWithErrors.length,
      modesFailed: modesWithErrors.length,
      failedModes: modesWithErrors,
      totalDurationMs,
      perModeDurationsMs,
    } as Record<string, unknown>,
    toolName:     "pm_health_audit",
    cwd:          project,
    identity:     "monitor",
    memoryLayers: ["procedural", "semantic"],
    reasoning:
      `pm_health_audit mode=all: ${ALL_MODES.length - modesWithErrors.length}/${ALL_MODES.length} succeeded ` +
      `in ${totalDurationMs}ms. Failed: ${modesWithErrors.join(", ") || "none"}.`,
  });

  return aggregate;
}
