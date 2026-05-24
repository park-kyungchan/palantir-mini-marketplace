// palantir-mini v3.7.0 — hooks/subagent-stop.ts (orchestrator)
// SubagentStop hook: emits subagent_stop event + validates output contract.
// Decomposed in v3.7.0 A.1: agent-md / contract / state-check helpers extracted to ./subagent-stop/*.
//
// Flow:
//   1. emit subagent_stop event (always — preserves v1.0 behavior)
//   2. lookup agent .md → if none, emit warning + pass through
//   3. parse ## Output Contract section → if absent, emit warning + pass through
//   4. checkStateFile → emit subagent_state_validation + return decision
//
// See rule 12 §Phase-gate contract, lead-system-v2 §5.5.

import * as fs from "fs";
import { emit } from "../scripts/log";
import { findAgentMd } from "./subagent-stop/agent-md";
import { analyzeAgentMarkdown, formatOutputContractStatus, parseOutputContract, statusRequiresBlocking } from "../lib/agents/inventory";
import { checkStateFile } from "./subagent-stop/state-check";
import type { HookPayload, HookResult } from "./subagent-stop/types";

// Backward-compat re-exports for tests + external callers
export { findAgentMd } from "./subagent-stop/agent-md";
export { parseOutputContract } from "../lib/agents/inventory";
export { validateAgainstContract } from "./subagent-stop/contract";
export { checkStateFile } from "./subagent-stop/state-check";
export type { HookPayload, OutputContract, ValidationResult, HookResult } from "./subagent-stop/types";
export type { StateCheckOutcome } from "./subagent-stop/state-check";

export default async function subagentStop(payload: unknown): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();
  const agentId = p.agent_id ?? "unknown";
  const agentName = p.agent_name ?? p.agent_id;

  // Always emit subagent_stop first
  try {
    await emit({
      type: "subagent_stop",
      payload: { agentId, exitCode: p.exit_code, reason: p.reason },
      toolName:  "SubagentStop",
      cwd,
      sessionId: p.session_id,
      identity:  "claude-code",
      agentName,
    });
  } catch { /* best-effort */ }

  // Contract lookup
  const agentMdPath = agentName ? findAgentMd(agentName, cwd) : null;
  if (!agentMdPath) {
    try {
      await emit({
        type: "subagent_state_validation",
        payload: { agentId, agentName, passed: true, errorClass: "NoAgentDefinition" },
        toolName:  "SubagentStop",
        cwd,
        sessionId: p.session_id,
        identity:  "monitor",
        reasoning: `no agent .md found for agent_name=${agentName ?? "<missing>"}`,
      });
    } catch { /* best-effort */ }
    return { message: `palantir-mini: subagent_stop recorded (agent=${agentId}, no contract declared)`, decision: "continue" };
  }

  let mdContent: string;
  try {
    mdContent = fs.readFileSync(agentMdPath, "utf8");
  } catch (e) {
    return { message: `palantir-mini: subagent_stop — failed reading agent md ${agentMdPath}: ${(e as Error).message}`, decision: "continue" };
  }

  const inventoryEntry = analyzeAgentMarkdown(mdContent, agentMdPath);
  const contract = parseOutputContract(mdContent);

  if (inventoryEntry.outputContractStatus.kind === "exempt") {
    try {
      await emit({
        type: "subagent_state_validation",
        payload: { agentId, agentName, passed: true, errorClass: "OutputContractExempt" },
        toolName:  "SubagentStop",
        cwd,
        sessionId: p.session_id,
        identity:  "monitor",
        reasoning: `agent ${agentName} is output-contract exempt: ${inventoryEntry.outputContractStatus.exemptionReason ?? "no reason"}`,
      });
    } catch { /* best-effort */ }
    return { message: `palantir-mini: subagent_stop recorded (agent=${agentId}, output contract exempt)`, decision: "continue" };
  }

  if (!contract) {
    const shouldBlock = statusRequiresBlocking(inventoryEntry);
    const errorClass = shouldBlock ? "MissingOutputContract" : "NoContractDeclared";
    try {
      await emit({
        type: "subagent_state_validation",
        payload: { agentId, agentName, passed: !shouldBlock, errorClass },
        toolName:  "SubagentStop",
        cwd,
        sessionId: p.session_id,
        identity:  "monitor",
        reasoning: `agent ${agentName} has no complete ## Output Contract section in ${agentMdPath}; ${formatOutputContractStatus(inventoryEntry)}`,
      });
    } catch { /* best-effort */ }
    if (shouldBlock) {
      const msg = `mutation-capable agent ${agentName} is missing required output contract: ${formatOutputContractStatus(inventoryEntry)}`;
      process.stderr.write(`[palantir-mini/subagent-stop] ${msg}\n`);
      return { message: `palantir-mini: subagent_stop — ${msg}`, decision: "block", reason: msg };
    }
    return { message: `palantir-mini: subagent_stop recorded (agent=${agentId}, no contract declared)`, decision: "continue" };
  }

  if (statusRequiresBlocking(inventoryEntry)) {
    const msg = `mutation-capable agent ${agentName} has incomplete output contract: ${formatOutputContractStatus(inventoryEntry)}`;
    try {
      await emit({
        type: "subagent_state_validation",
        payload: { agentId, agentName, passed: false, errorClass: "IncompleteOutputContract" },
        toolName:  "SubagentStop",
        cwd,
        sessionId: p.session_id,
        identity:  "monitor",
        reasoning: msg,
      });
    } catch { /* best-effort */ }
    process.stderr.write(`[palantir-mini/subagent-stop] ${msg}\n`);
    return { message: `palantir-mini: subagent_stop — ${msg}`, decision: "block", reason: msg };
  }

  // State file check
  const outcome = checkStateFile(contract, cwd);

  if (outcome.kind === "missing") {
    const msg = `expected state file ${outcome.statePath} was not written`;
    try {
      await emit({
        type: "subagent_state_validation",
        payload: { agentId, agentName, statePath: outcome.statePath, passed: false, errorClass: "StateFileMissing" },
        toolName:  "SubagentStop",
        cwd,
        sessionId: p.session_id,
        identity:  "monitor",
      });
    } catch { /* best-effort */ }
    process.stderr.write(`[palantir-mini/subagent-stop] ${msg}\n`);
    return { message: `palantir-mini: subagent_stop — ${msg}`, decision: "block", reason: msg };
  }

  if (outcome.kind === "invalid-json") {
    const msg = `state file ${outcome.statePath} is not valid JSON: ${outcome.message}`;
    try {
      await emit({
        type: "subagent_state_validation",
        payload: { agentId, agentName, statePath: outcome.statePath, passed: false, errorClass: "InvalidJson" },
        toolName:  "SubagentStop",
        cwd,
        sessionId: p.session_id,
        identity:  "monitor",
      });
    } catch { /* best-effort */ }
    process.stderr.write(`[palantir-mini/subagent-stop] ${msg}\n`);
    return { message: `palantir-mini: subagent_stop — ${msg}`, decision: "block", reason: msg };
  }

  // outcome.kind === "validated"
  const result = outcome.result;
  try {
    await emit({
      type: "subagent_state_validation",
      payload: {
        agentId, agentName,
        statePath:  outcome.statePath,
        passed:     result.passed,
        errorClass: result.errorClass,
        wrapped:    result.wrapped,
      },
      toolName:  "SubagentStop",
      cwd,
      sessionId: p.session_id,
      identity:  "monitor",
      reasoning: result.message,
    });
  } catch { /* best-effort */ }

  if (!result.passed) {
    const msg = `schema mismatch for ${outcome.statePath}: ${result.message ?? "unknown error"}`;
    process.stderr.write(`[palantir-mini/subagent-stop] ${msg}\n`);
    return { message: `palantir-mini: subagent_stop — ${msg}`, decision: "block", reason: msg };
  }

  return {
    message: `palantir-mini: subagent_stop recorded (agent=${agentId}, contract ok${result.wrapped ? ", wrapped on read" : ""})`,
    decision: "continue",
  };
}
