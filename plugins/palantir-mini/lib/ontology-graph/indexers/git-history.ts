/**
 * lib/ontology-graph/indexers/git-history.ts — Ninth-in-sequence concrete indexer
 * for the in-memory OntologyGraphStore (PR 2.13 sprint-090; THIRD PR of
 * Sprint X3 / canonical plan v2 §4 row 2.13). Runs `git log` for recent commits
 * + `gh pr list` for PR metadata, emits `Commit` + `PullRequest` node fragments
 * (PR 2.1 wrappers), and emits `correlatesWith` lineage-edges (PR 2.2 cluster)
 * linking each Commit→PullRequest whose `mergeCommit.oid` matches the commit SHA.
 *
 * @stable
 *
 * Authority chain:
 *   ~/.claude/schemas/ontology/primitives/ (PR 2.1 node + PR 2.2 edge sources)
 *     → ~/ontology/shared-core/index.ts (consumer surface)
 *     → lib/ontology-graph/types.ts (NodeRecord, EdgeRecord, NodeRid, EdgeRid,
 *                                    NodeTypeKind literals "Commit", "PullRequest",
 *                                    EdgeKindUnion literal "correlatesWith")
 *     → lib/ontology-graph/indexers/events.ts (read-only structural reference)
 *     → lib/ontology-graph/store.ts (OntologyGraphStore consumer — NOT called here)
 *     → this file (pure fragment producer; no live store mutation; no events.jsonl
 *                  write — rule 10 append-only invariant respected)
 *     → PR 2.14 (orchestration layer — reconciles Commit `atopWhich` to Event
 *                NodeRids emitted by PR 2.12)
 *
 * D/L/A domain: DATA — invokes two shell commands (git log + gh pr list) under
 * a single projectRoot, parses results, emits a flat { nodes, edges } fragment.
 * No event emission, no store mutation, no Convex. NEVER writes to projectRoot
 * via mutating git commands — only `git log` (read-only) + optional `gh pr list`
 * (read-only) + `gh --version` (probe).
 *
 * IMPLEMENTATION NOTE: Uses generic-only emission (Option A per sprint-090/spec.md
 * §2 inheriting sprint-089/spec.md §2.2). Local payload interfaces CommitPayload +
 * PullRequestPayload + CorrelatesWithEdgePayload mirror the PR 2.1/2.2 wrapper-
 * primitive field shape but do NOT import from @palantirKC/ontology-shared-core
 * (snapshot at runtime-overlay/ predates PR 2.1+2.2; importing fails with TS2307).
 * When snapshot is refreshed, local interfaces become drop-in compatible.
 *
 * NAMING NOTE: Canonical NodeTypeKind discriminators are "Commit" and "PullRequest"
 * (lib/ontology-graph/types.ts). Canonical EdgeKindUnion discriminator is
 * "correlatesWith" (lineage cluster). Indexer uses these literals verbatim so
 * future TypedGraphNode/Edge union projection binds without rename.
 *
 * Walk targets (single projectRoot — NO directory walk):
 *   - `git -C <projectRoot> log --format=%H%x00%ae%x00%cI%x00%P%x00%s -n <maxCommits>`
 *   - `gh -R <projectRoot> pr list --state all --limit <maxPRs>
 *      --json number,title,isDraft,mergeable,mergedAt,mergeCommit,headRefName,baseRefName`
 *   (gh path skipped when opts.skipPRs=true OR `gh --version` probe fails.)
 *
 * Node kinds emitted:
 *   - "Commit" (one per `git log` row; payload fields per §3.4 spec)
 *   - "PullRequest" (one per `gh pr list` JSON element; payload fields per §3.4 spec)
 *
 * Edge kinds emitted:
 *   - "correlatesWith" (lineage-edge cluster; one per (Commit, PullRequest) pair
 *                       where the commit's SHA matches the PR's `mergeCommit.oid`)
 *
 * Perf caps (spec §3.3):
 *   - opts.maxCommits defaults to 500 — enforced at `git log -n` (source-side).
 *   - opts.maxPRs defaults to 100 — enforced at `gh pr list --limit` (source-side).
 *
 * @owner palantirkc-ontology
 * @since palantir-mini v6.11.0 (sprint-090 PR 2.13; Sprint X3 PR 3/5)
 */

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { promisify } from "node:util";

import type { NodeRecord, EdgeRecord, NodeRid, EdgeRid } from "../types";

const execFileAsync = promisify(execFile);

// ─── Local payload interfaces (Option A — no shared-core import) ──────────────

interface CommitPayload {
  readonly projectRoot: string;
  readonly lastIndexed: string;

  readonly sha: string;
  readonly authorEmail: string;
  readonly committerDateIso: string;
  readonly parentSha?: string;
  readonly subject: string;
}

interface PullRequestPayload {
  readonly projectRoot: string;
  readonly lastIndexed: string;

  readonly number: number;
  readonly title: string;
  readonly isDraft: boolean;
  readonly mergeable: string;
  readonly mergedAt?: string;
  readonly mergeCommitSha?: string;
  readonly headRefName: string;
  readonly baseRefName: string;
}

interface CorrelatesWithEdgePayload {
  readonly joinReason: "merge-sha-match";
  readonly mergeCommitSha: string;
}

// ─── Brand helpers (local; mirrors PR 2.4-2.12 indexer pattern) ───────────────

function nodeRid(s: string): NodeRid {
  return s as NodeRid;
}

function edgeRid(s: string): EdgeRid {
  return s as EdgeRid;
}

// ─── RID derivation ───────────────────────────────────────────────────────────

function ridFromCommit(projectRoot: string, sha: string): NodeRid {
  const hash = createHash("sha256")
    .update(`${projectRoot}#${sha}`)
    .digest("hex");
  return nodeRid(`commit:${hash}`);
}

function ridFromPullRequest(projectRoot: string, prNumber: number): NodeRid {
  const hash = createHash("sha256")
    .update(`${projectRoot}#${prNumber}`)
    .digest("hex");
  return nodeRid(`pr:${hash}`);
}

function edgeRidFromCorrelates(from: NodeRid, to: NodeRid): EdgeRid {
  const hash = createHash("sha256")
    .update(`${from}:correlatesWith:${to}`)
    .digest("hex");
  return edgeRid(`git-history-edge:${hash}`);
}

// ─── Shell invocation helpers ─────────────────────────────────────────────────

/**
 * Best-effort probe for the `gh` CLI. Returns true when `gh --version` exits 0.
 * Suppresses all errors (PATH miss, ENOENT, non-zero exit) → returns false.
 */
async function isGhAvailable(): Promise<boolean> {
  try {
    await execFileAsync("gh", ["--version"], { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Invoke `git log` under <projectRoot>. Returns the parsed commit rows or `[]`
 * when git is unavailable / projectRoot is not a git working tree / git exits
 * non-zero. NEVER throws.
 */
async function readGitLog(
  projectRoot: string,
  maxCommits: number,
): Promise<ReadonlyArray<{
  sha: string;
  authorEmail: string;
  committerDateIso: string;
  parentSha?: string;
  subject: string;
}>> {
  try {
    const { stdout } = await execFileAsync(
      "git",
      [
        "-C",
        projectRoot,
        "log",
        "--format=%H%x00%ae%x00%cI%x00%P%x00%s",
        "-n",
        String(maxCommits),
      ],
      { maxBuffer: 64 * 1024 * 1024, timeout: 30000 },
    );

    const rows: Array<{
      sha: string;
      authorEmail: string;
      committerDateIso: string;
      parentSha?: string;
      subject: string;
    }> = [];

    for (const line of stdout.split("\n")) {
      if (line.length === 0) continue;
      const fields = line.split("\x00");
      if (fields.length < 5) continue;
      const [sha, authorEmail, committerDateIso, parents, subject] = fields;
      if (!sha || !authorEmail || !committerDateIso) continue;
      const parentSha = parents && parents.length > 0
        ? parents.split(" ")[0]
        : undefined;
      rows.push({
        sha,
        authorEmail,
        committerDateIso,
        ...(parentSha !== undefined && parentSha.length > 0 ? { parentSha } : {}),
        subject: subject ?? "",
      });
    }

    return rows;
  } catch {
    return [];
  }
}

/**
 * Invoke `gh pr list` under <projectRoot>. Returns the parsed PR objects or `[]`
 * when gh is unavailable / projectRoot has no PRs / gh exits non-zero / JSON
 * parse fails. NEVER throws.
 */
async function readGhPrList(
  projectRoot: string,
  maxPRs: number,
): Promise<ReadonlyArray<{
  number: number;
  title: string;
  isDraft: boolean;
  mergeable: string;
  mergedAt?: string;
  mergeCommit?: { oid?: string } | null;
  headRefName: string;
  baseRefName: string;
}>> {
  try {
    const { stdout } = await execFileAsync(
      "gh",
      [
        "-R",
        projectRoot,
        "pr",
        "list",
        "--state",
        "all",
        "--limit",
        String(maxPRs),
        "--json",
        "number,title,isDraft,mergeable,mergedAt,mergeCommit,headRefName,baseRefName",
      ],
      { maxBuffer: 64 * 1024 * 1024, timeout: 30000 },
    );

    const parsed = JSON.parse(stdout) as unknown;
    if (!Array.isArray(parsed)) return [];

    const rows: Array<{
      number: number;
      title: string;
      isDraft: boolean;
      mergeable: string;
      mergedAt?: string;
      mergeCommit?: { oid?: string } | null;
      headRefName: string;
      baseRefName: string;
    }> = [];

    for (const raw of parsed) {
      if (!raw || typeof raw !== "object") continue;
      const obj = raw as Record<string, unknown>;
      const number = typeof obj.number === "number" ? obj.number : undefined;
      const title = typeof obj.title === "string" ? obj.title : undefined;
      const isDraft = typeof obj.isDraft === "boolean" ? obj.isDraft : undefined;
      const mergeable = typeof obj.mergeable === "string" ? obj.mergeable : undefined;
      const headRefName = typeof obj.headRefName === "string" ? obj.headRefName : undefined;
      const baseRefName = typeof obj.baseRefName === "string" ? obj.baseRefName : undefined;
      if (
        number === undefined ||
        title === undefined ||
        isDraft === undefined ||
        mergeable === undefined ||
        headRefName === undefined ||
        baseRefName === undefined
      ) {
        continue;
      }
      const mergedAt = typeof obj.mergedAt === "string" ? obj.mergedAt : undefined;
      const mergeCommitRaw = obj.mergeCommit;
      const mergeCommit = mergeCommitRaw && typeof mergeCommitRaw === "object"
        ? (mergeCommitRaw as { oid?: unknown })
        : null;
      const oid = mergeCommit && typeof mergeCommit.oid === "string"
        ? mergeCommit.oid
        : undefined;
      rows.push({
        number,
        title,
        isDraft,
        mergeable,
        ...(mergedAt !== undefined ? { mergedAt } : {}),
        mergeCommit: oid !== undefined ? { oid } : null,
        headRefName,
        baseRefName,
      });
    }

    return rows;
  } catch {
    return [];
  }
}

// ─── Main indexer function ────────────────────────────────────────────────────

/**
 * Run `git log` for recent commits + (best-effort) `gh pr list` for PR metadata
 * under <projectRoot>, emit Commit + PullRequest node fragments + correlatesWith
 * edges linking commits to their merging PR. NEVER throws.
 *
 * Does NOT call store.addNode / store.addEdge — fragment emission only.
 * NEVER writes to events.jsonl — rule 10 append-only invariant respected.
 * NEVER mutates git state — only invokes read-only commands (`git log`, `gh pr list`,
 * `gh --version`).
 *
 * Cross-indexer endpoint reconciliation (e.g. wiring a Commit's SHA to Event
 * nodes from PR 2.12 via `atopWhich`) is the orchestration layer's job (PR 2.14).
 *
 * @param projectRoot — absolute path to the project root. The indexer invokes
 *   git/gh ONLY scoped to this projectRoot. NEVER walks into other projectRoot.
 * @param opts.maxCommits — perf cap on `git log -n` (default 500).
 * @param opts.maxPRs — perf cap on `gh pr list --limit` (default 100).
 * @param opts.skipPRs — when true, skip `gh pr list` entirely (used in tests
 *   where `gh` is unavailable). Default false.
 * @param opts.nowIso — injectable ISO timestamp for test determinism (defaults
 *   to current time).
 */
export async function indexGitHistory(
  projectRoot: string,
  opts?: {
    readonly maxCommits?: number;
    readonly maxPRs?: number;
    readonly skipPRs?: boolean;
    readonly nowIso?: string;
  },
): Promise<{
  readonly nodes: ReadonlyArray<NodeRecord<unknown>>;
  readonly edges: ReadonlyArray<EdgeRecord<unknown>>;
}> {
  const nowIso = opts?.nowIso ?? new Date().toISOString();
  const maxCommits = opts?.maxCommits ?? 500;
  const maxPRs = opts?.maxPRs ?? 100;
  const skipPRs = opts?.skipPRs ?? false;

  // ─── Step 1: git log ─────────────────────────────────────────────────────────
  const commitRows = await readGitLog(projectRoot, maxCommits);

  // ─── Step 2: gh pr list (best-effort) ────────────────────────────────────────
  let prRows: ReadonlyArray<{
    number: number;
    title: string;
    isDraft: boolean;
    mergeable: string;
    mergedAt?: string;
    mergeCommit?: { oid?: string } | null;
    headRefName: string;
    baseRefName: string;
  }> = [];

  if (!skipPRs) {
    const ghOk = await isGhAvailable();
    if (ghOk) {
      prRows = await readGhPrList(projectRoot, maxPRs);
    }
  }

  // ─── Step 3: emit Commit nodes ───────────────────────────────────────────────
  const nodes: NodeRecord<unknown>[] = [];
  const edges: EdgeRecord<unknown>[] = [];

  // Map sha → CommitRid for the correlatesWith join below
  const commitRidBySha = new Map<string, NodeRid>();

  for (const row of commitRows) {
    const rid = ridFromCommit(projectRoot, row.sha);
    commitRidBySha.set(row.sha, rid);
    const payload: CommitPayload = {
      projectRoot,
      lastIndexed: nowIso,
      sha: row.sha,
      authorEmail: row.authorEmail,
      committerDateIso: row.committerDateIso,
      ...(row.parentSha !== undefined ? { parentSha: row.parentSha } : {}),
      subject: row.subject,
    };
    const node: NodeRecord<CommitPayload> = {
      rid,
      kind: "Commit",
      value: payload,
    };
    nodes.push(node);
  }

  // ─── Step 4: emit PullRequest nodes + correlatesWith edges ───────────────────
  for (const pr of prRows) {
    const prRid = ridFromPullRequest(projectRoot, pr.number);
    const mergeCommitSha = pr.mergeCommit?.oid;
    const prPayload: PullRequestPayload = {
      projectRoot,
      lastIndexed: nowIso,
      number: pr.number,
      title: pr.title,
      isDraft: pr.isDraft,
      mergeable: pr.mergeable,
      ...(pr.mergedAt !== undefined ? { mergedAt: pr.mergedAt } : {}),
      ...(mergeCommitSha !== undefined ? { mergeCommitSha } : {}),
      headRefName: pr.headRefName,
      baseRefName: pr.baseRefName,
    };
    const prNode: NodeRecord<PullRequestPayload> = {
      rid: prRid,
      kind: "PullRequest",
      value: prPayload,
    };
    nodes.push(prNode);

    // correlatesWith edge when mergeCommit.oid matches a known Commit SHA
    if (mergeCommitSha !== undefined) {
      const commitRid = commitRidBySha.get(mergeCommitSha);
      if (commitRid !== undefined) {
        const correlatesEdge: EdgeRecord<CorrelatesWithEdgePayload> = {
          rid: edgeRidFromCorrelates(commitRid, prRid),
          kind: "correlatesWith",
          fromRid: commitRid,
          toRid: prRid,
          value: {
            joinReason: "merge-sha-match",
            mergeCommitSha,
          },
        };
        edges.push(correlatesEdge);
      }
    }
  }

  return { nodes, edges };
}
