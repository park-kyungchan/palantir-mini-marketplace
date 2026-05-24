// palantir-mini v3.6.0 — shared fixtures for pm-preamble tests (A9 trim).

import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export function makeTmpRoot(label: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `pm-pre-${label}-`));
}

export function eventsPathFor(root: string): string {
  return path.join(root, ".palantir-mini", "session", "events.jsonl");
}

export function seedEventLine(root: string, line: object): void {
  const dir = path.join(root, ".palantir-mini", "session");
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(path.join(dir, "events.jsonl"), JSON.stringify(line) + "\n", "utf8");
}
