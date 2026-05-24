// palantir-mini v3.7.0 — get_ontology handler tests (C.D.4)
// Coverage: validation, missing events.jsonl returns empty snapshot,
// folded snapshot, atSequence filter, domain default = "all".

import { test, expect, describe, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import getOntology from "../../../bridge/handlers/get-ontology";

const tmpDirs: string[] = [];

function makeTmpProject(eventLines: string[] = []): string {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "pm-get-ontology-"));
  tmpDirs.push(project);
  const sessionDir = path.join(project, ".palantir-mini", "session");
  fs.mkdirSync(sessionDir, { recursive: true });
  if (eventLines.length > 0) {
    fs.writeFileSync(path.join(sessionDir, "events.jsonl"), eventLines.join("\n") + "\n");
  }
  return project;
}

function makeEvent(seq: number, type: string, payload: Record<string, unknown> = {}): string {
  return JSON.stringify({
    eventId: `evt-${seq}`,
    sequence: seq,
    type,
    when: new Date(Date.now() - (1000 - seq) * 1000).toISOString(),
    payload,
    timestamp: new Date(Date.now() - (1000 - seq) * 1000).toISOString(),
    atopWhich: { commitSha: "abc" },
    throughWhich: { sessionId: "test-session", toolName: "test", cwd: "test" },
    byWhom: { agentName: "test", identity: "claude-code" },
    decision: {
      atopWhich: { commitSha: "abc" },
      throughWhich: { surface: "test", tool: "test" },
      byWhom: { agent: "test", identity: "claude-code" },
      withWhat: { reasoning: "test event" },
    },
  });
}

afterEach(() => {
  for (const d of tmpDirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

describe("getOntology", () => {
  test("validation — missing project throws", async () => {
    await expect(getOntology({})).rejects.toThrow(/project.*required/);
  });

  test("validation — non-string project throws", async () => {
    await expect(getOntology({ project: 42 })).rejects.toThrow(/project.*required/);
  });

  test("project with no events.jsonl returns empty snapshot", async () => {
    const project = makeTmpProject();
    const result = await getOntology({ project });
    expect(result.project).toBe(project);
    expect(result.snapshot).toBeDefined();
    expect(result.snapshot.lastSequence).toBe(0);
    expect(typeof result.generatedAt).toBe("string");
  });

  test("project with events folds to snapshot", async () => {
    const project = makeTmpProject([
      makeEvent(1, "session_started"),
      makeEvent(2, "edit_committed", { file: "x.ts" }),
      makeEvent(3, "edit_committed", { file: "y.ts" }),
    ]);
    const result = await getOntology({ project });
    expect(result.snapshot.lastSequence).toBe(3);
  });

  test("atSequence filter limits fold to events <= N", async () => {
    const project = makeTmpProject([
      makeEvent(1, "session_started"),
      makeEvent(2, "edit_committed", { file: "x.ts" }),
      makeEvent(3, "edit_committed", { file: "y.ts" }),
    ]);
    const result = await getOntology({ project, atSequence: 2 });
    expect(result.atSequence).toBe(2);
    expect(result.snapshot.lastSequence).toBe(2);
  });

  test("domain defaults to 'all'", async () => {
    const project = makeTmpProject();
    const result = await getOntology({ project });
    expect(result.domain).toBe("all");
  });

  test("domain override is preserved on result", async () => {
    const project = makeTmpProject();
    const result = await getOntology({ project, domain: "data" });
    expect(result.domain).toBe("data");
  });
});
