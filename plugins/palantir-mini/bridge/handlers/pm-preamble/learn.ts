// palantir-mini v3.5.0 — pm-preamble sibling: learning_captured event projection
// Pure helper — reads events.jsonl, filters to learning_captured rows.

import * as fs from "fs";
import type { LearningRef } from "./types";

/**
 * Project `learning_captured` events out of events.jsonl. Because the typed
 * union does not yet include this variant (schemas v1.14.0), we read the raw
 * lines and filter by string. Each event is expected to carry
 *   payload: { topic, content, confidence }
 * — the shape defined in plans/luminous-wondering-kettle.md §Scope.
 */
export function readLearnings(eventsPath: string): LearningRef[] {
  if (!fs.existsSync(eventsPath)) return [];
  try {
    const content = fs.readFileSync(eventsPath, "utf8");
    const out: LearningRef[] = [];
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const ev = JSON.parse(trimmed) as {
          type?: string;
          payload?: Record<string, unknown>;
        };
        if (ev.type !== "learning_captured") continue;
        const p = ev.payload ?? {};
        out.push({
          topic: typeof p["topic"] === "string" ? p["topic"] : "",
          content: typeof p["content"] === "string" ? p["content"] : "",
          confidence:
            typeof p["confidence"] === "number" ? p["confidence"] : 0,
        });
      } catch {
        /* skip malformed */
      }
    }
    return out;
  } catch {
    return [];
  }
}
