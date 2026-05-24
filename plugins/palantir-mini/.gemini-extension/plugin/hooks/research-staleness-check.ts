// palantir-mini v4.5.0 — research-staleness-check hook (sprint-030 W1.C)
// Fires on: SessionStart (advisory, async)
//
// Reads MANIFEST.json files under ~/.claude/research/<topic>/ and emits
// `skill_invocation_suggested` envelope (via lib/skill-suggestion-emit) for
// each entry whose lastFetchedAt + expectedRefreshDays has elapsed.
//
// Authority: rule 02 v3.1.0 §Research retrieval, rule 26 v1.0.0 §Axis A3.
// Schema primitive: ResearchSourceManifest (schemas v1.39.0+).

import * as fs from "fs";
import * as path from "path";
import { emitSkillSuggestion } from "../lib/skill-suggestion-emit";
import {
  isResearchSourceManifest,
  type ResearchSource,
} from "#schemas/ontology/primitives/research-source-manifest";

interface HookPayload {
  cwd?: string;
}

interface HookResult {
  message: string;
  decision?: "continue";
  additionalContext?: string;
}

/** Hard-coded list of MANIFEST.json paths to scan. Future: walk research/ dir. */
const MANIFEST_PATHS: readonly string[] = [
  "/home/palantirkc/.claude/research/palantir-foundry/MANIFEST.json",
  "/home/palantirkc/.claude/research/anthropic/MANIFEST.json",
  "/home/palantirkc/.claude/research/palantir-vision/aipcon-devcon/MANIFEST.json",
  "/home/palantirkc/.claude/research/claude-code/MANIFEST.json",
];

interface StaleEntry {
  manifestPath: string;
  source: ResearchSource;
  daysSinceLastFetch: number;
}

function loadManifest(manifestPath: string): { sources: readonly ResearchSource[] } | null {
  try {
    const raw = fs.readFileSync(manifestPath, "utf8");
    const parsed = JSON.parse(raw);
    if (!isResearchSourceManifest(parsed)) return null;
    return { sources: parsed.sources };
  } catch {
    return null;
  }
}

function findStale(now: number): StaleEntry[] {
  const stale: StaleEntry[] = [];
  for (const manifestPath of MANIFEST_PATHS) {
    const manifest = loadManifest(manifestPath);
    if (manifest === null) continue;
    for (const source of manifest.sources) {
      const fetchedAt = Date.parse(source.lastFetchedAt);
      if (Number.isNaN(fetchedAt)) continue;
      const daysSince = (now - fetchedAt) / 86_400_000;
      if (daysSince > source.expectedRefreshDays) {
        stale.push({ manifestPath, source, daysSinceLastFetch: daysSince });
      }
    }
  }
  return stale;
}

export default async function researchStalenessCheck(
  payload: unknown,
): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();

  const stale = findStale(Date.now());
  if (stale.length === 0) {
    return {
      message: "palantir-mini: research-staleness-check (no stale sources)",
      decision: "continue",
    };
  }

  const top3 = stale.slice(0, 3);
  const advisory = [
    `[research-staleness advisory] ${stale.length} source(s) past their expected refresh window:`,
    ...top3.map(
      (e) =>
        `  - ${path.basename(path.dirname(e.manifestPath))}: ${e.source.mirrorPath} (${Math.round(e.daysSinceLastFetch)}d / ${e.source.expectedRefreshDays}d expected, class=${e.source.refreshClass})`,
    ),
    stale.length > 3 ? `  ...and ${stale.length - 3} more.` : "",
    "Consider /palantir-mini:pm-research-staleness-audit (full audit) or /palantir-mini:pm-research-refresh (refresh stale entries).",
  ]
    .filter((s) => s.length > 0)
    .join("\n");

  // Persist suggestion as 5-dim event so future BackProp can replay.
  await emitSkillSuggestion({
    suggestedSkillSlug: "pm-research-staleness-audit",
    suggestedByHook: "research-staleness-check",
    triggerCondition: `${stale.length} source(s) past expectedRefreshDays`,
    suggestionContext: top3.map((e) => e.source.mirrorPath).join(","),
    memoryLayers: ["semantic", "procedural"],
    cwd,
  });

  return {
    message: `palantir-mini: research-staleness-check (${stale.length} stale; advisory)`,
    decision: "continue",
    additionalContext: advisory,
  };
}
