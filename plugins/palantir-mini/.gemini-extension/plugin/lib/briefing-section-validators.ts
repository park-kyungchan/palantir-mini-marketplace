/**
 * palantir-mini v4.13.0 — per-section semantic validators for briefing-template-validate hook
 * Sprint-060 W1.2 — closes P1.LD3 / architecture review §5.D.4 (M12)
 *
 * Architecture review finding: regex-only section presence checks produce
 * suspiciously perfect 0 `missing_briefing_sections` counts.  Pure label
 * matching accepts boilerplate like "Memory layers: semantic." with no
 * rationale, or "Speed target: TBD".  These validators enforce semantic
 * content requirements per rule 12 v3.3.0 §Briefing template.
 *
 * Each validator receives the full briefing text and returns:
 *   { passed: boolean; reason?: string }
 *
 * Authority: ~/.claude/rules/12-lead-protocol-v2.md §Briefing template (5-section)
 *            ~/.claude/rules/26-valuable-data-standard.md §Axis E (Memory-mapped)
 */

export interface SectionValidationResult {
  passed:   boolean;
  reason?:  string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Extract text from a labeled section until the next blank line or next numbered section. */
function extractSectionBody(text: string, headerPattern: RegExp): string {
  const lines = text.split("\n");
  let inSection = false;
  const body: string[] = [];

  for (const line of lines) {
    if (!inSection && headerPattern.test(line)) {
      inSection = true;
      // Include the header line itself for self-contained single-line sections
      body.push(line);
      continue;
    }
    if (inSection) {
      // Stop at next numbered top-level section header (e.g. "1. Speed" / "2. Claim")
      if (/^\d+\.\s+\S/.test(line) && body.length > 1) {
        break;
      }
      body.push(line);
    }
  }

  return body.join("\n");
}

// ─── Per-section validators ──────────────────────────────────────────────────

/**
 * Section 1 — Speed target
 * Must include a digit followed by "min" or "hour".
 * Rejects: "TBD", "as needed", "N/A", placeholder text.
 */
export function validateSpeedTarget(text: string): SectionValidationResult {
  const body = extractSectionBody(text, /speed[\s-]target/i);

  if (!body) {
    return { passed: false, reason: "Section 1 (Speed target): section header not found." };
  }

  // Reject explicit deferrals
  if (/\b(tbd|as[\s-]needed|n\/a|placeholder)\b/i.test(body)) {
    return {
      passed: false,
      reason: "Section 1 (Speed target): must include a concrete time estimate (digit + min/hour). " +
              "\"TBD\" and \"as needed\" are not accepted.",
    };
  }

  // Require: a digit immediately adjacent to "min" or "hour" (e.g. "5min", "5-10 min", "1 hour")
  if (!/\d+\s*[-–]?\s*\d*\s*(min|hour)/i.test(body)) {
    return {
      passed: false,
      reason: "Section 1 (Speed target): must include a concrete time estimate, " +
              "e.g. \"5-10 min per task\" or \"1 hour\". Got: " + body.slice(0, 120),
    };
  }

  return { passed: true };
}

/**
 * Section 2 — Claim order
 * Must reference at least one task ID matching T-[A-Z0-9.-]+.
 * Rejects empty lists, placeholder "T-?" etc.
 */
export function validateClaimOrder(text: string): SectionValidationResult {
  const body = extractSectionBody(text, /claim[\s-]order/i);

  if (!body) {
    return { passed: false, reason: "Section 2 (Claim order): section header not found." };
  }

  // Require at least one concrete task reference
  const taskRefs = body.match(/T-[A-Z0-9][A-Z0-9.\-]*/g) ?? [];
  if (taskRefs.length === 0) {
    return {
      passed: false,
      reason: "Section 2 (Claim order): must reference at least one task ID in the form " +
              "\"T-<id>\" (e.g. T-W1.1, T-42). Got: " + body.slice(0, 120),
    };
  }

  return { passed: true };
}

/**
 * Section 3 — No idle polling directive
 * Must contain at least one of: "continuous", "self-shutdown", "final".
 * Rejects passive/empty restatements of the label.
 */
export function validateNoIdlePolling(text: string): SectionValidationResult {
  const body = extractSectionBody(text, /no[\s-]idle[\s-]poll/i);

  if (!body) {
    return { passed: false, reason: "Section 3 (No idle polling): section header not found." };
  }

  // The body must contain at least one strong directive keyword
  if (!/continuous|self[-\s]?shutdown|final/i.test(body)) {
    return {
      passed: false,
      reason: "Section 3 (No idle polling): must contain \"continuous\", \"self-shutdown\", " +
              "or \"final\" — empty or passive restatement is not accepted. Got: " + body.slice(0, 120),
    };
  }

  return { passed: true };
}

/**
 * Section 4 — Reply-in-text expectation
 * Must contain at least one of: "markdown", "structured", "status", "plain".
 * Note: "text" is excluded from keyword matching — the section header itself
 * contains "in text", which would always match.  Instead we require a more
 * specific signal word that indicates a real reply format was specified.
 * Rejects entries where the value after the colon is a stub like "yes." or
 * contains no qualifying keyword.
 */
export function validateReplyInText(text: string): SectionValidationResult {
  // Extract the VALUE portion — everything after the colon on the header line
  // plus any continuation lines.
  const headerMatch = text.match(/reply[\s-]in[\s-]text\s*:([^\n]*)/i);

  if (!headerMatch) {
    return { passed: false, reason: "Section 4 (Reply-in-text): section header not found." };
  }

  // Value = content after the colon on the header line
  const valueAfterColon = headerMatch[1] ?? "";

  // Collect continuation lines that follow the header (until blank or next numbered section)
  const lines = text.split("\n");
  const headerIdx = lines.findIndex((l) => /reply[\s-]in[\s-]text/i.test(l));
  const continuationLines: string[] = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const l = lines[i]!;
    if (/^\d+\.\s+\S/.test(l) || l.trim() === "") break;
    continuationLines.push(l);
  }

  const fullValue = (valueAfterColon + " " + continuationLines.join(" ")).trim();

  if (!/\b(markdown|structured|status|plain)\b/i.test(fullValue)) {
    return {
      passed: false,
      reason: "Section 4 (Reply-in-text): value after header must contain " +
              "\"markdown\", \"structured\", \"status\", or \"plain\". " +
              "Got: \"" + fullValue.slice(0, 100) + "\"",
    };
  }

  return { passed: true };
}

/**
 * Section 5 — Memory layer declaration
 * Must list ≥1 of [working, episodic, semantic, procedural].
 * Must include a rationale of ≥30 chars AFTER the layer list (not just a label).
 * Rejects: bare "Memory: semantic." with no explanation.
 */
export function validateMemoryLayers(text: string): SectionValidationResult {
  const body = extractSectionBody(text, /memory[\s-]layer/i);

  if (!body) {
    return { passed: false, reason: "Section 5 (Memory layers): section header not found." };
  }

  const LAYER_NAMES = ["working", "episodic", "semantic", "procedural"] as const;
  const mentionedLayers = LAYER_NAMES.filter((l) => new RegExp(l, "i").test(body));

  if (mentionedLayers.length === 0) {
    return {
      passed: false,
      reason: "Section 5 (Memory layers): must name ≥1 layer: working / episodic / semantic / procedural. " +
              "Got: " + body.slice(0, 120),
    };
  }

  // Check for rationale: at least 30 non-whitespace characters that follow the
  // last layer name mention (the text after the layer list).
  const lastLayerMatch = body.search(
    new RegExp(mentionedLayers[mentionedLayers.length - 1]!, "i"),
  );
  const afterLastLayer = body.slice(lastLayerMatch + mentionedLayers[mentionedLayers.length - 1]!.length);
  const rationaleText  = afterLastLayer.replace(/\s+/g, " ").trim();

  if (rationaleText.length < 30) {
    return {
      passed: false,
      reason: "Section 5 (Memory layers): rationale after layer list is too short " +
              `(${rationaleText.length} chars; need ≥30). ` +
              "Boilerplate like \"Memory: semantic.\" is not accepted. " +
              "Add a one-line rationale explaining WHY this work refines that layer. " +
              "Got: " + body.slice(0, 200),
    };
  }

  return { passed: true };
}

// ─── Aggregate validator ─────────────────────────────────────────────────────

export interface SectionValidationFailure {
  sectionKey: string;
  label:      string;
  reason:     string;
}

export interface BriefingSemanticValidationResult {
  passed:   boolean;
  failures: SectionValidationFailure[];
}

/**
 * Run all 5 per-section semantic validators and return an aggregate result.
 * Each validator runs independently — all failures are collected, not short-circuited.
 */
export function validateBriefingSemantic(text: string): BriefingSemanticValidationResult {
  const checks: Array<{ key: string; label: string; fn: (t: string) => SectionValidationResult }> = [
    { key: "speed_target",  label: "Speed target",             fn: validateSpeedTarget  },
    { key: "claim_order",   label: "Claim order",              fn: validateClaimOrder   },
    { key: "no_idle_poll",  label: "No idle polling",          fn: validateNoIdlePolling },
    { key: "reply_in_text", label: "Reply-in-text expectation", fn: validateReplyInText  },
    { key: "memory_layers", label: "Memory layer declaration",  fn: validateMemoryLayers },
  ];

  const failures: SectionValidationFailure[] = [];

  for (const { key, label, fn } of checks) {
    const result = fn(text);
    if (!result.passed) {
      failures.push({ sectionKey: key, label, reason: result.reason ?? `${label} validation failed.` });
    }
  }

  return { passed: failures.length === 0, failures };
}
