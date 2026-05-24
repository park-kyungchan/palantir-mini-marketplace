// palantir-mini v4.1.0 — MCP tool handler: pm_memory_layer_audit
// Domain: LEARN (rule 26 §Axis E — agentic memory layer balance audit)
//
// Reads project events.jsonl + groups by event type + counts memoryLayer
// occurrences across 4 layers (working / episodic / semantic / procedural).
// Flags T2+ envelopes missing layers; surfaces per-event-type layer stats
// + recommendations for under-represented layers.
//
// Authority: ~/.claude/rules/26-valuable-data-standard.md §Axis E
//            ~/.claude/schemas/ontology/primitives/agentic-memory-layer.ts
//            ~/.claude/plans/quiet-fluttering-garden.md §Phase 3.4

import * as fs from "fs";
import * as path from "path";
import { readEvents } from "../../lib/event-log/read";
import {
  AGENTIC_MEMORY_LAYERS,
  type AgenticMemoryLayer,
} from "#schemas/ontology/primitives/agentic-memory-layer";
import type { EventEnvelope } from "../../lib/event-log/types";

interface PmMemoryLayerAuditArgs {
  project:    string;
  sinceWhen?: string;
}

type LayerStats = Record<AgenticMemoryLayer, number>;

interface StaleMemoryFile {
  /** Path relative to project root */
  path:          string;
  /** Mapped agentic memory layer (from frontmatter type field) */
  layer:         AgenticMemoryLayer;
  /** ISO8601 mtime */
  mtime:         string;
  /** Days since last modification */
  ageDays:       number;
  /** Frontmatter type field (user/feedback/project/reference) if parseable */
  memoryType?:   string;
}

interface PmMemoryLayerAuditResult {
  totalEvents:              number;
  layerDistribution:        LayerStats;
  t2PlusEvents:             number;
  t2PlusMissingLayers:      number;
  t2PlusMissingRatio:       number;
  perEventTypeLayerStats:   Record<string, LayerStats>;
  t2PlusMissingByType:      Record<string, number>;
  recommendations:          string[];
  /** sprint-055 W3.B — file-level staleness (mtime > 30 days ago) */
  staleMemoryFiles?:        StaleMemoryFile[];
  /** sprint-055 W3.B — per-axis staleness count (working/episodic/semantic/procedural) */
  staleByLayer?:            LayerStats;
}

function emptyLayerStats(): LayerStats {
  return { working: 0, episodic: 0, semantic: 0, procedural: 0 };
}

function isT2Plus(grade: string | undefined): boolean {
  return grade === "T2" || grade === "T3" || grade === "T4";
}

/**
 * sprint-055 W3.B — map memory file `type` frontmatter to AgenticMemoryLayer.
 * Heuristic per CLAUDE.md auto-memory schema:
 *   - `user`      → semantic   (durable knowledge about the operator)
 *   - `feedback`  → procedural (how-to-collaborate guidance)
 *   - `project`   → episodic   (specific project state at a moment)
 *   - `reference` → semantic   (external pointer durable knowledge)
 * Unknown types default to `semantic` (the broadest layer).
 */
function memoryTypeToLayer(memoryType: string | undefined): AgenticMemoryLayer {
  switch ((memoryType ?? "").toLowerCase()) {
    case "user":      return "semantic";
    case "feedback":  return "procedural";
    case "project":   return "episodic";
    case "reference": return "semantic";
    default:          return "semantic";
  }
}

/**
 * sprint-055 W3.B — locate the memory directory for a project.
 * Convention: <project>/.claude/projects/-<sanitized-project-path>/memory/
 * For the home root: .claude/projects/-home-palantirkc/memory/
 */
function memoryDirFor(project: string): string {
  const sanitized = project.replace(/^\//, "").replace(/[\/\\]+/g, "-");
  return path.join(project, ".claude", "projects", `-${sanitized}`, "memory");
}

const STALE_MEMORY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * sprint-055 W3.B — walk memory dir, stat mtimes, parse `type` frontmatter,
 * flag files modified > 30 days ago. Best-effort: missing dir or unparseable
 * frontmatter degrades gracefully (returns empty result).
 */
function collectStaleMemoryFiles(project: string): { files: StaleMemoryFile[]; byLayer: LayerStats } {
  const dir = memoryDirFor(project);
  const byLayer = emptyLayerStats();
  const files: StaleMemoryFile[] = [];

  if (!fs.existsSync(dir)) return { files, byLayer };

  const now = Date.now();
  let entries: string[];
  try {
    entries = fs.readdirSync(dir).filter((f) => f.endsWith(".md") && f !== "MEMORY.md");
  } catch {
    return { files, byLayer };
  }

  for (const entry of entries) {
    const full = path.join(dir, entry);
    let stat: fs.Stats;
    try {
      stat = fs.statSync(full);
    } catch {
      continue;
    }

    const ageMs = now - stat.mtimeMs;
    if (ageMs < STALE_MEMORY_WINDOW_MS) continue; // fresh — skip

    // Parse frontmatter `type` field (best-effort regex)
    let memoryType: string | undefined;
    try {
      const content = fs.readFileSync(full, "utf8");
      const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (fmMatch) {
        const typeMatch = fmMatch[1]!.match(/^type:\s*(\S+)/m);
        if (typeMatch) memoryType = typeMatch[1];
      }
    } catch {
      // best-effort
    }

    const layer = memoryTypeToLayer(memoryType);
    byLayer[layer] += 1;
    files.push({
      path:        path.relative(project, full),
      layer,
      mtime:       new Date(stat.mtimeMs).toISOString(),
      ageDays:     Math.floor(ageMs / (24 * 60 * 60 * 1000)),
      memoryType,
    });
  }

  return { files, byLayer };
}

export default async function pmMemoryLayerAudit(
  rawArgs: unknown,
): Promise<PmMemoryLayerAuditResult> {
  const args = (rawArgs ?? {}) as PmMemoryLayerAuditArgs;
  if (!args.project || typeof args.project !== "string") {
    throw new Error("pm_memory_layer_audit: `project` is required");
  }

  const eventsPath = path.join(args.project, ".palantir-mini", "session", "events.jsonl");
  const layerDistribution = emptyLayerStats();
  const perEventTypeLayerStats: Record<string, LayerStats> = {};
  const t2PlusMissingByType: Record<string, number> = {};
  let totalEvents = 0;
  let t2PlusEvents = 0;
  let t2PlusMissingLayers = 0;

  if (!fs.existsSync(eventsPath)) {
    // sprint-055 W3.B — even with no events, stale-memory check still runs (file mtime is the source of truth, not event log)
    const { files: staleMemoryFiles, byLayer: staleByLayer } = collectStaleMemoryFiles(args.project);
    return {
      totalEvents: 0,
      layerDistribution,
      t2PlusEvents: 0,
      t2PlusMissingLayers: 0,
      t2PlusMissingRatio: 0,
      perEventTypeLayerStats: {},
      t2PlusMissingByType: {},
      recommendations: staleMemoryFiles.length > 0
        ? [`No events yet. ${staleMemoryFiles.length} stale memory file(s) found.`]
        : ["No events yet."],
      staleMemoryFiles,
      staleByLayer,
    };
  }

  const events = readEvents(eventsPath);

  for (const ev of events) {
    const env = ev as EventEnvelope;
    if (args.sinceWhen && typeof env.when === "string" && env.when < args.sinceWhen) continue;

    totalEvents += 1;
    const eventType = env.type;
    if (!perEventTypeLayerStats[eventType]) {
      perEventTypeLayerStats[eventType] = emptyLayerStats();
    }

    const layers = env.withWhat?.memoryLayers;
    if (Array.isArray(layers)) {
      for (const l of layers) {
        if ((AGENTIC_MEMORY_LAYERS as readonly string[]).includes(l)) {
          const layer = l as AgenticMemoryLayer;
          layerDistribution[layer] += 1;
          perEventTypeLayerStats[eventType]![layer] += 1;
        }
      }
    }

    if (isT2Plus(env.valueGrade)) {
      t2PlusEvents += 1;
      if (!Array.isArray(layers) || layers.length === 0) {
        t2PlusMissingLayers += 1;
        t2PlusMissingByType[eventType] = (t2PlusMissingByType[eventType] ?? 0) + 1;
      }
    }
  }

  const t2PlusMissingRatio = t2PlusEvents > 0 ? t2PlusMissingLayers / t2PlusEvents : 0;

  // Recommendations
  const recommendations: string[] = [];
  const total = layerDistribution.working + layerDistribution.episodic +
    layerDistribution.semantic + layerDistribution.procedural;
  if (total === 0) {
    recommendations.push("No memoryLayer tags found — start tagging T2+ envelopes per rule 26 §Axis E.");
  } else {
    for (const layer of AGENTIC_MEMORY_LAYERS) {
      const ratio = layerDistribution[layer] / total;
      if (ratio < 0.10) {
        recommendations.push(
          `Layer "${layer}" under-represented (${(ratio * 100).toFixed(1)}% of all tags). ` +
          `Audit which event types should refine ${layer} memory.`,
        );
      }
    }
  }
  if (t2PlusMissingRatio > 0.20) {
    recommendations.push(
      `T2+ envelopes missing memoryLayers: ${(t2PlusMissingRatio * 100).toFixed(1)}% > 20%. ` +
      `Check value-grade-assigner / memory-layer-validator hooks; verify auto-tag heuristics in memory-layer-validator.ts cover top missing types.`,
    );
  }
  // Top 3 missing types
  const sortedMissing = Object.entries(t2PlusMissingByType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  if (sortedMissing.length > 0) {
    recommendations.push(
      `Top T2+ missing-layer types: ${sortedMissing.map(([k, v]) => `${k}(${v})`).join(", ")}.`,
    );
  }

  // sprint-055 W3.B — staleness (mtime > 30d ago) by layer
  const { files: staleMemoryFiles, byLayer: staleByLayer } = collectStaleMemoryFiles(args.project);
  if (staleMemoryFiles.length > 0) {
    recommendations.push(
      `Stale memory files (mtime > 30d): ${staleMemoryFiles.length} (${Object.entries(staleByLayer).filter(([, n]) => n > 0).map(([k, n]) => `${k}=${n}`).join(", ")}). Review via /palantir-mini:pm-rule-memory-prune.`,
    );
  }

  return {
    totalEvents,
    layerDistribution,
    t2PlusEvents,
    t2PlusMissingLayers,
    t2PlusMissingRatio,
    perEventTypeLayerStats,
    t2PlusMissingByType,
    recommendations,
    staleMemoryFiles,
    staleByLayer,
  };
}
