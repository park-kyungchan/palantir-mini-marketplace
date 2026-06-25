// @domain: LEARN
// lead-decision-emit-cli — Path-B governed-emit CLI for a LEAD orchestration decision (P3).
//
// WHY THIS EXISTS (closes the dogfood, ssot/palantir Altitude-2 BackwardProp doctrine):
// the Lead's high-signal orchestration verdicts ("delegate STAGE 4 to an opus subagent",
// "pick approach A", "refine this hypothesis") are exactly the decisions the BackwardProp
// fold most wants to surface NEXT session — yet there was no governed write path for them.
// The prior emit locus — the MCP emit_event tool — is HIDDEN under the live altitude-2 MCP
// profile (mcp-tool-capability.ts: emit_event ∈ INTERNAL_TELEMETRY; the altitude-2 surface
// is studio-core + altitude-2-read only), so a Lead decision could never land. This thin CLI
// routes the governed emit through pm's in-process scripts/log.ts emit() (Path B), which is
// NOT subject to the MCP profile — the SAME mechanism the second-brain fold uses
// (lib/second-brain/foldedsessions-emit-cli.ts).
//
// CLEAN SEPARATION (USER/LEAD decision): a Lead decision emits a NEW 'lead_decision' event
// type, NOT the fold's 'resolution_verdict'. The Lead's orchestration verdicts stay cleanly
// separable from fold output; the a2-prior fold-verdict BY-TYPE branch already whitelists
// 'lead_decision' (lib/runtime-overlay/a2-prior.ts FOLD_VERDICT_TYPES), so a freshly-emitted
// T2/T3 lead_decision surfaces NEXT session BY TYPE even before any promotion grades it.
//
// READ-ONLY BASH CLASSIFICATION: this CLI only APPENDS to events.jsonl (via emit() →
// appendEventAtomic, an atomic write+rename inside Node fs — never a shell redirect). Its
// `bun run lib/lead-intent/lead-decision-emit-cli.ts <args>` invocation carries no shell
// redirect / mutating verb, so lib/hooks/tool-classifier.ts isReadOnlyBashCommand
// (DENYLIST-WINS) classifies it read-only/allowed — same as the fold emit CLI.
//
// GRADING (rule 26 §Auto-grade): the in-band emit() auto-grades the envelope. With the 5-dim
// envelope (A) + memoryLayers (E) + a B-axis signal (withWhat.hypothesis OR lineageRefs) the
// decision grades ≥T2; ADDING withWhat.refinementTarget (C) lifts it to T3. The CLI maps the
// decisionJson fields onto exactly those withWhat slots.
//
// IDENTITY: the REAL runtime identity (resolveEmitIdentity, from PALANTIR_MINI_HOST_RUNTIME,
// default "claude-code") — NEVER "monitor" (a Lead decision is a runtime decision, not a
// monitor/hook telemetry emit).
//
// Usage:
//   bun run lib/lead-intent/lead-decision-emit-cli.ts <projectRoot> <sessionId> <decisionJson>
//     <decisionJson> — a JSON object:
//       { decision, reasoning, hypothesis?, refinementTarget?, memoryLayers, lineageRefs? }
// Exit 0 on success; nonzero + stderr on bad/missing input.

import { emit } from "../../scripts/log";
import { resolveEmitIdentity } from "../second-brain/foldedsessions-emit-cli";
import type { AgenticMemoryLayer } from "#schemas/ontology/primitives/agentic-memory-layer";
import type { RefinementTarget } from "#schemas/ontology/primitives/refinement-target";
import type { LineageRefs } from "#schemas/ontology/primitives/lineage-refs";

/**
 * toolName carried on the Lead-decision row. This is a runtime Lead emit, not a
 * monitor/hook telemetry emit, so it is tagged with the CLI's own context path —
 * a contracts/hooks-layer origin (rule 10 §Auto-derivation derives propagationDepth
 * from this path; the lead-intent path resolves to the contracts/hooks layer).
 */
const EMIT_TOOL_NAME = "lead-decision-emit-cli";

/** One Lead-decision input as PARSED from the <decisionJson> CLI arg. */
export interface LeadDecisionObj {
  /** The Lead's decision, one line. Lands in payload.decision. */
  decision:          string;
  /** First-class WHY (rule 26 §Axis A) → withWhat.reasoning. */
  reasoning:         string;
  /** Axis B signal → withWhat.hypothesis (presence lifts the grade to ≥T2). */
  hypothesis?:       string;
  /** Axis C signal → withWhat.refinementTarget (presence lifts the grade to T3). */
  refinementTarget?: RefinementTarget;
  /** Axis E mapping → withWhat.memoryLayers (required at T2+; no heuristic for this type). */
  memoryLayers:      readonly AgenticMemoryLayer[];
  /** Axis A3 / alternative axis-B signal → lineageRefs. */
  lineageRefs?:      LineageRefs;
}

/**
 * Forward ONE Lead-decision object into the project's events.jsonl via Path-B emit().
 * Maps the decision-grade fields onto withWhat (reasoning/hypothesis/refinementTarget/
 * memoryLayers) + lineageRefs so the in-band auto-grade reaches ≥T2 (T3 with
 * refinementTarget). identity = real runtime (never "monitor"). Returns the sequence.
 */
export async function emitLeadDecision(
  obj: LeadDecisionObj,
  projectRoot: string,
  sessionId: string,
): Promise<number> {
  return emit({
    type:             "lead_decision",
    payload:          { decision: obj.decision },
    toolName:         EMIT_TOOL_NAME,
    cwd:              projectRoot,
    sessionId,
    identity:         resolveEmitIdentity(),
    // EXPLICIT memoryLayers — lead_decision has NO AUTO_TAG_HEURISTICS entry, so
    // omitting these would drop Axis E (rule 26).
    memoryLayers:     obj.memoryLayers,
    // First-class WHY (Axis A) + Axis-B hypothesis + Axis-C refinement target.
    reasoning:        obj.reasoning,
    hypothesis:       obj.hypothesis,
    refinementTarget: obj.refinementTarget,
    ...(obj.lineageRefs !== undefined ? { lineageRefs: obj.lineageRefs } : {}),
  });
}

/** Parse + structurally validate a decisionJson string. Throws on malformed input. */
export function parseDecisionObj(raw: string): LeadDecisionObj {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`decisionJson is not valid JSON: ${(e as Error).message}`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(
      "decisionJson must be a JSON object { decision, reasoning, memoryLayers, ... }",
    );
  }
  const o = parsed as Record<string, unknown>;
  if (typeof o.decision !== "string" || o.decision.trim().length === 0) {
    throw new Error("decisionJson.decision must be a non-empty string");
  }
  if (typeof o.reasoning !== "string" || o.reasoning.trim().length === 0) {
    throw new Error("decisionJson.reasoning must be a non-empty string (rule 26 §Axis A WHY)");
  }
  if (
    !Array.isArray(o.memoryLayers) ||
    o.memoryLayers.length === 0 ||
    !o.memoryLayers.every((l) => typeof l === "string")
  ) {
    throw new Error(
      "decisionJson.memoryLayers must be a non-empty string[] (rule 26 §Axis E) — " +
      "≥1 of working/episodic/semantic/procedural",
    );
  }
  return parsed as LeadDecisionObj;
}

if (import.meta.main) {
  const [, , projectRoot, sessionId, decisionJson] = process.argv;
  if (!projectRoot || !sessionId || decisionJson === undefined) {
    process.stderr.write(
      "usage: lead-decision-emit-cli.ts <projectRoot> <sessionId> <decisionJson>\n",
    );
    process.exit(2);
  }
  let obj: LeadDecisionObj;
  try {
    obj = parseDecisionObj(decisionJson);
  } catch (e) {
    process.stderr.write(`lead-decision-emit-cli: ${(e as Error).message}\n`);
    process.exit(2);
  }
  emitLeadDecision(obj, projectRoot, sessionId)
    .then((seq) => {
      process.stdout.write(JSON.stringify({ emitted: true, sequence: seq }) + "\n");
      process.exit(0);
    })
    .catch((e) => {
      process.stderr.write(`lead-decision-emit-cli: ${(e as Error).message}\n`);
      process.exit(1);
    });
}
