// palantir-mini v0 — Structured event log writer helper
// Domain: LEARN (prim-learn-01 AppendOnlyEventLog entry-point)
//
// Invoked by hook handlers and bridge handlers. Encapsulates Decision Lineage
// 5-dim envelope construction + atomic append.
//
// Per-project session dir lookup: <project>/.palantir-mini/session/events.jsonl
// Project root is determined by PALANTIR_MINI_PROJECT env var if set, else cwd.

import * as fs from "fs";
import * as path from "path";
import { appendEventAtomic } from "../lib/event-log/append";
import type { EventEnvelope, EventId, CommitSha, SessionId } from "../lib/event-log/types";
import type { AgenticMemoryLayer } from "#schemas/ontology/primitives/agentic-memory-layer";
import type { RefinementTarget } from "#schemas/ontology/primitives/refinement-target";
import type { LineageRefs } from "#schemas/ontology/primitives/lineage-refs";
import type { ValueGrade } from "#schemas/ontology/primitives/value-grade";
// W1.2/W1.4/W1.5 (sprint-026) — in-band substrate enrichment imports.
// These cover path B (hook-direct emit() calls that bypass the MCP boundary).
// Path A (MCP mcp__emit_event → bridge/handlers/emit-event.ts) already grades
// + outcome-pair-tracks via PostToolUse hooks; the in-band path catches the
// 96% of emits that the empirical audit (2026-05-06) found ungraded.
import { autoGradeEnvelope } from "../bridge/handlers/emit-event";
import { suggestLayers } from "../lib/memory-layer/heuristics";
import {
  classifyPairRole,
  outcomePairsDir,
  writeOpenMarker,
  closeOpenMarker,
  writeClosedMarker,
} from "../lib/outcome-pairing/track";
import { isCanonicalSkillSlug, inferCanonicalSlug } from "../lib/skill-registry/canonical-slugs";

export interface LogEnvelope {
  type:     EventEnvelope["type"];
  payload:  EventEnvelope["payload"];
  toolName: string;
  cwd:      string;
  sessionId?: string;
  identity?:  "claude-code" | "codex" | "gemini" | "user" | "monitor" | "test-agent";
  agentName?: string;
  teamName?:  string;
  reasoning?: string;
  hypothesis?: string;
  /**
   * When true, emit() additionally appends the event to the parent project's
   * events.jsonl (federation for Lead-spawned agents).
   * Defaults to false — backward-compatible for all existing handlers.
   */
  hierarchyMode?: boolean;
  // ─── v1.35.0 valuable-data substrate (rule 26) ─────────────────────────
  /** Axis E — 4-layer agentic memory mapping (working/episodic/semantic/procedural). Required at T2+ per rule 26. */
  memoryLayers?: readonly AgenticMemoryLayer[];
  /** Axis C2 — typed refinement pointer. Required on validation_phase_completed.passed=false per rule 26 §R5. */
  refinementTarget?: RefinementTarget;
  /** Axis A3 — typed cross-references (actionRid / dryRunRef / outcomePairId / evidenceUrls). */
  lineageRefs?: LineageRefs;
  /** Substrate-routing grade (T0..T4). Set by value-grade-assigner hook; callers may pass to override auto-grade. */
  valueGrade?: ValueGrade;
  /** Axis A2 — propagation chain depth (0..5). */
  propagationDepth?: number;
  /** Axis D1 — provider-neutral identity fields (LLMI-02). */
  model?: string;
  provider?: string;
  interfaceFamily?: string;
  runtime?: string;
  /** UI/system surface tag (e.g. "workshop", "cli", "mcp"). */
  surface?: string;
}

type RuntimeIdentity = NonNullable<LogEnvelope["identity"]>;

function normalizeRuntimeIdentity(value: string | undefined): RuntimeIdentity | undefined {
  switch (value?.trim()) {
    case "claude":
    case "claude-code":
      return "claude-code";
    case "codex":
    case "codex-cli":
      return "codex";
    case "gemini":
    case "gemini-cli":
      return "gemini";
    case "user":
    case "monitor":
    case "test-agent":
      return value.trim() as RuntimeIdentity;
    default:
      return undefined;
  }
}

function resolveRuntimeIdentity(env: LogEnvelope): RuntimeIdentity {
  return env.identity
    ?? normalizeRuntimeIdentity(env.runtime)
    ?? normalizeRuntimeIdentity(process.env.PALANTIR_MINI_HOST_RUNTIME)
    ?? "claude-code";
}

/** Resolves the project root for session dir lookup. */
export function projectRoot(): string {
  return process.env.PALANTIR_MINI_PROJECT ?? process.cwd();
}

/**
 * Resolves the parent project root for federation writes.
 * Returns the value of PALANTIR_MINI_PARENT_PROJECT env var, or null when
 * the current session has no parent (i.e. it is itself the Lead session).
 */
export function projectHierarchy(): string | null {
  const parent = process.env.PALANTIR_MINI_PARENT_PROJECT;
  return parent && parent.trim().length > 0 ? parent.trim() : null;
}

/** Resolves the per-project events.jsonl path. */
export function eventsPathFor(root: string): string {
  const override = process.env.PALANTIR_MINI_EVENTS_FILE;
  if (override && path.isAbsolute(override)) {
    if (process.env.PALANTIR_MINI_EVENTS_FILE_FORCE === "1") return override;
    const resolvedRoot = path.resolve(root);
    const resolvedOverride = path.resolve(override);
    const relative = path.relative(resolvedRoot, resolvedOverride);
    const overrideInsideRoot = relative.length > 0 && !relative.startsWith("..") && !path.isAbsolute(relative);
    if (overrideInsideRoot) return override;
  }
  return path.join(root, ".palantir-mini", "session", "events.jsonl");
}

/** Best-effort git HEAD SHA. Empty string if not in a git repo. */
function gitHeadSha(root: string): string {
  const gitHead = path.join(root, ".git", "HEAD");
  if (!fs.existsSync(gitHead)) return "no-git";
  try {
    const head = fs.readFileSync(gitHead, "utf8").trim();
    if (head.startsWith("ref: ")) {
      const refPath = path.join(root, ".git", head.slice(5));
      if (fs.existsSync(refPath)) return fs.readFileSync(refPath, "utf8").trim();
      return head.slice(5);
    }
    return head;
  } catch {
    return "no-git";
  }
}

function uniqueEventId(): string {
  return `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Build a complete envelope with 5-dim Decision Lineage and append atomically. */
export async function emit(env: LogEnvelope): Promise<number> {
  // B-30 (harness-h4 canary): handler-supplied env.cwd takes precedence over
  // MCP subprocess process.cwd() so events land in the project's events.jsonl
  // that the handler was invoked for, not the MCP server's launch cwd.
  const root  = env.cwd && env.cwd.length > 0 ? env.cwd : projectRoot();
  const epath = eventsPathFor(root);
  const sha   = gitHeadSha(root);

  // ─── W1.5 (sprint-026) — AUTO_TAG_HEURISTICS in-band injection ──────────
  // Caller did not declare memoryLayers AND envelope.type has a heuristic →
  // inject the heuristic so Axis E (rule 26) is satisfied on path B emits.
  // Skipped when caller explicitly passed memoryLayers (caller wins).
  let effectiveMemoryLayers = env.memoryLayers;
  if (effectiveMemoryLayers === undefined || effectiveMemoryLayers.length === 0) {
    const suggested = suggestLayers(env.type);
    if (suggested.length > 0) {
      effectiveMemoryLayers = suggested;
    }
  }

  // v1.35.0 — withWhat now carries memoryLayers + refinementTarget when provided.
  const hasWithWhat =
    Boolean(env.reasoning) ||
    Boolean(env.hypothesis) ||
    (effectiveMemoryLayers !== undefined && effectiveMemoryLayers.length > 0) ||
    env.refinementTarget !== undefined;

  const base = {
    eventId: uniqueEventId() as unknown as EventId,
    when:    new Date().toISOString(),
    atopWhich: sha as unknown as CommitSha,
    throughWhich: {
      sessionId: (env.sessionId ?? "local") as unknown as SessionId,
      toolName:  env.toolName,
      cwd:       env.cwd,
      ...(env.surface !== undefined ? { surface: env.surface } : {}),
    },
    byWhom: {
      identity:  resolveRuntimeIdentity(env),
      agentName: env.agentName,
      teamName:  env.teamName,
      ...(env.model !== undefined ? { model: env.model } : {}),
      ...(env.provider !== undefined ? { provider: env.provider } : {}),
      ...(env.interfaceFamily !== undefined ? { interfaceFamily: env.interfaceFamily } : {}),
      ...(env.runtime !== undefined ? { runtime: env.runtime } : {}),
    },
    withWhat: hasWithWhat ? {
      reasoning:  env.reasoning,
      hypothesis: env.hypothesis,
      ...(effectiveMemoryLayers !== undefined && effectiveMemoryLayers.length > 0
        ? { memoryLayers: effectiveMemoryLayers }
        : {}),
      ...(env.refinementTarget !== undefined
        ? { refinementTarget: env.refinementTarget }
        : {}),
    } : undefined,
    ...(env.lineageRefs !== undefined ? { lineageRefs: env.lineageRefs } : {}),
    ...(env.propagationDepth !== undefined ? { propagationDepth: env.propagationDepth } : {}),
  };

  const envelopeNoGrade = {
    ...base,
    type:    env.type,
    payload: env.payload,
  } as Omit<EventEnvelope, "sequence" | "valueGrade">;

  // ─── W1.2 (sprint-026) — autoGradeEnvelope in-band injection ────────────
  // Caller did not pass valueGrade AND envelope went through path B (hook
  // direct emit() — never crossed MCP boundary, so value-grade-assigner
  // PreToolUse hook didn't fire) → compute grade in-band per rule 26 §Auto-grade.
  // Caller-supplied valueGrade always wins.
  const computedGrade = env.valueGrade ?? autoGradeEnvelope(envelopeNoGrade as Omit<EventEnvelope, "sequence">);
  const envelope = {
    ...envelopeNoGrade,
    valueGrade: computedGrade,
  } as Omit<EventEnvelope, "sequence">;

  // ─── W2.4 (sprint-027) — skill_started canonical-slug advisory ─────────
  // When emitting a skill_started event whose payload.skillName is not in the
  // canonical SKILL.md slug set, log to stderr (advisory; never blocks). The
  // caller is responsible for fixing instrumentation; this advisory is the
  // observability hook that surfaces the gap.
  if (env.type === "skill_started") {
    const skillName = (env.payload as { skillName?: unknown })?.skillName;
    if (typeof skillName === "string" && skillName.length > 0 && !isCanonicalSkillSlug(skillName)) {
      const inferred = inferCanonicalSlug(skillName);
      const advisoryMsg = inferred !== null
        ? `[palantir-mini/skill-started] non-canonical skillName="${skillName}" — inferred canonical="${inferred}"; please normalize at emit site.`
        : `[palantir-mini/skill-started] non-canonical skillName="${skillName}" — no canonical prefix match; verify against plugins/palantir-mini/skills/.`;
      try {
        process.stderr.write(`${advisoryMsg}\n`);
      } catch { /* best-effort */ }
    }
  }

  // ─── W1.4 (sprint-026) — outcome-pairing in-band marker write ──────────
  // Path B emits never trigger the outcome-pair-tracker PostToolUse hook
  // (no MCP boundary), so the pre-W1.4 substrate had 0 pairs across 1533
  // events. Classify pair role and write marker to <project>/.palantir-mini/
  // session/outcome-pairs/. Best-effort — never throws.
  try {
    const role = classifyPairRole(env.type);
    if (role !== null) {
      const pairsDir = outcomePairsDir(root);
      const envelopeForPairing = {
        type:        envelope.type,
        eventId:     envelope.eventId as unknown as string,
        when:        envelope.when,
        lineageRefs: envelope.lineageRefs,
        payload:     envelope.payload as Record<string, unknown>,
      };
      if (role === "open") {
        writeOpenMarker(pairsDir, envelopeForPairing);
      } else {
        // role === "close" — try mutating an existing OPEN marker first; if no
        // matching open marker, write a standalone closed marker (snapshot only).
        const closed = closeOpenMarker(pairsDir, envelopeForPairing);
        if (closed === null) {
          writeClosedMarker(pairsDir, envelopeForPairing);
        }
      }
    }
  } catch {
    // best-effort; outcome-pair tracking is opportunistic, never blocks emit
  }

  // Leaf-project write (always)
  const seq = await appendEventAtomic(epath, envelope);

  // Federation: when hierarchyMode is true and a parent project is declared,
  // also write to the parent events.jsonl so Lead-spawned agent events are
  // visible in both parent and leaf event logs (append-only, no rewrite).
  if (env.hierarchyMode) {
    const parentRoot = projectHierarchy();
    if (parentRoot !== null) {
      const parentEpath = eventsPathFor(parentRoot);
      // Best-effort — if the parent write fails we do not throw; leaf write
      // already succeeded and the append-only invariant is preserved.
      try {
        await appendEventAtomic(parentEpath, envelope);
      } catch {
        // parent federation failure is non-fatal
      }
    }
  }

  return seq;
}
