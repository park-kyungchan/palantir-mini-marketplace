// palantir-mini — lib/runtime-overlay/memory-reflect.ts
// R-ID A.W5.a — session-end MEMORY.md cache reflection utility
//
// Calls pm_recap internally to produce a digest of the current session state.
// Computes a stable hash of the digest and compares with the last-reflected
// hash stored at <projectRoot>/.palantir-mini/session/.last-memory-reflect-hash.
//
// If unchanged: return { written: false, reason: "unchanged" }.
// If changed:   locate the Claude memory MEMORY.md, update the fenced cache block
//               (<!-- pm-recap-cache-start --> ... <!-- pm-recap-cache-end -->),
//               write the new hash, and return { written: true, reason: "hash changed" }.
//
// IMPORTANT: If the cache block does NOT exist in MEMORY.md, this function emits
// memory_reflect_skipped_no_cache_block and returns { written: false, reason: "no-cache-block" }.
// The user must manually add the fence markers ONCE; subsequent reflections are automatic.
//
// Cache block format written inside the fence:
//   <!-- pm-recap-cache-start -->
//   <CONTENT>
//   <!-- pm-recap-cache-end -->
//
// Authority: plan inherited-discovering-quill.md §4.A.W5
//            rule 10 §append-only invariant (events.jsonl; MEMORY.md is NOT events.jsonl)
//            rule 02 §Memory (MEMORY.md memory system)

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { deriveProjectSlug } from "../project/slug";
import { resolveExternalRoots } from "../runtime/external-roots";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MemoryReflectResult {
  /** Whether the MEMORY.md cache block was written. */
  written: boolean;
  /** Human-readable reason string. */
  reason: "unchanged" | "hash changed" | "no-cache-block" | "no-memory-file" | "error";
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
 * Derive the Claude memory MEMORY.md path for a given projectRoot.
 * Heuristic: ~/.claude/projects/<project-slug>/memory/MEMORY.md
 * Overridable via PALANTIR_MINI_MEMORY_PATH env.
 */
function resolveMemoryPath(projectRoot: string): string {
  const envOverride = process.env.PALANTIR_MINI_MEMORY_PATH;
  if (envOverride && envOverride.length > 0) return envOverride;

  const slug = deriveProjectSlug(projectRoot);
  // Claude memory mount convention: ~/.claude/projects/<encoded-path>/memory/MEMORY.md
  // The standard encoding replaces / with - in the project path.
  // We use the slug as an approximation; for production,
  // the real mount is ~/.claude/projects/<abs-path-encoded>/memory/MEMORY.md
  // where the path encoding is: absolute path with / replaced by -.
  const { projectsDir } = resolveExternalRoots();
  const encodedPath = projectRoot.replace(/\//g, "-");
  const standardMount = path.join(
    projectsDir,
    encodedPath,
    "memory",
    "MEMORY.md",
  );
  if (fs.existsSync(standardMount)) return standardMount;

  // Fallback: try slug-based path (for older memory layouts or test fixtures)
  const slugMount = path.join(
    projectsDir,
    slug,
    "memory",
    "MEMORY.md",
  );
  return slugMount;
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
 * Check whether MEMORY.md contains the cache fence markers.
 * Returns true only when BOTH markers are present and start appears before end.
 */
function hasCacheFence(content: string): boolean {
  const startIdx = content.indexOf(CACHE_START);
  const endIdx = content.indexOf(CACHE_END);
  return startIdx !== -1 && endIdx !== -1 && startIdx < endIdx;
}

/**
 * Replace the content between (and including) the fence markers in memoryContent.
 * Everything outside the fence is preserved exactly.
 */
function replaceFenceContent(memoryContent: string, newContent: string): string {
  const startIdx = memoryContent.indexOf(CACHE_START);
  const endIdx = memoryContent.indexOf(CACHE_END);
  if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) return memoryContent;

  const before = memoryContent.slice(0, startIdx);
  const afterEnd = memoryContent.slice(endIdx + CACHE_END.length);

  return `${before}${CACHE_START}\n${newContent}\n${CACHE_END}${afterEnd}`;
}

/**
 * Build a compact text digest of the current session state by calling pm_recap
 * internally. Returns the digest as a string suitable for MEMORY.md injection.
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
 * Reflect the current pm-recap digest into the MEMORY.md cache block.
 *
 * @param projectRoot  Absolute path to the project root.
 */
export async function reflectMemoryToCache(
  projectRoot: string,
): Promise<MemoryReflectResult> {
  if (typeof projectRoot !== "string" || projectRoot.trim().length === 0) {
    return { written: false, reason: "error" };
  }

  // Locate MEMORY.md
  const memoryPath = resolveMemoryPath(projectRoot);
  if (!fs.existsSync(memoryPath)) {
    return { written: false, reason: "no-memory-file" };
  }

  let memoryContent: string;
  try {
    memoryContent = fs.readFileSync(memoryPath, "utf8");
  } catch {
    return { written: false, reason: "error" };
  }

  // Guard: cache fence markers must already be present in MEMORY.md.
  if (!hasCacheFence(memoryContent)) {
    // Emit advisory — do NOT auto-create the fence.
    await emitNoCacheBlockAdvisory(projectRoot, memoryPath);
    return { written: false, reason: "no-cache-block" };
  }

  // Build the digest text.
  const digest = await buildSessionDigest(projectRoot);
  const hash = sha256(digest);

  // Compare with last-reflected hash.
  const lastHash = readLastHash(projectRoot);
  if (lastHash === hash) {
    return { written: false, reason: "unchanged", digest, hash };
  }

  // Hash changed — update MEMORY.md.
  const updatedContent = replaceFenceContent(memoryContent, digest);
  try {
    fs.writeFileSync(memoryPath, updatedContent, "utf8");
  } catch {
    return { written: false, reason: "error", digest, hash };
  }

  // Persist new hash.
  writeHash(projectRoot, hash);

  return { written: true, reason: "hash changed", digest, hash };
}

/** Fire-and-forget advisory emit when cache block is absent. */
async function emitNoCacheBlockAdvisory(
  projectRoot: string,
  memoryPath: string,
): Promise<void> {
  try {
    const logMod = await import("../../scripts/log");
    await logMod.emit({
      type: "validation_phase_completed",
      payload: {
        phase: "runtime",
        passed: false,
        errorClass: "memory_reflect_skipped_no_cache_block",
      },
      toolName: "memory-reflect",
      cwd: projectRoot,
      identity: "monitor",
      reasoning: `memory-reflect: MEMORY.md at ${memoryPath} does not contain cache fence markers (${CACHE_START} / ${CACHE_END}). Add the fence markers manually once to enable automatic pm-recap cache reflection.`,
      memoryLayers: ["episodic"],
    });
  } catch {
    // best-effort
  }
}
