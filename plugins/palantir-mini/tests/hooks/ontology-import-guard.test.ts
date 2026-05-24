// palantir-mini v2.25.0 — ontology-import-guard tests (sprint-053 W3B)
// v2.25.0: + tilde-expansion canonicalization tests.

import * as os from "os";
import * as path from "path";
import { describe, expect, test } from "bun:test";
import ontologyImportGuard, {
  isTargetedFile,
  detectForbiddenImports,
  collectNewContent,
} from "../../hooks/ontology-import-guard";

describe("isTargetedFile", () => {
  test("matches .ts under projects/palantir-math/", () => {
    expect(isTargetedFile("/home/palantirkc/projects/palantir-math/src/foo.ts")).toBe(true);
  });

  test("matches .tsx under projects/mathcrew/", () => {
    expect(isTargetedFile("/home/palantirkc/projects/mathcrew/src/Bar.tsx")).toBe(true);
  });

  test("matches .ts under projects/kosmos/", () => {
    expect(isTargetedFile("/home/palantirkc/projects/kosmos/lib/baz.ts")).toBe(true);
  });

  test("rejects non-projects path", () => {
    expect(isTargetedFile("/home/palantirkc/.claude/plugins/palantir-mini/hooks/x.ts")).toBe(false);
  });

  test("rejects non-TS extension", () => {
    expect(isTargetedFile("/home/palantirkc/projects/palantir-math/src/foo.js")).toBe(false);
    expect(isTargetedFile("/home/palantirkc/projects/palantir-math/README.md")).toBe(false);
  });

  test("rejects unrelated project", () => {
    expect(isTargetedFile("/home/palantirkc/projects/other-project/src/foo.ts")).toBe(false);
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
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("skipped");
  });

  test("skips out-of-scope file", async () => {
    const result = await ontologyImportGuard({
      tool_name: "Edit",
      tool_input: {
        file_path: "/home/palantirkc/.claude/plugins/foo.ts",
        new_string: `import { x } from "~/.claude/schemas/anywhere";`,
      },
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("out-of-scope");
  });

  test("allows clean import in projects/palantir-math/", async () => {
    const result = await ontologyImportGuard({
      tool_name: "Edit",
      tool_input: {
        file_path: "/home/palantirkc/projects/palantir-math/src/foo.ts",
        new_string: `import { Y } from "~/ontology/shared-core/primitives";`,
      },
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("OK");
  });

  test("BLOCKS forbidden ~/.claude/schemas import in projects/palantir-math/", async () => {
    const result = await ontologyImportGuard({
      tool_name: "Edit",
      tool_input: {
        file_path: "/home/palantirkc/projects/palantir-math/src/foo.ts",
        new_string: `import { X } from "~/.claude/schemas/ontology";`,
      },
    });
    expect(result.decision).toBe("block");
    expect(result.reason).toContain("BLOCK");
    expect(result.reason).toContain("ontology/shared-core");
  });

  test("BLOCKS forbidden @palantirKC/claude-schemas import in projects/mathcrew/", async () => {
    const result = await ontologyImportGuard({
      tool_name: "Write",
      tool_input: {
        file_path: "/home/palantirkc/projects/mathcrew/src/foo.tsx",
        content: `import type { X } from "@palantirKC/claude-schemas";`,
      },
    });
    expect(result.decision).toBe("block");
    expect(result.reason).toContain("BLOCK");
  });

  test("BLOCKS via MultiEdit edits[]", async () => {
    const result = await ontologyImportGuard({
      tool_name: "MultiEdit",
      tool_input: {
        file_path: "/home/palantirkc/projects/kosmos/lib/baz.ts",
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
