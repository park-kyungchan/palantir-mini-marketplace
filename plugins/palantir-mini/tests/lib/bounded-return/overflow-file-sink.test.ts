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
