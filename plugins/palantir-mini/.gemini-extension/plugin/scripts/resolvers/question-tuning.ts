// Question-tuning resolvers — Claude-slim port.
// Preserves gstack's preference/logging pattern; drops
// cross-host variants since we're single-host (Claude).

import type { TemplateContext } from "./types";

export function generateQuestionPreferenceCheck(_ctx: TemplateContext): string {
  return `## format

When surfacing a decision to the user, render a WorkflowContract turn-card decision with:

- **Single question.** One focused choice per call.
- **2-4 mutually exclusive options.** No "Other" — that is provided automatically.
- **Concise labels** (1-5 words) and **descriptions** that include the trade-off.
- **Recommended first.** If you have a recommendation, make it option A and append "(Recommended)" to the label.

Multi-select is only appropriate when the options are not mutually exclusive — use \`multiSelect: true\`.`;
}

export function generateQuestionLog(ctx: TemplateContext): string {
  return `## Question log

When a user decision captured through a WorkflowContract turn-card decision meaningfully shapes the session outcome, log it via:

\`\`\`json
{
  "type": "learning_captured",
  "payload": {
    "topic": "decision: <short-key>",
    "content": "User chose <answer> when asked <question>",
    "confidence": 10,
    "source": "user-stated",
    "skillName": "${ctx.skillName}"
  }
}
\`\`\`

Confidence 10 for user-stated decisions — these are authoritative, not inferences.`;
}

export function generateInlineTuneFeedback(_ctx: TemplateContext): string {
  return `## Inline tune feedback

If the user corrects the output mid-skill ("wrong — try Y instead", "stop doing X"), treat it as a feedback event:

1. Adjust the output immediately on the current turn.
2. Log a \`learning_captured\` event with \`topic: "feedback: <correction>"\` and \`confidence: 10, source: user-stated\`.
3. Do not re-ask on subsequent turns — the correction persists for the rest of the session via events.jsonl.`;
}
