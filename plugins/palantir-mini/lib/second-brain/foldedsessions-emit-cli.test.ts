// palantir-mini — foldedsessions-emit-cli tests (Path-B governed fold emit, LEARN lane).
//
// The emit-CLI is the second-brain-fold AGENT's governed-emit step: it routes the fold's
// verdicts (resolution_verdict / memory_fold_committed) through pm's in-process emit()
// (Path B) instead of the altitude-2-HIDDEN MCP emit_event tool. These tests assert the
// CLI appends a FULL 5-dim row with the LOAD-BEARING parity to the prior gated MCP path:
//   - withWhat.memoryLayers preserved EXPLICITLY (these types have NO heuristic);
//   - byWhom.identity is a REAL runtime, NEVER the old hard-coded "monitor";
//   - throughWhich.toolName === "mcp__emit_event" → propagationDepth OMITTED (MCP parity).

import { test, expect, describe, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const CLI = path.join(import.meta.dir, "foldedsessions-emit-cli.ts");

const tmpDirs: string[] = [];

function makeTmpProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-emit-cli-"));
  tmpDirs.push(dir);
  fs.mkdirSync(path.join(dir, ".palantir-mini", "session"), { recursive: true });
  return dir;
}

function eventsPath(root: string): string {
  return path.join(root, ".palantir-mini", "session", "events.jsonl");
}

/** A resolution_verdict EmitObj byte-shaped like the engine's buildResolutionVerdict output. */
function verdictEmitObj(): Record<string, unknown> {
  return {
    type: "resolution_verdict",
    payload: { verdict: "ADD", targetId: "node-abc", derivedFrom: ["uuid-1", "uuid-2"] },
    memoryLayers: ["semantic", "episodic"],
    hypothesis: "Folding session sess-1 resolved node \"X\" as ADD in the second-brain graph.",
    refinementTarget: {
      kind: "other",
      filePathOrRid: "second-brain/graph.json",
      description: "resolution_verdict ADD for a concept node persisted to second-brain/graph.json.",
      confidenceLevel: "medium",
    },
  };
}

/** Run the CLI as a subprocess (full import.meta.main path); returns {code, stdout, stderr}. */
async function runCli(
  args: string[],
  env: Record<string, string> = {},
): Promise<{ code: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn(["bun", "run", CLI, ...args], {
    env: { ...process.env, ...env },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  return { code, stdout, stderr };
}

function readRows(root: string): Record<string, unknown>[] {
  const raw = fs.readFileSync(eventsPath(root), "utf8");
  return raw.split("\n").filter((l) => l.trim().length > 0).map((l) => JSON.parse(l));
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("emit-CLI — Path-B governed fold emit with full 5-dim parity", () => {
  test("appends a resolution_verdict row: 5-dim full, memoryLayers preserved, REAL identity (not monitor), toolName=mcp__emit_event, propagationDepth OMITTED", async () => {
    const root = makeTmpProject();
    const obj = verdictEmitObj();

    const r = await runCli([root, "sess-1", JSON.stringify(obj)], {
      PALANTIR_MINI_HOST_RUNTIME: "claude-code",
    });
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("\"emitted\":true");

    const rows = readRows(root);
    expect(rows.length).toBe(1);
    const row = rows[0]!;

    // type + payload verbatim
    expect(row.type).toBe("resolution_verdict");
    expect(row.payload).toEqual(obj.payload as Record<string, unknown>);

    // ── 5-dim header complete ──
    expect(typeof row.eventId).toBe("string");
    expect(typeof row.when).toBe("string");
    expect("atopWhich" in row).toBe(true);
    const through = row.throughWhich as Record<string, unknown>;
    expect(through.sessionId).toBe("sess-1");
    expect(through.toolName).toBe("mcp__emit_event"); // MCP-path toolName parity
    expect(through.cwd).toBe(root);
    const byWhom = row.byWhom as Record<string, unknown>;

    // ── identity is a REAL runtime, NEVER the old hard-coded "monitor" ──
    expect(byWhom.identity).toBe("claude-code");
    expect(byWhom.identity).not.toBe("monitor");

    // ── Axis E preserved EXPLICITLY (no heuristic exists for this type) ──
    const withWhat = row.withWhat as Record<string, unknown>;
    expect(withWhat.memoryLayers).toEqual(["semantic", "episodic"]);
    expect(withWhat.reasoning).toBe(obj.hypothesis);
    expect(withWhat.hypothesis).toBe(obj.hypothesis);
    expect(withWhat.refinementTarget).toEqual(obj.refinementTarget as Record<string, unknown>);

    // ── propagationDepth OMITTED (mcp__emit_event derives no layer) — MCP-path parity ──
    expect("propagationDepth" in row).toBe(false);

    // graded valuable (not T0)
    expect(row.valueGrade).not.toBe("T0");
  });

  test("identity falls back to a real runtime (claude-code), never 'monitor', when HOST_RUNTIME is unset", async () => {
    const root = makeTmpProject();
    const obj = verdictEmitObj();
    // Explicitly clear the host-runtime signal so we exercise the fallback path.
    const r = await runCli([root, "sess-2", JSON.stringify(obj)], {
      PALANTIR_MINI_HOST_RUNTIME: "",
    });
    expect(r.code).toBe(0);
    const row = readRows(root)[0]!;
    const identity = (row.byWhom as Record<string, unknown>).identity as string;
    expect(identity).not.toBe("monitor");
    expect(["claude-code", "codex", "gemini"]).toContain(identity);
  });

  test("emits the memory_fold_committed summary row with its memoryLayers preserved", async () => {
    const root = makeTmpProject();
    const summary = {
      type: "memory_fold_committed",
      payload: { graphPath: "second-brain/graph.json", nodeCount: 9, edgeCount: 0, sessionId: "sess-3" },
      memoryLayers: ["semantic", "episodic"],
      hypothesis: "Session sess-3 folded into the second-brain graph (9 nodes, 0 edges total).",
      refinementTarget: {
        kind: "other",
        filePathOrRid: "second-brain/graph.json",
        description: "memory_fold_committed: nodes persisted to second-brain/graph.json.",
        confidenceLevel: "medium",
      },
    };
    const r = await runCli([root, "sess-3", JSON.stringify(summary)], {
      PALANTIR_MINI_HOST_RUNTIME: "claude-code",
    });
    expect(r.code).toBe(0);
    const row = readRows(root)[0]!;
    expect(row.type).toBe("memory_fold_committed");
    expect((row.withWhat as Record<string, unknown>).memoryLayers).toEqual(["semantic", "episodic"]);
    expect((row.byWhom as Record<string, unknown>).identity).not.toBe("monitor");
  });
});

describe("emit-CLI — bad input is a hard, non-zero failure (never a silent half-write)", () => {
  test("missing args → exit 2 + usage on stderr, no events file written", async () => {
    const root = makeTmpProject();
    const r = await runCli([root]); // missing sessionId + emitObjJson
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("usage:");
    expect(fs.existsSync(eventsPath(root))).toBe(false);
  });

  test("malformed JSON → exit 2 + parse error on stderr, no events file written", async () => {
    const root = makeTmpProject();
    const r = await runCli([root, "sess-x", "{not json"]);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("not valid JSON");
    expect(fs.existsSync(eventsPath(root))).toBe(false);
  });

  test("object missing type → exit 2 + field error on stderr", async () => {
    const root = makeTmpProject();
    const r = await runCli([root, "sess-y", JSON.stringify({ payload: {} })]);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("type must be a non-empty string");
  });
});
