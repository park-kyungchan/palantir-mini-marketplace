// palantir-mini v3.12.0 — harness-base-mode-advisory hook (auto-bootstrap)
// Fires on: SessionStart (advisory, async)
//
// Per harness-base-mode blueprint §4-P0 step 1 + the former sprint-harness policy v3.4.0 §Default-On Policy:
// detects active project, checks whether `.palantir-mini/harness/` exists and has
// any bound SprintContract.
//
// v3.8.0 (B1 soft default-on): advisory-only — emits `harness_base_mode_pending`
//   when missing.
// v3.12.0 (B2 hard default-on, current): AUTO-BOOTSTRAPS a default Quick Sprint
//   contract when the harness dir is absent OR no bound contract exists.
//   Falls back to advisory-only if bootstrap fails (best-effort) or if env var
//   PALANTIR_MINI_AUTO_SPRINT_DISABLE=1 is set (audited via
//   `harness_self_grading_guard_disabled` event).
//
// Authority: the former sprint-harness policy (3-agent-harness) §Default-On Policy (v3.4.0)
//            the former Lead-Protocol policy (lead-protocol) §Lead-direct harness wrapping (v3.1.0+) —
//            this hook auto-bootstraps the Quick Sprint contract that the
//            Lead-direct wrapper rule depends on.
//            ~/.claude/plans/dynamic-forging-globe.md §1.D (auto-bootstrap)

import * as fs from "fs";
import * as path from "path";
import { emit } from "../scripts/log";
import { deriveProjectSlug, composeSlugContractId } from "../lib/project/slug";
import { emitSkillSuggestion } from "../lib/skill-suggestion-emit";
import { findActiveBoundContractPath } from "../lib/harness/active-contract";

interface HookPayload {
  cwd?:        string;
  session_id?: string;
}

interface HookResult {
  message:           string;
  additionalContext?: string;
}

/**
 * Walk upward from `start` looking for a `.palantir-mini/` directory.
 * Returns the project root containing it, or null if not found.
 */
export function findProjectRoot(start: string): string | null {
  let cur = path.resolve(start);
  const root = path.parse(cur).root;
  while (cur !== root) {
    if (fs.existsSync(path.join(cur, ".palantir-mini"))) {
      return cur;
    }
    cur = path.dirname(cur);
  }
  return null;
}

/**
 * Check whether `<projectRoot>/.palantir-mini/harness/` exists.
 */
export function harnessDirExists(projectRoot: string): boolean {
  return fs.existsSync(path.join(projectRoot, ".palantir-mini", "harness"));
}

/**
 * Find the active SprintContract with status="bound".
 * Returns the selected contract path (relative), or null if none.
 */
export function findBoundContract(projectRoot: string): string | null {
  return findActiveBoundContractPath(projectRoot);
}

/**
 * Compute the next sprint number for auto-bootstrap.
 * Scans sprints/ for `sprint-NNN-*` directories and returns max+1 (1 if none).
 */
function nextSprintNumber(projectRoot: string): number {
  const sprintsDir = path.join(projectRoot, ".palantir-mini", "harness", "sprints");
  if (!fs.existsSync(sprintsDir)) return 1;
  const entries = fs.readdirSync(sprintsDir, { withFileTypes: true });
  let max = 0;
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const m = ent.name.match(/^sprint-(\d+)/);
    if (m && m[1]) {
      const n = parseInt(m[1], 10);
      if (!isNaN(n) && n > max) max = n;
    }
  }
  return max + 1;
}

/**
 * v3.12.0 D-tier auto-bootstrap: create a default Quick Sprint contract for
 * tracked palantir-mini projects without an active sprint. Mode="quick",
 * iterationLimit=1, inline 3-criterion rubric (code/ontology/rule).
 *
 * Race-safe: uses recursive mkdir + `wx` flag on contract.json write.
 * F7 patch: 3-attempt retry loop on EEXIST collision (concurrent SessionStart race).
 * Best-effort: returns null on failure (caller falls back to advisory only).
 */
export function bootstrapDefaultQuickSprint(
  projectRoot: string,
  sessionId: string | undefined,
): string | null {
  // F7: retry up to 3 times on EEXIST race; recompute sprint number each attempt.
  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = bootstrapAttempt(projectRoot, sessionId);
    if (result !== "RETRY_EEXIST") {
      return result;
    }
    // EEXIST race detected — sleep briefly + retry with recomputed sprint number
    // (deterministic, no blocking sleep beyond ~1ms)
  }
  return null;
}

function bootstrapAttempt(
  projectRoot: string,
  sessionId: string | undefined,
): string | "RETRY_EEXIST" | null {
  try {
    const sprintNum = nextSprintNumber(projectRoot);
    // Path-layer dir name stays plain `sprint-NNN-default` (path namespacing
    // already isolates per-project; renaming dir would break ls-based discovery).
    const sprintId = `sprint-${String(sprintNum).padStart(3, "0")}-default`;
    const sprintDir = path.join(projectRoot, ".palantir-mini", "harness", "sprints", sprintId);
    const iterDir = path.join(sprintDir, "iterations", "iteration-001");
    const contractPath = path.join(sprintDir, "contract.json");

    fs.mkdirSync(iterDir, { recursive: true });

    // v3.13.0+ crystalline-resilient-narwhal — derive slug + slug-prefix
    // the LOGICAL contractId (string field on the contract). The DIR name
    // stays unprefixed for backward-compat with discovery scanners.
    const projectSlug = deriveProjectSlug(projectRoot);
    const slugContractId = composeSlugContractId(projectSlug, sprintNum, "default");

    const now = new Date().toISOString();
    const contract = {
      contractId: slugContractId,
      sprintNumber: sprintNum,
      projectSlug,
      status: "bound",
      mode: "quick",
      theme: "auto-bootstrap session container — default Quick Sprint created by harness-base-mode-advisory (plugin v3.12.0+) for B2 hard default-on. Override via /palantir-mini:pm-quick-sprint with a custom brief.",
      iterationLimit: 1,
      timeoutMs: 900000,
      successCriteriaRids: ["crit-quick-code", "crit-quick-ontology", "crit-quick-rule"],
      hardThreshold: {
        perCriterion: {
          "crit-quick-code": 1,
          "crit-quick-ontology": 1,
          "crit-quick-rule": 1,
        },
        overall: 1,
        scale: "pass-fail",
      },
      leadAsEvaluator: false,
      graderDispatchEnabled: true,
      analyzerTriggerEnabled: true,
      disagreementResolution: "grader-dispatch-arbitrated",
      autoBootstrapped: true,
      rubricInline: [
        {
          criterionId: "crit-quick-code",
          title: "Code correctness — TypeScript compile (advisory)",
          rubricDomain: "code",
          weightInRubric: 0.4,
          validationExpression: "true # placeholder — override via /palantir-mini:pm-quick-sprint with project-specific shell",
          passFailLogic: { threshold: 1, scale: "pass-fail" },
          appliesToDomain: "any",
        },
        {
          criterionId: "crit-quick-ontology",
          title: "Ontology no-drift — detect_doc_drift",
          rubricDomain: "rule",
          weightInRubric: 0.3,
          validationExpression: "true # placeholder — override via /palantir-mini:pm-quick-sprint",
          passFailLogic: { threshold: 1, scale: "pass-fail" },
          appliesToDomain: "any",
        },
        {
          criterionId: "crit-quick-rule",
          title: "Rule conformance — pm_rule_audit",
          rubricDomain: "rule",
          weightInRubric: 0.3,
          validationExpression: "true # placeholder — override via /palantir-mini:pm-quick-sprint",
          passFailLogic: { threshold: 1, scale: "pass-fail" },
          appliesToDomain: "any",
        },
      ],
      createdAt: now,
      boundAt: now,
      boundBy: {
        identity: "monitor",
        agentName: "harness-base-mode-advisory",
        session: sessionId ?? "session-start",
      },
    };

    try {
      fs.writeFileSync(contractPath, JSON.stringify(contract, null, 2), { flag: "wx" });
    } catch (writeErr) {
      // F7 patch: detect EEXIST race specifically; signal retry to outer loop.
      if ((writeErr as NodeJS.ErrnoException).code === "EEXIST") {
        return "RETRY_EEXIST";
      }
      throw writeErr; // other errors → caught by outer try
    }

    // Emit via validation_phase_completed envelope (the former sprint-harness policy v3.4.0 §Loop Audit envelopes pattern;
    // same as harness_gate_passed / harness_bypass_invoked / dry_run_computed). The proper
    // sprint_contract_bound event is normally emitted by negotiate_sprint_contract MCP handler;
    // here we use the validation envelope with errorClass="auto_bootstrap_completed" to keep
    // the emit signature within the typed union.
    void emit({
      type: "validation_phase_completed",
      payload: {
        phase: "design",
        passed: true,
        errorClass: "auto_bootstrap_completed",
      },
      toolName: "SessionStart",
      cwd: projectRoot,
      sessionId,
      identity: "monitor",
      reasoning: `harness-base-mode-advisory auto-bootstrapped default Quick Sprint contractId=${slugContractId} (dir=${sprintId}, projectSlug=${projectSlug}) in ${projectRoot} (mode=quick, iterationLimit=1, contractPath=${contractPath}). the former sprint-harness policy v3.4.0 §Default-On Policy B2 + crystalline-resilient-narwhal slug-prefixing.`,
    }).catch(() => { /* best-effort */ });

    return path.relative(projectRoot, contractPath);
  } catch (err) {
    // Best-effort: any failure (disk full / permission / non-race) → return null,
    // caller falls back to advisory-only path.
    return null;
  }
}

/**
 * Detect whether the current session is running on claude-opus-4-7 model.
 * Check CLAUDE_MODEL env var first; session metadata can be passed via payload
 * (uses existing HookPayload cwd/session_id fields — no new payload fields needed).
 * Returns the detected model string, or null if not determinable.
 */
export function detectLeadModel(): string | null {
  const envModel = process.env.CLAUDE_MODEL;
  if (envModel && envModel.length > 0) return envModel;
  return null;
}

/**
 * Check whether detected model is claude-opus-4-7.
 */
export function isOpus47(model: string | null): boolean {
  return model !== null && model.includes("claude-opus-4-7");
}

/**
 * Given a SprintContract JSON object, return the taskFitness.species string
 * if present and non-default (not "claude-code-cli"), else null.
 */
export function getNonDefaultSpecies(contract: unknown): string | null {
  if (typeof contract !== "object" || contract === null) return null;
  const obj = contract as Record<string, unknown>;
  if (typeof obj.taskFitness !== "object" || obj.taskFitness === null) return null;
  const tf = obj.taskFitness as Record<string, unknown>;
  if (typeof tf.species !== "string" || tf.species.length === 0) return null;
  if (tf.species === "claude-code-cli") return null;
  return tf.species;
}

/**
 * Read and parse a SprintContract file at `contractPath`. Returns parsed JSON
 * on success, null on any error.
 */
function readContractJson(contractPath: string): unknown | null {
  try {
    const raw = fs.readFileSync(contractPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default async function harnessBaseModeAdvisory(payload: unknown): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();

  const projectRoot = findProjectRoot(cwd);
  if (!projectRoot) {
    return { message: "palantir-mini: harness-base-mode-advisory skipped (no .palantir-mini/ found upward)" };
  }

  // v3.12.0: detect bootstrap-disable env var (audited)
  // F5 patch: errorClass="auto_sprint_disabled" (was mislabeled as harness_self_grading_guard_disabled).
  const autoBootstrapDisabled = process.env.PALANTIR_MINI_AUTO_SPRINT_DISABLE === "1";
  if (autoBootstrapDisabled) {
    try {
      await emit({
        type: "validation_phase_completed",
        payload: {
          phase: "design",
          passed: true,
          errorClass: "auto_sprint_disabled",
        },
        toolName: "SessionStart",
        cwd: projectRoot,
        sessionId: p.session_id,
        identity: "monitor",
        reasoning: `harness-base-mode-advisory: auto-bootstrap disabled via PALANTIR_MINI_AUTO_SPRINT_DISABLE=1 in ${projectRoot}; advisory-only mode`,
      });
    } catch { /* best-effort */ }
  }

  // ─── Branch 1: harness dir absent ───
  if (!harnessDirExists(projectRoot)) {
    if (!autoBootstrapDisabled) {
      // Try auto-bootstrap (creates harness dir + sprint + contract atomically)
      const bootstrappedRel = bootstrapDefaultQuickSprint(projectRoot, p.session_id);
      if (bootstrappedRel) {
        return {
          message: `palantir-mini: harness-base-mode-advisory AUTO-BOOTSTRAPPED (${bootstrappedRel})`,
          additionalContext: [
            "=== HARNESS AUTO-BOOTSTRAP (B2 default-on, plugin v3.12.0+) ===",
            `Project ${projectRoot} had no .palantir-mini/harness/ — created default Quick Sprint:`,
            `  ${bootstrappedRel}`,
            "Override with custom brief via /palantir-mini:pm-quick-sprint \"<brief>\" <scope>.",
            "Disable auto-bootstrap via PALANTIR_MINI_AUTO_SPRINT_DISABLE=1 (audited).",
            "the former sprint-harness policy v3.4.0 §Default-On Policy.",
          ].join("\n"),
        };
      }
    }
    // Bootstrap disabled OR failed → advisory-only fallback
    try {
      await emit({
        type: "validation_phase_completed",
        payload: {
          phase: "design",
          passed: false,
          errorClass: "harness_base_mode_pending",
        },
        toolName: "SessionStart",
        cwd: projectRoot,
        sessionId: p.session_id,
        identity: "monitor",
        reasoning: `harness-base-mode-advisory: no .palantir-mini/harness/ in ${projectRoot}; auto-bootstrap ${autoBootstrapDisabled ? "disabled" : "failed"}; advisory only`,
      });
    } catch { /* best-effort */ }
    // W1.8 — persist suggestion as 5-dim event (rule 26 §Definition closure; Agent #3 audit gap)
    await emitSkillSuggestion({
      suggestedSkillSlug: "pm-quick-sprint",
      suggestedByHook:    "harness-base-mode-advisory",
      triggerCondition:   `no .palantir-mini/harness/ dir AND auto-bootstrap ${autoBootstrapDisabled ? "disabled" : "failed"}`,
      suggestionContext:  projectRoot,
      memoryLayers:       ["procedural", "semantic"],
    });
    return {
      message: "palantir-mini: harness-base-mode-advisory — no harness dir (advisory)",
      additionalContext: [
        "=== HARNESS BASE-MODE ADVISORY ===",
        `Project ${projectRoot} has no .palantir-mini/harness/ directory.`,
        autoBootstrapDisabled
          ? "Auto-bootstrap disabled via PALANTIR_MINI_AUTO_SPRINT_DISABLE=1."
          : "Auto-bootstrap FAILED (check write permission / disk space).",
        "Manually bootstrap with /palantir-mini:pm-harness-init then /palantir-mini:pm-quick-sprint, OR /palantir-mini:pm-harness-plan for full pipeline.",
        "the former sprint-harness policy v3.4.0 §Default-On Policy (B2).",
      ].join("\n"),
    };
  }

  // ─── Branch 2: harness dir exists, no bound contract ───
  const boundContractRel = findBoundContract(projectRoot);
  if (!boundContractRel) {
    if (!autoBootstrapDisabled) {
      const bootstrappedRel = bootstrapDefaultQuickSprint(projectRoot, p.session_id);
      if (bootstrappedRel) {
        return {
          message: `palantir-mini: harness-base-mode-advisory AUTO-BOOTSTRAPPED (${bootstrappedRel})`,
          additionalContext: [
            "=== HARNESS AUTO-BOOTSTRAP (B2 default-on, plugin v3.12.0+) ===",
            `Project ${projectRoot} had no bound SprintContract — created default Quick Sprint:`,
            `  ${bootstrappedRel}`,
            "Override with custom brief via /palantir-mini:pm-quick-sprint \"<brief>\" <scope>.",
            "the former sprint-harness policy v3.4.0 §Default-On Policy.",
          ].join("\n"),
        };
      }
    }
    // Bootstrap disabled OR failed
    try {
      await emit({
        type: "validation_phase_completed",
        payload: {
          phase: "design",
          passed: false,
          errorClass: "harness_base_mode_pending",
        },
        toolName: "SessionStart",
        cwd: projectRoot,
        sessionId: p.session_id,
        identity: "monitor",
        reasoning: `harness-base-mode-advisory: ${projectRoot}/.palantir-mini/harness/ exists but no SprintContract status=bound; auto-bootstrap ${autoBootstrapDisabled ? "disabled" : "failed"}; advisory only`,
      });
    } catch { /* best-effort */ }
    return {
      message: "palantir-mini: harness-base-mode-advisory — no bound contract (advisory)",
      additionalContext: [
        "=== HARNESS BASE-MODE ADVISORY ===",
        `Project ${projectRoot} has .palantir-mini/harness/ but no active SprintContract (status=bound).`,
        autoBootstrapDisabled
          ? "Auto-bootstrap disabled via PALANTIR_MINI_AUTO_SPRINT_DISABLE=1."
          : "Auto-bootstrap FAILED — check write permission / disk space.",
        "Manually run /palantir-mini:pm-quick-sprint \"<brief>\" <scope>  or /palantir-mini:pm-harness-plan.",
        "the former sprint-harness policy v3.4.0 §Default-On Policy (B2 hard default-on).",
      ].join("\n"),
    };
  }

  // ─── Branch 3: bound contract found — green path ───

  // ─── Advisory A: Opus 4.7 token inflation warning ───
  // Detects claude-opus-4-7 via CLAUDE_MODEL env var and surfaces an advisory
  // about input token inflation (1.0–1.35×) due to thinking tokenizer changes.
  // Non-blocking; output to stderr. Never blocks session startup.
  // Authority: ~/.claude/research/anthropic/opus-4-7-introducing-2026-04-16.md
  const detectedModel = detectLeadModel();
  if (isOpus47(detectedModel)) {
    process.stderr.write(
      [
        "[harness-base-mode-advisory] Opus 4.7 detected — input token usage 1.0–1.35× higher vs Opus 4.6 due to thinking tokenizer changes (Anthropic explicit recommendation). Consider:",
        "- Reviewing max_tokens budgets in long-context grader dispatch",
        "- Adjusting taskBudgetTokens (SprintContractDeclaration v1.44.0+) accordingly",
        "- Note: budget_tokens parameter NOT supported on Opus 4.7 (returns 400 error)",
        "",
      ].join("\n"),
    );
  }

  // ─── Advisory B: Non-default harness species warning ───
  // Detects a non-default species in the active SprintContract's taskFitness
  // and surfaces a rationale advisory (the former sprint-harness policy v4.1.0 §0; 7-species enum).
  // Non-blocking; emits species_rationale_advisory_surfaced event for audit.
  if (boundContractRel) {
    const contractAbsPath = path.join(projectRoot, boundContractRel);
    const contractJson = readContractJson(contractAbsPath);
    const nonDefaultSpecies = getNonDefaultSpecies(contractJson);
    if (nonDefaultSpecies) {
      process.stderr.write(
        [
          `[harness-base-mode-advisory] Non-default harness species detected: ${nonDefaultSpecies}. Lead is responsible for documenting rationale in <sprint>/iterations/iteration-NNN/lead-guidance.md per the former sprint-harness policy v4.1.0 §0. Cross-ref:`,
          "- 7 species: claude-code-cli (default) / claude-agent-sdk / task-specific / anthropic-managed-agents / palantir-mini-sprint-harness / gemini-enterprise-agent-platform / microsoft-foundry-agent-service",
          "- pm_dispatch_cost_estimate (W3.F sprint-049) for per-vendor arbitrage signal",
          "- ~/.claude/plans/2026-05-09-palantir-mini-economic-positioning.md §3 (Mode 1/2/3 pricing)",
          "",
        ].join("\n"),
      );
      // Emit audit event (rule 10 5-dim; best-effort)
      void emit({
        type: "validation_phase_completed",
        payload: {
          phase: "design",
          passed: true,
          errorClass: "species_rationale_advisory_surfaced",
        },
        toolName: "SessionStart",
        cwd: projectRoot,
        sessionId: p.session_id,
        identity: "monitor",
        reasoning: `harness-base-mode-advisory: non-default species "${nonDefaultSpecies}" detected in ${boundContractRel}; advisory surfaced per the former sprint-harness policy v4.1.0 §0. Lead must document rationale in lead-guidance.md.`,
      }).catch(() => { /* best-effort */ });
    }
  }

  return {
    message: `palantir-mini: harness-base-mode-advisory OK (bound: ${boundContractRel})`,
  };
}
