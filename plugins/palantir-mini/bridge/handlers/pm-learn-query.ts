// palantir-mini v1.5 — MCP tool handler: pm_learn_query
// Domain: LEARN (prim-learn-01 AppendOnlyEventLog view projection)
//
// Thin wrapper over queryLearnings(). Projects learning_captured events
// from events.jsonl into a flat LearningView[] payload for MCP consumers.
//
// Authority chain: plans/luminous-wondering-kettle.md §Wave 1
//                  rules/10-events-jsonl.md (read-only)

import { queryLearnings } from "../../lib/event-log/learning-view";
import type { LearningView } from "../../lib/event-log/learning-view";

interface PmLearnQueryArgs {
  projectRoot?:   string;
  limit?:         number;
  minConfidence?: number;
  topic?:         string;
}

interface PmLearnQueryResult {
  learnings: LearningView[];
  count:     number;
}

export default async function pmLearnQuery(
  rawArgs: unknown,
): Promise<PmLearnQueryResult> {
  const args = (rawArgs ?? {}) as PmLearnQueryArgs;

  const learnings = queryLearnings({
    projectRoot:   args.projectRoot,
    limit:         args.limit,
    minConfidence: args.minConfidence,
    topic:         args.topic,
  });

  return {
    learnings,
    count: learnings.length,
  };
}
