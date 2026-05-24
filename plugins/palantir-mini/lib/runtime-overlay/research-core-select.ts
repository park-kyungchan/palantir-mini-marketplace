// palantir-mini — lib/runtime-overlay/research-core-select.ts
// R-ID A.W4.a — research resolver with external SSoT primary
//
// Authority: rule 02 §Manifest-driven staleness audit (research freshness pattern)
//
// Resolver pattern:
//   1. Prefer the plugin-vendored runtime-overlay by default so the plugin is
//      portable when carried without ~/.claude/research.
//   2. Read external MANIFEST.json or _manifest.json for freshness/currentness
//      notes when the external SSoT is present.
//   3. Use external ~/.claude/research/<topic>/ only when
//      PALANTIR_MINI_DEV_PREFER_EXTERNAL_RESEARCH=1, or when no plugin snapshot
//      exists for the topic.
//   4. Callers get the same ResearchFile[] shape regardless of source.
//
// Freshness check:
//   - A topic is fresh when its MANIFEST.json/_manifest.json exists AND the
//     most recent fetched/verified entry is within FRESHNESS_THRESHOLD_MS.
//   - Threshold is configurable via PALANTIR_MINI_RESEARCH_STALE_DAYS env
//     (default: 14 days).

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { resolvePalantirMiniRoot } from "../config/root";

// ─── Types ───────────────────────────────────────────────────────────────────

/** A resolved research file with its absolute path and origin label. */
export interface ResearchFile {
  /** Absolute path to the file. */
  path: string;
  /** Human-readable label for this file (e.g. "BROWSE.md", "INDEX.md"). */
  label: string;
  /** Whether the file actually exists on disk. */
  exists: boolean;
}

export type ResearchAuthorityMode =
  | "plugin-portable"
  | "external-preferred"
  | "external-required";

export type ResearchSourceReadiness = "ready" | "fallback" | "blocked";

/** Shape returned by resolveResearchAnchor. */
export interface ResearchAnchorResult {
  /** Resolved files for this topic. */
  files: ResearchFile[];
  /** Resolved source. */
  source: "plugin-snapshot" | "external-ssot" | "external-dev-override";
  /** Detailed source provenance for audit and self-check output. */
  provenance: "plugin-default" | "external-ssot" | "external-dev-override" | "missing" | "version-mismatch";
  /** ISO8601 timestamp of the most recent lastFetchedAt found in MANIFEST.json, or null if no manifest. */
  lastFetchedAt: string | null;
  /** Staleness age in milliseconds relative to Date.now(), or null if no manifest. */
  staleMs: number | null;
  /** SSoT policy requested by the caller after env overrides are applied. */
  authorityMode: ResearchAuthorityMode;
  /** True only when the selected source satisfies the requested authority mode. */
  ssotSatisfied: boolean;
  /** Whether the caller can rely on the selected source without an authority/currentness gap. */
  sourceReadiness: ResearchSourceReadiness;
  /** Why resolver fell back away from the requested authority, when applicable. */
  fallbackReason?: string;
  /** Currentness or live-refresh gap that must be disclosed to the user, when applicable. */
  currentnessGap?: string;
}

export interface ResearchAnchorOptions {
  readonly authorityMode?: ResearchAuthorityMode;
}

/** Minimal shape of a MANIFEST.json/_manifest.json source entry we care about. */
interface ManifestSource {
  lastFetchedAt?: string;
  lastVerified?: string;
  fetchedAt?: string;
  fetched?: string;
  sourceLastmod?: string | null;
  [k: string]: unknown;
}

/** Minimal shape of a MANIFEST.json/_manifest.json file. */
interface Manifest {
  sources?: ManifestSource[];
  docs?: ManifestSource[];
  entries?: ManifestSource[];
  generatedAt?: string;
  generated?: string;
  [k: string]: unknown;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_STALE_DAYS = 14;
const MS_PER_DAY = 86_400_000;

// Standard file labels emitted for every topic.
const STANDARD_ANCHORS = ["BROWSE.md", "INDEX.md"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Parse a manifest at the given path. Returns null on parse failure. */
function readManifestFile(manifestPath: string): Manifest | null {
  if (!fs.existsSync(manifestPath)) return null;
  try {
    const raw = fs.readFileSync(manifestPath, "utf8");
    return JSON.parse(raw) as Manifest;
  } catch {
    return null;
  }
}

function readManifest(dir: string): Manifest | null {
  for (const filename of ["MANIFEST.json", "_manifest.json"]) {
    const manifest = readManifestFile(path.join(dir, filename));
    if (manifest !== null) return manifest;
  }
  return null;
}

/**
 * Find the most recent fetched/verified timestamp across all source entries.
 * Returns null when no timestamp is present.
 */
function mostRecentFetchedAt(manifest: Manifest): string | null {
  const sources = [
    ...(manifest.sources ?? []),
    ...(manifest.docs ?? []),
    ...(manifest.entries ?? []),
  ];
  let latest: string | null = null;
  for (const s of sources) {
    const candidate =
      s.lastFetchedAt ??
      s.lastVerified ??
      s.fetchedAt ??
      s.fetched ??
      s.sourceLastmod ??
      null;
    if (typeof candidate === "string" && candidate.length > 0) {
      if (latest === null || candidate > latest) latest = candidate;
    }
  }
  return latest ?? manifest.generatedAt ?? manifest.generated ?? null;
}

/** Compute staleness threshold in ms from env or default. */
function staleThresholdMs(): number {
  const envDays = parseInt(process.env.PALANTIR_MINI_RESEARCH_STALE_DAYS ?? "", 10);
  const days = Number.isFinite(envDays) && envDays > 0 ? envDays : DEFAULT_STALE_DAYS;
  return days * MS_PER_DAY;
}

/**
 * Determine whether the external research directory for a given topic is fresh.
 *
 * Returns { fresh: boolean, lastFetchedAt, staleMs }:
 *   - fresh=false when MANIFEST.json missing.
 *   - fresh=false when no lastFetchedAt found in manifest.
 *   - fresh=true when most recent lastFetchedAt is within threshold.
 */
function checkExternalFreshness(
  externalTopicDir: string,
): { fresh: boolean; lastFetchedAt: string | null; staleMs: number | null } {
  const manifest = readManifest(externalTopicDir);

  if (manifest === null) {
    return { fresh: false, lastFetchedAt: null, staleMs: null };
  }

  const lastFetchedAt = mostRecentFetchedAt(manifest);
  if (lastFetchedAt === null) {
    return { fresh: false, lastFetchedAt: null, staleMs: null };
  }

  const fetchedMs = new Date(lastFetchedAt).getTime();
  const staleMs = Date.now() - fetchedMs;
  const threshold = staleThresholdMs();

  return {
    fresh: staleMs <= threshold,
    lastFetchedAt,
    staleMs,
  };
}

/** Build ResearchFile[] for a given directory with the standard anchors. */
function buildFileList(dir: string): ResearchFile[] {
  return STANDARD_ANCHORS.map((label) => {
    const fullPath = path.join(dir, label);
    return { path: fullPath, label, exists: fs.existsSync(fullPath) };
  });
}

function missingExternalReason(topic: string): string {
  return `External ~/.claude/research/${topic} BROWSE.md/INDEX.md anchors were not available.`;
}

function pluginSnapshotCurrentnessGap(topic: string): string {
  return (
    `External research SSoT for topic "${topic}" was not selected; plugin snapshot ` +
    "currentness does not prove live official-doc freshness."
  );
}

// ─── Main resolver ───────────────────────────────────────────────────────────

const HOME = process.env.HOME ?? os.homedir();
const PLUGIN_ROOT = resolvePalantirMiniRoot();

/**
 * Resolve research anchor files for a given topic.
 *
 * Uses the plugin-owned research-library snapshot by default. External research
 * is used only for development refresh flows when explicitly requested.
 *
 * @param query  Human-readable query string (informational; used in future logging).
 * @param topic  Research topic directory name (e.g. "claude-code").
 */
export async function resolveResearchAnchor(
  query: string,
  topic: string,
  options: ResearchAnchorOptions = {},
): Promise<ResearchAnchorResult> {
  if (typeof topic !== "string" || topic.trim().length === 0) {
    throw new Error("resolveResearchAnchor: topic must be a non-empty string");
  }

  const externalTopicDir = path.join(HOME, ".claude", "research", topic);
  const pluginTopicDir = path.join(
    PLUGIN_ROOT,
    "runtime-overlay",
    "research-library",
    topic,
  );
  const legacyPluginTopicDir = path.join(
    PLUGIN_ROOT,
    "runtime-overlay",
    "research-core",
    topic,
  );

  void query;
  const forcePlugin = process.env.PALANTIR_MINI_PREFER_PLUGIN_RESEARCH === "1";
  const preferExternal = process.env.PALANTIR_MINI_DEV_PREFER_EXTERNAL_RESEARCH === "1";
  const requestedAuthorityMode = options.authorityMode ?? "plugin-portable";
  const authorityMode: ResearchAuthorityMode = forcePlugin
    ? "plugin-portable"
    : requestedAuthorityMode;
  const { lastFetchedAt, staleMs } = checkExternalFreshness(externalTopicDir);
  const hasExternalAnchors = STANDARD_ANCHORS.some((label) =>
    fs.existsSync(path.join(externalTopicDir, label)),
  );
  const selectedPluginDir = fs.existsSync(pluginTopicDir) ? pluginTopicDir : legacyPluginTopicDir;
  const hasPluginAnchors = STANDARD_ANCHORS.some((label) =>
    fs.existsSync(path.join(selectedPluginDir, label)),
  );

  if (
    !forcePlugin &&
    (preferExternal ||
      authorityMode === "external-preferred" ||
      authorityMode === "external-required") &&
    hasExternalAnchors
  ) {
    return {
      files: buildFileList(externalTopicDir),
      source: preferExternal ? "external-dev-override" : "external-ssot",
      provenance: preferExternal ? "external-dev-override" : "external-ssot",
      lastFetchedAt,
      staleMs,
      authorityMode,
      ssotSatisfied: true,
      sourceReadiness: "ready",
    };
  }

  if (!forcePlugin && authorityMode === "external-required") {
    return {
      files: buildFileList(selectedPluginDir),
      source: "plugin-snapshot",
      provenance: hasExternalAnchors ? "version-mismatch" : "missing",
      lastFetchedAt,
      staleMs,
      authorityMode,
      ssotSatisfied: false,
      sourceReadiness: "blocked",
      fallbackReason: missingExternalReason(topic),
      currentnessGap: pluginSnapshotCurrentnessGap(topic),
    };
  }

  if (hasPluginAnchors) {
    const fallbackToPlugin = !forcePlugin && authorityMode === "external-preferred";
    return {
      files: buildFileList(selectedPluginDir),
      source: "plugin-snapshot",
      provenance: hasExternalAnchors ? "plugin-default" : "missing",
      lastFetchedAt,
      staleMs,
      authorityMode,
      ssotSatisfied: !fallbackToPlugin,
      sourceReadiness: fallbackToPlugin ? "fallback" : "ready",
      ...(fallbackToPlugin ? { fallbackReason: missingExternalReason(topic) } : {}),
      ...(fallbackToPlugin ? { currentnessGap: pluginSnapshotCurrentnessGap(topic) } : {}),
    };
  }

  if (hasExternalAnchors) {
    return {
      files: buildFileList(externalTopicDir),
      source: "external-ssot",
      provenance: "external-ssot",
      lastFetchedAt,
      staleMs,
      authorityMode,
      ssotSatisfied: true,
      sourceReadiness: "ready",
    };
  }

  // Fallback: use plugin-vendored research-library anchor, with legacy
  // research-core fallback for old bundles.
  return {
    files: buildFileList(selectedPluginDir),
    source: "plugin-snapshot",
    provenance: hasExternalAnchors ? "version-mismatch" : (lastFetchedAt === null ? "missing" : "plugin-default"),
    lastFetchedAt,
    staleMs,
    authorityMode,
    ssotSatisfied: false,
    sourceReadiness: "blocked",
    fallbackReason:
      "No plugin snapshot anchors or external research anchors were available for the requested topic.",
    currentnessGap: pluginSnapshotCurrentnessGap(topic),
  };
}
