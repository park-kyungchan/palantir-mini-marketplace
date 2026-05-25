/**
 * palantir-mini sprint-061 B.W1 — Convex impact-graph client
 * @owner hook-builder
 * @purpose Wraps ConvexClient for impact-graph queries/mutations.
 *          Replaces lib/impact-graph/sqlite-cache.ts as the primary SSoT.
 *          Per operating model §4.5.6a and rule 27 (cross-runtime substrate).
 *
 * STUB MODE: When CONVEX_URL is absent (Convex dev not running), all queries
 * return empty arrays and mutations log to stderr. Callers must not crash.
 * Users must run `bunx convex dev` interactively to bind a real deployment.
 *
 * sprint-102 PR 4.1c: Cloud-aware URL detection (CONVEX_ENV=cloud reads
 * convex/.env.cloud), 18-key BackPropValueIndexEntry envelope for
 * mirrorDecisionEvent, WAL buffer at .palantir-mini/session/convex-pending.jsonl
 * on outage, drain-batched-50 on restore + truncate, STUB MODE preserved.
 * Per canonical plan v2 §4 row 4.1c.
 *
 * sprint-115 PR 5.4b: NEW queryRecentEvalRuns helper (read-only, pull-based).
 * Queries evalRuns table filtered by projectSlug, ordered by ranAt desc.
 * Per canonical plan v2 §4 row 5.4b.
 */

import * as fs from "fs";
import * as path from "path";
import type { BackPropValueIndexEntry } from "#schemas/ontology/primitives/back-prop-value-index";
import type { AIPEvaluationRunConvexRow } from "#schemas/ontology/primitives/aip-evaluation";

// ─── Types (mirrors StoredEdge from sqlite-cache for interface parity) ────────

export interface ConvexEdge {
  /** Absolute project root (partition key) */
  projectRoot:  string;
  fromRid:      string;
  toRid:        string;
  edgeKind:     string;
  confidence:   number;
  evidence?:    string;
  registeredAt: string;
  verifiedAt?:  string;
}

export interface ConvexFileState {
  projectRoot:       string;
  filePath:          string;
  contentHash:       string;
  lastWalkedAt:      string;
  lastWalkedTsConfig: string;
  edgeCount:         number;
  walkDurationMs:    number;
}

export interface ImpactGraphResult {
  forward:    ConvexEdge[];
  backward:   ConvexEdge[];
  transitive: {
    forward:  ConvexEdge[];
    backward: ConvexEdge[];
  };
}

export interface ApplyDiffArgs {
  projectRoot:        string;
  filePath:           string;
  contentHash:        string;
  addedEdges:         Omit<ConvexEdge, "_id" | "_creationTime">[];
  deletedEdges:       Pick<ConvexEdge, "projectRoot" | "fromRid" | "toRid" | "edgeKind">[];
  walkDurationMs:     number;
  lastWalkedTsConfig?: string;
}

/**
 * Arguments for mirrorDecisionEvent — maps BackPropValueIndexEntry 18 keys
 * onto the Convex decisionEvents mutation shape.
 * Per canonical plan v2 §4 row 4.1c (sprint-102 PR 4.1c).
 */
export interface MirrorDecisionEventArgs {
  projectRoot:    string;
  sequence:       number;
  eventType:      string;
  valueGrade:     "T0" | "T1" | "T2" | "T3" | "T4";
  byWhomIdentity: string;
  when:           string;
  raw:            string;
  /** 18-key BackPropValueIndexEntry fields (all optional except eventId + when above) */
  entry?: BackPropValueIndexEntry;
}

/**
 * Result of queryRecentEvalRuns.
 * Per canonical plan v2 §4 row 5.4b (sprint-115 PR 5.4b).
 */
export interface EvalRunQueryResult {
  /** Runs ordered by ranAt descending (most recent first), up to limit. */
  rows: AIPEvaluationRunConvexRow[];
}

// ─── WAL buffer types (sprint-102 PR 4.1c) ───────────────────────────────────

/** A buffered envelope entry for the WAL. */
interface WalEntry {
  projectRoot:    string;
  sequence:       number;
  eventType:      string;
  valueGrade:     "T0" | "T1" | "T2" | "T3" | "T4";
  byWhomIdentity: string;
  when:           string;
  raw:            string;
  entry?:         BackPropValueIndexEntry;
}

const WAL_BATCH_SIZE = 50;

// ─── Convex URL resolution ────────────────────────────────────────────────────

const PLUGIN_ROOT = path.resolve(import.meta.dirname ?? __dirname, "..", "..");

/**
 * Determines whether Cloud mode is active.
 * Cloud mode: CONVEX_ENV=cloud env set AND convex/.env.cloud exists.
 * Per canonical plan v2 §4 row 4.1c (sprint-102 PR 4.1c).
 */
function isCloudMode(): boolean {
  return (
    process.env.CONVEX_ENV === "cloud" &&
    fs.existsSync(path.join(PLUGIN_ROOT, "convex", ".env.cloud"))
  );
}

function resolveConvexUrl(): string | null {
  // 1. Explicit env var (always wins regardless of mode)
  if (process.env.CONVEX_URL) return process.env.CONVEX_URL;

  // 2. Cloud mode: read CONVEX_URL from convex/.env.cloud
  if (isCloudMode()) {
    const cloudEnvPath = path.join(PLUGIN_ROOT, "convex", ".env.cloud");
    try {
      const content = fs.readFileSync(cloudEnvPath, "utf8");
      const match = content.match(/^CONVEX_URL=(.+)$/m);
      if (match?.[1]) return match[1].trim();
    } catch {
      // ignore read errors; fall through to local
    }
  }

  // 3. Local fallback: read from .env.local in the plugin root or convex/ subdir
  for (const candidate of [
    path.join(PLUGIN_ROOT, "convex", ".env.local"),
    path.join(PLUGIN_ROOT, ".env.local"),
  ]) {
    if (fs.existsSync(candidate)) {
      try {
        const content = fs.readFileSync(candidate, "utf8");
        const match = content.match(/^CONVEX_URL=(.+)$/m);
        if (match?.[1]) return match[1].trim();
      } catch {
        // ignore read errors
      }
    }
  }

  return null;
}

// ─── WAL helpers ─────────────────────────────────────────────────────────────

/**
 * Resolve WAL file path: <projectRoot>/.palantir-mini/session/convex-pending.jsonl
 * Falls back to plugin root when projectRoot is unavailable.
 */
function resolveWalPath(projectRoot?: string): string {
  const base = projectRoot ?? PLUGIN_ROOT;
  return path.join(base, ".palantir-mini", "session", "convex-pending.jsonl");
}

/** Append a single entry to the WAL (NDJSON append-only). */
function walAppend(walPath: string, entry: WalEntry): void {
  try {
    const dir = path.dirname(walPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(walPath, JSON.stringify(entry) + "\n", "utf8");
  } catch (e) {
    process.stderr.write(
      `[palantir-mini/convex-client] WAL append failed: ${(e as Error).message}\n`,
    );
  }
}

/** Read all WAL entries (oldest first). Returns empty array on missing or corrupt file. */
function walReadAll(walPath: string): WalEntry[] {
  try {
    if (!fs.existsSync(walPath)) return [];
    const content = fs.readFileSync(walPath, "utf8");
    return content
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        try {
          return JSON.parse(line) as WalEntry;
        } catch {
          return null;
        }
      })
      .filter((e): e is WalEntry => e !== null);
  } catch {
    return [];
  }
}

/** Truncate (empty) the WAL after successful drain. */
function walTruncate(walPath: string): void {
  try {
    if (fs.existsSync(walPath)) fs.writeFileSync(walPath, "", "utf8");
  } catch (e) {
    process.stderr.write(
      `[palantir-mini/convex-client] WAL truncate failed: ${(e as Error).message}\n`,
    );
  }
}

// ─── No-op stub client (when Convex dev is not running) ──────────────────────

class StubConvexClient {
  readonly isStub = true;

  warn(method: string): void {
    try {
      process.stderr.write(
        `[palantir-mini/convex-client] STUB mode — ${method} is a no-op. ` +
        `Run \`bunx convex dev\` in plugins/palantir-mini to bind a real deployment.\n`,
      );
    } catch { /* ignore */ }
  }

  async getImpactGraph(_projectRoot: string, _rid: string, _depth?: number): Promise<ImpactGraphResult> {
    this.warn("getImpactGraph");
    return { forward: [], backward: [], transitive: { forward: [], backward: [] } };
  }

  async getFileState(_projectRoot: string, _filePath: string): Promise<ConvexFileState | null> {
    this.warn("getFileState");
    return null;
  }

  async populateGraph(_projectRoot: string, _filePath: string, _contentHash: string, _edges: Omit<ConvexEdge, "_id" | "_creationTime">[], _walkDurationMs: number, _tsConfig?: string): Promise<{ upserted: number }> {
    this.warn("populateGraph");
    return { upserted: 0 };
  }

  async applyDiff(_args: ApplyDiffArgs): Promise<{ added: number; deleted: number }> {
    this.warn("applyDiff");
    return { added: 0, deleted: 0 };
  }

  async cascadeDelete(_projectRoot: string, _filePath: string): Promise<{ deletedCount: number }> {
    this.warn("cascadeDelete");
    return { deletedCount: 0 };
  }

  async markBatchDirty(_projectRoot: string, _paths: string[]): Promise<{ markedCount: number }> {
    this.warn("markBatchDirty");
    return { markedCount: 0 };
  }

  async dirtyCount(_projectRoot: string): Promise<number> {
    this.warn("dirtyCount");
    return 0;
  }

  async totalEdgeCount(_projectRoot?: string): Promise<number> {
    this.warn("totalEdgeCount");
    return 0;
  }

  async mirrorDecisionEvent(_args: MirrorDecisionEventArgs): Promise<{ _id: string; deduped: boolean } | null> {
    this.warn("mirrorDecisionEvent");
    return null;
  }

  async queryRecentEvalRuns(_projectSlug: string, _limit: number): Promise<EvalRunQueryResult> {
    this.warn("queryRecentEvalRuns");
    return { rows: [] };
  }
}

// ─── Real Convex client ───────────────────────────────────────────────────────

class RealConvexClient {
  readonly isStub = false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private api: any;

  constructor(convexUrl: string) {
    // Dynamic import to avoid hard dependency at module load time.
    // The ConvexHttpClient is synchronous-friendly and does not require
    // a running WebSocket — suitable for hook/script contexts.
    const convexBrowser = require("convex/browser");
    const apiModule = require(path.join(PLUGIN_ROOT, "convex", "_generated", "api.js"));

    this.client = new convexBrowser.ConvexHttpClient(convexUrl);
    this.api = apiModule.api;
  }

  async getImpactGraph(projectRoot: string, rid: string, depth?: number): Promise<ImpactGraphResult> {
    try {
      const result = await this.client.query(this.api.impactGraph.queryByRid, {
        projectRoot,
        rid,
        depth: depth ?? 3,
      });
      return {
        forward:  result.forward  ?? [],
        backward: result.backward ?? [],
        transitive: {
          forward:  result.transitive?.forward  ?? [],
          backward: result.transitive?.backward ?? [],
        },
      };
    } catch (e) {
      process.stderr.write(`[palantir-mini/convex-client] getImpactGraph error: ${(e as Error).message}\n`);
      return { forward: [], backward: [], transitive: { forward: [], backward: [] } };
    }
  }

  async getFileState(projectRoot: string, filePath: string): Promise<ConvexFileState | null> {
    try {
      return await this.client.query(this.api.impactGraph.getFileState, {
        projectRoot,
        filePath,
      });
    } catch (e) {
      process.stderr.write(`[palantir-mini/convex-client] getFileState error: ${(e as Error).message}\n`);
      return null;
    }
  }

  async populateGraph(
    projectRoot: string,
    filePath: string,
    contentHash: string,
    edges: Omit<ConvexEdge, "_id" | "_creationTime">[],
    walkDurationMs: number,
    tsConfig?: string,
  ): Promise<{ upserted: number }> {
    try {
      const result = await this.client.mutation(this.api.impactGraph.upsertEdges, {
        projectRoot,
        filePath,
        contentHash,
        edges,
        walkDurationMs,
        lastWalkedTsConfig: tsConfig,
      });
      return { upserted: result.upserted ?? 0 };
    } catch (e) {
      process.stderr.write(`[palantir-mini/convex-client] populateGraph error: ${(e as Error).message}\n`);
      return { upserted: 0 };
    }
  }

  async applyDiff(args: ApplyDiffArgs): Promise<{ added: number; deleted: number }> {
    try {
      const result = await this.client.mutation(this.api.impactGraph.applyDiff, {
        projectRoot:        args.projectRoot,
        filePath:           args.filePath,
        contentHash:        args.contentHash,
        addedEdges:         args.addedEdges,
        deletedEdges:       args.deletedEdges,
        walkDurationMs:     args.walkDurationMs,
        lastWalkedTsConfig: args.lastWalkedTsConfig,
      });
      return { added: result.added ?? 0, deleted: result.deleted ?? 0 };
    } catch (e) {
      process.stderr.write(`[palantir-mini/convex-client] applyDiff error: ${(e as Error).message}\n`);
      return { added: 0, deleted: 0 };
    }
  }

  async cascadeDelete(projectRoot: string, filePath: string): Promise<{ deletedCount: number }> {
    try {
      const result = await this.client.mutation(this.api.impactGraph.cascadeDelete, {
        projectRoot,
        filePath,
      });
      return { deletedCount: result.deletedCount ?? 0 };
    } catch (e) {
      process.stderr.write(`[palantir-mini/convex-client] cascadeDelete error: ${(e as Error).message}\n`);
      return { deletedCount: 0 };
    }
  }

  async markBatchDirty(projectRoot: string, paths: string[]): Promise<{ markedCount: number }> {
    try {
      const result = await this.client.mutation(this.api.impactGraph.markBatchDirty, {
        projectRoot,
        paths,
      });
      return { markedCount: result.markedCount ?? 0 };
    } catch (e) {
      process.stderr.write(`[palantir-mini/convex-client] markBatchDirty error: ${(e as Error).message}\n`);
      return { markedCount: 0 };
    }
  }

  async dirtyCount(projectRoot: string): Promise<number> {
    try {
      const result = await this.client.query(this.api.impactGraph.dirtyCount, {
        projectRoot,
      });
      return typeof result === "number" ? result : 0;
    } catch (e) {
      process.stderr.write(`[palantir-mini/convex-client] dirtyCount error: ${(e as Error).message}\n`);
      return 0;
    }
  }

  async totalEdgeCount(projectRoot?: string): Promise<number> {
    try {
      const result = await this.client.query(this.api.impactGraph.totalEdgeCount, {
        projectRoot,
      });
      return typeof result === "number" ? result : 0;
    } catch (e) {
      process.stderr.write(`[palantir-mini/convex-client] totalEdgeCount error: ${(e as Error).message}\n`);
      return 0;
    }
  }

  /**
   * Mirror a decision event using the 18-key BackPropValueIndexEntry envelope shape.
   * On Cloud unreachable (network error / 5xx), buffers the entry to the WAL
   * at <projectRoot>/.palantir-mini/session/convex-pending.jsonl and returns null.
   * On next successful call, drains the WAL in batches of 50 (oldest-first),
   * then truncates the file, and emits a convex_wal_drained event.
   * Per canonical plan v2 §4 row 4.1c (sprint-102 PR 4.1c).
   */
  async mirrorDecisionEvent(args: MirrorDecisionEventArgs): Promise<{ _id: string; deduped: boolean } | null> {
    const walPath = resolveWalPath(args.projectRoot);

    // Build the base payload
    const payload: Record<string, unknown> = {
      projectRoot:     args.projectRoot,
      sequence:        args.sequence,
      eventType:       args.eventType,
      valueGrade:      args.valueGrade,
      byWhomIdentity:  args.byWhomIdentity,
      when:            args.when,
      raw:             args.raw,
    };

    // Merge 18-key BackPropValueIndexEntry fields (all optional)
    if (args.entry) {
      const e = args.entry;
      if (e.eventId !== undefined)                      payload["eventId"]                      = e.eventId;
      if (e.promptId !== undefined)                     payload["promptId"]                     = e.promptId;
      if (e.promptHash !== undefined)                   payload["promptHash"]                   = e.promptHash;
      if (e.sessionId !== undefined)                    payload["sessionId"]                    = e.sessionId;
      if (e.runtime !== undefined)                      payload["runtime"]                      = e.runtime;
      if (e.semanticIntentContractRef !== undefined)    payload["semanticIntentContractRef"]    = e.semanticIntentContractRef;
      if (e.digitalTwinChangeContractRef !== undefined) payload["digitalTwinChangeContractRef"] = e.digitalTwinChangeContractRef;
      if (e.sprintContractRef !== undefined)            payload["sprintContractRef"]            = e.sprintContractRef;
      if (e.correlationId !== undefined)                payload["correlationId"]                = e.correlationId;
      if (e.agentId !== undefined)                      payload["agentId"]                      = e.agentId;
      if (e.toolName !== undefined)                     payload["toolName"]                     = e.toolName;
      if (e.commitSha !== undefined)                    payload["commitSha"]                    = e.commitSha;
      if (e.branchName !== undefined)                   payload["branchName"]                   = e.branchName;
      if (e.pullRequestNumber !== undefined)            payload["pullRequestNumber"]             = e.pullRequestNumber;
      if (e.evalSuiteId !== undefined)                  payload["evalSuiteId"]                  = e.evalSuiteId;
      if (e.evalRunId !== undefined)                    payload["evalRunId"]                    = e.evalRunId;
      if (e.affectedRid !== undefined)                  payload["affectedRid"]                  = e.affectedRid;
      if (e.refinementTarget !== undefined)             payload["refinementTarget"]              = e.refinementTarget;
    }

    let result: { _id: string; deduped: boolean } | null = null;

    try {
      // Try to drain any pending WAL entries first (oldest-first, batched 50)
      const walEntries = walReadAll(walPath);
      if (walEntries.length > 0) {
        let allDrained = true;
        for (let i = 0; i < walEntries.length; i += WAL_BATCH_SIZE) {
          const batch = walEntries.slice(i, i + WAL_BATCH_SIZE);
          const bulkEvents = batch.map((w) => {
            const p: Record<string, unknown> = {
              projectRoot:     w.projectRoot,
              sequence:        w.sequence,
              eventType:       w.eventType,
              valueGrade:      w.valueGrade,
              byWhomIdentity:  w.byWhomIdentity,
              when:            w.when,
              raw:             w.raw,
            };
            if (w.entry) {
              const en = w.entry;
              if (en.eventId !== undefined)                      p["eventId"]                      = en.eventId;
              if (en.promptId !== undefined)                     p["promptId"]                     = en.promptId;
              if (en.promptHash !== undefined)                   p["promptHash"]                   = en.promptHash;
              if (en.sessionId !== undefined)                    p["sessionId"]                    = en.sessionId;
              if (en.runtime !== undefined)                      p["runtime"]                      = en.runtime;
              if (en.semanticIntentContractRef !== undefined)    p["semanticIntentContractRef"]    = en.semanticIntentContractRef;
              if (en.digitalTwinChangeContractRef !== undefined) p["digitalTwinChangeContractRef"] = en.digitalTwinChangeContractRef;
              if (en.sprintContractRef !== undefined)            p["sprintContractRef"]            = en.sprintContractRef;
              if (en.correlationId !== undefined)                p["correlationId"]                = en.correlationId;
              if (en.agentId !== undefined)                      p["agentId"]                      = en.agentId;
              if (en.toolName !== undefined)                     p["toolName"]                     = en.toolName;
              if (en.commitSha !== undefined)                    p["commitSha"]                    = en.commitSha;
              if (en.branchName !== undefined)                   p["branchName"]                   = en.branchName;
              if (en.pullRequestNumber !== undefined)            p["pullRequestNumber"]             = en.pullRequestNumber;
              if (en.evalSuiteId !== undefined)                  p["evalSuiteId"]                  = en.evalSuiteId;
              if (en.evalRunId !== undefined)                    p["evalRunId"]                    = en.evalRunId;
              if (en.affectedRid !== undefined)                  p["affectedRid"]                  = en.affectedRid;
              if (en.refinementTarget !== undefined)             p["refinementTarget"]              = en.refinementTarget;
            }
            return p;
          });

          try {
            await this.client.mutation(this.api.decisionEvents.bulkMirror, {
              events: bulkEvents,
            });
          } catch (drainErr) {
            process.stderr.write(
              `[palantir-mini/convex-client] WAL drain batch failed: ${(drainErr as Error).message}\n`,
            );
            allDrained = false;
            break;
          }
        }

        if (allDrained) {
          walTruncate(walPath);
          // Emit convex_wal_drained event on first post-outage flush
          _emitWalDrainedEvent(args.projectRoot, walEntries.length);
        }
      }

      // Now mirror the current event
      result = await this.client.mutation(this.api.decisionEvents.mirrorFromEventsLog, payload);
    } catch (e) {
      const msg = (e as Error).message ?? String(e);
      const isNetworkErr =
        msg.includes("ECONNREFUSED") ||
        msg.includes("ETIMEDOUT") ||
        msg.includes("ENOTFOUND") ||
        msg.includes("fetch failed") ||
        msg.includes("network") ||
        /^5\d\d/.test(msg);

      if (isNetworkErr) {
        // Cloud unreachable — buffer to WAL
        const walEntry: WalEntry = {
          projectRoot:    args.projectRoot,
          sequence:       args.sequence,
          eventType:      args.eventType,
          valueGrade:     args.valueGrade,
          byWhomIdentity: args.byWhomIdentity,
          when:           args.when,
          raw:            args.raw,
          entry:          args.entry,
        };
        walAppend(walPath, walEntry);
        process.stderr.write(
          `[palantir-mini/convex-client] Cloud unreachable — buffered to WAL: ${walPath}\n`,
        );
      } else {
        process.stderr.write(
          `[palantir-mini/convex-client] mirrorDecisionEvent error: ${msg}\n`,
        );
      }
    }

    return result;
  }

  /**
   * Query recent eval runs from Convex evalRuns table, filtered by projectSlug.
   * Returns rows ordered by ranAt descending (most recent first), up to limit.
   * On Cloud unreachable / STUB MODE → returns empty rows (graceful degrade).
   * Per canonical plan v2 §4 row 5.4b (sprint-115 PR 5.4b).
   */
  async queryRecentEvalRuns(
    projectSlug: string,
    limit: number,
  ): Promise<EvalRunQueryResult> {
    try {
      // evalRuns table has index by_suite_ran["suiteId","ranAt"]. Since we want
      // all runs for a projectSlug (across suites), we must look up suite IDs
      // first via evalSuites.by_project_suite, then query runs per suiteId.
      // For the pull-based read path, we query all suites for the project slug,
      // collect run rows from evalRuns table sorted by ranAt desc, cap at limit.
      const suites = await this.client.query(
        this.api.evalSuites?.listByProjectSlug ?? this.api.impactGraph?.listEvalSuites,
        { projectSlug },
      );
      const suiteIds: string[] = Array.isArray(suites)
        ? suites.map((s: Record<string, unknown>) => s["suiteId"] as string)
        : [];

      if (suiteIds.length === 0) return { rows: [] };

      const allRuns: AIPEvaluationRunConvexRow[] = [];
      for (const suiteId of suiteIds) {
        const runs = await this.client.query(
          this.api.evalRuns?.listBySuite ?? this.api.impactGraph?.listEvalRuns,
          { suiteId, limit },
        );
        if (Array.isArray(runs)) {
          for (const r of runs) allRuns.push(r as AIPEvaluationRunConvexRow);
        }
      }

      // Sort by ranAt descending, cap at limit.
      allRuns.sort((a, b) => b.ranAt - a.ranAt);
      return { rows: allRuns.slice(0, limit) };
    } catch (e) {
      process.stderr.write(
        `[palantir-mini/convex-client] queryRecentEvalRuns error: ${(e as Error).message}\n`,
      );
      return { rows: [] };
    }
  }
}

// ─── WAL drain event emitter ──────────────────────────────────────────────────

/**
 * Emit a validation_phase_completed / convex_wal_drained event via events.jsonl.
 * Soft-fail: if the append fails, log to stderr and continue.
 * Per canonical plan v2 §4 row 4.1c (sprint-102 PR 4.1c).
 */
function _emitWalDrainedEvent(projectRoot: string, drainedCount: number): void {
  try {
    const eventsPath = path.join(projectRoot, ".palantir-mini", "session", "events.jsonl");
    const dir = path.dirname(eventsPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const envelope = {
      type: "validation_phase_completed",
      eventId: `convex-wal-drained-${Date.now()}`,
      when: new Date().toISOString(),
      atopWhich: process.env.GIT_SHA ?? "unknown",
      throughWhich: { surface: "lib/impact-graph/convex-client.ts", tool: "mirrorDecisionEvent" },
      byWhom: { agent: "convex-client", identity: "claude-code/procedural-skill" },
      payload: {
        errorClass: "convex_wal_drained",
        drainedCount,
        walPath: path.join(projectRoot, ".palantir-mini", "session", "convex-pending.jsonl"),
      },
      withWhat: {
        reasoning:
          `Sprint-102 PR 4.1c: WAL drained ${drainedCount} buffered envelopes to Cloud Convex after outage recovery. ` +
          `WAL buffer at .palantir-mini/session/convex-pending.jsonl drained oldest-first in batches of ${WAL_BATCH_SIZE}. ` +
          `Per canonical plan v2 §4 row 4.1c.`,
      },
    };

    fs.appendFileSync(eventsPath, JSON.stringify(envelope) + "\n", "utf8");
  } catch (e) {
    process.stderr.write(
      `[palantir-mini/convex-client] WAL drained event emit failed: ${(e as Error).message}\n`,
    );
  }
}

// ─── Module-level singleton ───────────────────────────────────────────────────

let _client: RealConvexClient | StubConvexClient | null = null;

export function getConvexClient(): RealConvexClient | StubConvexClient {
  if (_client !== null) return _client;

  // R2 invariant: PALANTIR_MINI_CONVEX_STUB=1 forces stub regardless of URL.
  // Preserves STUB MODE behavior per canonical plan v2 §4 row 4.1c.
  if (process.env.PALANTIR_MINI_CONVEX_STUB === "1") {
    process.stderr.write(
      "[palantir-mini/convex-client] STUB MODE forced via PALANTIR_MINI_CONVEX_STUB=1.\n",
    );
    _client = new StubConvexClient();
    return _client;
  }

  const url = resolveConvexUrl();
  if (!url) {
    _client = new StubConvexClient();
    return _client;
  }

  try {
    _client = new RealConvexClient(url);
    return _client;
  } catch (e) {
    process.stderr.write(
      `[palantir-mini/convex-client] Failed to init ConvexHttpClient: ${(e as Error).message}. Falling back to stub.\n`,
    );
    _client = new StubConvexClient();
    return _client;
  }
}

/** Reset the singleton (primarily for tests). */
export function resetConvexClient(): void {
  _client = null;
}

// ─── Public API (matches sqlite-cache interface for handler drop-in swap) ────

/** Resolve a file path to a project-relative RID. */
export function normalize(filePath: string, projectRoot: string): string {
  if (path.isAbsolute(filePath)) {
    const rel = path.relative(projectRoot, filePath);
    return rel.startsWith("..") ? filePath : rel.replace(/\\/g, "/");
  }
  return filePath.replace(/\\/g, "/");
}

export async function getImpactGraph(
  projectRoot: string,
  rid: string,
  depth?: number,
): Promise<ImpactGraphResult> {
  return getConvexClient().getImpactGraph(projectRoot, rid, depth);
}

export async function getFileState(
  projectRoot: string,
  filePath: string,
): Promise<ConvexFileState | null> {
  return getConvexClient().getFileState(projectRoot, filePath);
}

export async function populateGraph(
  projectRoot: string,
  filePath: string,
  contentHash: string,
  edges: Omit<ConvexEdge, "_id" | "_creationTime">[],
  walkDurationMs: number,
  tsConfig?: string,
): Promise<{ upserted: number }> {
  return getConvexClient().populateGraph(projectRoot, filePath, contentHash, edges, walkDurationMs, tsConfig);
}

export async function applyDiff(args: ApplyDiffArgs): Promise<{ added: number; deleted: number }> {
  return getConvexClient().applyDiff(args);
}

export async function cascadeDelete(
  projectRoot: string,
  filePath: string,
): Promise<{ deletedCount: number }> {
  return getConvexClient().cascadeDelete(projectRoot, filePath);
}

export async function markBatchDirty(
  projectRoot: string,
  paths: string[],
): Promise<{ markedCount: number }> {
  return getConvexClient().markBatchDirty(projectRoot, paths);
}

export async function dirtyCount(projectRoot: string): Promise<number> {
  return getConvexClient().dirtyCount(projectRoot);
}

export async function totalEdgeCount(projectRoot?: string): Promise<number> {
  return getConvexClient().totalEdgeCount(projectRoot);
}

/**
 * Mirror a T3+/T4 event to Convex using the 18-key BackPropValueIndexEntry
 * envelope shape. Cloud-aware: reads URL from .env.cloud when CONVEX_ENV=cloud.
 * On outage: buffers to WAL; drains on next successful call.
 * STUB MODE (PALANTIR_MINI_CONVEX_STUB=1): returns null immediately.
 * Per canonical plan v2 §4 row 4.1c (sprint-102 PR 4.1c).
 */
export async function mirrorDecisionEvent(
  args: MirrorDecisionEventArgs,
): Promise<{ _id: string; deduped: boolean } | null> {
  return getConvexClient().mirrorDecisionEvent(args);
}

/**
 * Query recent eval runs from Convex evalRuns table for a given projectSlug.
 * Returns rows ordered by ranAt descending, up to limit.
 * STUB MODE / Cloud-unreachable: returns { rows: [] } (graceful degrade).
 * Per canonical plan v2 §4 row 5.4b (sprint-115 PR 5.4b).
 */
export async function queryRecentEvalRuns(
  projectSlug: string,
  limit: number,
): Promise<EvalRunQueryResult> {
  return getConvexClient().queryRecentEvalRuns(projectSlug, limit);
}

// Re-export types for callers
export type { BackPropValueIndexEntry } from "#schemas/ontology/primitives/back-prop-value-index";
export type { AIPEvaluationRunConvexRow } from "#schemas/ontology/primitives/aip-evaluation";
