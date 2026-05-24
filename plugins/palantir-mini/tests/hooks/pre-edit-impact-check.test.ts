// palantir-mini v1.4 — pre-edit-impact-check tests
// A8.3: verifies advisory impact context injection before edits.
// v1.4 (sprint-053 W3A): + symlink canonicalization tests.

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import preEditImpactCheck from "../../hooks/pre-edit-impact-check";

describe("preEditImpactCheck", () => {
  test("skips when no file path in payload", async () => {
    const result = await preEditImpactCheck({ cwd: "/tmp" });
    expect(result.message).toContain("skipped");
    expect(result.additionalContext).toBeUndefined();
  });

  test("returns additionalContext with impact summary for single file", async () => {
    const result = await preEditImpactCheck({
      tool_input: { file_path: "/tmp/foo.ts" },
      cwd: "/tmp",
    });
    expect(result.additionalContext).toContain("Impact analysis");
  });

  test("handles multi-file paths array", async () => {
    const result = await preEditImpactCheck({
      tool_input: { paths: ["/tmp/a.ts", "/tmp/b.ts"] },
      cwd: "/tmp",
    });
    expect(result.message).toContain("files=2");
  });

  test("handles null payload gracefully", async () => {
    const result = await preEditImpactCheck(null);
    expect(result.message).toBeTruthy();
  });
});

describe("preEditImpactCheck — CC v2.1.85+ updatedInput canonicalization", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "palantir-mini-peic-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  test("symlink_input_emits_updatedInput — symlink resolves to realpath", async () => {
    const realFile = path.join(tmpDir, "real.ts");
    fs.writeFileSync(realFile, "// real file");
    const symlinkPath = path.join(tmpDir, "link.ts");
    fs.symlinkSync(realFile, symlinkPath);

    const result = await preEditImpactCheck({
      tool_input: { file_path: symlinkPath },
      cwd: tmpDir,
    });

    const expectedCanonical = fs.realpathSync(symlinkPath);
    expect(result.hookSpecificOutput?.updatedInput?.file_path).toBe(expectedCanonical);
  });

  test("non_symlink_no_updatedInput — regular file path does not emit updatedInput", async () => {
    const regularFile = path.join(tmpDir, "regular.ts");
    fs.writeFileSync(regularFile, "// regular file");

    const result = await preEditImpactCheck({
      tool_input: { file_path: regularFile },
      cwd: tmpDir,
    });

    const updatedFilePath = result.hookSpecificOutput?.updatedInput?.file_path;
    expect(updatedFilePath).toBeUndefined();
  });
});
