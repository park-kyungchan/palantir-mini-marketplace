// palantir-mini — ontology-engineering-turn-fan-out-gate hook (sprint-125 PR 5.14)
// Fires on: PreToolUse — Agent tool only
//
// Advisory → blocking ladder (rule 28 v1.0.0):
//   When an active SemanticIntentContract has evidenceDomains.length > 2,
//   each domain must have ≥1 `evidence_domain_visited` event before Phase 3
//   (subagent spawn). Missing-domain strikes are tracked in a session temp file.
//
//   Strike 1-2: advisory (decision: "continue") + stderr message.
//   Strike 3+:  blocking (decision: "deny").
//   Bypass:     PALANTIR_MINI_TURN_FAN_OUT_BYPASS=1 (audited).
//
// Authority:
//   rule 28 v1.0.0 §Advisory → blocking ladder
//   rule 12 (lead-protocol-v2) §Pre-delegation framework
//   rule 16 §SprintContract bind
//   rule 26 §Axis D evidence-domain coverage
//   canonical plan v2 §4 row 5.14

import { emit } from "../scripts/log";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HookPayload {
  cwd?:        string;
  session_id?: string;
  tool_name?:  string;
  tool_input?: Record<string, unknown>;
}

interface HookResult {
  message:           string;
  decision:          "continue" | "deny";
  stopReason?:       string;
  permissionDecision?: "allow" | "deny";
}

interface SemanticIntentContract {
  evidenceDomains?: string[];
  [key: string]:    unknown;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BYPASS_ENV    = "PALANTIR_MINI_TURN_FAN_OUT_BYPASS";
const STRIKES_FNAME = "ontology-engineering-turn-fan-out-strikes.json";
const ADVISORY_MAX  = 2;   // strikes 1-2 → advisory; 3+ → blocking

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return "";
  const chunks: Buffer[] = [];
  try {
    for await (const chunk of process.stdin) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : (chunk as Buffer));
    }
  } catch {
    return "";
  }
  return Buffer.concat(chunks).toString("utf8");
}

/** Resolve the SIC file path from cwd. Returns null if not found. */
function findSicFile(cwd: string): string | null {
  const candidates = [
    path.join(cwd, ".palantir-mini", "session", "semantic-intent-contract.json"),
    path.join(cwd, ".palantir-mini", "semantic-intent-contract.json"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

/** Load evidenceDomains from the active SIC. Returns null if no SIC or no domains. */
function loadEvidenceDomains(cwd: string): string[] | null {
  const sicPath = findSicFile(cwd);
  if (!sicPath) return null;
  try {
    const raw = fs.readFileSync(sicPath, "utf8");
    const sic = JSON.parse(raw) as SemanticIntentContract;
    if (!Array.isArray(sic.evidenceDomains) || sic.evidenceDomains.length === 0) return null;
    return sic.evidenceDomains as string[];
  } catch {
    return null;
  }
}

/** Load visited domains from events.jsonl. */
function loadVisitedDomains(cwd: string): Set<string> {
  const eventsFile =
    process.env["PALANTIR_MINI_EVENTS_FILE"] ??
    path.join(cwd, ".palantir-mini", "session", "events.jsonl");
  const visited = new Set<string>();
  if (!fs.existsSync(eventsFile)) return visited;
  try {
    const lines = fs.readFileSync(eventsFile, "utf8")
      .split("\n")
      .filter(l => l.trim().length > 0);
    for (const line of lines) {
      try {
        const evt = JSON.parse(line) as Record<string, unknown>;
        if (evt["type"] === "evidence_domain_visited") {
          const ww = evt["withWhat"] as Record<string, unknown> | undefined;
          const domain = ww?.["domain"];
          if (typeof domain === "string" && domain.length > 0) {
            visited.add(domain);
          }
        }
      } catch {
        // skip malformed lines
      }
    }
  } catch {
    // best-effort
  }
  return visited;
}

/** Strike file lives in OS tmp so it survives context compaction but not reboots. */
function strikesFilePath(sessionId: string | undefined): string {
  const sessionSuffix = sessionId ? `-${sessionId.slice(0, 12)}` : "";
  return path.join(os.tmpdir(), `claude-hooks${sessionSuffix}-${STRIKES_FNAME}`);
}

function loadStrikes(sessionId: string | undefined): number {
  const p = strikesFilePath(sessionId);
  try {
    if (!fs.existsSync(p)) return 0;
    const data = JSON.parse(fs.readFileSync(p, "utf8")) as { strikes?: number };
    return typeof data.strikes === "number" ? data.strikes : 0;
  } catch {
    return 0;
  }
}

function saveStrikes(sessionId: string | undefined, count: number): void {
  try {
    fs.writeFileSync(strikesFilePath(sessionId), JSON.stringify({ strikes: count }), "utf8");
  } catch {
    // best-effort
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const raw = await readStdin();
  let payload: HookPayload = {};
  if (raw.trim().length > 0) {
    try {
      payload = JSON.parse(raw) as HookPayload;
    } catch {
      // parse error → skip gracefully
      const result: HookResult = {
        message:  "palantir-mini: ontology-engineering-turn-fan-out-gate — parse error; skipping",
        decision: "continue",
      };
      process.stdout.write(JSON.stringify(result) + "\n");
      process.exit(0);
    }
  }

  const cwd       = payload.cwd ?? process.cwd();
  const sessionId = payload.session_id;

  // 0. Bypass check
  if (process.env[BYPASS_ENV] === "1") {
    try {
      const bypassPayload: Record<string, unknown> = {
        phase:      "design",
        passed:     true,
        errorClass: "turn_fan_out_bypass_invoked",
        bypassEnv:  BYPASS_ENV,
      };
      await emit({
        type:    "validation_phase_completed",
        payload: bypassPayload,
        toolName:  "Agent",
        cwd,
        sessionId,
        identity:  "monitor",
        reasoning: `rule 28 v1.0.0 §Advisory → blocking ladder — bypass env ${BYPASS_ENV}=1 honored; gate skipped (audited)`,
      });
    } catch {
      // best-effort emit
    }
    const result: HookResult = {
      message:  `palantir-mini: ontology-engineering-turn-fan-out-gate — bypass via ${BYPASS_ENV}=1`,
      decision: "continue",
    };
    process.stdout.write(JSON.stringify(result) + "\n");
    process.exit(0);
  }

  // 1. Load active SIC evidence domains
  const evidenceDomains = loadEvidenceDomains(cwd);
  if (!evidenceDomains || evidenceDomains.length <= 2) {
    // No SIC or ≤2 domains → no-op
    const result: HookResult = {
      message:  `palantir-mini: ontology-engineering-turn-fan-out-gate — no-op (evidenceDomains=${evidenceDomains?.length ?? 0})`,
      decision: "continue",
    };
    process.stdout.write(JSON.stringify(result) + "\n");
    process.exit(0);
  }

  // 2. Check which domains have been visited
  const visitedDomains = loadVisitedDomains(cwd);
  const missingDomains = evidenceDomains.filter(d => !visitedDomains.has(d));

  if (missingDomains.length === 0) {
    // All domains visited → allow spawn
    const result: HookResult = {
      message:  `palantir-mini: ontology-engineering-turn-fan-out-gate — all ${evidenceDomains.length} evidence domains visited; spawn allowed`,
      decision: "continue",
    };
    process.stdout.write(JSON.stringify(result) + "\n");
    process.exit(0);
  }

  // 3. Missing domains detected — apply strike ladder
  const prevStrikes = loadStrikes(sessionId);
  const newStrikes  = prevStrikes + 1;
  saveStrikes(sessionId, newStrikes);

  const isBlocking = newStrikes > ADVISORY_MAX;
  const errorClass = isBlocking
    ? "turn_fan_out_blocking"
    : "turn_fan_out_advisory_emitted";

  const strikePayload: Record<string, unknown> = {
    phase:          "design",
    passed:         !isBlocking,
    errorClass,
    missingDomains,
    visitedDomains: Array.from(visitedDomains),
    strikeCount:    newStrikes,
    blocking:       isBlocking,
    advisoryMessage:
      `SemanticIntentContract has ${evidenceDomains.length} evidenceDomains; ` +
      `${missingDomains.length} unvisited before Phase 3 spawn: [${missingDomains.join(", ")}]. ` +
      `Emit evidence_domain_visited for each missing domain before spawning. (strike ${newStrikes})`,
  };

  try {
    await emit({
      type:    "validation_phase_completed",
      payload: strikePayload,
      toolName:  "Agent",
      cwd,
      sessionId,
      identity:  "monitor",
      reasoning:
        `rule 28 v1.0.0 §Advisory → blocking ladder — ` +
        `SIC evidenceDomains.length=${evidenceDomains.length} > 2; ` +
        `${missingDomains.length} domains unvisited before Phase 3; strike ${newStrikes}`,
      refinementTarget: {
        kind:            "other",
        filePathOrRid:   "evidence_domain_visited events",
        description:     `Unvisited evidence domains before Phase 3 spawn: ${missingDomains.join(", ")}`,
        confidenceLevel: "high",
      },
    });
  } catch {
    // best-effort emit — never block spawn due to emit failure
  }

  const advisoryText =
    `palantir-mini: ontology-engineering-turn-fan-out-gate (rule 28 v1.0.0) — ` +
    `SIC evidenceDomains.length=${evidenceDomains.length} > 2; ` +
    `${missingDomains.length} domain(s) need ≥1 evidence-gathering turn before spawning: ` +
    `[${missingDomains.join(", ")}]. ` +
    `Emit \`evidence_domain_visited\` with withWhat.domain=<domain> for each. ` +
    `Strike ${newStrikes}/${ADVISORY_MAX + 1} — ${isBlocking ? "BLOCKING" : "advisory"}. ` +
    `Bypass: ${BYPASS_ENV}=1 (audited).\n`;

  process.stderr.write(advisoryText);

  if (isBlocking) {
    const result: HookResult = {
      message:           advisoryText.trim(),
      decision:          "deny",
      stopReason:        `rule 28: unvisited evidence domains before Phase 3 spawn (strike ${newStrikes})`,
      permissionDecision: "deny",
    };
    process.stdout.write(JSON.stringify(result) + "\n");
    process.exit(0);
  }

  const result: HookResult = {
    message:  advisoryText.trim(),
    decision: "continue",
  };
  process.stdout.write(JSON.stringify(result) + "\n");
  process.exit(0);
}

void main().catch((e) => {
  process.stderr.write(`[ontology-engineering-turn-fan-out-gate] unhandled error: ${(e as Error).message}\n`);
  const fallback: HookResult = {
    message:  "palantir-mini: ontology-engineering-turn-fan-out-gate — unhandled error; continuing",
    decision: "continue",
  };
  process.stdout.write(JSON.stringify(fallback) + "\n");
  process.exit(0);
});
