#!/usr/bin/env bun
// test:home-isolation-guard (ledger row P340, execution-plan.md section
// 11.2's successor-equivalent of the legacy plugin's
// `bun run test:home-isolation-guard`). NOT wired into the default
// `bun test`/CI invocation — the same "run this on-demand" precedent the
// legacy plugin's `scripts/verify-real-home-untouched.ts` set. This is a
// fresh implementation for this scaffold's own real global state
// directories, not a copy of the legacy script (AGENT-CONTRACT.md section
// 5 forbids wholesale legacy copies).
//
// ADR-006 fixes this plugin's future storage authority as per-project
// `.palantir-ontology/`-scoped (mirroring the legacy `.palantir-mini/`
// convention); ADR-008 additionally requires the legacy plugin's own real
// global state to never be touched by this plugin. This guard snapshots
// BOTH real home directories (`~/.palantir-ontology`, `~/.palantir-mini`)
// before and after running the full `bun test` suite as a subprocess, and
// fails if either changed. At this scaffold stage no code writes to either
// directory (no handlers/hooks exist yet), so a clean pass is a genuine
// negative result, not a hardcoded no-op — this guard will catch the first
// future test that leaks a write to real home state.

import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { diffSnapshots, snapshotDir } from "./lib/fs-walk";

const PACKAGE_ROOT = resolve(import.meta.dir, "..");
const GUARDED_DIRS: ReadonlyArray<{ label: string; path: string }> = [
  { label: "~/.palantir-ontology", path: join(homedir(), ".palantir-ontology") },
  { label: "~/.palantir-mini", path: join(homedir(), ".palantir-mini") },
];

function main(): void {
  const before = GUARDED_DIRS.map((d) => ({ ...d, snap: snapshotDir(d.path) }));

  const result = spawnSync("bun", ["test"], { cwd: PACKAGE_ROOT, stdio: "inherit" });

  const after = GUARDED_DIRS.map((d) => ({ ...d, snap: snapshotDir(d.path) }));

  const diffs: string[] = [];
  for (let i = 0; i < GUARDED_DIRS.length; i++) {
    diffs.push(...diffSnapshots(before[i]!.snap, after[i]!.snap, before[i]!.label));
  }

  if (result.status !== 0) {
    console.error(`test:home-isolation-guard FAIL — guarded \`bun test\` run itself failed (exit ${result.status}).`);
    process.exit(result.status ?? 1);
  }

  if (diffs.length > 0) {
    console.error(`test:home-isolation-guard FAIL — real home state changed during \`bun test\`:`);
    for (const d of diffs) console.error(`  ${d}`);
    process.exit(1);
  }

  console.log(
    `test:home-isolation-guard PASS — \`bun test\` completed and neither ${GUARDED_DIRS.map((d) => d.label).join(" nor ")} changed.`,
  );
}

main();
