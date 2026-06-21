// palantir-mini v0 — MCP tool handler: apply_edit_function
// Domain: LOGIC (EditFunction — prim-logic-01)
//
// Executes a Tier-2 edit function returning OntologyEdit[] WITHOUT committing.
// Mirrors Palantir §LOGIC.FN-04. Emits an edit_proposed event with the
// hypothetical edits for lineage, then returns the edits to the caller.

import * as path from "path";
import { applyEditFunction } from "../../lib/actions/tier2-function";
// O-2: side-effect import — fires the four pm.actions.ontology.applyRegister*
// registerEditFunction() registrations on the live apply path.
import "../../lib/actions/ontology-register";
// O-1: side-effect import — fires the pm.structuredOutput.fillOrFallback
// registerEditFunction() registration (ActionType↔editFunctionName parity) on the live path.
import "../../lib/structured-output";
import { appendEventAtomic } from "../../lib/event-log/append";
import { resolveHostRuntimeIdentity } from "../../lib/runtime/identity";
import { gitHeadSha } from "../../lib/git/head-sha";
import type { EventEnvelope, EventId, SessionId, CommitSha, OntologyEdit } from "../../lib/event-log/types";

interface ApplyEditFunctionArgs {
  project:      string;
  functionName: string;
  params:       unknown;
}

interface ApplyEditFunctionResult {
  functionName:  string;
  edits:         OntologyEdit[];
  editProposedSequence: number;
}

export default async function applyEditFunctionHandler(rawArgs: unknown): Promise<ApplyEditFunctionResult> {
  const args = (rawArgs ?? {}) as ApplyEditFunctionArgs;
  if (!args.project || typeof args.project !== "string") throw new Error("apply_edit_function: `project` required");
  if (!args.functionName || typeof args.functionName !== "string") throw new Error("apply_edit_function: `functionName` required");

  const { edits, functionName } = await applyEditFunction(args.functionName, args.params);

  // Append edit_proposed for lineage
  const eventsPath = path.join(args.project, ".palantir-mini", "session", "events.jsonl");
  const envelope: Omit<EventEnvelope, "sequence"> = {
    type: "edit_proposed",
    eventId: `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}` as unknown as EventId,
    when: new Date().toISOString(),
    atopWhich: gitHeadSha(args.project) as unknown as CommitSha,
    throughWhich: {
      sessionId: "mcp" as unknown as SessionId,
      toolName:  "apply_edit_function",
      cwd:       args.project,
    },
    byWhom: { identity: resolveHostRuntimeIdentity() },
    payload: {
      functionName,
      params: args.params,
      hypotheticalEdits: edits,
    },
  };
  const sequence = await appendEventAtomic(eventsPath, envelope);

  return {
    functionName,
    edits,
    editProposedSequence: sequence,
  };
}
