// palantir-mini — lib/runtime-overlay/a2-prior.ts
// Sink-1 READ — the A2 (altitude-2 everyday-operation) prior-context consumption point.
//
// PURPOSE: at SessionStart, surface ONE compact additionalContext line summarizing
// the most recent valuable decisions in events.jsonl so the NEXT session opens with
// the prior session's high-signal verdicts already in view — without waiting for the
// promotion/grade pass (which only runs later). This closes the dogfood READ gap:
// a freshly-emitted T2 `lead_decision` must surface NEXT session BY TYPE even before
// any T3 promotion has graded it.
//
// READ-ONLY + TAIL-ONLY: this module NEVER writes (append-only invariant, rule 10 —
// events.jsonl is the SSoT and is not mutated here) and reads ONLY the tail of the
// log (last ~2000 lines) to stay within the SessionStart ~50ms budget. A missing or
// unreadable file degrades to an empty result (best-effort).
//
// Three signals, folded into ONE line:
//   (a) recentT3Plus       — events whose LITERAL valueGrade ∈ {T3,T4} (already-promoted).
//   (b) recentFoldVerdicts — events BY TYPE ∈ {resolution_verdict, memory_fold_committed,
//                            lead_decision} carrying reasoning + refinementTarget. This
//                            BY-TYPE branch is LOAD-BEARING: it surfaces a fresh T2
//                            lead_decision NEXT session before promotion runs.
//   (c) recentOutcomePairs — events carrying lineageRefs.outcomePairId (decision↔outcome).
//
// Authority: rule 10 §append-only (read-only here) + rule 26 §valuable-data (T3+ +
//            outcome-pairing + the BackProp READ side) + the Sink-1 second-brain
//            fold-detect push precedent in hooks/session-start.ts (unconditional inject).

import * as fs from "fs";

// ─── Constants ───────────────────────────────────────────────────────────────

/** Tail window — last N physical lines scanned. Bounds the SessionStart budget. */
export const A2_PRIOR_TAIL_LINES = 2000;

/** Event TYPES the fold-verdict BY-TYPE branch surfaces (the dogfood READ gap). */
const FOLD_VERDICT_TYPES = new Set<string>([
  "resolution_verdict",
  "memory_fold_committed",
  "lead_decision",
]);

/** Per-bucket cap so the single line stays compact. */
const PER_BUCKET_CAP = 3;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface A2PriorT3PlusEntry {
  type: string;
  valueGrade: string;
  reasoning?: string;
}

export interface A2PriorFoldVerdictEntry {
  type: string;
  reasoning?: string;
  /** Free-form refinement-target pointer (filePathOrRid when present). */
  refinementTarget?: string;
}

export interface A2PriorOutcomePairEntry {
  type: string;
  outcomePairId: string;
}

export interface A2PriorResult {
  /** (a) literal valueGrade ∈ {T3,T4}. */
  recentT3Plus: A2PriorT3PlusEntry[];
  /** (b) BY-TYPE fold verdicts (load-bearing dogfood branch). */
  recentFoldVerdicts: A2PriorFoldVerdictEntry[];
  /** (c) events carrying lineageRefs.outcomePairId. */
  recentOutcomePairs: A2PriorOutcomePairEntry[];
  /** Number of physical lines actually scanned (≤ A2_PRIOR_TAIL_LINES). */
  scannedLines: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function asRecord(v: unknown): Record<string, unknown> | undefined {
  return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : undefined;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim().length > 0 ? v : undefined;
}

/**
 * Resolve a free-form refinement-target pointer from withWhat.refinementTarget.
 * The typed RefinementTarget carries filePathOrRid; we surface that (or description)
 * as a short string. Returns undefined when absent.
 */
function refinementTargetPointer(ww: Record<string, unknown> | undefined): string | undefined {
  const rt = asRecord(ww?.["refinementTarget"]);
  if (!rt) return undefined;
  return str(rt["filePathOrRid"]) ?? str(rt["description"]) ?? str(rt["kind"]);
}

/** Truncate reasoning to keep the single line bounded. */
function clip(s: string | undefined, max = 60): string | undefined {
  if (s === undefined) return undefined;
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

// ─── Core read ───────────────────────────────────────────────────────────────

/**
 * TAIL-ONLY read of events.jsonl: parse only the last A2_PRIOR_TAIL_LINES physical
 * lines and bucket them into the three A2-prior signals. Read-only; best-effort.
 *
 * The read deliberately operates on raw `Record<string, unknown>` rows (NOT the
 * EventEnvelope discriminated union) so the BY-TYPE branch surfaces event types —
 * like `lead_decision` — that are not (yet) registered union variants. That is the
 * whole point of the dogfood READ gap: a fresh T2 lead_decision must surface NEXT
 * session by TYPE, before any promotion grades it into the union.
 */
export function readA2Prior(eventsPath: string): A2PriorResult {
  const empty: A2PriorResult = {
    recentT3Plus: [],
    recentFoldVerdicts: [],
    recentOutcomePairs: [],
    scannedLines: 0,
  };

  let content: string;
  try {
    if (!fs.existsSync(eventsPath)) return empty;
    content = fs.readFileSync(eventsPath, "utf8");
  } catch {
    return empty; // best-effort on missing / unreadable file
  }

  // TAIL-ONLY: keep just the last N non-empty lines — bounds parse cost.
  const lines = content.split("\n").filter((l) => l.trim().length > 0).slice(-A2_PRIOR_TAIL_LINES);

  const recentT3Plus: A2PriorT3PlusEntry[] = [];
  const recentFoldVerdicts: A2PriorFoldVerdictEntry[] = [];
  const recentOutcomePairs: A2PriorOutcomePairEntry[] = [];

  for (const l of lines) {
    let ev: Record<string, unknown>;
    try {
      const parsed = JSON.parse(l);
      const rec = asRecord(parsed);
      if (!rec) continue;
      ev = rec;
    } catch {
      continue; // skip malformed (read.ts owns quarantine; we never write)
    }

    const type = str(ev["type"]) ?? "";
    const ww = asRecord(ev["withWhat"]);
    const reasoning = str(ww?.["reasoning"]);

    // (a) literal valueGrade ∈ {T3,T4}
    const grade = ev["valueGrade"];
    if (grade === "T3" || grade === "T4") {
      recentT3Plus.push({ type, valueGrade: grade, ...(reasoning ? { reasoning } : {}) });
    }

    // (b) BY-TYPE fold verdicts (load-bearing — surfaces fresh T2 lead_decision)
    if (FOLD_VERDICT_TYPES.has(type)) {
      const refinementTarget = refinementTargetPointer(ww);
      recentFoldVerdicts.push({
        type,
        ...(reasoning ? { reasoning } : {}),
        ...(refinementTarget ? { refinementTarget } : {}),
      });
    }

    // (c) outcome-pairs: lineageRefs.outcomePairId present
    const outcomePairId = str(asRecord(ev["lineageRefs"])?.["outcomePairId"]);
    if (outcomePairId) {
      recentOutcomePairs.push({ type, outcomePairId });
    }
  }

  // Keep only the most-recent PER_BUCKET_CAP per bucket (tail of each).
  return {
    recentT3Plus: recentT3Plus.slice(-PER_BUCKET_CAP),
    recentFoldVerdicts: recentFoldVerdicts.slice(-PER_BUCKET_CAP),
    recentOutcomePairs: recentOutcomePairs.slice(-PER_BUCKET_CAP),
    scannedLines: lines.length,
  };
}

// ─── Context-line formatter ────────────────────────────────────────────────

/**
 * Format the A2-prior result into ONE compact `[A2-prior] …` additionalContext
 * line, or "" when there is nothing to surface. Callers push only the non-empty line.
 */
export function formatA2PriorLine(r: A2PriorResult): string {
  const segs: string[] = [];

  if (r.recentFoldVerdicts.length > 0) {
    const items = r.recentFoldVerdicts
      .map((v) => {
        const why = clip(v.reasoning);
        const tgt = v.refinementTarget ? `→${v.refinementTarget}` : "";
        return why ? `${v.type}(${why}${tgt})` : `${v.type}${tgt ? `(${tgt})` : ""}`;
      })
      .join(", ");
    segs.push(`verdicts: ${items}`);
  }

  if (r.recentT3Plus.length > 0) {
    const items = r.recentT3Plus
      .map((e) => {
        const why = clip(e.reasoning, 40);
        return why ? `${e.valueGrade}:${e.type}(${why})` : `${e.valueGrade}:${e.type}`;
      })
      .join(", ");
    segs.push(`T3+: ${items}`);
  }

  if (r.recentOutcomePairs.length > 0) {
    const items = r.recentOutcomePairs.map((p) => `${p.type}#${p.outcomePairId}`).join(", ");
    segs.push(`outcome-pairs: ${items}`);
  }

  if (segs.length === 0) return "";
  return `[A2-prior] ${segs.join(" | ")}`;
}

/**
 * One-shot convenience: tail-read events.jsonl + format. Returns "" on nothing /
 * missing file so the SessionStart caller can push unconditionally yet inject only
 * the non-empty line (mirrors the second-brain fold-detect push precedent).
 */
export function a2PriorContextLine(eventsPath: string): string {
  return formatA2PriorLine(readA2Prior(eventsPath));
}
