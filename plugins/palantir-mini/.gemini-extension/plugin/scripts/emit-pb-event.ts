// palantir-mini v3.7.0 — emit-pb-event.ts (orchestrator)
// Helper wrapper: bridges palantir-browse pb_* events into the palantir-mini
// 5-dim Decision Lineage envelope and appends via emit().
// Decomposed in v3.7.0 A.3: types + mappers extracted to ./emit-pb-event/*.
//
// Usage (CLI):
//   bun run scripts/emit-pb-event.ts <pb_event_name> <project> [payload-json]
//
// Usage (module):
//   import { emitPbEvent } from "./emit-pb-event";
//   await emitPbEvent({ pbEventName: "pb_navigate", project: "/home/...", payload: { url } });
//
// Authority: rules/10-events-jsonl.md — every event uses emit() with full 5D envelope.

import { emit } from "./log";
import type { EventEnvelope } from "../lib/event-log/types";
import { resolvePbEventType, buildPbPayload } from "./emit-pb-event/mappers";
import type { EmitPbEventArgs, EmitPbEventResult, PbEventName, PbEventPayload } from "./emit-pb-event/types";

// Backward-compat re-exports
export type {
  PbEventName,
  PbEventPayload,
  EmitPbEventArgs,
  EmitPbEventResult,
  MappedType,
} from "./emit-pb-event/types";
export { resolvePbEventType, buildPbPayload } from "./emit-pb-event/mappers";

/**
 * Wrap a palantir-browse pb_* event into the palantir-mini 5-dim Decision
 * Lineage envelope and append atomically to <project>/.palantir-mini/session/events.jsonl.
 *
 * The raw pbEventName is preserved in withWhat.reasoning so pm-retro can
 * reconstruct the full pb_* taxonomy from the event log.
 */
export async function emitPbEvent(args: EmitPbEventArgs): Promise<EmitPbEventResult> {
  const { pbEventName, project, payload = {}, sessionId, reasoning } = args;

  if (!project || typeof project !== "string") {
    throw new Error("emitPbEvent: `project` is required");
  }
  if (!pbEventName || typeof pbEventName !== "string") {
    throw new Error("emitPbEvent: `pbEventName` is required");
  }

  // Store original project root so emit() resolves the right events.jsonl.
  const prevProject = process.env.PALANTIR_MINI_PROJECT;
  process.env.PALANTIR_MINI_PROJECT = project;

  try {
    const type = resolvePbEventType(pbEventName);
    const envelope = buildPbPayload(type, pbEventName, payload);

    const sequence = await emit({
      type: envelope.type as EventEnvelope["type"],
      payload: envelope.payload as EventEnvelope["payload"],
      toolName: "palantir-browse",
      cwd: project,
      sessionId,
      identity: "monitor",
      agentName: "palantir-browse",
      teamName: "pb",
      reasoning: reasoning ?? `pb_event: ${pbEventName}`,
      hypothesis: `palantir-browse co-install bridge — pb_* event routed to events.jsonl`,
    });

    return { sequence, pbEventName, project };
  } finally {
    if (prevProject === undefined) {
      delete process.env.PALANTIR_MINI_PROJECT;
    } else {
      process.env.PALANTIR_MINI_PROJECT = prevProject;
    }
  }
}

// ─── CLI entry point ──────────────────────────────────────────────────────────

if (import.meta.main) {
  const [pbEventName, project, payloadJson] = process.argv.slice(2);

  if (!pbEventName || !project) {
    process.stderr.write(
      "Usage: bun run scripts/emit-pb-event.ts <pb_event_name> <project> [payload-json]\n"
    );
    process.exit(1);
  }

  let payload: PbEventPayload = {};
  if (payloadJson) {
    try {
      payload = JSON.parse(payloadJson) as PbEventPayload;
    } catch {
      process.stderr.write(`emit-pb-event: invalid payload JSON: ${payloadJson}\n`);
      process.exit(1);
    }
  }

  emitPbEvent({
    pbEventName: pbEventName as PbEventName,
    project,
    payload,
  }).then((result) => {
    process.stdout.write(JSON.stringify(result) + "\n");
  }).catch((e: unknown) => {
    process.stderr.write(`emit-pb-event: error: ${(e as Error).message}\n`);
    process.exit(1);
  });
}
