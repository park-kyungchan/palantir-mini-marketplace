// palantir-mini v3.4.0 — research_library_refresh sibling: per-doc loop + emit.

import * as fs from "fs";
import * as path from "path";
import { emit } from "../../../scripts/log";
import { isStale, readSummary, tryFetchDoc } from "./staleness";
import type {
  DocRefreshResult,
  ManifestEntry,
  ResearchLibraryManifest,
} from "./types";

export interface IterateDocsResult {
  results: DocRefreshResult[];
  emittedEventCount: number;
}

/**
 * Iterate manifest docs, refresh stale ones, emit learning_captured per stale
 * doc (5-dim envelope, rule 10).
 */
export async function iterateDocs(
  manifest: ResearchLibraryManifest,
  libraryRoot: string,
  staleThresholdDays: number,
  options: { agentName?: string; dryRun?: boolean; since?: string } = {},
): Promise<IterateDocsResult> {
  const results: DocRefreshResult[] = [];
  let emittedEventCount = 0;
  const dryRun = options.dryRun === true;

  for (const entry of manifest.docs ?? []) {
    const docPath = path.isAbsolute(entry.path)
      ? entry.path
      : path.join(libraryRoot, entry.path);
    const fetchUrl = typeof entry.url === "string" && entry.url.trim().length > 0
      ? entry.url.trim()
      : undefined;
    const sourceUrl = [entry.sourceUrl, entry.canonicalUrl, entry.source]
      .find((value): value is string => typeof value === "string" && value.trim().length > 0)
      ?.trim();

    const refreshedAt = new Date().toISOString();
    const wasStale = isStale(entry, staleThresholdDays, options.since);

    if (!wasStale) {
      results.push({
        path: docPath,
        topic: entry.topic,
        wasStale: false,
        refreshedAt,
        refreshStatus: "skipped_fresh",
        fetchUrl,
        sourceUrl,
        summary: null,
      });
      continue;
    }

    if (!fetchUrl) {
      results.push({
        path: docPath,
        topic: entry.topic,
        wasStale: true,
        refreshedAt,
        refreshStatus: "unfetchable",
        sourceUrl,
        summary: readSummary(docPath),
        dryRun,
        error:
          "stale doc has no direct fetch URL; manifest source is provenance only and must not be written raw",
      });
      continue;
    }

    if (dryRun) {
      results.push({
        path: docPath,
        topic: entry.topic,
        wasStale: true,
        refreshedAt,
        refreshStatus: "dry_run",
        fetchUrl,
        sourceUrl,
        summary: readSummary(docPath),
        dryRun: true,
      });
      continue;
    }

    let summary: string | null = null;
    let error: string | undefined;

    try {
      const fetched = tryFetchDoc({ ...entry, url: fetchUrl });
      if (fetched !== null && fetched.length > 0) {
        const isUnderLibrary = path
          .resolve(docPath)
          .startsWith(path.resolve(libraryRoot));
        if (isUnderLibrary && fs.existsSync(path.dirname(docPath))) {
          fs.writeFileSync(docPath, fetched, "utf8");
        }
        summary = fetched.slice(0, 500).replace(/\n/g, " ").trim();
      } else {
        error = "fetch returned no content";
        summary = readSummary(docPath);
      }
    } catch (e) {
      error = (e as Error).message;
    }

    const docResult: DocRefreshResult = {
      path: docPath,
      topic: entry.topic,
      wasStale: true,
      refreshedAt,
      refreshStatus: error ? "fetch_failed" : "refreshed",
      fetchUrl,
      sourceUrl,
      summary,
      ...(error !== undefined ? { error } : {}),
    };
    results.push(docResult);

    if (error !== undefined) {
      continue;
    }

    await emit({
      type: "learning_captured",
      payload: {
        topic: entry.topic ?? path.basename(docPath),
        content: summary ?? "(no content available)",
        confidence: error ? 0.3 : 0.8,
        source: docPath,
      },
      toolName: "research_library_refresh",
      cwd: libraryRoot,
      agentName: options.agentName,
      reasoning: `Research doc refreshed: ${docPath} was stale (lastVerified: ${entry.lastVerified ?? "never"}, threshold: ${staleThresholdDays}d)`,
      hypothesis:
        "Refreshing stale research docs keeps the LEARN substrate current for downstream evaluations.",
    });
    emittedEventCount += 1;
  }

  return { results, emittedEventCount };
}
