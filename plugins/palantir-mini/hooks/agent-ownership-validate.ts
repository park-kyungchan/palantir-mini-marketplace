// palantir-mini PR-13 — Hook enforcement level
//   enforcement: blocking
//   rationale:   permissionDecision=defer + process.exit(2) in body; blocks Edit|Write|MultiEdit on plugin files outside the owning agent's writable set.
// palantir-mini v4.12.0 — agent-ownership-validate hook (sprint-060 W1.8)
// Fires on: PreToolUse(Edit|Write|MultiEdit) for palantir-mini plugin files.
//
// PURPOSE: Enforce rule 07 §Agent file-ownership at the filesystem layer.
// Rule 07 distributes plugin file ownership across hook-builder / plugin-maintainer
// / protocol-designer. Before this hook, ownership was enforced ONLY by Lead
// dispatch — a misrouted task (e.g. hook-builder editing plugin.json) would
// succeed at the filesystem layer and only appear in the audit trail after-the-fact.
//
// Logic:
//   1. Extract file_path from tool_input.
//   2. If file_path does NOT start with PLUGIN_ROOT → pass-through (out of scope).
//   3. Derive relative path within plugin root.
//   4. Identify caller agent from payload (byWhom.agentName or agent_name).
//   5. If caller is Lead-direct (claude-code / no subagent type) → EXEMPT.
//   6. Look up caller in AGENT_OWNERSHIP_TABLE:
//      a. If caller is unknown → advisory (not all agents are in the table; e.g.
//         researcher, evaluator) — pass-through with advisory emit.
//      b. If caller agent's patterns match relPath → ALLOW.
//      c. If relPath matches SHARED_ADVISORY_PATTERNS → advisory emit + ALLOW
//         (lib/** requires coordination, not a hard deny).
//      d. Otherwise → emit agent_ownership_violation + deny.
//   7. Bypass: PALANTIR_MINI_AGENT_OWNERSHIP_BYPASS=1 (audited via
//      agent_ownership_bypass_invoked event).
//
// Authority:
//   rule 07 v1.2.0 §Agent file-ownership
//   PR #103 (2026-04-21) precedent — hook-builder edited plugin.json out-of-scope.
//
// permissionDecision: "deny" on violation
// blocking: true
// timeout: 3 seconds

import * as path from "path";
import { emit } from "../scripts/log";
import {
  AGENT_OWNERSHIP_TABLE,
  SHARED_ADVISORY_PATTERNS,
  isKnownAgent,
  type AgentName,
} from "../lib/agent-ownership-table";
import {
  DEFAULT_PLUGIN_ROOT,
  findAgentInventoryEntry,
  formatOutputContractStatus,
  statusRequiresBlocking,
} from "../lib/agents/inventory";
import { resolvePalantirMiniRoot } from "../lib/config/root";

// ─── Types ───────────────────────────────────────────────────────────────────

interface HookPayload {
  cwd?:        string;
  session_id?: string;
  tool_name?:  string;
  tool_input?: {
    file_path?:     string;
    notebook_path?: string;
    [key: string]: unknown;
  };
  byWhom?: {
    agentName?: string;
    identity?:  string;
  };
  agent_name?:    string;
  subagent_type?: string;
}

interface HookResult {
  message: string;
  hookSpecificOutput?: {
    permissionDecision?:       "deny" | "allow";
    permissionDecisionReason?: string;
    additionalContext?:        string;
  };
}

// ─── Constants ───────────────────────────────────────────────────────────────

function pluginRoot(): string {
  return path.resolve(resolvePalantirMiniRoot() ?? DEFAULT_PLUGIN_ROOT);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns true if this edit is from Lead-direct context.
 * Lead (dispatcher) is exempt — it is not subject to the ownership table.
 * Same logic as pre-delegation-check.ts / lead-direct-edit-watch.ts.
 */
function isLeadDirect(p: HookPayload): boolean {
  const agentName = p.byWhom?.agentName ?? p.agent_name;
  const subagentType = p.subagent_type;

  if (agentName === "claude-code") return true;
  if (agentName && agentName !== "claude-code" && agentName !== "subagent-unnamed") {
    return false; // named subagent — not Lead-direct
  }
  if (agentName === "subagent-unnamed") {
    return !subagentType || subagentType === "claude-code";
  }
  if (!agentName) {
    return !p.subagent_type; // no name, no subagent_type → infer Lead-direct
  }
  return false;
}

/**
 * Extract caller agent name from payload.
 * Returns null when no agent name is determinable.
 */
function callerAgentName(p: HookPayload): string | null {
  const name = p.byWhom?.agentName ?? p.agent_name ?? null;
  return name && name.length > 0 ? name : null;
}

/**
 * Normalize file path: expand ~ prefix, resolve absolute.
 */
function resolveAbsPath(filePath: string, cwd: string): string {
  const home = process.env.HOME ?? "/home/palantirkc";
  if (filePath.startsWith("~/")) {
    return path.resolve(home, filePath.slice(2));
  }
  if (!path.isAbsolute(filePath)) {
    return path.resolve(cwd, filePath);
  }
  return filePath;
}

/**
 * Minimal glob pattern matcher sufficient for the ownership table patterns:
 *   - "hooks/**"      → any file under hooks/ (any depth)
 *   - "hooks/**"      also matches "hooks/foo.ts"
 *   - ".codex-plugin/plugin.json" → exact match
 *   - "README.md"     → exact match
 *
 * Supported wildcards:
 *   **  → matches any path segment(s) including /
 *    *  → matches any single path segment (no /)
 *
 * dot-files (e.g. .codex-plugin/) are matched transparently.
 */
function globMatch(pattern: string, input: string): boolean {
  // Convert glob to a RegExp
  // 1. Escape regex special chars except * ? [ ]
  // 2. Replace ** with a placeholder, then * with [^/]*, then restore **
  const DOUBLE_STAR = "\x00DOUBLESTAR\x00";
  let re = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&") // escape regex specials (but not *)
    .replace(/\*\*/g, DOUBLE_STAR)
    .replace(/\*/g, "[^/]*")
    .replace(new RegExp(DOUBLE_STAR.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), ".*");
  // Anchor full match
  const regex = new RegExp(`^${re}$`);
  return regex.test(input);
}

/**
 * Check if a relPath (relative to plugin root) matches any of the given patterns.
 */
function matchesAnyPattern(relPath: string, patterns: readonly string[]): boolean {
  return patterns.some((pat) => globMatch(pat, relPath));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default async function agentOwnershipValidate(payload: unknown): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;
  const cwd      = p.cwd ?? process.cwd();
  const toolName = p.tool_name ?? "unknown";
  const sessionId = p.session_id;

  try {
    // 1. Bypass via env var (audited)
    if (process.env.PALANTIR_MINI_AGENT_OWNERSHIP_BYPASS === "1") {
      const callerName = callerAgentName(p) ?? "unknown";
      const rawPath = p.tool_input?.file_path ?? p.tool_input?.notebook_path ?? "";
      try {
        await emit({
          type: "validation_phase_completed",
          payload: {
            phase:      "design",
            passed:     true,
            errorClass: "agent_ownership_bypass_invoked",
          },
          toolName,
          cwd,
          sessionId,
          identity:    "monitor",
          agentName:   callerName,
          memoryLayers: ["working", "procedural"],
          reasoning:   `agent-ownership-validate: bypass via PALANTIR_MINI_AGENT_OWNERSHIP_BYPASS=1 (agent=${callerName}, file=${rawPath}). Audited per rule 07 v1.2.0 §Agent file-ownership.`,
          refinementTarget: {
            kind:            "other",
            filePathOrRid:   "hooks/agent-ownership-validate.ts",
            description:     `Agent ownership bypass invoked by ${callerName} for ${rawPath || "unknown file"}. Audited per rule 07 v1.2.0 §Agent file-ownership.`,
            confidenceLevel: "high",
          },
        });
      } catch { /* best-effort */ }
      return { message: `palantir-mini: agent-ownership-validate BYPASS (env, agent=${callerName})` };
    }

    // 2. Resolve file path
    const rawFilePath = p.tool_input?.file_path ?? p.tool_input?.notebook_path;
    if (!rawFilePath || typeof rawFilePath !== "string" || rawFilePath.length === 0) {
      // No file path determinable — pass-through (cannot evaluate ownership)
      return { message: "palantir-mini: agent-ownership-validate SKIP (no file_path in tool_input)" };
    }

    const absPath = resolveAbsPath(rawFilePath, cwd);

    // 3. Check if path is within plugin root — if not, out of scope
    const root = pluginRoot();
    const pluginRootNorm = root.endsWith("/") ? root : root + "/";
    const isInPluginRoot = absPath === root || absPath.startsWith(pluginRootNorm);
    if (!isInPluginRoot) {
      return { message: `palantir-mini: agent-ownership-validate SKIP (out-of-scope: ${absPath})` };
    }

    // 4. Derive relative path
    const relPath = absPath === root
      ? ""
      : absPath.slice(pluginRootNorm.length);

    // 5. Lead-direct exemption
    if (isLeadDirect(p)) {
      return { message: `palantir-mini: agent-ownership-validate EXEMPT (Lead-direct, file=${relPath})` };
    }

    // 6. Identify caller agent
    const callerName = callerAgentName(p);

    if (callerName) {
      const inventoryEntry = findAgentInventoryEntry(callerName, root);
      if (inventoryEntry && statusRequiresBlocking(inventoryEntry)) {
        const status = formatOutputContractStatus(inventoryEntry);
        const violationMsg =
          `Mutation-capable agent "${callerName}" cannot mutate plugin files before declaring ` +
          `the PR-G output contract minimum fields: ${status}`;
        try {
          await emit({
            type: "validation_phase_completed",
            payload: {
              phase:      "design",
              passed:     false,
              errorClass: "agent_output_contract_missing",
            },
            toolName,
            cwd,
            sessionId,
            identity:    "monitor",
            agentName:   callerName,
            memoryLayers: ["procedural", "semantic"],
            reasoning:   `agent-ownership-validate DENY: ${violationMsg} file=${relPath}`,
          });
        } catch { /* best-effort emit; still deny */ }
        return {
          message: `palantir-mini: agent-ownership-validate DENY (missing output contract, agent=${callerName}, file=${relPath})`,
          hookSpecificOutput: {
            permissionDecision:       "deny",
            permissionDecisionReason: violationMsg,
            additionalContext:        "Add a complete ## Output Contract section or explicit outputContractExempt metadata before mutation.",
          },
        };
      }
    }

    // 6a. Unknown agent (not in table: researcher, evaluator, etc.) → advisory + pass-through
    if (!callerName || !isKnownAgent(callerName)) {
      const displayName = callerName ?? "unknown";
      try {
        await emit({
          type: "validation_phase_completed",
          payload: {
            phase:      "design",
            passed:     true,
            errorClass: "agent_ownership_unknown_agent",
          },
          toolName,
          cwd,
          sessionId,
          identity:    "monitor",
          agentName:   displayName,
          memoryLayers: ["procedural", "semantic"],
          reasoning:   `agent-ownership-validate: caller "${displayName}" not in ownership table — non-hook/maintainer/designer agent, advisory pass-through (file=${relPath})`,
        });
      } catch { /* best-effort */ }
      return {
        message: `palantir-mini: agent-ownership-validate ADVISORY (unknown agent "${displayName}", file=${relPath})`,
      };
    }

    // callerName is now a known AgentName
    const agent: AgentName = callerName;
    const agentPatterns = AGENT_OWNERSHIP_TABLE[agent];

    // 6b. Check agent's own patterns — ALLOW if match
    if (matchesAnyPattern(relPath, agentPatterns)) {
      return { message: `palantir-mini: agent-ownership-validate ALLOW (${agent}, file=${relPath})` };
    }

    // 6c. Shared paths (lib/**) → advisory + ALLOW
    if (matchesAnyPattern(relPath, SHARED_ADVISORY_PATTERNS)) {
      try {
        await emit({
          type: "validation_phase_completed",
          payload: {
            phase:      "design",
            passed:     true,
            errorClass: "agent_ownership_shared_advisory",
          },
          toolName,
          cwd,
          sessionId,
          identity:    "monitor",
          agentName:   agent,
          memoryLayers: ["procedural", "semantic"],
          reasoning:   `agent-ownership-validate: ${agent} editing lib/** (shared path "${relPath}") — advisory emit. lib/** requires cross-agent coordination per rule 07 §Agent file-ownership.`,
        });
      } catch { /* best-effort */ }
      return {
        message: `palantir-mini: agent-ownership-validate ADVISORY (${agent} editing shared path ${relPath} — coordination required)`,
      };
    }

    // 6d. No match → DENY
    const violationMsg = [
      `palantir-mini agent-ownership-validate BLOCK in ${root}`,
      ``,
      `Agent "${agent}" attempted to write: ${relPath}`,
      ``,
      `=== RULE 07 §Agent file-ownership VIOLATION ===`,
      ``,
      `Permitted paths for "${agent}":`,
      ...agentPatterns.map((p) => `  - ${p}`),
      ``,
      `The file "${relPath}" does not match any permitted pattern.`,
      ``,
      `Correct actions:`,
      `  • If this task should be done by a different agent, Lead should re-route`,
      `    the task to the owning agent.`,
      `  • If rule 07 ownership table needs updating, coordinate with Lead and`,
      `    update lib/agent-ownership-table.ts + rule 07 together.`,
      ``,
      `PR #103 precedent (2026-04-21): hook-builder editing plugin.json produced a`,
      `phantom v1.2.0 that existed only in plugin cache. This hook prevents recurrence.`,
      ``,
      `Bypass for emergency only: PALANTIR_MINI_AGENT_OWNERSHIP_BYPASS=1 (audited).`,
      `Cross-ref: rule 07 v1.2.0 §Agent file-ownership`,
    ].join("\n");

    try {
      await emit({
        type: "validation_phase_completed",
        payload: {
          phase:      "design",
          passed:     false,
          errorClass: "agent_ownership_violation",
        },
        toolName,
        cwd,
        sessionId,
        identity:    "monitor",
        agentName:   agent,
        memoryLayers: ["procedural", "semantic"],
        reasoning:   `agent-ownership-validate DENY: agent="${agent}" attempted to write "${relPath}" but permitted patterns=[${agentPatterns.join(", ")}]. rule 07 v1.2.0 §Agent file-ownership.`,
        refinementTarget: {
          kind:            "other",
          filePathOrRid:   "hooks/agent-ownership-validate.ts",
          description:     `Agent "${agent}" ownership violation: attempted "${relPath}", not in permitted patterns. Lead should re-route or update ownership table.`,
          confidenceLevel: "high",
        },
      });
    } catch { /* best-effort emit; still deny */ }

    return {
      message: `palantir-mini: agent-ownership-validate DENY (${agent} not permitted to write ${relPath})`,
      hookSpecificOutput: {
        permissionDecision:       "deny",
        permissionDecisionReason: violationMsg,
        additionalContext:        `Re-route task to the agent that owns "${relPath}", or set PALANTIR_MINI_AGENT_OWNERSHIP_BYPASS=1 for emergency override (audited).`,
      },
    };

  } catch (err) {
    // Never fail catastrophically — always allow through on unexpected error
    const errMsg = (err as Error).message ?? String(err);
    try {
      process.stderr.write(`[palantir-mini/agent-ownership-validate] unexpected error (suppressed): ${errMsg}\n`);
    } catch { /* truly silent */ }
    return { message: `palantir-mini: agent-ownership-validate error suppressed (${errMsg})` };
  }
}
