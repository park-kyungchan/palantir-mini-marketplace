// palantir-mini v3.4.0 — research_library_refresh sibling: staleness probes + best-effort fetch.

import * as fs from "fs";
import { execSync } from "child_process";
import type { ManifestEntry } from "./types";

export function isStale(entry: ManifestEntry, thresholdDays: number, since?: string): boolean {
  const verifiedAt = entry.lastVerified ?? entry.fetchedAt ?? entry.fetched ?? entry.sourceLastmod ?? undefined;
  if (!verifiedAt) return true;
  const lastMs = Date.parse(verifiedAt);
  if (isNaN(lastMs)) return true;
  if (since) {
    const sinceMs = Date.parse(since);
    if (!isNaN(sinceMs)) return lastMs < sinceMs;
  }
  const ageMs = Date.now() - lastMs;
  const threshold = (entry.staleThresholdDays ?? thresholdDays) * 24 * 60 * 60 * 1000;
  return ageMs > threshold;
}

export function readSummary(docPath: string): string | null {
  try {
    const fd = fs.openSync(docPath, "r");
    const buf = Buffer.alloc(500);
    const bytesRead = fs.readSync(fd, buf, 0, 500, 0);
    fs.closeSync(fd);
    return buf.slice(0, bytesRead).toString("utf8").replace(/\n/g, " ").trim();
  } catch {
    return null;
  }
}

/**
 * Best-effort fetch via curl when the entry has a `url` field. Forward-compatible —
 * ManifestEntry base type does not declare `url`, only widened entries surface it.
 */
export function tryFetchDoc(entry: ManifestEntry & { url?: string }): string | null {
  if (!entry.url || typeof entry.url !== "string") return null;
  try {
    const raw = execSync(`curl -s --max-time 10 ${JSON.stringify(entry.url)}`, {
      timeout: 12_000,
      encoding: "utf8",
    });
    return typeof raw === "string" ? raw : null;
  } catch {
    return null;
  }
}
