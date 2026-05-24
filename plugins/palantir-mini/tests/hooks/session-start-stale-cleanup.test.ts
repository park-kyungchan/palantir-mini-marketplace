// palantir-mini v1.1 — session-start stale-state cleanup tests
// Defect #5 coverage: CLEAN_STATE=1 resets, CLEAN_STATE unset warns+preserves,
// events.jsonl untouched in both paths.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import sessionStart, {
  listOntologyStateFiles,
  listInboxFiles,
  resetOntologyStateFile,
  resetInboxFile,
  detectStaleState,
} from "../../hooks/session-start";
import { readEvents } from "../../lib/event-log/read";

function makeTmpProject(label: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `pm-sst-${label}-`));
}

function eventsPathFor(root: string): string {
  return path.join(root, ".palantir-mini", "session", "events.jsonl");
}

function seedStateFile(root: string, name: string, body: string, agedSec = 120): string {
  const dir = path.join(root, "ontology-state");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, name);
  fs.writeFileSync(file, body, "utf8");
  const aged = new Date(Date.now() - agedSec * 1000);
  fs.utimesSync(file, aged, aged);
  return file;
}

function seedInboxFile(root: string, recipient: string, body: unknown, agedSec = 120): string {
  const dir = path.join(root, ".palantir-mini", "session");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `inbox-${recipient}.json`);
  fs.writeFileSync(file, JSON.stringify(body), "utf8");
  const aged = new Date(Date.now() - agedSec * 1000);
  fs.utimesSync(file, aged, aged);
  return file;
}

describe("session-start helpers", () => {
  let tmpRoot: string;
  beforeEach(() => { tmpRoot = makeTmpProject("h"); });
  afterEach(() => { fs.rmSync(tmpRoot, { recursive: true, force: true }); });

  test("listOntologyStateFiles handles missing dir", () => {
    expect(listOntologyStateFiles(tmpRoot)).toEqual([]);
  });

  test("listInboxFiles handles missing dir", () => {
    expect(listInboxFiles(tmpRoot)).toEqual([]);
  });

  test("resetOntologyStateFile writes empty template", () => {
    const f = seedStateFile(tmpRoot, "ds.json", JSON.stringify({ primitives: [{ id: "x" }] }));
    resetOntologyStateFile(f);
    const reloaded = JSON.parse(fs.readFileSync(f, "utf8"));
    expect(reloaded.primitives).toEqual([]);
    expect(reloaded.edges).toEqual([]);
  });

  test("resetInboxFile empties messages array", () => {
    const f = seedInboxFile(tmpRoot, "lead", { recipient: "lead", messages: [{ id: "m1", read: false }] });
    resetInboxFile(f);
    const reloaded = JSON.parse(fs.readFileSync(f, "utf8"));
    expect(reloaded.messages).toEqual([]);
    expect(reloaded.recipient).toBe("lead");
  });

  test("detectStaleState finds aged files only", () => {
    seedStateFile(tmpRoot, "stale.json", JSON.stringify({ a: 1 }), 120);
    seedStateFile(tmpRoot, "fresh.json", JSON.stringify({ a: 2 }), 5);
    const stale = detectStaleState(tmpRoot);
    const names = stale.map((f) => path.basename(f));
    expect(names).toContain("stale.json");
    expect(names).not.toContain("fresh.json");
  });
});

describe("session-start integration", () => {
  let tmpRoot: string;
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    tmpRoot = makeTmpProject("integ");
    savedEnv.PALANTIR_MINI_PROJECT     = process.env.PALANTIR_MINI_PROJECT;
    savedEnv.PALANTIR_MINI_EVENTS_FILE = process.env.PALANTIR_MINI_EVENTS_FILE;
    savedEnv.CLEAN_STATE                = process.env.CLEAN_STATE;
    process.env.PALANTIR_MINI_PROJECT     = tmpRoot;
    process.env.PALANTIR_MINI_EVENTS_FILE = eventsPathFor(tmpRoot);
    delete process.env.CLEAN_STATE;
  });

  afterEach(() => {
    for (const k of Object.keys(savedEnv)) {
      const v = savedEnv[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  test("CLEAN_STATE=1 resets ontology-state and inbox files", async () => {
    seedStateFile(tmpRoot, "ds.json", JSON.stringify({ primitives: [{ id: "ghost" }] }));
    seedInboxFile(tmpRoot, "lead", { recipient: "lead", messages: [{ id: "ghost", read: false }] });
    process.env.CLEAN_STATE = "1";

    const res = await sessionStart({ cwd: tmpRoot, session_id: "s1" });
    expect(res.additionalContext).toContain("CLEAN_STATE=1 applied");

    const ds = JSON.parse(fs.readFileSync(path.join(tmpRoot, "ontology-state", "ds.json"), "utf8"));
    expect(ds.primitives).toEqual([]);
    const inbox = JSON.parse(fs.readFileSync(path.join(tmpRoot, ".palantir-mini", "session", "inbox-lead.json"), "utf8"));
    expect(inbox.messages).toEqual([]);
  });

  test("CLEAN_STATE unset preserves state and emits stale_state_warning", async () => {
    seedStateFile(tmpRoot, "ds.json", JSON.stringify({ primitives: [{ id: "ghost" }] }));

    const res = await sessionStart({ cwd: tmpRoot, session_id: "s2" });
    expect(res.additionalContext).toContain("stale prior-session state detected");

    const ds = JSON.parse(fs.readFileSync(path.join(tmpRoot, "ontology-state", "ds.json"), "utf8"));
    expect(ds.primitives).toEqual([{ id: "ghost" }]);

    const events = readEvents(eventsPathFor(tmpRoot));
    const warn = events.find((e) => e.type === "stale_state_warning");
    expect(warn).toBeDefined();
    expect((warn!.payload as { preserved: boolean }).preserved).toBe(true);
    expect((warn!.payload as { staleFiles: string[] }).staleFiles.length).toBeGreaterThan(0);
  });

  test("events.jsonl never touched during CLEAN_STATE=1", async () => {
    // Pre-seed events.jsonl with a dummy line
    const evPath = eventsPathFor(tmpRoot);
    fs.mkdirSync(path.dirname(evPath), { recursive: true });
    const preExisting = '{"sequence":1,"type":"session_started","eventId":"pre","when":"x","atopWhich":"no-git","throughWhich":{"sessionId":"pre","toolName":"t","cwd":"/t"},"byWhom":{"identity":"test-agent"},"payload":{"model":"m","effort":"e"}}\n';
    fs.writeFileSync(evPath, preExisting, "utf8");
    const sizeBefore = fs.statSync(evPath).size;

    process.env.CLEAN_STATE = "1";
    seedStateFile(tmpRoot, "ds.json", "{}");
    await sessionStart({ cwd: tmpRoot, session_id: "s3" });

    const sizeAfter = fs.statSync(evPath).size;
    expect(sizeAfter).toBeGreaterThanOrEqual(sizeBefore); // appended, never truncated
    const contents = fs.readFileSync(evPath, "utf8");
    expect(contents.startsWith(preExisting)).toBe(true);
  });

  test("no stale state, no CLEAN_STATE → session_started emits without stale warning", async () => {
    const res = await sessionStart({ cwd: tmpRoot, session_id: "s4" });
    const events = readEvents(eventsPathFor(tmpRoot));
    expect(events.some((e) => e.type === "stale_state_warning")).toBe(false);
    expect(events.some((e) => e.type === "session_started")).toBe(true);
    if (res.additionalContext) {
      expect(res.additionalContext).not.toContain("stale prior-session state detected");
    }
  });
});
