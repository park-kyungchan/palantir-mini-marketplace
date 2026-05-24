/**
 * palantir-mini v2.6.0 — Producer: lineage
 * @owner palantirkc-plugin-learn
 * @purpose Scans events.jsonl co-change history → emits lineage:cochange.* nodes + lineage-cochange edges.
 *
 * Read-only. No subprocess. No setInterval. No fs.watch.
 * PR #145 tail-resilient pattern: skip malformed JSON lines, never error.
 */
// Domain: LEARN | Authority: plan §Wave 3 · W3.3 | Wave 3 MVP.

import * as fs from "fs";
import * as path from "path";
import { semanticRid } from "#schemas/ontology/primitives/semantic-rid";
import type {
  ProducerContext, ProducerResult, SemanticEdge, SemanticNode,
} from "./types";

const MAX_LINES = 5000;
const MIN_COCHANGE = 3;
const WINDOW_DAYS = 14;

/** Event types that carry file evidence we care about. */
const FILE_EVENT_TYPES = new Set(["edit_committed", "edit_proposed"]);

interface RawEvent {
  type?: unknown;
  when?: unknown;
  payload?: {
    sessionId?: unknown;
    file?: unknown;
    files?: unknown;
    filePath?: unknown;
    filePaths?: unknown;
  };
}

/** Extract a sessionId from an event payload. Falls back to the ISO date hour (YYYY-MM-DDTHH) as a coarse session bucket. */
function extractSessionId(ev: RawEvent): string | null {
  const p = ev.payload;
  if (!p) return null;
  if (typeof p.sessionId === "string" && p.sessionId.length > 0) return p.sessionId;
  // Fallback: hour-bucket from `when`
  if (typeof ev.when === "string") return ev.when.slice(0, 13); // "2026-04-23T14"
  return null;
}

/** Extract file path(s) from a payload — handles file, files, filePath, filePaths variants. */
function extractFiles(ev: RawEvent): string[] {
  const p = ev.payload;
  if (!p) return [];
  const candidates: string[] = [];
  if (typeof p.file === "string")      candidates.push(p.file);
  if (typeof p.filePath === "string")  candidates.push(p.filePath);
  if (Array.isArray(p.files))          candidates.push(...(p.files as string[]).filter((f) => typeof f === "string"));
  if (Array.isArray(p.filePaths))      candidates.push(...(p.filePaths as string[]).filter((f) => typeof f === "string"));
  // Deduplicate
  return [...new Set(candidates)];
}

/** Parse events.jsonl: returns up to MAX_LINES lines within the 14-day window, skipping malformed JSON. */
function loadEvents(eventsPath: string): RawEvent[] {
  if (!fs.existsSync(eventsPath)) return [];
  const content = fs.readFileSync(eventsPath, "utf8");
  const lines = content.split("\n").filter((l) => l.trim().length > 0);

  const cutoff = Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const events: RawEvent[] = [];

  // Walk from the end — most-recent first — and cap at MAX_LINES
  const start = Math.max(0, lines.length - MAX_LINES);
  for (let i = lines.length - 1; i >= start; i--) {
    const raw = lines[i]!;
    if (!raw.startsWith("{")) continue; // fast-reject non-JSON (PR #145 pattern)
    let ev: RawEvent;
    try {
      ev = JSON.parse(raw) as RawEvent;
    } catch {
      continue; // skip malformed
    }
    // 14-day window filter
    if (typeof ev.when === "string") {
      const ts = Date.parse(ev.when);
      if (!Number.isNaN(ts) && ts < cutoff) break; // older than window — stop (events are ordered)
    }
    events.push(ev);
  }

  return events;
}

export async function runProducerLineage(ctx: ProducerContext): Promise<ProducerResult> {
  const t0 = Date.now();
  const nodes: SemanticNode[] = [];
  const edges: SemanticEdge[] = [];
  const uncertainties: string[] = [];
  const scannedAt = new Date().toISOString();

  const eventsPath = path.join(ctx.projectRoot, ".palantir-mini", "session", "events.jsonl");
  const rawEvents = loadEvents(eventsPath);

  if (rawEvents.length === 0) {
    uncertainties.push(`no events within ${WINDOW_DAYS}-day window in ${eventsPath}`);
    return { producer: "lineage", nodes, edges, uncertainties, durationMs: Date.now() - t0 };
  }

  // Group files by sessionId — only for edit_committed + edit_proposed events
  const sessionFiles = new Map<string, Set<string>>();

  for (const ev of rawEvents) {
    if (!FILE_EVENT_TYPES.has(String(ev.type ?? ""))) continue;
    const sessionId = extractSessionId(ev);
    if (!sessionId) continue;
    const files = extractFiles(ev);
    if (files.length === 0) continue;

    if (!sessionFiles.has(sessionId)) sessionFiles.set(sessionId, new Set());
    const bucket = sessionFiles.get(sessionId)!;
    for (const f of files) bucket.add(f);
  }

  // Count co-change pairs across sessions
  const pairCounts = new Map<string, number>();

  for (const fileSet of sessionFiles.values()) {
    const fileArr = [...fileSet];
    for (let i = 0; i < fileArr.length; i++) {
      for (let j = i + 1; j < fileArr.length; j++) {
        // Canonical key: lexicographically sorted pair
        const a = fileArr[i]!;
        const b = fileArr[j]!;
        const key = a < b ? `${a}\0${b}` : `${b}\0${a}`;
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
      }
    }
  }

  // Emit nodes + edges for pairs meeting MIN_COCHANGE threshold
  const emittedNodes = new Set<string>();

  for (const [key, count] of pairCounts) {
    if (count < MIN_COCHANGE) continue;

    const [fileA, fileB] = key.split("\0") as [string, string];

    const ridA = semanticRid("lineage", `cochange.${fileA}`);
    const ridB = semanticRid("lineage", `cochange.${fileB}`);

    if (!emittedNodes.has(String(ridA))) {
      emittedNodes.add(String(ridA));
      nodes.push({
        decl: { rid: ridA, kind: "lineage", value: `cochange.${fileA}`, label: fileA, registeredAt: scannedAt },
        discoveredBy: ["lineage"],
      });
    }
    if (!emittedNodes.has(String(ridB))) {
      emittedNodes.add(String(ridB));
      nodes.push({
        decl: { rid: ridB, kind: "lineage", value: `cochange.${fileB}`, label: fileB, registeredAt: scannedAt },
        discoveredBy: ["lineage"],
      });
    }

    const edge: SemanticEdge = {
      fromRid: ridA,
      toRid: ridB,
      edgeKind: "lineage-cochange",
      confidence: Math.min(1.0, count / (MIN_COCHANGE * 2)), // scale 0..1; saturates at 2× threshold
      evidenceKind: "semantic",
      evidence: `co-changed in ${count} session(s) (14d window)`,
      producer: "lineage",
    };
    edges.push(edge);
  }

  if (nodes.length === 0) {
    uncertainties.push(
      `no file pairs with co-change count >= ${MIN_COCHANGE} in ${WINDOW_DAYS}-day window (${sessionFiles.size} sessions scanned)`
    );
  }

  return { producer: "lineage", nodes, edges, uncertainties, durationMs: Date.now() - t0 };
}
