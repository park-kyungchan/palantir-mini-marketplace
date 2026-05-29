import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { run as plansIndexDriftDetect } from "../../hooks/plans-index-drift-detect";

describe("plans-index-drift-detect", () => {
  let projectRoot: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pm-plan-index-"));
    process.chdir(projectRoot);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  test("keeps nested plan markdown paths in sync with BROWSE.md", async () => {
    const planRoot = path.join(projectRoot, ".palantir-mini", "plan");
    const nestedRoot = path.join(planRoot, "2026-05-29-codex-continuity");
    fs.mkdirSync(nestedRoot, { recursive: true });
    fs.writeFileSync(path.join(nestedRoot, "checkpoint.md"), "# Checkpoint\n", "utf8");
    fs.writeFileSync(
      path.join(planRoot, "BROWSE.md"),
      "[checkpoint](2026-05-29-codex-continuity/checkpoint.md)\n",
      "utf8",
    );

    const result = await plansIndexDriftDetect();
    expect(result.message).toContain("in sync");
  });

  test("reports nested unindexed plan markdown paths", async () => {
    const planRoot = path.join(projectRoot, ".palantir-mini", "plan");
    const nestedRoot = path.join(planRoot, "2026-05-29-codex-continuity");
    fs.mkdirSync(nestedRoot, { recursive: true });
    fs.writeFileSync(path.join(nestedRoot, "checkpoint.md"), "# Checkpoint\n", "utf8");
    fs.writeFileSync(path.join(planRoot, "BROWSE.md"), "", "utf8");

    const result = await plansIndexDriftDetect();
    expect(result.message).toContain("ADVISORY");
    expect(result.message).toContain("2026-05-29-codex-continuity/checkpoint.md");
  });
});
