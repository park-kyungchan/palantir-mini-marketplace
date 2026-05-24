// palantir-mini v4.13.0 — briefing-template-validate tests
// Sprint-060 W1.2: semantic per-section validators (closes P1.LD3 / D.4).
// Phase A-4: rule 12 v3.3.0 §Briefing template enforcement on SubagentStart.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import briefingTemplateValidate, {
  validateBriefing,
  REQUIRED_SECTIONS,
  BRIEFING_TEMPLATE,
} from "../../hooks/briefing-template-validate";
import {
  validateSpeedTarget,
  validateClaimOrder,
  validateNoIdlePolling,
  validateReplyInText,
  validateMemoryLayers,
  validateBriefingSemantic,
} from "../../lib/briefing-section-validators";

// Full valid briefing that satisfies all 5 sections (v4.1.0+ default).
// 4-section legacy variant kept for advisory + blocking-mode tests.
const VALID_BRIEFING = `
Speed target: 5-10 min per primitive.

Claim order:
  1. T-9 — all 8 hooks

No idle polling: Work continuously until done. Then self-shutdown.

Reply in text: Respond to Lead DMs with plain-text status. Not just idle notifications.

Memory layer declaration: procedural (hook authoring) + semantic (typed primitive cross-refs). This rationale explains why these memory layers are modified.
`.trim();

const VALID_BRIEFING_V1_ONLY = `
Speed target: 5-10 min per primitive.

Claim order:
  1. T-9 — all 8 hooks

No idle polling: Work continuously until done. Then self-shutdown.

Reply in text: Respond to Lead DMs with plain-text status. Not just idle notifications.
`.trim();

describe("REQUIRED_SECTIONS structure", () => {
  test("has 4 required sections", () => {
    expect(REQUIRED_SECTIONS.length).toBe(4);
  });

  test("sections include speed_target, claim_order, no_idle_poll, reply_in_text", () => {
    const keys = REQUIRED_SECTIONS.map((s) => s.key);
    expect(keys).toContain("speed_target");
    expect(keys).toContain("claim_order");
    expect(keys).toContain("no_idle_poll");
    expect(keys).toContain("reply_in_text");
  });
});

describe("validateBriefing helper (legacy regex)", () => {
  test("returns empty array for fully compliant briefing", () => {
    expect(validateBriefing(VALID_BRIEFING)).toEqual([]);
  });

  test("detects missing speed-target (dash variant)", () => {
    const text = VALID_BRIEFING.replace(/speed[\s-]target/i, "");
    const missing = validateBriefing(text);
    expect(missing).toContain("Speed target");
  });

  test("detects missing claim order", () => {
    const text = VALID_BRIEFING.replace(/claim[\s-]order/i, "");
    const missing = validateBriefing(text);
    expect(missing).toContain("Claim order");
  });

  test("detects missing no-idle-poll directive", () => {
    const text = VALID_BRIEFING.replace(/no[\s-]idle[\s-]poll/i, "");
    const missing = validateBriefing(text);
    expect(missing).toContain("No idle polling directive");
  });

  test("detects missing reply-in-text expectation", () => {
    const text = VALID_BRIEFING.replace(/reply[\s-]in[\s-]text/i, "");
    const missing = validateBriefing(text);
    expect(missing).toContain("Reply-in-text expectation");
  });

  test("reports all 4 missing for empty briefing", () => {
    const missing = validateBriefing("");
    expect(missing.length).toBe(4);
  });

  test("case-insensitive matching for SPEED TARGET (uppercase)", () => {
    const text = "SPEED TARGET: 10min\nCLAIM ORDER:\n1. T-1\nNO IDLE POLLING: stop.\nREPLY IN TEXT: yes.";
    expect(validateBriefing(text)).toEqual([]);
  });

  test("accepts 'speed-target' with hyphen", () => {
    const text = VALID_BRIEFING.replace("Speed target:", "Speed-target:");
    expect(validateBriefing(text)).toEqual([]);
  });

  test("accepts 'no-idle-poll' with hyphen", () => {
    const text = VALID_BRIEFING.replace("No idle polling", "No-idle-poll");
    expect(validateBriefing(text)).toEqual([]);
  });

  test("accepts 'reply-in-text' with hyphen", () => {
    const text = VALID_BRIEFING.replace("Reply in text", "Reply-in-text");
    expect(validateBriefing(text)).toEqual([]);
  });
});

describe("BRIEFING_TEMPLATE export", () => {
  test("template contains all 4 required section labels", () => {
    expect(BRIEFING_TEMPLATE).toMatch(/speed[\s-]target/i);
    expect(BRIEFING_TEMPLATE).toMatch(/claim[\s-]order/i);
    expect(BRIEFING_TEMPLATE).toMatch(/no[\s-]idle[\s-]poll/i);
    expect(BRIEFING_TEMPLATE).toMatch(/reply[\s-]in[\s-]text/i);
  });
});

// ─── Sprint-060 W1.2: Semantic per-section validators ───────────────────────

describe("validateSpeedTarget — semantic validator", () => {
  test("passes with concrete digit+min estimate", () => {
    const r = validateSpeedTarget("Speed target: 5-10 min per primitive.");
    expect(r.passed).toBe(true);
  });

  test("passes with hour-based estimate", () => {
    const r = validateSpeedTarget("Speed target: 1 hour total.");
    expect(r.passed).toBe(true);
  });

  test("fails when 'TBD' present", () => {
    const r = validateSpeedTarget("Speed target: TBD.");
    expect(r.passed).toBe(false);
    expect(r.reason).toContain("TBD");
  });

  test("fails when 'as needed' present", () => {
    const r = validateSpeedTarget("Speed target: as needed.");
    expect(r.passed).toBe(false);
    expect(r.reason).toContain("as needed");
  });

  test("fails when no digit+min/hour present", () => {
    const r = validateSpeedTarget("Speed target: quickly.");
    expect(r.passed).toBe(false);
    expect(r.reason).toContain("concrete time estimate");
  });
});

describe("validateClaimOrder — semantic validator", () => {
  test("passes with valid T-<id> reference", () => {
    const r = validateClaimOrder("Claim order:\n  1. T-W1.2 — briefing fix");
    expect(r.passed).toBe(true);
  });

  test("passes with multiple task IDs", () => {
    const r = validateClaimOrder("Claim order:\n  1. T-42\n  2. T-A1.B");
    expect(r.passed).toBe(true);
  });

  test("fails with empty claim list (no T- ref)", () => {
    const r = validateClaimOrder("Claim order:\n  (none yet)");
    expect(r.passed).toBe(false);
    expect(r.reason).toContain("T-<id>");
  });

  test("fails when only plain numbers listed (not T- format)", () => {
    const r = validateClaimOrder("Claim order:\n  1. first task\n  2. second task");
    expect(r.passed).toBe(false);
  });
});

describe("validateNoIdlePolling — semantic validator", () => {
  test("passes with 'continuous' keyword", () => {
    const r = validateNoIdlePolling("No idle polling: Work continuously until done.");
    expect(r.passed).toBe(true);
  });

  test("passes with 'self-shutdown' keyword", () => {
    const r = validateNoIdlePolling("No idle polling: self-shutdown when complete.");
    expect(r.passed).toBe(true);
  });

  test("passes with 'final' keyword", () => {
    const r = validateNoIdlePolling("No idle polling: complete final task then stop.");
    expect(r.passed).toBe(true);
  });

  test("fails with passive/empty restatement", () => {
    const r = validateNoIdlePolling("No idle polling: yes.");
    expect(r.passed).toBe(false);
    expect(r.reason).toContain("continuous");
  });
});

describe("validateReplyInText — semantic validator", () => {
  test("passes with 'status' keyword in value", () => {
    const r = validateReplyInText("Reply in text: Respond with plain-text status.");
    expect(r.passed).toBe(true);
  });

  test("passes with 'markdown' keyword", () => {
    const r = validateReplyInText("Reply in text: Use markdown format.");
    expect(r.passed).toBe(true);
  });

  test("passes with 'status' keyword", () => {
    const r = validateReplyInText("Reply in text: Provide status when asked.");
    expect(r.passed).toBe(true);
  });

  test("fails with empty/stub entry", () => {
    const r = validateReplyInText("Reply in text: yes.");
    expect(r.passed).toBe(false);
    expect(r.reason).toContain("markdown");
  });
});

describe("validateMemoryLayers — semantic validator", () => {
  test("passes with named layer + ≥30-char rationale", () => {
    const r = validateMemoryLayers(
      "Memory layer declaration: procedural (hook authoring) + semantic (typed primitive cross-refs). This rationale explains.",
    );
    expect(r.passed).toBe(true);
  });

  test("passes with single layer and adequate rationale", () => {
    const r = validateMemoryLayers(
      "Memory layer declaration: semantic — validators describe policy intent for future Lead briefings.",
    );
    expect(r.passed).toBe(true);
  });

  test("fails with no recognized layer name", () => {
    const r = validateMemoryLayers("Memory layer declaration: none applicable.");
    expect(r.passed).toBe(false);
    expect(r.reason).toContain("working / episodic / semantic / procedural");
  });

  test("fails with boilerplate (layer named but rationale < 30 chars)", () => {
    const r = validateMemoryLayers("Memory layer declaration: semantic.");
    expect(r.passed).toBe(false);
    expect(r.reason).toContain("rationale");
    expect(r.reason).toContain("30");
  });

  test("fails with missing section header", () => {
    const r = validateMemoryLayers("No memory section here.");
    expect(r.passed).toBe(false);
    expect(r.reason).toContain("section header not found");
  });
});

// ─── Aggregate semantic validator ─────────────────────────────────────────

describe("validateBriefingSemantic — aggregate (5 positive + 5 negative cases)", () => {
  // Positive cases — all 5 sections valid
  test("[P1] fully valid 5-section briefing passes", () => {
    const result = validateBriefingSemantic(VALID_BRIEFING);
    expect(result.passed).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  test("[P2] valid briefing with 'hour' in speed target passes", () => {
    const text = `Speed target: 1 hour.
Claim order:
  1. T-X1 — fix hook
No idle polling: Work continuously until done. Then self-shutdown.
Reply in text: Respond with plain-text status.
Memory layer declaration: procedural — hook encoding becomes enforced behavior in future sprints.`;
    const result = validateBriefingSemantic(text);
    expect(result.passed).toBe(true);
  });

  test("[P3] valid briefing with multiple task IDs passes", () => {
    const text = `Speed target: 5 min per task.
Claim order:
  1. T-A1 — task alpha
  2. T-B2 — task beta
No idle polling: Work continuously until done. Then self-shutdown.
Reply in text: Use markdown format for status.
Memory layer declaration: semantic — validators encode policy intent, episodic — sprint outcome captured.`;
    const result = validateBriefingSemantic(text);
    expect(result.passed).toBe(true);
  });

  test("[P4] valid briefing with advisory-only bypass valid memory layer passes", () => {
    const text = `Speed target: 10-15 min per primitive.
Claim order:
  1. T-W2.1 — schema update
No idle polling: self-shutdown when complete.
Reply in text: Respond with structured status.
Memory layer declaration: working (current sprint context) + episodic (sprint outcome record). Full rationale here explaining the layers.`;
    const result = validateBriefingSemantic(text);
    expect(result.passed).toBe(true);
  });

  test("[P5] valid briefing with 'final' in no-idle-poll passes", () => {
    const text = `Speed target: 20 min.
Claim order:
  1. T-Z99 — final check
No idle polling: complete final task then stop.
Reply in text: Plain text status when asked.
Memory layer declaration: procedural — instructs hook runtime behavior for all future subagent spawns.`;
    const result = validateBriefingSemantic(text);
    expect(result.passed).toBe(true);
  });

  // Negative cases — one per section
  test("[N1] section 1 fail — speed target is TBD", () => {
    const text = VALID_BRIEFING.replace("5-10 min per primitive", "TBD");
    const result = validateBriefingSemantic(text);
    expect(result.passed).toBe(false);
    const fail = result.failures.find((f) => f.sectionKey === "speed_target");
    expect(fail).toBeDefined();
    expect(fail?.reason).toContain("TBD");
  });

  test("[N2] section 2 fail — no T-<id> task reference", () => {
    const text = VALID_BRIEFING.replace("T-9", "").replace("all 8 hooks", "all hooks");
    const result = validateBriefingSemantic(text);
    expect(result.passed).toBe(false);
    const fail = result.failures.find((f) => f.sectionKey === "claim_order");
    expect(fail).toBeDefined();
    expect(fail?.reason).toContain("T-<id>");
  });

  test("[N3] section 3 fail — no continuous/self-shutdown/final keyword", () => {
    const text = `Speed target: 5 min.
Claim order:
  1. T-1 — task
No idle polling: yes.
Reply in text: text status.
Memory layer declaration: procedural — detailed rationale explaining how hooks become encoded policy.`;
    const result = validateBriefingSemantic(text);
    expect(result.passed).toBe(false);
    const fail = result.failures.find((f) => f.sectionKey === "no_idle_poll");
    expect(fail).toBeDefined();
  });

  test("[N4] section 4 fail — no keyword in reply-in-text", () => {
    const text = `Speed target: 5 min.
Claim order:
  1. T-1 — task
No idle polling: Work continuously until done. Then self-shutdown.
Reply in text: yes.
Memory layer declaration: procedural — detailed rationale explaining how hooks become encoded policy.`;
    const result = validateBriefingSemantic(text);
    expect(result.passed).toBe(false);
    const fail = result.failures.find((f) => f.sectionKey === "reply_in_text");
    expect(fail).toBeDefined();
  });

  test("[N5] section 5 fail — boilerplate memory declaration (rationale < 30 chars)", () => {
    const text = `Speed target: 5 min.
Claim order:
  1. T-1 — task
No idle polling: Work continuously until done. Then self-shutdown.
Reply in text: text status.
Memory layer declaration: semantic.`;
    const result = validateBriefingSemantic(text);
    expect(result.passed).toBe(false);
    const fail = result.failures.find((f) => f.sectionKey === "memory_layers");
    expect(fail).toBeDefined();
    expect(fail?.reason).toContain("rationale");
  });
});

// ─── Hook integration tests (existing + extended) ────────────────────────

describe("briefingTemplateValidate hook", () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    savedEnv.PALANTIR_MINI_EVENTS_FILE = process.env.PALANTIR_MINI_EVENTS_FILE;
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-btv-"));
    process.env.PALANTIR_MINI_EVENTS_FILE = path.join(tmpDir, "events.jsonl");
  });

  afterEach(() => {
    for (const k of Object.keys(savedEnv)) {
      const v = savedEnv[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  test("valid briefing via 'briefing' field passes", async () => {
    const res = await briefingTemplateValidate({
      agent_id: "agent-ok",
      briefing: VALID_BRIEFING,
    });
    expect(res.decision).toBe("continue");
    expect(res.message).toContain("OK");
  });

  test("valid briefing via 'prompt' field passes", async () => {
    const res = await briefingTemplateValidate({
      agent_id: "agent-ok2",
      prompt:   VALID_BRIEFING,
    });
    expect(res.decision).toBe("continue");
  });

  test("valid briefing via 'initial_prompt' field passes", async () => {
    const res = await briefingTemplateValidate({
      agent_id:       "agent-ok3",
      initial_prompt: VALID_BRIEFING,
    });
    expect(res.decision).toBe("continue");
  });

  test("empty briefing text blocks", async () => {
    const res = await briefingTemplateValidate({ agent_id: "agent-empty", briefing: "" });
    expect(res.decision).toBe("block");
    expect(res.reason).toContain("no briefing text");
  });

  test("missing sections (sections 3+4 absent) blocks with section names in reason", async () => {
    const partial = "Speed target: 5min\nClaim order:\n1. T-1 — task";
    const res = await briefingTemplateValidate({ agent_id: "agent-partial", briefing: partial });
    expect(res.decision).toBe("block");
    // Should mention at least one missing section
    expect(res.reason).toMatch(/No idle polling|Reply-in-text|Memory layer/);
  });

  test("bypass=v1 skips validation entirely", async () => {
    const res = await briefingTemplateValidate({
      agent_id:                  "agent-bypass",
      briefing_template_bypass:  "v1",
      briefing:                  "", // would normally block
    });
    expect(res.decision).toBe("continue");
    expect(res.message).toContain("bypassed");
  });

  test("no payload blocks on missing briefing text", async () => {
    const res = await briefingTemplateValidate({});
    expect(res.decision).toBe("block");
  });

  test("template included in block reason", async () => {
    const res = await briefingTemplateValidate({ agent_id: "x", briefing: "" });
    expect(res.reason).toContain("REQUIRED BRIEFING TEMPLATE");
  });

  // Semantic failure tests
  test("speed target = 'TBD' blocks with reason citing TBD", async () => {
    const badBriefing = VALID_BRIEFING.replace("5-10 min per primitive", "TBD");
    const res = await briefingTemplateValidate({ agent_id: "agent-tbd", briefing: badBriefing });
    expect(res.decision).toBe("block");
    expect(res.reason).toContain("TBD");
  });

  test("claim order with no T-<id> blocks", async () => {
    const badBriefing = `Speed target: 5 min.
Claim order:
  1. all hooks
No idle polling: Work continuously until done. Then self-shutdown.
Reply in text: text status.
Memory layer declaration: procedural — detailed rationale explaining how hooks become encoded policy.`;
    const res = await briefingTemplateValidate({ agent_id: "agent-no-tid", briefing: badBriefing });
    expect(res.decision).toBe("block");
    expect(res.reason).toContain("T-<id>");
  });
});

// v4.1.0+ — 5th section (Memory layer declaration) tests
// sprint-046 (2026-05-08): blocking is now the DEFAULT. Advisory-only via
// PALANTIR_MINI_BRIEFING_5SEC_ADVISORY_ONLY=1 (emergency bypass; audited).
describe("briefingTemplateValidate v4.1.0 5-section", () => {
  let savedAdvisoryOnly: string | undefined;
  const savedEventsFile: { value?: string } = {};

  beforeEach(() => {
    savedAdvisoryOnly = process.env.PALANTIR_MINI_BRIEFING_5SEC_ADVISORY_ONLY;
    delete process.env.PALANTIR_MINI_BRIEFING_5SEC_ADVISORY_ONLY;
    savedEventsFile.value = process.env.PALANTIR_MINI_EVENTS_FILE;
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-btv5-"));
    process.env.PALANTIR_MINI_EVENTS_FILE = path.join(tmpDir, "events.jsonl");
  });

  afterEach(() => {
    if (savedAdvisoryOnly !== undefined) process.env.PALANTIR_MINI_BRIEFING_5SEC_ADVISORY_ONLY = savedAdvisoryOnly;
    else delete process.env.PALANTIR_MINI_BRIEFING_5SEC_ADVISORY_ONLY;
    if (savedEventsFile.value !== undefined) process.env.PALANTIR_MINI_EVENTS_FILE = savedEventsFile.value;
    else delete process.env.PALANTIR_MINI_EVENTS_FILE;
  });

  test("5-section briefing with rationale → OK (no advisory)", async () => {
    const res = await briefingTemplateValidate({
      agent_id: "agent-v4-ok",
      briefing: VALID_BRIEFING, // includes Memory layer declaration with rationale
    });
    expect(res.decision).toBe("continue");
    expect(res.message).toContain("OK");
    expect(res.message).not.toContain("advisory");
  });

  test("4-section briefing in DEFAULT (blocking) mode → block", async () => {
    const res = await briefingTemplateValidate({
      agent_id: "agent-v4-block",
      briefing: VALID_BRIEFING_V1_ONLY,
    });
    expect(res.decision).toBe("block");
    expect(res.message).toContain("v4 BLOCK");
  });

  test("boilerplate memory declaration in DEFAULT mode → block with rationale mention", async () => {
    const boilerplateBriefing = `${VALID_BRIEFING_V1_ONLY}

Memory layer declaration: semantic.`;
    const res = await briefingTemplateValidate({
      agent_id: "agent-v4-boilerplate",
      briefing: boilerplateBriefing,
    });
    expect(res.decision).toBe("block");
    expect(res.reason).toContain("rationale");
  });

  test("4-section briefing with ADVISORY_ONLY bypass → continue + advisory", async () => {
    process.env.PALANTIR_MINI_BRIEFING_5SEC_ADVISORY_ONLY = "1";
    const res = await briefingTemplateValidate({
      agent_id: "agent-v4-advisory",
      briefing: VALID_BRIEFING_V1_ONLY,
    });
    expect(res.decision).toBe("continue");
    expect(res.message).toContain("advisory");
  });

  test("bypass=v1 still accepts 4-section in blocking mode", async () => {
    const res = await briefingTemplateValidate({
      agent_id: "agent-v4-bypass",
      briefing: VALID_BRIEFING_V1_ONLY,
      briefing_template_bypass: "v1",
    });
    expect(res.decision).toBe("continue");
    expect(res.message).toContain("bypassed");
  });
});
