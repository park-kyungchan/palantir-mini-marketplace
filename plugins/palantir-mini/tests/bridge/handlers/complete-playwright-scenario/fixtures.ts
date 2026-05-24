// palantir-mini v3.5.0 — complete-playwright-scenario shared test fixtures (B2 split)
// Extracted from complete-playwright-scenario.test.ts.

import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const tmpDirs: string[] = [];

export function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "complete-pws-test-"));
  tmpDirs.push(dir);
  return dir;
}

export function cleanupTmpDirs(): void {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export function makeEvidenceDir(label: string): { project: string; evidenceDir: string } {
  const project = makeTmpDir();
  const evidenceDir = path.join(project, ".palantir-mini", "harness", "ad-hoc", label);
  fs.mkdirSync(evidenceDir, { recursive: true });
  return { project, evidenceDir };
}
