// palantir-mini v3.7.0 — lib/codegen/descender-gen/helpers.ts
// File / git / event helpers for codegen runner.
// Extracted from descender-gen.ts during A.2 decomposition.

import * as fs from "fs";
import * as path from "path";
import { appendEventAtomic } from "../../event-log/append";
import type { EventEnvelope, EventId, SessionId, CommitSha } from "../../event-log/types";
import { resolvePalantirMiniRoot } from "../../config/root";

export function defaultSchemaRoot(): string {
  return path.join(resolvePalantirMiniRoot(), "runtime-overlay", "schemas-snapshot", "ontology");
}

export function listSchemaFiles(schemaRoot: string): string[] {
  const subdirs = ["primitives", "functions", "policies", "lineage", "generators"];
  const out: string[] = [];
  for (const sub of subdirs) {
    const dir = path.join(schemaRoot, sub);
    if (!fs.existsSync(dir)) continue;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isFile() && e.name.endsWith(".ts")) out.push(path.join(dir, e.name));
    }
  }
  return out;
}

export function eventsPathFor(project: string): string {
  return path.join(project, ".palantir-mini", "session", "events.jsonl");
}

export function uniqueEventId(): string {
  return `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function gitHeadSha(project: string): string {
  const gitHead = path.join(project, ".git", "HEAD");
  if (!fs.existsSync(gitHead)) return "no-git";
  try {
    const head = fs.readFileSync(gitHead, "utf8").trim();
    if (head.startsWith("ref: ")) {
      const refPath = path.join(project, ".git", head.slice(5));
      if (fs.existsSync(refPath)) return fs.readFileSync(refPath, "utf8").trim();
      return head.slice(5);
    }
    return head;
  } catch {
    return "no-git";
  }
}

export async function emitCodegenEvent(
  project: string,
  type: "codegen_started" | "codegen_completed",
  payload: Extract<EventEnvelope, { type: "codegen_started" | "codegen_completed" }>["payload"]
): Promise<number> {
  const envelope: Omit<EventEnvelope, "sequence"> = {
    type,
    eventId: uniqueEventId() as unknown as EventId,
    when: new Date().toISOString(),
    atopWhich: gitHeadSha(project) as unknown as CommitSha,
    throughWhich: {
      sessionId: "codegen" as unknown as SessionId,
      toolName:  "descender-gen",
      cwd:       project,
    },
    byWhom: { identity: "claude-code", agentName: "codegen-runner" },
    payload,
  } as Omit<EventEnvelope, "sequence">;

  return appendEventAtomic(eventsPathFor(project), envelope);
}
