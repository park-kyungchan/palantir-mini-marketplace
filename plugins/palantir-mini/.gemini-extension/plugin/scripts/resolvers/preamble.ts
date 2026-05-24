// PREAMBLE resolver — Claude-slim.
// Replaces gstack's 856-LOC bash preamble chain with a single-line
// MCP invocation of mcp__palantir-mini__pm_preamble via preamble-invoke.ts.
// Per A-5 W1a, pm_preamble returns the session context (sessionMinutes,
// concurrentProjects, explainLevel, proactive, learningsCount,
// recentLearnings, branch, repoMode) in 5-10ms (vs bash 300-500ms).

import type { TemplateContext } from "./types";
import { PLUGIN_ROOT_VAR } from "./constants";

export function generatePreamble(ctx: TemplateContext): string {
  return `## Preamble (run first)

\`\`\`bash
bun run "${PLUGIN_ROOT_VAR}/scripts/preamble-invoke.ts" ${ctx.skillName}
\`\`\`

Reads session context and emits a \`skill_started\` event with 5-dim Decision Lineage to \`events.jsonl\`. Output includes: sessionMinutes, concurrentProjects, explainLevel, proactive, learningsCount, recentLearnings, branch, repoMode.

If the command fails (palantir-mini not installed or project not registered): skip with a one-line note and continue.`;
}

export function generateTestFailureTriage(_ctx: TemplateContext): string {
  return `## Test Failure Triage

When a test fails during any skill execution:

1. **Read the failure output carefully.** Do not retry blindly.
2. **Identify root cause:** expected-vs-actual mismatch? timing? environment? flaky?
3. **Fix at the right layer.** If the test is wrong, fix the test. If the code is wrong, fix the code. If the environment is wrong, fix the environment.
4. **Never silence via retry-until-pass.** A test that passes on retry is still broken.
5. **Log a learning** if the failure pattern is non-obvious and likely to recur.`;
}
