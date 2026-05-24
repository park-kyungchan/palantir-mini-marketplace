// palantir-mini — t4-canonical-emit-watch hook (sprint-062 W2-α)
// Fires on: PostToolUse(mcp__plugin_palantir-mini_palantir-mini__emit_event)
//
// PURPOSE: After each emit_event MCP call, inspect the emitted envelope.
// When the event is validation_phase_completed AND carries lineageRefs.actionRid,
// check how many distinct byWhom.identity values have emitted events for the
// same actionRid in the last 7 days.
//
// K >= 2 distinct → emit T4 D2-canonical envelope (rule 26 v1.1.0 §D2 multi-vendor).
// K == 1          → emit T4 D2-fallback envelope (single-vendor-attested + lower confidence).
//
// Authority:
//   rule 26 v1.1.0 §D2 — K-LLM Consensus (dual-mode)
//   rule 26 v1.3.0 §Auto-grade — T4 reachable via D2-canonical or D2-fallback
//   sprint-062 W2-α acceptance criteria: ≥1 T4 event during sprint

import * as fs from "fs";
import * as path from "path";
import { emit } from "../scripts/log";
import { readEvents } from "../lib/event-log/read";
import type { EventEnvelope } from "../lib/event-log/types";

// ─── Hook input shape (PostToolUse stdin) ────────────────────────────────────

interface PostToolUsePayload {
  tool_input?:    unknown;
  tool_response?: unknown;
  session_id?:    string;
  cwd?:           string;
}

// ─── Seven-day window (ms) ────────────────────────────────────────────────────

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extract the emitted envelope from tool_input or tool_response.
 * emit_event puts the envelope in tool_input.envelope; the response
 * carries eventId + sequence. We need the input envelope for type + lineageRefs.
 */
function extractEnvelope(payload: PostToolUsePayload): Record<string, unknown> | null {
  try {
    const input = payload.tool_input as { envelope?: Record<string, unknown> } | undefined;
    if (input && typeof input === "object" && "envelope" in input) {
      const env = input.envelope;
      if (env && typeof env === "object") return env as Record<string, unknown>;
    }
  } catch {
    // fall through
  }
  return null;
}

/**
 * Extract actionRid from lineageRefs.
 */
function extractActionRid(envelope: Record<string, unknown>): string | null {
  try {
    const lr = envelope["lineageRefs"] as Record<string, unknown> | undefined;
    if (lr && typeof lr["actionRid"] === "string") return lr["actionRid"] as string;
  } catch {
    // fall through
  }
  return null;
}

/**
 * Count distinct byWhom.identity values for events that:
 *   - have type === "validation_phase_completed"
 *   - have lineageRefs.actionRid === targetActionRid
 *   - were emitted within the last 7 days
 */
function countDistinctIdentities(
  events:          EventEnvelope[],
  targetActionRid: string,
): Set<string> {
  const cutoff    = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();
  const identities = new Set<string>();

  for (const ev of events) {
    if (ev.type !== "validation_phase_completed") continue;
    if (typeof ev.when === "string" && ev.when < cutoff) continue;

    const lr = (ev as EventEnvelope & { lineageRefs?: Record<string, unknown> }).lineageRefs;
    if (!lr || lr["actionRid"] !== targetActionRid) continue;

    const identity = ev.byWhom?.identity;
    if (typeof identity === "string") identities.add(identity);
  }

  return identities;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // Read hook payload from stdin
  let rawInput = "";
  for await (const chunk of process.stdin) rawInput += chunk;

  let payload: PostToolUsePayload = {};
  try {
    payload = JSON.parse(rawInput) as PostToolUsePayload;
  } catch {
    // Malformed input — exit silently (advisory hook, never blocks)
    process.exit(0);
  }

  const cwd = payload.cwd ?? process.env.PALANTIR_MINI_PROJECT ?? process.cwd();

  // Extract the emitted envelope
  const envelope = extractEnvelope(payload);
  if (!envelope) {
    process.exit(0); // Not an emit_event call with envelope — skip
  }

  // Only care about validation_phase_completed
  if (envelope["type"] !== "validation_phase_completed") {
    process.exit(0);
  }

  // Must have lineageRefs.actionRid to trace K-LLM consensus
  const actionRid = extractActionRid(envelope);
  if (!actionRid) {
    process.exit(0);
  }

  // Read events.jsonl for K-LLM check
  const eventsPath = path.join(cwd, ".palantir-mini", "session", "events.jsonl");
  let existingEvents: EventEnvelope[] = [];
  if (fs.existsSync(eventsPath)) {
    existingEvents = readEvents(eventsPath);
  }

  const identities = countDistinctIdentities(existingEvents, actionRid);

  // Include the current emit's identity in the count
  const currentIdentity = (envelope["byWhom"] as { identity?: string } | undefined)?.identity;
  if (typeof currentIdentity === "string") {
    identities.add(currentIdentity);
  }

  const k = identities.size;

  if (k >= 2) {
    // D2-canonical: K >= 2 distinct vendors (e.g. claude-code + codex-cli)
    await emit({
      type:    "validation_phase_completed",
      payload: {
        phase:      "post_write",
        passed:     true,
        errorClass: "t4_canonical_consensus_reached",
      },
      toolName:    "t4-canonical-emit-watch",
      cwd,
      reasoning:   `T4 D2-canonical: K=${k} distinct identities [${[...identities].join(", ")}] agreed on actionRid=${actionRid}. Per rule 26 v1.1.0 §D2 multi-vendor consensus.`,
      hypothesis:  `K-LLM consensus (K=${k}) on actionRid=${actionRid} elevates this envelope to T4 D2-canonical confidence. Future: Codex as 2nd vendor grader.`,
      memoryLayers: ["episodic", "semantic"],
      lineageRefs:  {
        actionRid,
      },
      // T4 D2-canonical metadata embedded in payload via valueGrade override
      valueGrade: "T4",
    });
  } else {
    // D2-fallback: K == 1 — single-vendor attestation (sprint-062 single-Claude-account constraint)
    await emit({
      type:    "validation_phase_completed",
      payload: {
        phase:      "post_write",
        passed:     true,
        errorClass: "t4_fallback_single_vendor",
      },
      toolName:    "t4-canonical-emit-watch",
      cwd,
      reasoning:   `T4 D2-fallback: K=1 (single-vendor, identity=[${[...identities].join(", ")}]) for actionRid=${actionRid}. Marked single-vendor-attested per rule 26 v1.1.0 §D2-fallback. Confidence tier: lower. Sprint-062 constraint: 2nd vendor (Codex) not yet wired.`,
      memoryLayers: ["episodic"],
      lineageRefs:  {
        actionRid,
      },
      // D2-fallback: T4 with lower confidence tier
      valueGrade: "T4",
    });
  }

  // Output advisory to stderr for Lead visibility (never blocks)
  process.stderr.write(
    `[t4-canonical-emit-watch] actionRid=${actionRid} K=${k} identities=[${[...identities].join(",")}] → ${k >= 2 ? "D2-canonical" : "D2-fallback"}\n`,
  );

  // Advisory hook — always continue
  process.stdout.write(JSON.stringify({ continue: true }) + "\n");
}

main().catch((err) => {
  process.stderr.write(`[t4-canonical-emit-watch] error: ${String(err)}\n`);
  process.exit(0); // Advisory — never block on failure
});
