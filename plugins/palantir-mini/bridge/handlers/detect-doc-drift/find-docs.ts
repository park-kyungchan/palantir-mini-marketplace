// palantir-mini v3.5.0 — detect-doc-drift sibling: recursive doc finder
// Pure helper — no fs mutations, no events.

import * as fs from "fs";
import * as path from "path";

export function findDocs(projectDir: string, names: string[]): string[] {
  const found: string[] = [];
  const scan = (dir: string, depth: number) => {
    if (depth > 3) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scan(full, depth + 1);
      } else if (names.includes(entry.name)) {
        found.push(full);
      }
    }
  };
  if (fs.existsSync(projectDir)) scan(projectDir, 0);
  return found;
}
