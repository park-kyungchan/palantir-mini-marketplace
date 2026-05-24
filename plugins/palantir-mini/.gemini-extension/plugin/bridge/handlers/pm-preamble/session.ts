// palantir-mini v3.5.0 — pm-preamble sibling: session-minutes + concurrent-projects probes
// Pure helpers — fs reads only, no events, no mutations.

import * as fs from "fs";
import * as os from "os";
import * as path from "path";

/** Compute minutes elapsed from first event's `when` timestamp in events.jsonl. */
export function sessionMinutesFor(eventsPath: string): number {
  if (!fs.existsSync(eventsPath)) return 0;
  try {
    // Read first line only — first event's `when` is the anchor
    const buf = Buffer.alloc(4096);
    const fd = fs.openSync(eventsPath, "r");
    const bytesRead = fs.readSync(fd, buf, 0, 4096, 0);
    fs.closeSync(fd);
    const chunk = buf.subarray(0, bytesRead).toString("utf8");
    const firstLine = chunk.split("\n").find((l) => l.trim().length > 0);
    if (!firstLine) return 0;
    const parsed = JSON.parse(firstLine) as { when?: string };
    if (typeof parsed.when !== "string") return 0;
    const ms = new Date(parsed.when).getTime();
    if (isNaN(ms)) return 0;
    return Math.floor((Date.now() - ms) / 60_000);
  } catch {
    return 0;
  }
}

/** Known project roots probed for the concurrent-sessions heuristic. */
export function knownProjectRoots(): string[] {
  const home = os.homedir();
  return [
    home, // ~/.palantir-mini/session/events.jsonl
    path.join(home, "kosmos"),
    path.join(home, "palantir-math"),
    path.join(home, "mathcrew"),
  ];
}

/** Count events.jsonl files across known roots with mtime within 2h. */
export function countConcurrentProjects(): number {
  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
  let count = 0;
  for (const root of knownProjectRoots()) {
    const p = path.join(root, ".palantir-mini", "session", "events.jsonl");
    try {
      const stat = fs.statSync(p);
      if (stat.mtimeMs >= twoHoursAgo) count++;
    } catch {
      // missing file → not counted
    }
  }
  return count;
}
