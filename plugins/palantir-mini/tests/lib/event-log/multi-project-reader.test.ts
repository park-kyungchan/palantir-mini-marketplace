// palantir-mini v3.10.0 — multi-project-reader tests (W5.0a, P5)
// Coverage: registry-only discovery, fs-walk fallback, hybrid (both sources),
// missing registry graceful, dedup registered vs discovered, cross-project
// (when, sequence) ASC ordering, perProjectCounts, annotated events.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  discoverProjects,
  readMultiProjectEvents,
  type ProjectEntry,
} from "../../../lib/event-log/multi-project-reader";

let TMP_HOME: string;
let TMP_PROJECTS_ROOT: string;
let savedRegistry: string | undefined;
let savedProjectsRoot: string | undefined;

function makeProjectWithEvents(
  projectsRoot: string,
  projectName: string,
  events: Array<{ when: string; sequence: number; type: string; payload?: any }>,
): string {
  const projectPath = path.join(projectsRoot, projectName);
  const sessionDir = path.join(projectPath, ".palantir-mini", "session");
  fs.mkdirSync(sessionDir, { recursive: true });
  const eventsPath = path.join(sessionDir, "events.jsonl");
  const lines = events.map((e) =>
    JSON.stringify({
      eventId: `evt-${projectName}-${e.sequence}`,
      when: e.when,
      atopWhich: "no-git",
      throughWhich: { sessionId: "x", toolName: "test", cwd: projectPath },
      byWhom: { identity: "claude-code" },
      sequence: e.sequence,
      type: e.type,
      payload: e.payload ?? {},
    }),
  );
  fs.writeFileSync(eventsPath, lines.join("\n") + "\n");
  return projectPath;
}

function makeRegistry(registryPath: string, registrations: Array<{ projectPath: string; rid?: string; label?: string }>): void {
  fs.mkdirSync(path.dirname(registryPath), { recursive: true });
  fs.writeFileSync(
    registryPath,
    JSON.stringify({
      registrations: registrations.map((r) => ({
        rid: r.rid ?? `rid:${path.basename(r.projectPath)}`,
        projectPath: r.projectPath,
        peerDepPin: "@palantirKC/claude-schemas@1.31.0",
        label: r.label ?? path.basename(r.projectPath),
        registeredAt: new Date().toISOString(),
      })),
    }),
  );
}

beforeEach(() => {
  TMP_HOME = fs.mkdtempSync(path.join(os.tmpdir(), "pm-mpr-home-"));
  TMP_PROJECTS_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), "pm-mpr-projects-"));
  savedRegistry = process.env.PALANTIR_MINI_REGISTRY;
  savedProjectsRoot = process.env.PALANTIR_MINI_PROJECTS_ROOT;
  process.env.PALANTIR_MINI_REGISTRY = path.join(TMP_HOME, "registered-projects.json");
  process.env.PALANTIR_MINI_PROJECTS_ROOT = TMP_PROJECTS_ROOT;
});

afterEach(() => {
  if (savedRegistry !== undefined) process.env.PALANTIR_MINI_REGISTRY = savedRegistry;
  else delete process.env.PALANTIR_MINI_REGISTRY;
  if (savedProjectsRoot !== undefined) process.env.PALANTIR_MINI_PROJECTS_ROOT = savedProjectsRoot;
  else delete process.env.PALANTIR_MINI_PROJECTS_ROOT;
  if (TMP_HOME && fs.existsSync(TMP_HOME)) fs.rmSync(TMP_HOME, { recursive: true, force: true });
  if (TMP_PROJECTS_ROOT && fs.existsSync(TMP_PROJECTS_ROOT)) {
    fs.rmSync(TMP_PROJECTS_ROOT, { recursive: true, force: true });
  }
});

describe("discoverProjects", () => {
  test("missing registry + empty fs walk → both arrays empty", () => {
    const result = discoverProjects();
    expect(result.registered).toEqual([]);
    expect(result.discovered).toEqual([]);
  });

  test("registry-only: registered list populated, discovered empty", () => {
    const projectPath = makeProjectWithEvents(TMP_PROJECTS_ROOT, "project-a", [
      { when: "2026-04-29T10:00:00Z", sequence: 1, type: "session_started" },
    ]);
    makeRegistry(process.env.PALANTIR_MINI_REGISTRY!, [{ projectPath, label: "Alpha" }]);

    const result = discoverProjects();
    expect(result.registered.length).toBe(1);
    expect(result.registered[0]?.projectPath).toBe(projectPath);
    expect(result.registered[0]?.label).toBe("Alpha");
    expect(result.registered[0]?.source).toBe("registered");
    expect(result.discovered).toEqual([]);
  });

  test("fs-walk fallback: discovered when registry empty + project has events.jsonl", () => {
    const projectPath = makeProjectWithEvents(TMP_PROJECTS_ROOT, "project-b", [
      { when: "2026-04-29T10:00:00Z", sequence: 1, type: "session_started" },
    ]);

    const result = discoverProjects();
    expect(result.registered).toEqual([]);
    expect(result.discovered.length).toBe(1);
    expect(result.discovered[0]?.projectPath).toBe(projectPath);
    expect(result.discovered[0]?.source).toBe("discovered");
  });

  test("hybrid: registered + discovered both populated, no dedup overlap", () => {
    const pathA = makeProjectWithEvents(TMP_PROJECTS_ROOT, "registered-A", [
      { when: "2026-04-29T10:00:00Z", sequence: 1, type: "session_started" },
    ]);
    const pathB = makeProjectWithEvents(TMP_PROJECTS_ROOT, "discovered-B", [
      { when: "2026-04-29T10:00:00Z", sequence: 1, type: "session_started" },
    ]);
    makeRegistry(process.env.PALANTIR_MINI_REGISTRY!, [{ projectPath: pathA }]);

    const result = discoverProjects();
    expect(result.registered.length).toBe(1);
    expect(result.registered[0]?.projectPath).toBe(pathA);
    expect(result.discovered.length).toBe(1);
    expect(result.discovered[0]?.projectPath).toBe(pathB);
  });

  test("dedup: project in BOTH registry + fs walk → only in registered (not discovered)", () => {
    const sharedPath = makeProjectWithEvents(TMP_PROJECTS_ROOT, "shared-project", [
      { when: "2026-04-29T10:00:00Z", sequence: 1, type: "session_started" },
    ]);
    makeRegistry(process.env.PALANTIR_MINI_REGISTRY!, [{ projectPath: sharedPath }]);

    const result = discoverProjects();
    expect(result.registered.length).toBe(1);
    expect(result.discovered).toEqual([]);
  });

  test("ignores fs entries without .palantir-mini/session/events.jsonl", () => {
    fs.mkdirSync(path.join(TMP_PROJECTS_ROOT, "not-a-pm-project"));
    const result = discoverProjects();
    expect(result.discovered).toEqual([]);
  });
});

describe("readMultiProjectEvents", () => {
  test("returns empty when no projects", () => {
    const result = readMultiProjectEvents([]);
    expect(result.events).toEqual([]);
    expect(result.perProjectCounts).toEqual({});
  });

  test("merges events across projects sorted by (when, sequence) ASC", () => {
    const pathA = makeProjectWithEvents(TMP_PROJECTS_ROOT, "p-a", [
      { when: "2026-04-29T10:00:00Z", sequence: 1, type: "session_started" },
      { when: "2026-04-29T12:00:00Z", sequence: 5, type: "edit_committed", payload: { actionTypeRid: "x", appliedEdits: [], submissionCriteriaPassed: [] } },
    ]);
    const pathB = makeProjectWithEvents(TMP_PROJECTS_ROOT, "p-b", [
      { when: "2026-04-29T11:00:00Z", sequence: 1, type: "session_started" },
    ]);

    const projects: ProjectEntry[] = [
      { projectPath: pathA, eventsJsonlPath: path.join(pathA, ".palantir-mini", "session", "events.jsonl"), source: "discovered" },
      { projectPath: pathB, eventsJsonlPath: path.join(pathB, ".palantir-mini", "session", "events.jsonl"), source: "discovered" },
    ];

    const result = readMultiProjectEvents(projects);
    expect(result.events.length).toBe(3);
    // Order: pathA[10:00] < pathB[11:00] < pathA[12:00]
    expect(result.events[0]?.__sourceProject).toBe(pathA);
    expect(result.events[0]?.when).toBe("2026-04-29T10:00:00Z");
    expect(result.events[1]?.__sourceProject).toBe(pathB);
    expect(result.events[1]?.when).toBe("2026-04-29T11:00:00Z");
    expect(result.events[2]?.__sourceProject).toBe(pathA);
    expect(result.events[2]?.when).toBe("2026-04-29T12:00:00Z");
  });

  test("perProjectCounts populated correctly", () => {
    const pathA = makeProjectWithEvents(TMP_PROJECTS_ROOT, "p-counts-a", [
      { when: "2026-04-29T10:00:00Z", sequence: 1, type: "session_started" },
      { when: "2026-04-29T11:00:00Z", sequence: 2, type: "session_started" },
      { when: "2026-04-29T12:00:00Z", sequence: 3, type: "session_started" },
    ]);
    const pathB = makeProjectWithEvents(TMP_PROJECTS_ROOT, "p-counts-b", [
      { when: "2026-04-29T13:00:00Z", sequence: 1, type: "session_started" },
    ]);

    const result = readMultiProjectEvents([
      { projectPath: pathA, eventsJsonlPath: path.join(pathA, ".palantir-mini", "session", "events.jsonl"), source: "discovered" },
      { projectPath: pathB, eventsJsonlPath: path.join(pathB, ".palantir-mini", "session", "events.jsonl"), source: "discovered" },
    ]);
    expect(result.perProjectCounts[pathA]).toBe(3);
    expect(result.perProjectCounts[pathB]).toBe(1);
  });

  test("missing events.jsonl per project = 0 events (not error)", () => {
    const result = readMultiProjectEvents([
      { projectPath: "/nonexistent/path", eventsJsonlPath: "/nonexistent/path/events.jsonl", source: "discovered" },
    ]);
    expect(result.events).toEqual([]);
    expect(result.perProjectCounts["/nonexistent/path"]).toBe(0);
  });
});
