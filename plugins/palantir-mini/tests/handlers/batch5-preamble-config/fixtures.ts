// palantir-mini v3.6.0 — shared fixtures for batch5 preamble + config tests
// Extracted from batch5-preamble-config.test.ts during v3.6.0 N1-LARGE wave 4 (A1).

import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export function tmpDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `pm-h5-${prefix}-`));
}

export function withIsolatedConfig(cb: () => void): void {
  const dir = tmpDir("cfg");
  const cfg = path.join(dir, "config.json");
  const prev = process.env["PALANTIR_MINI_CONFIG_PATH"];
  process.env["PALANTIR_MINI_CONFIG_PATH"] = cfg;
  try {
    cb();
  } finally {
    if (prev === undefined) delete process.env["PALANTIR_MINI_CONFIG_PATH"];
    else process.env["PALANTIR_MINI_CONFIG_PATH"] = prev;
  }
}
