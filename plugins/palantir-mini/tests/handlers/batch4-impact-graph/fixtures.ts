// palantir-mini v3.6.0 — shared fixtures for batch4 impact-graph tests
// Extracted from batch4-impact-graph.test.ts during v3.6.0 N1-LARGE wave 4 (A4).

import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export const tmpDirs: string[] = [];

export function tmp(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "pm-ig-"));
  tmpDirs.push(d);
  return d;
}

export function writeTs(dir: string, name: string, content: string): string {
  const fp = path.join(dir, name);
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, content);
  return fp;
}

export function cleanupTmpDirs(): void {
  for (const d of tmpDirs.splice(0)) {
    try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}
