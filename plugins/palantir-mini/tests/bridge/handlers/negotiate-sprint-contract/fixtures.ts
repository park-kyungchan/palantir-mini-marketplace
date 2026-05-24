// palantir-mini v3.5.0 — negotiate-sprint-contract shared test fixtures (B3 split)
// Extracted from negotiate-sprint-contract.test.ts.

import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const tmpRoots: string[] = [];

export const savedEnv: Record<string, string | undefined> = {};

export function makeTmpRoot(label: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `pm-nsc-${label}-`));
}

export function eventsPathFor(root: string): string {
  return path.join(root, ".palantir-mini", "session", "events.jsonl");
}

export function setupRoot(label: string): string {
  const root = makeTmpRoot(label);
  tmpRoots.push(root);
  process.env["PALANTIR_MINI_PROJECT"] = root;
  process.env["PALANTIR_MINI_EVENTS_FILE"] = eventsPathFor(root);
  return root;
}

export function saveEnv(): void {
  savedEnv["PALANTIR_MINI_PROJECT"] = process.env["PALANTIR_MINI_PROJECT"];
  savedEnv["PALANTIR_MINI_EVENTS_FILE"] = process.env["PALANTIR_MINI_EVENTS_FILE"];
}

export function restoreEnv(): void {
  for (const k of Object.keys(savedEnv)) {
    const v = savedEnv[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

export function cleanupTmpRoots(): void {
  for (const r of tmpRoots.splice(0)) fs.rmSync(r, { recursive: true, force: true });
}

export const baseContract = {
  contractId: "ctr-1",
  theme: "demo theme",
  timeboxMs: 60000,
  gradingRubric: { criteria: [{ criterionId: "c1", weightInRubric: 1 }] },
  terminationHardThreshold: 0.7,
};
