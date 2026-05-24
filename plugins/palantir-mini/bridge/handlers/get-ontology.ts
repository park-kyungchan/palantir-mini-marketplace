// palantir-mini v0 — MCP tool handler: get_ontology
// Domain: LOGIC (Reducer) + DATA (SnapshotManifest)
//
// Reads the derived ontology snapshot for a project. If atSequence is omitted,
// folds the full events.jsonl and returns the latest snapshot.

import * as path from "path";
import { readEvents, foldToSnapshot } from "../../lib/event-log/read";
import type { EventSnapshot } from "../../lib/event-log/types";

interface GetOntologyArgs {
  project:    string;
  domain?:    "data" | "logic" | "action" | "security" | "learn" | "all";
  atSequence?: number;
}

interface GetOntologyResult {
  project:        string;
  domain:         string;
  atSequence:     number;
  snapshot:       EventSnapshot;
  generatedAt:    string;
}

export default async function getOntology(rawArgs: unknown): Promise<GetOntologyResult> {
  const args = (rawArgs ?? {}) as GetOntologyArgs;
  if (!args.project || typeof args.project !== "string") {
    throw new Error("get_ontology: `project` is required (absolute path to project root)");
  }

  const eventsPath = path.join(args.project, ".palantir-mini", "session", "events.jsonl");
  let events = readEvents(eventsPath);

  if (typeof args.atSequence === "number") {
    events = events.filter((e) => e.sequence <= args.atSequence!);
  }

  const snapshot = foldToSnapshot(events);

  return {
    project: args.project,
    domain: args.domain ?? "all",
    atSequence: args.atSequence ?? snapshot.lastSequence,
    snapshot,
    generatedAt: new Date().toISOString(),
  };
}
