/**
 * Learning view (Phase A-5 Wave 1a)
 * @owner palantirkc-plugin-learn
 * @purpose Learning view (Phase A-5 Wave 1a)
 */
// palantir-mini v1.5 — Learning view (Phase A-5 Wave 1a)
// Domain: LEARN (prim-learn-01 AppendOnlyEventLog view projection)
//
// Projects `learning_captured` events from events.jsonl into a flat
// LearningView[] suitable for UI/query consumption. Filters by topic
// substring + minConfidence, ranks by confidence desc then recency desc,
// applies a limit (default 10).
//
// Authority chain: rules/10-events-jsonl.md (read-only; never mutate log)
//                  plans/luminous-wondering-kettle.md §Wave 1

import { readEvents } from "../event-log/read";
import type {
  EventEnvelope,
  LearningCapturedEnvelope,
} from "../event-log/types";
import { eventsPathFor } from "../../scripts/log";

export interface LearningView {
  topic:      string;
  content:    string;
  confidence: number;
  source?:    string;
  when:       string;
  byWhom:     string;
}

export interface QueryLearningsOptions {
  /** Absolute project root. Defaults to PALANTIR_MINI_PROJECT env or CWD. */
  projectRoot?:   string;
  /** Max rows to return. Default 10. */
  limit?:         number;
  /** Minimum confidence threshold. Default 0. */
  minConfidence?: number;
  /** Substring match on payload.topic (case-insensitive). */
  topic?:         string;
}

function isLearningCaptured(ev: EventEnvelope): ev is LearningCapturedEnvelope {
  return ev.type === "learning_captured";
}

function formatByWhom(ev: EventEnvelope): string {
  const ident = ev.byWhom.identity;
  const name  = ev.byWhom.agentName;
  return name ? `${ident}:${name}` : ident;
}

/**
 * Query `learning_captured` events and project into LearningView[].
 * Ranks by confidence desc, then recency desc (newer first).
 */
export function queryLearnings(options: QueryLearningsOptions = {}): LearningView[] {
  const projectRoot   = options.projectRoot ?? process.env.PALANTIR_MINI_PROJECT ?? process.cwd();
  const limit         = typeof options.limit === "number" && options.limit > 0 ? options.limit : 10;
  const minConfidence = typeof options.minConfidence === "number" ? options.minConfidence : 0;
  const topicFilter   = typeof options.topic === "string" && options.topic.length > 0
    ? options.topic.toLowerCase()
    : null;

  const eventsPath = eventsPathFor(projectRoot);
  const events     = readEvents(eventsPath);

  const views: LearningView[] = [];
  for (const ev of events) {
    if (!isLearningCaptured(ev)) continue;
    const p = ev.payload;
    if (typeof p.confidence !== "number") continue;
    if (p.confidence < minConfidence) continue;
    if (topicFilter && !p.topic.toLowerCase().includes(topicFilter)) continue;

    views.push({
      topic:      p.topic,
      content:    p.content,
      confidence: p.confidence,
      source:     p.source,
      when:       ev.when,
      byWhom:     formatByWhom(ev),
    });
  }

  // Sort: confidence desc, then recency desc (lexicographic ISO8601 descending)
  views.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    if (a.when !== b.when) return b.when.localeCompare(a.when);
    return 0;
  });

  return views.slice(0, limit);
}
