// Review-army resolver — Claude-slim of gstack review-army.ts (244 LOC).
// Ports the parallel-review dispatch pattern; drops gstack-specific
// hook wiring (our parallel review is governed by rule 06 lazy-spawn).

import type { TemplateContext } from "./types";

export function generateReviewArmy(_ctx: TemplateContext): string {
  return `## Review Army (parallel dispatch)

When coverage benefits from multiple reviewer lenses (CEO, Eng, DX, CSO), dispatch the lens reviews in parallel:

\`\`\`
Agent × 4 (parallel, run_in_background: true):
  - ceo-review    → subagent_type: researcher  (per frontmatter model: opus)
  - eng-review    → subagent_type: implementer (per frontmatter model: sonnet)
  - devex-review  → subagent_type: implementer (sonnet)
  - cso-review    → subagent_type: researcher  (opus)
\`\`\`

Per rule 12 §Model policy: **never pass \`model:\` at spawn** — frontmatter is the single source of truth.

Per rule 06 §Lazy-spawn: all four spawn in a single message, run concurrently on disjoint analysis surfaces (no file ownership conflict because reviews are read-only), shut down individually on TaskCompleted.

After all four complete, run the CROSS_REVIEW_DEDUP step to fold findings into a unified output.`;
}
