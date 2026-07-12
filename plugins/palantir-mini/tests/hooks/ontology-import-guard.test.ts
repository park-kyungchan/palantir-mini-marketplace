// palantir-mini — ontology-import-guard tests
// bd-005 de-hardcode: isTargetedFile now resolves STRUCTURAL .palantir-mini
// membership (FS walk-up) instead of a hardcoded 3-name allowlist, so the
// scope cases build a real tmp project with a .palantir-mini/ marker.
// (Retains tilde-expansion canonicalization tests.)

import * as os from "os";
import * as fs from "fs";
import * as path from "path";
import { describe, expect, test, afterEach } from "bun:test";
import ontologyImportGuard, {
  isTargetedFile,
  detectForbiddenImports,
  collectNewContent,
} from "../../hooks/ontology-import-guard";

// --- tmp-root harness (real .palantir-mini/ marker so the FS walk-up resolves) ---
const tmpRoots: string[] = [];

afterEach(() => {
  for (const r of tmpRoots.splice(0)) {
    try { fs.rmSync(r, { recursive: true, force: true }); } catch { /* best-effort */ }
  }
});

function makeProjectRoot(label: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `pm-oig-${label}-`));
  tmpRoots.push(root);
  fs.mkdirSync(path.join(root, ".palantir-mini"), { recursive: true });
  return root;
}

// A tmp root with NO .palantir-mini ANYWHERE up its spine. os.tmpdir() (/tmp) and
// $HOME can carry stray .palantir-mini markers on a real pm-governed machine, so a
// marker-free root must live under a spine known to be clean (/var/tmp -> /var -> /).
function makeMarkerFreeRoot(label: string): string {
  const root = fs.mkdtempSync(path.join("/var/tmp", `pm-oig-nomark-${label}-`));
  tmpRoots.push(root);
  return root;
}

describe("isTargetedFile", () => {
  test("guards a TS file under ANY project with .palantir-mini (P0 proof)", () => {
    const root = makeProjectRoot("any");
    const fp = path.join(root, "some-new-project/src/foo.ts");
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    // "some-new-project" was NEVER in the old 3-name allowlist.
    expect(isTargetedFile(fp)).toBe(true);
  });

  test("still guards palantir-math / mathcrew / kosmos (behavior identical)", () => {
    const root = makeProjectRoot("legacy");
    const math = path.join(root, "palantir-math/src/foo.ts");
    const crew = path.join(root, "mathcrew/src/Bar.tsx");
    const kos = path.join(root, "kosmos/lib/baz.ts");
    for (const fp of [math, crew, kos]) fs.mkdirSync(path.dirname(fp), { recursive: true });
    expect(isTargetedFile(math)).toBe(true);
    expect(isTargetedFile(crew)).toBe(true);
    expect(isTargetedFile(kos)).toBe(true);
  });

  test("ignores a TS file with NO .palantir-mini ancestor (fail-open for non-ontology)", () => {
    const root = makeMarkerFreeRoot("ignore");
    const fp = path.join(root, "src/foo.ts");
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    expect(isTargetedFile(fp)).toBe(false);
  });

  test("rejects non-TS extension (extension gate fires before membership)", () => {
    const root = makeProjectRoot("ext");
    const dir = path.join(root, "palantir-math/src");
    fs.mkdirSync(dir, { recursive: true });
    expect(isTargetedFile(path.join(dir, "foo.js"))).toBe(false);
    expect(isTargetedFile(path.join(dir, "README.md"))).toBe(false);
  });

  test("does NOT target a .ts sitting DIRECTLY in $HOME even with a HOME .palantir-mini marker (FIX 2)", () => {
    const home = os.homedir();
    const marker = path.join(home, ".palantir-mini");
    const hadMarker = fs.existsSync(marker);
    if (!hadMarker) fs.mkdirSync(marker, { recursive: true });
    try {
      // A file directly in HOME resolves its root to HOME (excluded) → not targeted.
      expect(isTargetedFile(path.join(home, "some-stray-file.ts"))).toBe(false);
    } finally {
      // Only remove the marker if WE created it (never delete a real HOME marker).
      if (!hadMarker) { try { fs.rmSync(marker, { recursive: true, force: true }); } catch { /* best-effort */ } }
    }
  });

  test("STILL targets a real project .palantir-mini root under HOME (FIX 2 does not over-exclude)", () => {
    const root = makeProjectRoot("under-home-still-guarded");
    const fp = path.join(root, "src/foo.ts");
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    expect(isTargetedFile(fp)).toBe(true);
  });
});

describe("detectForbiddenImports", () => {
  test("flags ~/.claude/schemas import (double quotes)", () => {
    const v = detectForbiddenImports(`import { x } from "~/.claude/schemas/ontology/primitives";`);
    expect(v.length).toBe(1);
  });

  test("flags ~/.claude/schemas import (single quotes)", () => {
    const v = detectForbiddenImports(`import { x } from '~/.claude/schemas/foo';`);
    expect(v.length).toBe(1);
  });

  test("flags @palantirKC/claude-schemas package", () => {
    const v = detectForbiddenImports(`import type { X } from "@palantirKC/claude-schemas";`);
    expect(v.length).toBe(1);
  });

  test("ALLOWS ~/ontology/shared-core imports (correct surface)", () => {
    const v = detectForbiddenImports(`import { Y } from "~/ontology/shared-core/primitives";`);
    expect(v).toEqual([]);
  });

  test("ALLOWS unrelated imports", () => {
    const v = detectForbiddenImports(`import * as fs from "fs";\nimport React from "react";`);
    expect(v).toEqual([]);
  });
});

describe("collectNewContent", () => {
  test("aggregates Write tool content", () => {
    expect(collectNewContent({ content: "hello" })).toBe("hello");
  });

  test("aggregates Edit tool new_string", () => {
    expect(collectNewContent({ new_string: "world" })).toBe("world");
  });

  test("aggregates MultiEdit tool edits[].new_string", () => {
    const out = collectNewContent({
      edits: [{ new_string: "a" }, { new_string: "b" }],
    });
    expect(out).toContain("a");
    expect(out).toContain("b");
  });

  test("returns empty for null input", () => {
    expect(collectNewContent(undefined)).toBe("");
  });
});

describe("ontology-import-guard hook", () => {
  test("skips non-Edit tool", async () => {
    const result = await ontologyImportGuard({ tool_name: "Read", tool_input: {} });
    expect(result.decision).toBeUndefined();
    expect(result.message).toContain("skipped");
  });

  test("skips out-of-scope file (no .palantir-mini ancestor)", async () => {
    const root = makeMarkerFreeRoot("oos");
    const fp = path.join(root, "foo.ts");
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    const result = await ontologyImportGuard({
      tool_name: "Edit",
      tool_input: {
        file_path: fp,
        new_string: `import { x } from "~/.claude/schemas/anywhere";`,
      },
    });
    expect(result.decision).toBeUndefined();
    expect(result.message).toContain("out-of-scope");
  });

  test("allows clean import in a .palantir-mini project", async () => {
    const root = makeProjectRoot("clean");
    const fp = path.join(root, "palantir-math/src/foo.ts");
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    const result = await ontologyImportGuard({
      tool_name: "Edit",
      tool_input: {
        file_path: fp,
        new_string: `import { Y } from "~/ontology/shared-core/primitives";`,
      },
    });
    expect(result.decision).toBeUndefined();
    expect(result.message).toContain("OK");
  });

  test("BLOCKS forbidden ~/.claude/schemas import in a .palantir-mini project", async () => {
    const root = makeProjectRoot("block-math");
    const fp = path.join(root, "palantir-math/src/foo.ts");
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    const result = await ontologyImportGuard({
      tool_name: "Edit",
      tool_input: {
        file_path: fp,
        new_string: `import { X } from "~/.claude/schemas/ontology";`,
      },
    });
    expect(result.decision).toBe("block");
    expect(result.reason).toContain("BLOCK");
    expect(result.reason).toContain("ontology/shared-core");
  });

  test("BLOCKS forbidden @palantirKC/claude-schemas import via Write", async () => {
    const root = makeProjectRoot("block-crew");
    const fp = path.join(root, "mathcrew/src/foo.tsx");
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    const result = await ontologyImportGuard({
      tool_name: "Write",
      tool_input: {
        file_path: fp,
        content: `import type { X } from "@palantirKC/claude-schemas";`,
      },
    });
    expect(result.decision).toBe("block");
    expect(result.reason).toContain("BLOCK");
  });

  test("BLOCKS via MultiEdit edits[]", async () => {
    const root = makeProjectRoot("block-multi");
    const fp = path.join(root, "kosmos/lib/baz.ts");
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    const result = await ontologyImportGuard({
      tool_name: "MultiEdit",
      tool_input: {
        file_path: fp,
        edits: [
          { old_string: "// foo", new_string: `import { X } from "~/.claude/schemas/x";` },
        ],
      },
    });
    expect(result.decision).toBe("block");
  });

  test("handles null payload gracefully", async () => {
    const result = await ontologyImportGuard(null);
    expect(typeof result.message).toBe("string");
    expect(result.message).toBeTruthy();
  });
});

describe("ontology-import-guard — CC v2.1.85+ updatedInput tilde-expansion", () => {
  test("tilde_path_emits_updatedInput — ~/foo/bar.ts resolves to absolute home path", async () => {
    const result = await ontologyImportGuard({
      tool_name: "Edit",
      tool_input: {
        file_path: "~/foo/bar.ts",
        new_string: `import { Y } from "~/ontology/shared-core/primitives";`,
      },
    });

    const expectedAbsolute = path.resolve(os.homedir(), "foo/bar.ts");
    expect(result.hookSpecificOutput?.updatedInput?.file_path).toBe(expectedAbsolute);
  });

  test("absolute_path_no_updatedInput — /abs/path/foo.ts does not emit updatedInput", async () => {
    const result = await ontologyImportGuard({
      tool_name: "Edit",
      tool_input: {
        file_path: "/abs/path/foo.ts",
        new_string: `import { Y } from "~/ontology/shared-core/primitives";`,
      },
    });

    const updatedFilePath = result.hookSpecificOutput?.updatedInput?.file_path;
    expect(updatedFilePath).toBeUndefined();
  });
});
