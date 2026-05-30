// INVOKE_SKILL resolver — Claude-slim.
// Ported from gstack composition.ts. Paths rewritten from gstack
// host-path model to the Claude plugin scope: /palantir-mini:<skill-name>.

import type { TemplateContext } from "./types";

export function generateInvokeSkill(_ctx: TemplateContext, args?: string[]): string {
  const skillName = args?.[0];
  if (!skillName) {
    throw new Error("{{INVOKE_SKILL}} requires a skill name, e.g. {{INVOKE_SKILL:pm-review}}");
  }

  const extraSkips = (args?.slice(1) ?? [])
    .filter((a) => a.startsWith("skip="))
    .flatMap((a) => a.slice(5).split(","))
    .map((s) => s.trim())
    .filter(Boolean);

  const DEFAULT_SKIPS = [
    "Preamble (run first)",
    "Workflow Decision Format",
    "Completeness Principle",
    "Prior Learnings",
    "Capture Learnings",
    "Confidence Calibration",
    "Review Readiness Dashboard",
    "Plan File Review Report",
    "Completion Status Protocol",
  ];

  const allSkips = [...DEFAULT_SKIPS, ...extraSkips];

  return `Invoke the \`/palantir-mini:${skillName}\` skill (read its \`SKILL.md\` via the Read tool at \`\${PALANTIR_MINI_PLUGIN_ROOT}/skills/${skillName}/SKILL.md\`).

**If unreadable:** skip with "Could not load /palantir-mini:${skillName} — skipping." and continue.

Follow the loaded skill's instructions top to bottom, **skipping these sections** (already handled by the parent skill):
${allSkips.map((s) => `- ${s}`).join("\n")}

Execute every other section at full depth. When the invoked skill's instructions complete, continue with the next step below.`;
}
