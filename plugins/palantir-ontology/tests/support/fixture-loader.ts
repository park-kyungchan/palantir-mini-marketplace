// Test-only fixture loader. Reads every *.json file in a fixtures directory
// (tests/fixtures/<slug>/ or tests/negative/<slug>/) and returns
// {file, data} pairs, sorted by filename for deterministic test output.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface LoadedFixture {
  file: string;
  data: unknown;
}

export function loadFixtures(dir: string): LoadedFixture[] {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort();
  return files.map((file) => ({
    file,
    data: JSON.parse(readFileSync(join(dir, file), "utf8")),
  }));
}
