// palantir-mini — lib/runtime-overlay/memory-reflect.ts
// R-ID A.W5.a — session-end prior-digest reflection utility (Sink-1 WRITE)
//
// Calls pm_recap internally to produce a digest of the current session state.
// Computes a stable hash of the digest and compares with the last-reflected
// hash stored at <projectRoot>/.palantir-mini/session/.last-memory-reflect-hash.
//
// TARGET: a DEDICATED pm-owned cache file at
//   <projectRoot>/.palantir-mini/cache/memory-prior.md
// inside a fenced cache block:
//   <!-- pm-recap-cache-start -->
//   <CONTENT>
//   <!-- pm-recap-cache-end -->
//
// USER DECISION: the curated git-tracked Claude memory MEMORY.md is INDEX-ONLY
// and is NEVER written to by this utility. The cache file above is a pm-owned
// artifact — safe to auto-create and manage. If the cache file (or its fence)
// is missing, it is auto-created.
//
// If unchanged: return { written: false, reason: "unchanged" }.
// If changed:   rewrite the fenced cache block in the dedicated cache file,
//               write the new hash, and return { written: true, reason: "hash changed" }.
//
// Bypass: PALANTIR_MINI_MEMORY_REFLECT_DISABLE=1 → return
//   { written: false, reason: "disabled" } without touching disk.
//
// Authority: plan inherited-discovering-quill.md §4.A.W5
//            rule 10 §append-only invariant (events.jsonl; cache file is NOT events.jsonl)
//            rule 02 §Memory (MEMORY.md is index-only; cache is pm-owned)

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MemoryReflectResult {
  /** Whether the cache block was written. */
  written: boolean;
  /** Human-readable reason string. */
  reason: "unchanged" | "hash changed" | "disabled" | "error";
  /** The digest text that was (or would have been) written. */
  digest?: string;
  /** SHA-256 hash of the digest text. */
  hash?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CACHE_START = "<!-- pm-recap-cache-start -->";
const CACHE_END = "<!-- pm-recap-cache-end -->";
const HASH_FILE_NAME = ".last-memory-reflect-hash";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Resolve the dedicated pm-owned prior-digest cache file path for a projectRoot.
 *
 * Target: <projectRoot>/.palantir-mini/cache/memory-prior.md
 * Overridable via PALANTIR_MINI_MEMORY_PATH env (kept for test isolation /
 * advanced overrides — points the cache file elsewhere, NOT at MEMORY.md).
 *
 * Exported so the Sink-1 READER (session-start) can locate the same file.
 */
export function resolveCachePath(projectRoot: string): string {
  const envOverride = process.env.PALANTIR_MINI_MEMORY_PATH;
  if (envOverride && envOverride.length > 0) return envOverride;

  return path.join(projectRoot, ".palantir-mini", "cache", "memory-prior.md");
}

/** Compute SHA-256 hash of a string and return hex digest. */
function sha256(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

/** Read the last-reflected hash from the hash file. Returns null if absent. */
function readLastHash(projectRoot: string): string | null {
  const hashPath = path.join(
    projectRoot,
    ".palantir-mini",
    "session",
    HASH_FILE_NAME,
  );
  if (!fs.existsSync(hashPath)) return null;
  try {
    return fs.readFileSync(hashPath, "utf8").trim();
  } catch {
    return null;
  }
}

/** Write the new hash to the hash file. Best-effort. */
function writeHash(projectRoot: string, hash: string): void {
  const sessionDir = path.join(projectRoot, ".palantir-mini", "session");
  const hashPath = path.join(sessionDir, HASH_FILE_NAME);
  try {
    fs.mkdirSync(sessionDir, { recursive: true });
    fs.writeFileSync(hashPath, hash + "\n", "utf8");
  } catch {
    // best-effort
  }
}

/**
 * Check whether content contains the cache fence markers.
 * Returns true only when BOTH markers are present and start appears before end.
 */
function hasCacheFence(content: string): boolean {
  const startIdx = content.indexOf(CACHE_START);
  const endIdx = content.indexOf(CACHE_END);
  return startIdx !== -1 && endIdx !== -1 && startIdx < endIdx;
}

/**
 * Replace the content between (and including) the fence markers in cacheContent.
 * Everything outside the fence is preserved exactly.
 */
function replaceFenceContent(cacheContent: string, newContent: string): string {
  const startIdx = cacheContent.indexOf(CACHE_START);
  const endIdx = cacheContent.indexOf(CACHE_END);
  if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) return cacheContent;

  const before = cacheContent.slice(0, startIdx);
  const afterEnd = cacheContent.slice(endIdx + CACHE_END.length);

  return `${before}${CACHE_START}\n${newContent}\n${CACHE_END}${afterEnd}`;
}

/**
 * Build the initial cache-file scaffold (header + empty fence). Used when the
 * cache file is auto-created for the first time.
 */
function buildCacheScaffold(digest: string): string {
  return [
    "# palantir-mini — prior session digest cache",
    "",
    "<!-- pm-owned artifact: auto-managed by lib/runtime-overlay/memory-reflect.ts. -->",
    "<!-- The curated Claude memory MEMORY.md is index-only and NEVER written here. -->",
    "",
    CACHE_START,
    digest,
    CACHE_END,
    "",
  ].join("\n");
}

/**
 * Build a compact text digest of the current session state by calling pm_recap
 * internally. Returns the digest as a string suitable for cache injection.
 */
async function buildSessionDigest(projectRoot: string): Promise<string> {
  try {
    // Dynamically import pm-recap to avoid circular dep at module load time.
    const recapMod = await import("../../bridge/handlers/pm-recap");
    const result = await recapMod.default({ project: projectRoot, skipMcpFirst: false });

    const { substrateHealth, sprintSummary, generatedAt } = result;
    const lastSprint = sprintSummary.length > 0
      ? sprintSummary[sprintSummary.length - 1]
      : null;

    const lines: string[] = [
      `Generated: ${generatedAt}`,
      `Events: ${substrateHealth.totalEvents} total | T2+: ${substrateHealth.t2PlusRatio} | T3 circuit: ${substrateHealth.t3CircuitInputs}`,
    ];

    if (lastSprint) {
      lines.push(
        `Last sprint: #${lastSprint.sprintNumber}${lastSprint.contractId ? ` (${lastSprint.contractId})` : ""}${lastSprint.verdict ? ` → ${lastSprint.verdict}` : ""}`,
      );
    }

    // MCP-first compliance line when available
    if (result.mcpFirstCompliance !== undefined) {
      const mcp = result.mcpFirstCompliance;
      lines.push(
        `MCP-first: ${(mcp.ratio * 100).toFixed(1)}% (${mcp.passed} passed / ${mcp.bypassed} bypassed)`,
      );
    }

    return lines.join("\n");
  } catch {
    // pm-recap unavailable or failed — produce minimal digest from events file directly
    return buildMinimalDigest(projectRoot);
  }
}

/**
 * Minimal fallback digest when pm-recap import fails.
 * Counts lines in events.jsonl.
 */
function buildMinimalDigest(projectRoot: string): string {
  const eventsPath = path.join(
    projectRoot,
    ".palantir-mini",
    "session",
    "events.jsonl",
  );
  let lineCount = 0;
  try {
    const content = fs.readFileSync(eventsPath, "utf8");
    lineCount = content.split("\n").filter((l) => l.trim().length > 0).length;
  } catch {
    lineCount = 0;
  }
  return `Generated: ${new Date().toISOString()}\nEvents: ${lineCount} (pm-recap unavailable)`;
}

// ─── Main function ────────────────────────────────────────────────────────────

/**
 * Reflect the current pm-recap digest into the dedicated pm-owned cache block.
 *
 * The curated Claude memory MEMORY.md is NEVER touched. The cache file at
 * resolveCachePath(projectRoot) is auto-created (with its fence) when missing.
 *
 * @param projectRoot  Absolute path to the project root.
 */
export async function reflectMemoryToCache(
  projectRoot: string,
): Promise<MemoryReflectResult> {
  if (typeof projectRoot !== "string" || projectRoot.trim().length === 0) {
    return { written: false, reason: "error" };
  }

  // ─── Bypass path ───────────────────────────────────────────────────────────
  if (process.env.PALANTIR_MINI_MEMORY_REFLECT_DISABLE === "1") {
    return { written: false, reason: "disabled" };
  }

  const cachePath = resolveCachePath(projectRoot);

  // Build the digest text first (needed for both create + update paths).
  const digest = await buildSessionDigest(projectRoot);
  const hash = sha256(digest);

  // Compare with last-reflected hash. When unchanged AND the cache file already
  // exists with a fence, skip the re-write (hash-gated).
  const lastHash = readLastHash(projectRoot);
  const cacheExists = fs.existsSync(cachePath);

  let existingContent = "";
  if (cacheExists) {
    try {
      existingContent = fs.readFileSync(cachePath, "utf8");
    } catch {
      return { written: false, reason: "error", digest, hash };
    }
  }

  if (lastHash === hash && cacheExists && hasCacheFence(existingContent)) {
    return { written: false, reason: "unchanged", digest, hash };
  }

  // Need to (re)write. Auto-create the file + fence if missing/fence-less.
  let updatedContent: string;
  if (cacheExists && hasCacheFence(existingContent)) {
    updatedContent = replaceFenceContent(existingContent, digest);
  } else {
    updatedContent = buildCacheScaffold(digest);
  }

  try {
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    fs.writeFileSync(cachePath, updatedContent, "utf8");
  } catch {
    return { written: false, reason: "error", digest, hash };
  }

  // Persist new hash.
  writeHash(projectRoot, hash);

  return { written: true, reason: "hash changed", digest, hash };
}
