/**
 * Tests: the lifted concrete fs sink (resolveOverflowRoot + makeOverflowFileSink) —
 * P1 moved these VERBATIM out of bridge/mcp-server.ts into a shared module so the MCP
 * seam AND pm_semantic_intent_gate share ONE implementation. Proves the path convention
 * (<root>/<toolName>-<stamp>-<sha256[:8]>.json) and the {path, bytes} return shape.
 */

import { test, expect, describe, afterEach } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createHash } from "node:crypto";
import {
  resolveOverflowRoot,
  makeOverflowFileSink,
  sweepOverflowDir,
  maybeSweepOverflowDir,
} from "../../../lib/bounded-return/overflow-file-sink";

const tmpDirs: string[] = [];

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-overflow-sink-"));
  tmpDirs.push(dir);
  return dir;
}

describe("overflow-file-sink — lifted concrete fs sink", () => {
  test("resolveOverflowRoot uses <project>/.palantir-mini/mcp-response-overflow when project is supplied", () => {
    const project = makeProject();
    expect(resolveOverflowRoot({ project })).toBe(
      path.join(project, ".palantir-mini", "mcp-response-overflow"),
    );
    // projectRoot is honored too (same precedence as the original seam).
    expect(resolveOverflowRoot({ projectRoot: project })).toBe(
      path.join(project, ".palantir-mini", "mcp-response-overflow"),
    );
  });

  test("resolveOverflowRoot falls back to an os.tmpdir mkdtemp when no project is supplied", () => {
    const root = resolveOverflowRoot({});
    tmpDirs.push(root);
    expect(root.startsWith(os.tmpdir())).toBe(true);
    expect(path.basename(root).startsWith("pm-mcp-overflow-")).toBe(true);
    expect(fs.existsSync(root)).toBe(true);
  });

  test("makeOverflowFileSink writes <toolName>-<stamp>-<sha256[:8]>.json and returns {path, bytes}", async () => {
    const project = makeProject();
    const root = resolveOverflowRoot({ project });
    const sink = makeOverflowFileSink("pm_semantic_intent_gate", root);

    const serialized = JSON.stringify({ heavy: "x".repeat(500) }, null, 2);
    const out = await sink.write(serialized);

    // Return shape.
    expect(out.bytes).toBe(Buffer.byteLength(serialized, "utf8"));
    expect(out.path.startsWith(root)).toBe(true);

    // Path convention: <toolName>-<ISO-stamp(:.->-)>-<sha256[:8]>.json
    const expectedHash = createHash("sha256").update(serialized).digest("hex").slice(0, 8);
    const base = path.basename(out.path);
    expect(base.startsWith("pm_semantic_intent_gate-")).toBe(true);
    expect(base.endsWith(`-${expectedHash}.json`)).toBe(true);

    // The file exists and round-trips the exact serialized bytes.
    expect(fs.existsSync(out.path)).toBe(true);
    expect(fs.readFileSync(out.path, "utf8")).toBe(serialized);
  });

  test("makeOverflowFileSink creates the root directory tree on demand", () => {
    const project = makeProject();
    const root = resolveOverflowRoot({ project });
    expect(fs.existsSync(root)).toBe(false); // not yet created
    const sink = makeOverflowFileSink("pm_semantic_intent_gate", root);
    sink.write("{}");
    expect(fs.existsSync(root)).toBe(true);
  });
});

describe("overflow-file-sink — age-out GC (sweepOverflowDir / maybeSweepOverflowDir)", () => {
  const DAY = 24 * 60 * 60 * 1000;

  // Make a fresh root dir + a sink, write `count` files, and return their paths.
  // The concrete fs sink writes synchronously; the port type is a union, so narrow it.
  function writeFiles(root: string, count: number): string[] {
    const sink = makeOverflowFileSink("pm_semantic_intent_gate", root);
    const paths: string[] = [];
    for (let i = 0; i < count; i++) {
      // Distinct serialized content -> distinct sha8 -> distinct filename.
      const out = sink.write(JSON.stringify({ i, pad: "x".repeat(10) })) as {
        path: string;
        bytes: number;
      };
      paths.push(out.path);
    }
    return paths;
  }

  function ageFile(file: string, ms: number): void {
    const when = (Date.now() - ms) / 1000;
    fs.utimesSync(file, when, when);
  }

  test("old files are pruned, a recent one is kept", () => {
    const root = resolveOverflowRoot({ project: makeProject() });
    const [a, b, c] = writeFiles(root, 3);
    ageFile(a!, 8 * DAY);
    ageFile(b!, 8 * DAY);
    // c keeps its fresh mtime.

    sweepOverflowDir(root, { maxAgeMs: 7 * DAY });

    expect(fs.existsSync(a!)).toBe(false);
    expect(fs.existsSync(b!)).toBe(false);
    expect(fs.existsSync(c!)).toBe(true);
  });

  test("a recent file survives a sweep (concurrency tolerance)", () => {
    const root = resolveOverflowRoot({ project: makeProject() });
    const [a] = writeFiles(root, 1); // mtime now
    sweepOverflowDir(root, { maxAgeMs: 7 * DAY });
    expect(fs.existsSync(a!)).toBe(true);
  });

  test("non-matching files, subdirs and the sentinel are NEVER touched", () => {
    const root = resolveOverflowRoot({ project: makeProject() });
    fs.mkdirSync(root, { recursive: true });
    const readme = path.join(root, "README.txt");
    const malformed = path.join(root, "not-an-overflow.json");
    const sentinel = path.join(root, ".last-gc");
    const nestedDir = path.join(root, "nested");
    fs.writeFileSync(readme, "keep me");
    fs.writeFileSync(malformed, "{}");
    fs.writeFileSync(sentinel, "");
    fs.mkdirSync(nestedDir, { recursive: true });
    const nestedFile = path.join(nestedDir, "pm_x-2026-06-16T00-00-00-000Z-deadbeef.json");
    fs.writeFileSync(nestedFile, "{}"); // a "matching" name but inside a subdir -> must not recurse
    for (const f of [readme, malformed, sentinel, nestedFile]) ageFile(f, 30 * DAY);

    sweepOverflowDir(root, { maxAgeMs: 7 * DAY });

    expect(fs.existsSync(readme)).toBe(true);
    expect(fs.existsSync(malformed)).toBe(true);
    expect(fs.existsSync(sentinel)).toBe(true);
    expect(fs.existsSync(nestedDir)).toBe(true);
    expect(fs.existsSync(nestedFile)).toBe(true); // never recursed into the subdir
  });

  test("a symlink is never followed nor deleted (even with a matching name)", () => {
    const root = resolveOverflowRoot({ project: makeProject() });
    const [real] = writeFiles(root, 1);
    // A symlink whose NAME matches the overflow pattern, pointing at the real overflow file.
    const linkName = "pm_semantic_intent_gate-2026-06-16T00-00-00-000Z-aaaabbbb.json";
    const link = path.join(root, linkName);
    fs.symlinkSync(real!, link);
    ageFile(real!, 1 * DAY); // both young (link inherits via lstat? no — assert on the link only)

    // Sweep with maxAge so SMALL that everything matching+regular would die — the symlink must
    // still survive because lstat().isSymbolicLink() short-circuits it.
    sweepOverflowDir(root, { maxAgeMs: 0 });

    // The symlink itself was neither followed nor unlinked by the GC.
    expect(fs.existsSync(link) || fs.lstatSync(link)).toBeTruthy();
    expect(fs.lstatSync(link).isSymbolicLink()).toBe(true);
  });

  test("count-cap backstop keeps the NEWEST maxFiles and prunes older overflow files", () => {
    const root = resolveOverflowRoot({ project: makeProject() });
    const paths = writeFiles(root, 8); // all fresh
    // Stagger mtimes: index 0 is oldest, index 7 is newest.
    paths.forEach((p, i) => ageFile(p, (paths.length - i) * 1000));

    sweepOverflowDir(root, { maxAgeMs: 30 * DAY, maxFiles: 3 }); // age policy keeps all; cap trims to 3

    const survivors = fs
      .readdirSync(root)
      .filter((n) => n.endsWith(".json"));
    expect(survivors.length).toBe(3);
    // The 3 NEWEST (indices 5,6,7) survive; the 5 oldest are gone.
    for (const p of paths.slice(0, 5)) expect(fs.existsSync(p)).toBe(false);
    for (const p of paths.slice(5)) expect(fs.existsSync(p)).toBe(true);
  });

  test("fail-open: sweeping a non-existent root does NOT throw", () => {
    expect(() => sweepOverflowDir("/nonexistent/pm-overflow-root-xyz")).not.toThrow();
  });

  test("sentinel throttle: a fresh .last-gc makes the next maybeSweep a no-op", () => {
    const root = resolveOverflowRoot({ project: makeProject() });
    const [old] = writeFiles(root, 1);
    ageFile(old!, 30 * DAY); // eligible for age-out
    // Seed a FRESH sentinel so the throttle treats GC as "not due".
    fs.writeFileSync(path.join(root, ".last-gc"), "");

    maybeSweepOverflowDir(root); // throttled — must NOT scan/prune

    expect(fs.existsSync(old!)).toBe(true);
  });

  test("DISABLE escape hatch: maybeSweep is a no-op when PALANTIR_MINI_OVERFLOW_GC_DISABLE=1", () => {
    // NB: GC_DISABLED is read at module load; we re-import a fresh module instance with the env set
    // so this assertion is independent of load order.
    const root = resolveOverflowRoot({ project: makeProject() });
    const [old] = writeFiles(root, 1);
    ageFile(old!, 30 * DAY);
    // Remove any sentinel so the only thing that could stop the sweep is the DISABLE flag.
    const sentinel = path.join(root, ".last-gc");
    if (fs.existsSync(sentinel)) fs.rmSync(sentinel);

    const prev = process.env.PALANTIR_MINI_OVERFLOW_GC_DISABLE;
    process.env.PALANTIR_MINI_OVERFLOW_GC_DISABLE = "1";
    try {
      delete require.cache?.[require.resolve("../../../lib/bounded-return/overflow-file-sink")];
      const fresh = require("../../../lib/bounded-return/overflow-file-sink") as typeof import("../../../lib/bounded-return/overflow-file-sink");
      fresh.maybeSweepOverflowDir(root); // DISABLE=1 -> immediate return, no prune
      expect(fs.existsSync(old!)).toBe(true);
    } finally {
      if (prev === undefined) delete process.env.PALANTIR_MINI_OVERFLOW_GC_DISABLE;
      else process.env.PALANTIR_MINI_OVERFLOW_GC_DISABLE = prev;
    }
  });

  test("write() still returns the correct {path, bytes} shape after the GC fires", async () => {
    const root = resolveOverflowRoot({ project: makeProject() });
    const sink = makeOverflowFileSink("pm_semantic_intent_gate", root);
    const serialized = JSON.stringify({ heavy: "y".repeat(200) });
    const out = await sink.write(serialized);
    expect(out.bytes).toBe(Buffer.byteLength(serialized, "utf8"));
    expect(out.path.startsWith(root)).toBe(true);
    expect(fs.existsSync(out.path)).toBe(true);
  });
});
