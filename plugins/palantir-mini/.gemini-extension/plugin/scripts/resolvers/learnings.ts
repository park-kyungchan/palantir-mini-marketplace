// Learnings resolver — MCP-based (palantir-mini v1.4.2 W1a).
// Replaces gstack's ~/.gstack/projects/<slug>/learnings.jsonl file model
// with events.jsonl learning_captured events queryable via pm_learn_query.
// Per rule 10: events.jsonl is the SSoT; no shadow log stores.

import type { TemplateContext } from "./types";

export function generateLearningsSearch(_ctx: TemplateContext): string {
  return `## Prior Learnings

Before proceeding, query past learnings on this project via MCP:

Call \`mcp__palantir-mini__pm_learn_query\` with \`{limit: 10, minConfidence: 6}\` to retrieve confidence-ranked learnings from prior sessions.

If the MCP tool returns an empty list, continue without prior context. If it returns learnings, incorporate them into the current analysis. When a new finding matches a past learning, surface it in the output:

**Prior learning applied: [topic] (confidence N/10, from [date])**

This makes the compounding visible — the user should see the system getting smarter on their codebase over time.`;
}

export function generateLearningsLog(ctx: TemplateContext): string {
  return `## Capture Learnings

If this session produced a non-obvious pattern, pitfall, preference, architectural insight, tool nuance, or operational fact worth preserving, log it as a \`learning_captured\` event via MCP.

Call \`mcp__palantir-mini__emit_event\` with:

\`\`\`json
{
  "type": "learning_captured",
  "eventId": "learn-<short-uuid>",
  "when": "<ISO-timestamp>",
  "atopWhich": "<current-git-sha>",
  "throughWhich": "/palantir-mini:${ctx.skillName}",
  "byWhom": "<agent identity>",
  "payload": {
    "topic": "short-key",
    "content": "one-to-two sentence insight",
    "confidence": 7,
    "source": "observed | user-stated | inferred"
  }
}
\`\`\`

**Confidence scale (1-10):**
- 9-10: verified against specific code or user explicit statement.
- 7-8: strong pattern match, high-likelihood correct.
- 5-6: moderate; could be false positive.
- <5: speculation — do not log.

**Types** (informal topic prefix): \`pattern:\`, \`pitfall:\`, \`preference:\`, \`architecture:\`, \`tool:\`, \`operational:\`.

**Only log genuine discoveries.** A good test: would this insight save time in a future session? If yes, log it. If no, skip.`;
}
