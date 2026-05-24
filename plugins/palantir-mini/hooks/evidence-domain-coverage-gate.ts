// palantir-mini v6.34.0 — PreToolUse hook: evidence-domain-coverage-gate
// Triggers on DigitalTwinChangeContract-mutating MCP tools:
//   - mcp__plugin_palantir-mini_palantir-mini__apply_edit_function
//   - mcp__plugin_palantir-mini_palantir-mini__commit_edits
//   - mcp__plugin_palantir-mini_palantir-mini__ontology_context_query (with mutation mode)
//
// Reads the active SIC (most recent semantic_intent_contract_approved event),
// derives evidence-domains from affectedSurfaces[] top-level segments,
// reads the linked OntologyContextSeed.supportingResearchRefs,
// asserts ≥1 ref per domain.
//
// Advisory after 1st miss; blocking after 2nd. Bypass:
// PALANTIR_MINI_EVIDENCE_DOMAIN_COVERAGE_BYPASS=1 (audited).
//
// Per canonical plan v2 §4 row 5.15.

import { emit } from "../scripts/log";
import * as fs   from "fs";
import * as path from "path";
import * as os   from "os";
import { classifyHookTool } from "../lib/hooks/tool-classifier";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HookPayload {
  cwd?:        string;
  session_id?: string;
  tool_name?:  string;
  tool_input?: Record<string, unknown>;
}

interface HookResult {
  message:            string;
  decision:           "continue" | "deny";
  stopReason?:        string;
  permissionDecision?: "allow" | "deny";
  hookSpecificOutput?: {
    permissionDecision?:       "deny" | "allow";
    permissionDecisionReason?: string;
    additionalContext?:        string;
  };
}

interface SicEvent {
  type:     string;
  when:     string;
  withWhat?: {
    contractId?:      string;
    seedRid?:         string;
    affectedSurfaces?: string[];
    [key: string]:    unknown;
  };
  payload?: {
    contractId?:      string;
    seedRid?:         string;
    affectedSurfaces?: string[];
    [key: string]:    unknown;
  };
  [key: string]: unknown;
}

interface SeedEvent {
  type:     string;
  when:     string;
  withWhat?: {
    seedId?:                 string;
    supportingResearchRefs?: string[];
    [key: string]:           unknown;
  };
  payload?: {
    seedId?:                 string;
    supportingResearchRefs?: string[];
    [key: string]:           unknown;
  };
  [key: string]: unknown;
}

interface StrikeFile {
  count:     number;
  sessionId: string;
  lastMiss:  string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BYPASS_ENV = "PALANTIR_MINI_EVIDENCE_DOMAIN_COVERAGE_BYPASS";

/** Advisory threshold: 1st miss = advisory, 2nd+ = blocking. */
const BLOCK_THRESHOLD = 2;

/** Strike file stored in project session dir. */
const STRIKES_FILENAME = "evidence-domain-strikes.json";

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

/** Resolve events.jsonl path from cwd. */
function eventsPath(cwd: string): string {
  return (
    process.env["PALANTIR_MINI_EVENTS_FILE"] ??
    path.join(cwd, ".palantir-mini", "session", "events.jsonl")
  );
}

/** Read events.jsonl as parsed lines (most-recent-last). */
function readEventLines(evFile: string): unknown[] {
  if (!fs.existsSync(evFile)) return [];
  try {
    return fs
      .readFileSync(evFile, "utf8")
      .split("\n")
      .filter((l) => l.trim().length > 0)
      .map((l) => {
        try { return JSON.parse(l); } catch { return null; }
      })
      .filter((x) => x !== null);
  } catch {
    return [];
  }
}

/**
 * Find the most-recent semantic_intent_contract_approved event in last 60 min.
 * Returns the event or null.
 */
function findActiveSic(evFile: string): SicEvent | null {
  const events  = readEventLines(evFile);
  const cutoff  = Date.now() - 60 * 60 * 1000;  // 60 min window
  // Scan from end (most-recent first)
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i] as SicEvent;
    if (!ev || typeof ev !== "object") continue;
    const ts = typeof ev.when === "string" ? new Date(ev.when).getTime() : 0;
    if (ts < cutoff) continue;
    if (ev.type === "semantic_intent_contract_approved") return ev;
  }
  return null;
}

/**
 * Derive evidence-domains from affectedSurfaces[]:
 * Take the unique first path segment of each surface entry.
 * E.g. ".claude/schemas/foo.ts" → ".claude/schemas"
 *      "~/.claude/research/bar.md" → "~/.claude/research"
 *      "projects/mathcrew/src/foo.ts" → "projects"
 * Returns empty array when affectedSurfaces absent or empty.
 */
function deriveEvidenceDomains(affectedSurfaces: string[]): string[] {
  const home = process.env.HOME ?? "/home/palantirkc";
  const domains = new Set<string>();

  for (const surface of affectedSurfaces) {
    if (!surface || surface.length === 0) continue;

    // Expand ~ to home
    const expanded = surface.startsWith("~/")
      ? path.join(home, surface.slice(2))
      : surface;

    // Compute the top-two path segments for more-precise domain matching
    // For "~/.claude/schemas/foo.ts" → segments are [".claude", "schemas"] → domain = ".claude/schemas"
    // For "projects/mathcrew/src" → domain = "projects"
    // We use the first 2 segments for ~/.claude/* paths, else first segment.
    const parts = expanded.split("/").filter((p) => p.length > 0);

    let domain: string;
    if (parts.length >= 3 && (parts[0] === "home" || parts[0] === "root" || parts[0] === "Users")) {
      // Absolute path: /home/<user>/<segment1>/<segment2> → domain = <segment1>/<segment2>
      domain = parts.slice(2, 4).join("/");
    } else if (parts.length >= 2 && parts[0] === ".claude") {
      domain = parts.slice(0, 2).join("/");
    } else if (parts.length >= 1 && parts[0] !== undefined) {
      domain = parts[0];
    } else {
      continue;
    }

    if (domain.length > 0) domains.add(domain);
  }

  return Array.from(domains);
}

/**
 * Resolve supportingResearchRefs for the given seedRid from events.jsonl.
 * Looks for ontology_context_seed_drafted / ontology_context_seed_updated events.
 * Falls back to SIC file on disk if present.
 */
function resolveSeedRefs(evFile: string, seedRid: string | undefined, cwd: string): string[] {
  // 1. Try events.jsonl
  if (seedRid && seedRid.length > 0) {
    const events = readEventLines(evFile);
    for (let i = events.length - 1; i >= 0; i--) {
      const ev = events[i] as SeedEvent;
      if (!ev || typeof ev !== "object") continue;
      if (
        ev.type === "ontology_context_seed_drafted" ||
        ev.type === "ontology_context_seed_updated" ||
        ev.type === "ontology_context_seed_approved"
      ) {
        const ww  = ev.withWhat ?? ev.payload ?? {};
        const sid = ww.seedId;
        if (typeof sid === "string" && sid === seedRid) {
          const refs = ww.supportingResearchRefs;
          if (Array.isArray(refs)) return refs as string[];
        }
      }
    }
  }

  // 2. Try seed file on disk
  const seedPath = path.join(cwd, ".palantir-mini", "session", "ontology-context-seed.json");
  if (fs.existsSync(seedPath)) {
    try {
      const raw  = JSON.parse(fs.readFileSync(seedPath, "utf8")) as Record<string, unknown>;
      const refs = raw.supportingResearchRefs;
      if (Array.isArray(refs)) return refs as string[];
    } catch {
      // best-effort
    }
  }

  return [];
}

// ─── Strike file helpers ──────────────────────────────────────────────────────

function strikeFilePath(cwd: string): string {
  const projectRoot =
    process.env["PALANTIR_MINI_PROJECT"] ??
    cwd;
  const dir = path.join(projectRoot, ".palantir-mini", "session");
  try { fs.mkdirSync(dir, { recursive: true }); } catch { /* best-effort */ }
  return path.join(dir, STRIKES_FILENAME);
}

function readStrikes(cwd: string, sessionId: string): StrikeFile {
  const fp = strikeFilePath(cwd);
  try {
    if (fs.existsSync(fp)) {
      const raw = JSON.parse(fs.readFileSync(fp, "utf8")) as StrikeFile;
      if (raw.sessionId === sessionId) return raw;
    }
  } catch { /* best-effort */ }
  return { count: 0, sessionId, lastMiss: new Date().toISOString() };
}

function writeStrikes(cwd: string, state: StrikeFile): void {
  const fp  = strikeFilePath(cwd);
  const tmp = fp + ".tmp";
  try {
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2), "utf8");
    fs.renameSync(tmp, fp);
  } catch { /* best-effort */ }
}

function incrementStrikes(cwd: string, sessionId: string): number {
  const current = readStrikes(cwd, sessionId);
  const updated: StrikeFile = {
    count:     current.count + 1,
    sessionId,
    lastMiss:  new Date().toISOString(),
  };
  writeStrikes(cwd, updated);
  return updated.count;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const raw = await readStdin();
  let payload: HookPayload = {};
  if (raw.trim().length > 0) {
    try {
      payload = JSON.parse(raw) as HookPayload;
    } catch {
      const result: HookResult = {
        message:  "palantir-mini: evidence-domain-coverage-gate — parse error; skipping",
        decision: "continue",
      };
      process.stdout.write(JSON.stringify(result) + "\n");
      process.exit(0);
    }
  }

  const toolName  = payload.tool_name ?? "";
  const cwd       = payload.cwd ?? process.cwd();
  const sessionId = payload.session_id ?? "unknown";

  // 1. Only gate-crossing DTC-mutating tools
  const classification = classifyHookTool(payload);
  if (!classification.isDtcMutatingMcpTool) {
    const result: HookResult = {
      message:  `palantir-mini: evidence-domain-coverage-gate — skipped (tool=${toolName})`,
      decision: "continue",
    };
    process.stdout.write(JSON.stringify(result) + "\n");
    process.exit(0);
    return;
  }

  // 2. Bypass check
  if (process.env[BYPASS_ENV] === "1") {
    try {
      await emit({
        type:    "validation_phase_completed",
        payload: {
          phase:      "design",
          passed:     true,
          errorClass: "evidence_domain_coverage_bypass_invoked",
          bypassEnv:  BYPASS_ENV,
          toolName,
        } as Record<string, unknown>,
        toolName: "PreToolUse",
        cwd,
        sessionId,
        identity:  "monitor",
        reasoning: `evidence-domain-coverage-gate: bypass via ${BYPASS_ENV}=1 honored; gate skipped (audited). Per canonical plan v2 §4 row 5.15.`,
      });
    } catch {
      // best-effort emit
    }
    const result: HookResult = {
      message:  `palantir-mini: evidence-domain-coverage-gate — bypass via ${BYPASS_ENV}=1`,
      decision: "continue",
    };
    process.stdout.write(JSON.stringify(result) + "\n");
    process.exit(0);
    return;
  }

  // 3. Find active SIC from events.jsonl
  const evFile  = eventsPath(cwd);
  const sicEvent = findActiveSic(evFile);

  if (!sicEvent) {
    // No active SIC → no-op (gate only applies when SIC is present)
    const result: HookResult = {
      message:  "palantir-mini: evidence-domain-coverage-gate — no-op (no active SIC in last 60 min)",
      decision: "continue",
    };
    process.stdout.write(JSON.stringify(result) + "\n");
    process.exit(0);
    return;
  }

  // 4. Extract affectedSurfaces + seedRid from SIC event
  const ww              = sicEvent.withWhat ?? sicEvent.payload ?? {};
  const affectedSurfaces: string[] = Array.isArray(ww.affectedSurfaces)
    ? (ww.affectedSurfaces as string[])
    : [];
  const seedRid: string | undefined = typeof ww.seedRid === "string" ? ww.seedRid : undefined;

  if (affectedSurfaces.length === 0) {
    // No surfaces declared → no domains to check → no-op
    const result: HookResult = {
      message:  "palantir-mini: evidence-domain-coverage-gate — no-op (no affectedSurfaces in SIC)",
      decision: "continue",
    };
    process.stdout.write(JSON.stringify(result) + "\n");
    process.exit(0);
    return;
  }

  // 5. Derive evidence-domains from affectedSurfaces
  const evidenceDomains = deriveEvidenceDomains(affectedSurfaces);

  if (evidenceDomains.length === 0) {
    const result: HookResult = {
      message:  "palantir-mini: evidence-domain-coverage-gate — no-op (no domains derived from affectedSurfaces)",
      decision: "continue",
    };
    process.stdout.write(JSON.stringify(result) + "\n");
    process.exit(0);
    return;
  }

  // 6. Resolve supportingResearchRefs from linked seed
  const seedRefs = resolveSeedRefs(evFile, seedRid, cwd);

  // 7. Check each domain has ≥1 matching ref in seed.supportingResearchRefs
  const uncoveredDomains: string[] = [];
  for (const domain of evidenceDomains) {
    const hasCoverage = seedRefs.some((ref) => {
      // Expand ~ in ref before comparison
      const home = process.env.HOME ?? "/home/palantirkc";
      const expanded = typeof ref === "string" && ref.startsWith("~/")
        ? path.join(home, ref.slice(2))
        : ref;
      return (
        expanded.startsWith(domain) ||
        expanded.includes(domain) ||
        domain.startsWith(expanded)
      );
    });
    if (!hasCoverage) {
      uncoveredDomains.push(domain);
    }
  }

  // 8. All domains covered → pass
  if (uncoveredDomains.length === 0) {
    const result: HookResult = {
      message:  `palantir-mini: evidence-domain-coverage-gate — all ${evidenceDomains.length} domain(s) covered; gate passed`,
      decision: "continue",
    };
    process.stdout.write(JSON.stringify(result) + "\n");
    process.exit(0);
    return;
  }

  // 9. Domains uncovered — increment strike counter
  const strikeCount = incrementStrikes(cwd, sessionId);
  const isBlocking  = strikeCount >= BLOCK_THRESHOLD;
  const errorClass  = isBlocking
    ? "evidence_domain_coverage_blocked"
    : "evidence_domain_coverage_advisory";

  // Emit advisory/blocking event
  try {
    await emit({
      type:    "validation_phase_completed",
      payload: {
        phase:            "design",
        passed:           !isBlocking,
        errorClass,
        evidenceDomains,
        uncoveredDomains,
        coveredDomains:   evidenceDomains.filter((d) => !uncoveredDomains.includes(d)),
        seedRid:          seedRid ?? null,
        seedRefsCount:    seedRefs.length,
        strikeCount,
        blocking:         isBlocking,
        toolName,
        advisoryMessage:
          `SIC affectedSurfaces derived ${evidenceDomains.length} evidence-domain(s); ` +
          `${uncoveredDomains.length} domain(s) have no OntologyContextSeed.supportingResearchRefs entry: ` +
          `[${uncoveredDomains.join(", ")}]. ` +
          `Add ≥1 supporting ref per domain to the seed before mutating DTC. (strike ${strikeCount})`,
      } as Record<string, unknown>,
      toolName:  "PreToolUse",
      cwd,
      sessionId,
      identity:  "monitor",
      reasoning:
        `evidence-domain-coverage-gate: SIC affectedSurfaces → ${evidenceDomains.length} evidence-domain(s); ` +
        `${uncoveredDomains.length} uncovered by OntologyContextSeed.supportingResearchRefs; ` +
        `strike ${strikeCount}. Canonical plan v2 §4 row 5.15.`,
      refinementTarget: {
        kind:            "other",
        filePathOrRid:   "OntologyContextSeed.supportingResearchRefs",
        description:     `Uncovered evidence domains before DTC mutation: ${uncoveredDomains.join(", ")}`,
        confidenceLevel: "high",
      },
    });
  } catch {
    // best-effort emit — do not block due to emit failure
  }

  const advisoryText = [
    `palantir-mini: evidence-domain-coverage-gate (canonical plan v2 §4 row 5.15) —`,
    `SIC.affectedSurfaces derived ${evidenceDomains.length} evidence-domain(s); ${uncoveredDomains.length} uncovered.`,
    ``,
    `Uncovered domains: [${uncoveredDomains.join(", ")}]`,
    `Covered domains:   [${evidenceDomains.filter((d) => !uncoveredDomains.includes(d)).join(", ")}]`,
    `Seed supportingResearchRefs count: ${seedRefs.length}`,
    seedRid ? `Seed RID: ${seedRid}` : "(no seedRid on SIC; checked session seed file)",
    ``,
    `RULE: Each declared evidence-domain must have ≥1 OntologyContextSeed.supportingResearchRefs`,
    `entry that starts with or includes the domain prefix before DTC mutation.`,
    ``,
    `REMEDIATION: Add supporting refs to the OntologyContextSeed covering the missing domains,`,
    `then emit an ontology_context_seed_updated event, before calling ${toolName}.`,
    ``,
    `Strike ${strikeCount} of ${BLOCK_THRESHOLD} — ${isBlocking ? "BLOCKING" : "advisory (1 more miss will block)"}.`,
    `Bypass: ${BYPASS_ENV}=1 (audited).`,
    ``,
    `Per canonical plan v2 §4 row 5.15 (companion to PR 5.14 Rule 28).`,
  ].join("\n");

  process.stderr.write(advisoryText + "\n");

  if (isBlocking) {
    const result: HookResult = {
      message:           advisoryText,
      decision:          "deny",
      stopReason:        `evidence-domain-coverage-gate: ${uncoveredDomains.length} domain(s) uncovered by seed refs (strike ${strikeCount}/${BLOCK_THRESHOLD})`,
      permissionDecision: "deny",
      hookSpecificOutput: {
        permissionDecision:       "deny",
        permissionDecisionReason: advisoryText,
        additionalContext:
          `evidence-domain-coverage-gate BLOCK: ${uncoveredDomains.length} evidence-domain(s) uncovered. ` +
          `Bypass: ${BYPASS_ENV}=1 (audited).`,
      },
    };
    process.stdout.write(JSON.stringify(result) + "\n");
    process.exit(0);
    return;
  }

  const result: HookResult = {
    message:  advisoryText,
    decision: "continue",
    hookSpecificOutput: {
      additionalContext: advisoryText,
    },
  };
  process.stdout.write(JSON.stringify(result) + "\n");
  process.exit(0);
}

void main().catch((e) => {
  process.stderr.write(`[evidence-domain-coverage-gate] unhandled error: ${(e as Error).message}\n`);
  const fallback: HookResult = {
    message:  "palantir-mini: evidence-domain-coverage-gate — unhandled error; continuing",
    decision: "continue",
  };
  process.stdout.write(JSON.stringify(fallback) + "\n");
  process.exit(0);
});
