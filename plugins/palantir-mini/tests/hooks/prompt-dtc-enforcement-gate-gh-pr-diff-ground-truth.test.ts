/**
 * G-GATE-J / G-DOCS-K — regression tests for the gh-pr-merge change-set
 * ground-truth fix (R1: `ghPrChangeSetNonOntology` / `resolveGhPrDiffPaths`) and
 * the docs-class audit-after carve-out (R2/R3: `isDocsClassAuditAfterPath`
 * wired into `isNonOntologyPath` only).
 *
 * Cases (task brief):
 *   (a) `gh pr merge` from a SYNCED main with a faked docs/governance PR diff ->
 *       mutation class `generic-mutation` AND `isProvenNonOntologyDelivery` true.
 *   (b) a faked PR diff containing an ontology path -> stays `pull-request` AND
 *       the proof stays false (R3 — grants never relax the A1 ontology floor).
 *   (c) `gh` unresolvable/throws -> conservative floor (`pull-request` / false).
 *   (d) docs-class: an ontology-adjacent `.md` path is non-ontology via
 *       `isNonOntologyPath`, but `schemas/ontology/` and `.palantir-mini/` stay
 *       ontology regardless of the `.md` suffix; `scopedBlockingFileReason`
 *       (the edit-time/advisory surface) is unaffected by the carve.
 *   (e) `gh pr create` is UNCHANGED — still uses the local push range.
 */

import { afterEach, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { __test__ } from "../../hooks/gates/prompt-dtc-enforcement-gate.impl";

const tmpDirs: string[] = [];

function git(dir: string, args: string): void {
  execSync(`git ${args}`, { cwd: dir, stdio: ["ignore", "ignore", "ignore"] });
}

/**
 * A real git-backed tmp project whose upstream (`origin/main`) is pinned to the
 * SAME commit as HEAD immediately — a SYNCED main, so `origin/main...HEAD` is
 * EMPTY. This is the exact confirmed mechanism (investigator report,
 * `emptyRangeConfirmed`): `allPushRangePathsNonOntology` returns `false` here
 * regardless of what a `gh pr merge` would actually ship, which is why the
 * change-set ground truth must come from the PR's own diff instead.
 */
function makeTmpSyncedProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dtc-gate-ghdiff-"));
  tmpDirs.push(dir);
  git(dir, "init -q");
  git(dir, "config user.email ghdiff-test@example.com");
  git(dir, "config user.name ghdiff-test");
  git(dir, "config commit.gpgsign false");
  fs.writeFileSync(path.join(dir, "README.md"), "# base\n");
  git(dir, "add README.md");
  git(dir, "commit -q -m base");
  git(dir, "update-ref refs/remotes/origin/main HEAD");
  return dir;
}

/**
 * Fake `gh` PATH shim: writes an executable `gh` script that either echoes a
 * fixed path list (`paths`, one per line) for `pr diff --name-only`, or exits
 * nonzero (`fail: true`) to exercise the unresolvable/network-failure lane.
 * Prepends its dir to `process.env.PATH` for the duration of `fn`, restored in
 * `finally`.
 */
async function withFakeGh<T>(
  behavior: { paths?: string[]; fail?: boolean },
  fn: () => T,
): Promise<T> {
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), "dtc-gate-ghdiff-bin-"));
  tmpDirs.push(binDir);
  const script = behavior.fail
    ? "#!/bin/sh\nexit 1\n"
    : `#!/bin/sh\n${(behavior.paths ?? []).map((p) => `echo "${p}"`).join("\n")}\n`;
  fs.writeFileSync(path.join(binDir, "gh"), script, { mode: 0o755 });
  const savedPath = process.env.PATH;
  process.env.PATH = `${binDir}:${savedPath ?? ""}`;
  try {
    return fn();
  } finally {
    process.env.PATH = savedPath;
  }
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("G-GATE-J: gh-pr-merge change-set ground truth", () => {
  test("(a) gh pr merge from a SYNCED main with a faked docs/governance PR diff -> generic-mutation + proven non-ontology", async () => {
    const project = makeTmpSyncedProject();
    // Confirm the synced-main precondition: the local push range is empty.
    expect(__test__.allPushRangePathsNonOntology(project)).toBe(false);

    const payload = {
      cwd: project,
      tool_name: "Bash",
      tool_input: { command: "gh pr merge 456 --squash" },
    };

    await withFakeGh(
      { paths: ["docs/README.md", "projects/governance/handoffs-registry.yaml"] },
      () => {
        const mutationClass = __test__.protectedMutationClassForPromptGate(payload, true, project);
        expect(mutationClass).toBe("generic-mutation");
        expect(__test__.isProvenNonOntologyDelivery(payload, mutationClass!, project)).toBe(true);
      },
    );
  });

  test("(b) faked PR diff containing an ontology path -> stays pull-request + proof false (R3, grants never relax the A1 floor)", async () => {
    const project = makeTmpSyncedProject();
    const payload = {
      cwd: project,
      tool_name: "Bash",
      tool_input: { command: "gh pr merge 456 --squash" },
    };

    await withFakeGh(
      { paths: ["docs/README.md", "projects/foo/ontology/atom.yaml"] },
      () => {
        const mutationClass = __test__.protectedMutationClassForPromptGate(payload, true, project);
        expect(mutationClass).toBe("pull-request");
        expect(__test__.isProvenNonOntologyDelivery(payload, mutationClass!, project)).toBe(false);
      },
    );
  });

  test("(c) gh unresolvable/throws -> conservative floor (pull-request, proof false)", async () => {
    const project = makeTmpSyncedProject();
    const payload = {
      cwd: project,
      tool_name: "Bash",
      tool_input: { command: "gh pr merge 456 --squash" },
    };

    await withFakeGh({ fail: true }, () => {
      const mutationClass = __test__.protectedMutationClassForPromptGate(payload, true, project);
      expect(mutationClass).toBe("pull-request");
      expect(__test__.isProvenNonOntologyDelivery(payload, mutationClass!, project)).toBe(false);
    });
  });

  test("(e) gh pr create is UNCHANGED — still resolved via the local push range", () => {
    const project = makeTmpSyncedProject();
    const payload = {
      cwd: project,
      tool_name: "Bash",
      tool_input: { command: "gh pr create --fill" },
    };

    // No fake-gh shim active: `create` must not route through resolveGhPrDiffPaths
    // (which would invoke the real `gh` binary here) — it stays on
    // allPushRangePathsNonOntology, unchanged. Synced main -> empty push range ->
    // conservative `pull-request` floor, matching pre-R1 behavior for `create`.
    const mutationClass = __test__.protectedMutationClassForPromptGate(payload, true, project);
    expect(mutationClass).toBe("pull-request");
    expect(__test__.allPushRangePathsNonOntology(project)).toBe(false);
  });
});

describe("G-DOCS-K: docs-class audit-after carve-out", () => {
  const project = "/tmp/dtc-gate-ghdiff-docs-class-unused"; // no filesystem reads needed below

  test("(d1) 'projects/x/ontology/README.md' is now non-ontology via isNonOntologyPath", () => {
    expect(__test__.isNonOntologyPath("projects/x/ontology/README.md", project)).toBe(true);
  });

  test("(d2) 'schemas/ontology/README.md' STILL ontology (hard floor wins over the .md carve)", () => {
    expect(__test__.isNonOntologyPath("schemas/ontology/README.md", project)).toBe(false);
  });

  test("(d3) '.palantir-mini/notes.md' STILL ontology (hard floor wins over the .md carve)", () => {
    expect(__test__.isNonOntologyPath(".palantir-mini/notes.md", project)).toBe(false);
  });

  test("(d4) scopedBlockingFileReason for 'projects/x/ontology/README.md' STILL returns a reason (edit-time surface unaffected by the carve)", () => {
    expect(__test__.scopedBlockingFileReason("projects/x/ontology/README.md", project)).toBeDefined();
  });

  test("(d5) isDocsClassAuditAfterPath direct unit checks", () => {
    expect(__test__.isDocsClassAuditAfterPath("projects/x/ontology/README.md")).toBe(true);
    expect(__test__.isDocsClassAuditAfterPath("schemas/ontology/README.md")).toBe(false);
    expect(__test__.isDocsClassAuditAfterPath(".palantir-mini/notes.md")).toBe(false);
    expect(__test__.isDocsClassAuditAfterPath("projects/x/ontology/atom.ts")).toBe(false);
  });
});
