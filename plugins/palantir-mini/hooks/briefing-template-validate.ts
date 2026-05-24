// palantir-mini v4.13.0 — briefing-template-validate hook
// Fires on: SubagentStart (blocking)
//
// Phase A-4: enforces rule 12 §Briefing template.
// Parses the spawned teammate's initial briefing prompt and requires:
//   (a) "Speed target:" line        — /speed[\s-]target/i  + digit+min/hour, no TBD
//   (b) Claim-order list            — /claim[\s-]order/i   + ≥1 T-<id> reference
//   (c) "No idle polling" directive — /no[\s-]idle[\s-]poll/i + "continuous|self-shutdown|final"
//   (d) Reply-in-text expectation   — /reply[\s-]in[\s-]text/i + "markdown|structured|text|status"
//   (e) Memory layer declaration    — ≥1 layer named + rationale ≥30 chars (no boilerplate)
//
// Exit-2 with concrete template in stderr if any section is missing or boilerplate.
// Sprint-060 W1.2: upgraded from regex-only to semantic per-section validators.
// Architecture review §5.D.4 finding: 0 missing_briefing_sections across 2210 events
// indicated pure label regex accepted boilerplate. Semantic validators fix this.
//
// Allow-list bypass: if payload contains {briefing_template_bypass: "v1"},
// the check is skipped (emergency Lead escape-hatch per plan §Risks).
//
// See rule 12 v3.3.0 §Briefing template (5-section).

import { emit } from "../scripts/log";
import {
  validateBriefingSemantic,
  type SectionValidationFailure,
} from "../lib/briefing-section-validators";

interface HookPayload {
  agent_id?:                 string;
  agent_name?:               string;
  briefing?:                 string;
  prompt?:                   string;
  initial_prompt?:           string;
  briefing_template_bypass?: string;
  session_id?:               string;
  cwd?:                      string;
}

export interface SectionCheck {
  key:     string;
  pattern: RegExp;
  label:   string;
}

// v4.1.0 — 5th section (Memory layer declaration) per rule 12 v3.4.1 + rule 26 §Axis E.
// Migration window closed 2026-05-08 (sprint-046 default-flip PR):
//   - Default = BLOCKING. Missing memoryLayers declaration blocks SubagentStart.
//   - PALANTIR_MINI_BRIEFING_5SEC_ADVISORY_ONLY=1 reverts to advisory (emergency bypass; audited).
//   - PALANTIR_MINI_BRIEFING_5SEC_BLOCKING=1 is now a no-op (blocking is already the default).

export const REQUIRED_SECTIONS_V4: SectionCheck[] = [
  { key: "speed_target",     pattern: /speed[\s-]target/i,             label: "Speed target" },
  { key: "claim_order",      pattern: /claim[\s-]order/i,              label: "Claim order" },
  { key: "no_idle_poll",     pattern: /no[\s-]idle[\s-]poll/i,         label: "No idle polling directive" },
  { key: "reply_in_text",    pattern: /reply[\s-]in[\s-]text/i,        label: "Reply-in-text expectation" },
  { key: "memory_layers",    pattern: /memory[\s-]layer[\s-]declaration/i, label: "Memory layer declaration" },
];

/**
 * Pre-v4.1.0 4-section template — kept for reference; live regex check uses
 * REQUIRED_SECTIONS_V4 at runtime per blocking-mode env var.
 */
export const REQUIRED_SECTIONS: SectionCheck[] = REQUIRED_SECTIONS_V4.slice(0, 4);

export const BRIEFING_TEMPLATE = `
=== REQUIRED BRIEFING TEMPLATE (rule 12 v3.3.0 §Briefing template) ===

Speed target: <explicit time-per-task estimate, e.g. "5-10 min per primitive">

Claim order:
  1. T-<id> — <task name>
  2. T-<id> — <task name>
  (numbered list of task IDs to claim in sequence)

No idle polling: Work continuously until all claimed tasks done. Then self-shutdown.
Do NOT send idle notifications between tasks.

Reply in text: Respond to Lead DMs with plain-text status when asked. Not just idle notifications.

Memory layer declaration: Which of 4 agentic memory layers (working / episodic /
semantic / procedural) does this work refine? Cite ≥1 layer with one-line rationale.
(rule 26 v1.0.0 §Axis E + rule 12 v3.3.0 §Briefing template — 5th section)

=============================================
`.trim();

export function validateBriefing(text: string): string[] {
  return REQUIRED_SECTIONS
    .filter((s) => !s.pattern.test(text))
    .map((s) => s.label);
}

/**
 * v4.1.0+ — 5-section validation. Returns missing labels for sections beyond
 * the legacy 4-section set (i.e., `Memory layer declaration`). Used by the
 * advisory-mode path to surface advice without blocking.
 */
export function validateBriefingV4Extras(text: string): string[] {
  const v4Only = REQUIRED_SECTIONS_V4.filter(
    (s) => !REQUIRED_SECTIONS.some((legacy) => legacy.key === s.key),
  );
  return v4Only.filter((s) => !s.pattern.test(text)).map((s) => s.label);
}

/**
 * v4.1.0+ (updated 2026-05-08 sprint-046) — Section 5 is BLOCKING by default
 * as of the migration window expiry. Returns false only when the emergency
 * advisory-only bypass env var is set.
 *
 * PALANTIR_MINI_BRIEFING_5SEC_ADVISORY_ONLY=1 → advisory (audited bypass).
 * PALANTIR_MINI_BRIEFING_5SEC_BLOCKING=1      → no-op; blocking is the default.
 */
export function isV4BlockingMode(): boolean {
  return process.env.PALANTIR_MINI_BRIEFING_5SEC_ADVISORY_ONLY !== "1";
}

export default async function briefingTemplateValidate(payload: unknown): Promise<{
  message:    string;
  decision?:  "block" | "continue";
  reason?:    string;
}> {
  const p         = (payload ?? {}) as HookPayload;
  const cwd       = p.cwd ?? process.cwd();
  const agentId   = p.agent_id ?? p.agent_name ?? "unknown";
  const sessionId = p.session_id;

  // Allow-list bypass (emergency escape-hatch)
  if (p.briefing_template_bypass === "v1") {
    return {
      message:  `palantir-mini: briefing-template-validate bypassed (agent=${agentId}, bypass=v1)`,
      decision: "continue",
    };
  }

  // Resolve briefing text from multiple possible payload fields
  const briefingText = (
    p.briefing ?? p.prompt ?? p.initial_prompt ?? ""
  ).trim();

  if (briefingText.length === 0) {
    const base = `palantir-mini briefing-template-validate: no briefing text found in payload (agent=${agentId}). Provide briefing via 'briefing', 'prompt', or 'initial_prompt' field.\n\n${BRIEFING_TEMPLATE}`;
    const { withRuleExcerpt } = await import("../scripts/rule-excerpt");
    const reason = await withRuleExcerpt(base, 12);
    process.stderr.write(`[palantir-mini/briefing-template-validate] ${reason}\n`);

    try {
      await emit({
        type:      "validation_phase_completed",
        payload:   { phase: "design", passed: false, errorClass: "missing_briefing_text" },
        toolName:  "SubagentStart",
        cwd,
        sessionId,
        identity:  "monitor",
        reasoning: reason,
      });
    } catch {
      // best-effort
    }

    return {
      message:  `palantir-mini: briefing-template-validate BLOCK (agent=${agentId}, no briefing text)`,
      decision: "block",
      reason,
    };
  }

  // ─── Semantic per-section validation (sprint-060 W1.2) ──────────────────
  // Replaces dual regex-only pass (validateBriefing + validateBriefingV4Extras).
  // Architecture review §5.D.4: regex-only check produced 0 failures despite
  // boilerplate briefings passing.  Semantic validators enforce content quality
  // per rule 12 v3.3.0 §Briefing template (5-section).
  const semanticResult = validateBriefingSemantic(briefingText);

  if (!semanticResult.passed) {
    // Separate section-5 failures (memory layer declaration) so the advisory-only
    // bypass env var still covers them independently.
    const nonMemoryFails = semanticResult.failures.filter((f) => f.sectionKey !== "memory_layers");
    const memoryFails    = semanticResult.failures.filter((f) => f.sectionKey === "memory_layers");

    // Sections 1-4 failures are always blocking.
    if (nonMemoryFails.length > 0) {
      const failSummary = nonMemoryFails.map((f) => f.reason).join("\n");
      const base = `palantir-mini briefing-template-validate: semantic validation failed for agent=${agentId}.\n\n${failSummary}\n\nRequired template:\n${BRIEFING_TEMPLATE}`;
      const { withRuleExcerpt } = await import("../scripts/rule-excerpt");
      const reason = await withRuleExcerpt(base, 12);
      process.stderr.write(`[palantir-mini/briefing-template-validate] ${reason}\n`);

      const failLabels = nonMemoryFails.map((f: SectionValidationFailure) => f.label).join(", ");
      try {
        await emit({
          type:      "validation_phase_completed",
          payload:   {
            phase: "design",
            passed: false,
            errorClass: "missing_briefing_sections",
          },
          toolName:  "SubagentStart",
          cwd,
          sessionId,
          identity:  "monitor",
          memoryLayers: ["procedural"],
          refinementTarget: {
            kind:          "rule-conformance-policy",
            filePathOrRid: "rule-12 §Briefing",
            description:   `semantic section failures for agent=${agentId}: ${failLabels}`,
            confidenceLevel: "high",
          },
          reasoning: reason,
        });
      } catch {
        // best-effort
      }

      return {
        message:  `palantir-mini: briefing-template-validate BLOCK (agent=${agentId}, semantic failures: ${failLabels})`,
        decision: "block",
        reason,
      };
    }

    // Section 5 (memory layers) — governed by PALANTIR_MINI_BRIEFING_5SEC_ADVISORY_ONLY bypass.
    if (memoryFails.length > 0) {
      if (isV4BlockingMode()) {
        const failDetails = memoryFails.map((f: SectionValidationFailure) => f.reason).join("\n");
        const reason5 =
          `palantir-mini briefing-template-validate v4 BLOCK: Section 5 (Memory layer declaration) semantic failure for agent=${agentId}.\n\n` +
          `${failDetails}\n\n` +
          `Rule 26 v1.0.0 §Axis E (Memory-mapped) + rule 12 v3.3.0 §Briefing template require declaring agentic memory layers with rationale.\n` +
          `Boilerplate like "Memory: semantic." (no rationale ≥30 chars) is rejected.\n` +
          `Emergency bypass: PALANTIR_MINI_BRIEFING_5SEC_ADVISORY_ONLY=1 (advisory; audited via briefing_advisory_only_invoked) or briefing_template_bypass=v1 (per-call).`;
        process.stderr.write(`[palantir-mini/briefing-template-validate] ${reason5}\n`);
        try {
          await emit({
            type:      "validation_phase_completed",
            payload:   {
              phase: "design",
              passed: false,
              errorClass: "missing_v4_memory_layer_declaration",
            },
            toolName:  "SubagentStart",
            cwd,
            sessionId,
            identity:  "monitor",
            memoryLayers: ["procedural"],
            refinementTarget: {
              kind:          "rule-conformance-policy",
              filePathOrRid: "rule-12 §Briefing",
              description:   `Memory layer declaration boilerplate/missing rationale for agent=${agentId}`,
              confidenceLevel: "high",
            },
            reasoning: reason5,
          });
        } catch { /* best-effort */ }
        return {
          message:  `palantir-mini: briefing-template-validate v4 BLOCK (agent=${agentId}, memory layer semantic failure)`,
          decision: "block",
          reason:   reason5,
        };
      }

      // Advisory mode (emergency bypass: PALANTIR_MINI_BRIEFING_5SEC_ADVISORY_ONLY=1; audited)
      const failDetails = memoryFails.map((f: SectionValidationFailure) => f.reason).join("\n");
      const advisoryReason =
        `[ADVISORY — emergency bypass active] palantir-mini briefing-template-validate v4: ` +
        `Section 5 semantic failure for agent=${agentId}.\n${failDetails}\n` +
        `Rule 26 v1.0.0 §Axis E + rule 12 v3.3.0 §Briefing template — blocking is the default. ` +
        `Remove PALANTIR_MINI_BRIEFING_5SEC_ADVISORY_ONLY=1 when briefing rationale is added.`;
      process.stderr.write(`[palantir-mini/briefing-template-validate] ${advisoryReason}\n`);
      try {
        await emit({
          type:      "validation_phase_completed",
          payload:   {
            phase: "design",
            passed: false,
            errorClass: "briefing_advisory_only_invoked",
            agentName: agentId,
          },
          toolName:  "SubagentStart",
          cwd,
          sessionId,
          identity:  "monitor",
          memoryLayers: ["procedural"],
          reasoning: advisoryReason,
        });
      } catch { /* best-effort */ }
      return {
        message:  `palantir-mini: briefing-template-validate v4 advisory (agent=${agentId}, memory layer semantic failure)`,
        decision: "continue",
        reason:   advisoryReason,
      };
    }
  }

  try {
    await emit({
      type:      "validation_phase_completed",
      payload:   { phase: "design", passed: true },
      toolName:  "SubagentStart",
      cwd,
      sessionId,
      identity:  "monitor",
      reasoning: `briefing-template-validate: all required sections present (agent=${agentId})`,
    });
  } catch {
    // best-effort
  }

  return {
    message:  `palantir-mini: briefing-template-validate OK (agent=${agentId})`,
    decision: "continue",
  };
}
