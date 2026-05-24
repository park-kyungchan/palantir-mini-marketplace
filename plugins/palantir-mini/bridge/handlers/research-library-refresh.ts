// palantir-mini — MCP tool handler: research_library_refresh
// Dry-run/live refresh bridge for manifest-backed research libraries.

import * as fs from "fs";
import * as path from "path";
import { iterateDocs } from "./research_library_refresh/iterate-docs";
import type {
  ManifestEntry,
  ResearchLibraryManifest,
  ResearchLibraryRefreshArgs,
  ResearchLibraryRefreshResult,
  ResearchLibrarySource,
} from "./research_library_refresh/types";

const HOME = process.env.HOME ?? "/home/palantirkc";
const RESEARCH_ROOT = path.join(HOME, ".claude", "research");

const SOURCE_DIRS: Record<Exclude<ResearchLibrarySource, "all">, string> = {
  "palantir-official": path.join(RESEARCH_ROOT, "palantir-official"),
  "palantir-foundry": path.join(RESEARCH_ROOT, "palantir-foundry"),
  "claude-code": path.join(RESEARCH_ROOT, "claude-code"),
  "palantir-vision": path.join(RESEARCH_ROOT, "palantir-vision"),
  "interaction": path.join(RESEARCH_ROOT, "interaction"),
  "skills": path.join(RESEARCH_ROOT, "skills"),
};

function expandHome(value: string): string {
  return value.startsWith("~/") ? path.join(HOME, value.slice(2)) : value;
}

function resolveLibraryRoot(args: ResearchLibraryRefreshArgs): string {
  if (args.libraryRoot) return expandHome(args.libraryRoot);
  const source = args.source && args.source !== "all" ? args.source : "palantir-official";
  return SOURCE_DIRS[source] ?? path.join(RESEARCH_ROOT, source);
}

function resolveManifestPath(libraryRoot: string, explicit?: string): string {
  if (explicit) return expandHome(explicit);
  const candidates = [
    path.join(libraryRoot, "_manifest.json"),
    path.join(libraryRoot, "MANIFEST.json"),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0]!;
}

function readManifest(manifestPath: string): ResearchLibraryManifest | null {
  if (!fs.existsSync(manifestPath)) return null;
  const raw = fs.readFileSync(manifestPath, "utf8");
  const parsed = JSON.parse(raw) as ResearchLibraryManifest;
  const docs = [...(parsed.docs ?? []), ...(parsed.entries ?? [])]
    .filter((entry): entry is ManifestEntry => typeof entry.path === "string" && entry.path.trim().length > 0);
  return {
    ...parsed,
    docs,
  };
}

function summarize(
  libraryRoot: string,
  manifestPath: string,
  args: ResearchLibraryRefreshArgs,
  manifest: ResearchLibraryManifest,
  results: Awaited<ReturnType<typeof iterateDocs>>["results"],
  emittedEventCount: number,
): ResearchLibraryRefreshResult {
  const staleDocs = results.filter((row) => row.wasStale).length;
  const refreshed = results.filter((row) => row.refreshStatus === "refreshed").length;
  const skipped = results.filter((row) => row.refreshStatus === "skipped_fresh").length;
  const errors = results.filter((row) => row.refreshStatus === "fetch_failed").length;
  const staleUnfetchableDocs = results.filter((row) => row.refreshStatus === "unfetchable").length;
  const dryRun = args.dryRun !== false;
  return {
    libraryRoot,
    manifestPath,
    source: args.source,
    dryRun,
    totalDocs: manifest.docs?.length ?? 0,
    staleDocs,
    ...(dryRun ? { wouldRefresh: staleDocs - staleUnfetchableDocs } : {}),
    refreshed,
    skipped,
    staleUnfetchableDocs,
    errors,
    docs: results,
    emittedEventCount,
  };
}

async function refreshOne(args: ResearchLibraryRefreshArgs): Promise<ResearchLibraryRefreshResult> {
  const libraryRoot = resolveLibraryRoot(args);
  const manifestPath = resolveManifestPath(libraryRoot, args.manifestPath);
  const manifest = readManifest(manifestPath);
  const dryRun = args.dryRun !== false;
  if (manifest === null) {
    return {
      libraryRoot,
      manifestPath,
      source: args.source,
      dryRun,
      totalDocs: 0,
      staleDocs: 0,
      ...(dryRun ? { wouldRefresh: 0 } : {}),
      refreshed: 0,
      skipped: 0,
      staleUnfetchableDocs: 0,
      errors: 0,
      docs: [],
      emittedEventCount: 0,
      manifestMissing: true,
      manifestMissingReason: "manifest not found",
    };
  }
  const { results, emittedEventCount } = await iterateDocs(
    manifest,
    libraryRoot,
    args.staleThresholdDays ?? 30,
    {
      agentName: args.agentName,
      dryRun,
      since: args.since,
    },
  );
  return summarize(libraryRoot, manifestPath, args, manifest, results, emittedEventCount);
}

export default async function researchLibraryRefresh(
  rawArgs: unknown,
): Promise<ResearchLibraryRefreshResult> {
  const args = (rawArgs ?? {}) as ResearchLibraryRefreshArgs;
  if (args.source === "all") {
    const libraries = await Promise.all(
      (Object.keys(SOURCE_DIRS) as Array<Exclude<ResearchLibrarySource, "all">>).map((source) =>
        refreshOne({ ...args, source, libraryRoot: SOURCE_DIRS[source], dryRun: args.dryRun ?? true }),
      ),
    );
    return {
      libraryRoot: RESEARCH_ROOT,
      manifestPath: "(aggregate)",
      source: "all",
      dryRun: args.dryRun !== false,
      totalDocs: libraries.reduce((sum, item) => sum + item.totalDocs, 0),
      staleDocs: libraries.reduce((sum, item) => sum + item.staleDocs, 0),
      wouldRefresh: libraries.reduce((sum, item) => sum + (item.wouldRefresh ?? 0), 0),
      refreshed: libraries.reduce((sum, item) => sum + item.refreshed, 0),
      skipped: libraries.reduce((sum, item) => sum + item.skipped, 0),
      staleUnfetchableDocs: libraries.reduce((sum, item) => sum + (item.staleUnfetchableDocs ?? 0), 0),
      errors: libraries.reduce((sum, item) => sum + item.errors, 0),
      docs: [],
      emittedEventCount: libraries.reduce((sum, item) => sum + item.emittedEventCount, 0),
      manifestMissingCount: libraries.filter((item) => item.manifestMissing).length,
      libraries,
    };
  }
  return refreshOne({ ...args, dryRun: args.dryRun ?? true });
}
