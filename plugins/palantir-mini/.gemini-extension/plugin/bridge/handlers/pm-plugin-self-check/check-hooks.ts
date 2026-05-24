import * as fs from "fs";
import * as path from "path";
import { classifyHookTimeout } from "../../../lib/hooks/timeout-policy";
import { emit } from "../../../scripts/log";
import { PLUGIN_ROOT } from "./types";
import type { PmPluginSelfCheckResult } from "./types";

const FORBIDDEN_LIFECYCLE_AUDIT_COMMANDS = [
  "pm_plugin_self_check",
  "pm_health_audit",
  "pm_rule_audit --full",
  "pm_substrate_query --full",
] as const;

interface HookCommand {
  readonly command?: unknown;
  readonly timeout?: unknown;
  readonly async?: unknown;
}

interface HookGroup {
  readonly matcher?: unknown;
  readonly hooks?: HookCommand[];
}

interface HookTimeoutPolicyInput {
  readonly hooks?: Record<string, HookGroup[]>;
}

interface CheckHookRegistryOptions {
  readonly agentName?: string;
  readonly project?: string;
}

const HEAVY_AUDIT_GOVERNED_EVENTS = new Set([
  "PreToolUse",
  "PostToolUse",
  "SessionStart",
  "Stop",
  "UserPromptSubmit",
]);

const TRIVIAL_TIMEOUT_OPTIONAL_EVENTS = new Set([
  "SessionStart",
  "SessionStop",
  "Notification",
]);

function timeoutSeconds(hook: HookCommand): number | undefined {
  return typeof hook.timeout === "number" && Number.isFinite(hook.timeout)
    ? hook.timeout
    : undefined;
}

export function evaluateHookTimeoutPolicy(input: HookTimeoutPolicyInput): string[] {
  const violations: string[] = [];
  for (const [event, eventEntries] of Object.entries(input.hooks ?? {})) {
    for (const entry of eventEntries) {
      const matcher = typeof entry.matcher === "string" ? entry.matcher : undefined;
      for (const hook of entry.hooks ?? []) {
        if (typeof hook.command !== "string") continue;
        const timeout = timeoutSeconds(hook);
        const classification = classifyHookTimeout({
          event,
          command: hook.command,
          timeoutSeconds: timeout,
        });
        const location = `${event}${matcher ? `(${matcher})` : ""}`;
        if (classification.policy === "front-door" && (timeout ?? 600) < 20) {
          violations.push(
            `${location}: front-door hook timeout ${timeout ?? "missing"}s < 20s for ${hook.command}`,
          );
        }
        if (
          classification.policy === "governance" &&
          (timeout ?? 600) < 20 &&
          (hook.command.includes("prompt-dtc-enforcement-gate") ||
            hook.command.includes("prompt-front-door"))
        ) {
          violations.push(
            `${location}: governance prompt-DTC hook timeout ${timeout ?? "missing"}s < 20s for ${hook.command}`,
          );
        }
        if (
          classification.policy === "heavy-audit-forbidden" &&
          HEAVY_AUDIT_GOVERNED_EVENTS.has(event)
        ) {
          violations.push(
            `${location}: heavy audit command is forbidden in lifecycle hook ${hook.command}`,
          );
        }
        if (timeout === undefined && !TRIVIAL_TIMEOUT_OPTIONAL_EVENTS.has(event)) {
          violations.push(`${location}: non-trivial hook missing timeout for ${hook.command}`);
        }
      }
    }
  }
  return violations;
}

export function evaluateOntologyEngineeringWorkflowHookPolicy(
  input: HookTimeoutPolicyInput,
): string[] {
  const violations: string[] = [];
  const preToolUseEntries = input.hooks?.PreToolUse ?? [];
  const workflowHooks = preToolUseEntries.flatMap((entry) =>
    (entry.hooks ?? []).map((hook) => ({
      matcher: typeof entry.matcher === "string" ? entry.matcher : "",
      hook,
    })),
  ).filter(({ hook }) =>
    typeof hook.command === "string" &&
    hook.command.includes("ontology-engineering-workflow-enforcement-gate"),
  );

  if (workflowHooks.length === 0) {
    violations.push(
      "PreToolUse must register ontology-engineering-workflow-enforcement-gate.",
    );
    return violations;
  }

  const hasGlobalOrMutationMatcher = workflowHooks.some(({ matcher }) =>
    matcher === "*" ||
    matcher.includes("Edit") ||
    matcher.includes("Write") ||
    matcher.includes("Agent") ||
    matcher.includes("pm_intent_router"),
  );
  if (!hasGlobalOrMutationMatcher) {
    violations.push(
      "ontology-engineering-workflow-enforcement-gate must cover Edit/Write/Agent/router surfaces or global PreToolUse.",
    );
  }

  for (const { hook } of workflowHooks) {
    const timeout = timeoutSeconds(hook);
    if (timeout === undefined || timeout < 5) {
      violations.push(
        `ontology-engineering-workflow-enforcement-gate timeout ${timeout ?? "missing"}s < 5s.`,
      );
    }
    if (hook.async === true) {
      violations.push(
        "ontology-engineering-workflow-enforcement-gate must run synchronously.",
      );
    }
  }

  return violations;
}

export async function checkHookRegistry(
  options: CheckHookRegistryOptions = {},
): Promise<PmPluginSelfCheckResult["hookRegistryResult"]> {
  const hooksJson = path.join(PLUGIN_ROOT, "hooks", "hooks.json");
  if (!fs.existsSync(hooksJson)) {
    return {
      status: "skipped",
      details: `hooks.json not found at ${hooksJson}`,
      hookCommandCount: 0,
      forbiddenLifecycleCommands: [],
      timeoutPolicyViolations: [],
      ontologyEngineeringWorkflowPolicyViolations: [
        "hooks.json not found; ontology-engineering workflow hook policy cannot be verified.",
      ],
      hookTimeoutBypassInvoked: false,
    };
  }

  const parsed = JSON.parse(fs.readFileSync(hooksJson, "utf8")) as {
    hooks?: Record<string, HookGroup[]>;
  };
  const commands: string[] = [];
  for (const eventEntries of Object.values(parsed.hooks ?? {})) {
    for (const entry of eventEntries) {
      for (const hook of entry.hooks ?? []) {
        if (typeof hook.command === "string") commands.push(hook.command);
      }
    }
  }
  const forbiddenLifecycleCommands = commands.filter((command) =>
    FORBIDDEN_LIFECYCLE_AUDIT_COMMANDS.some((forbidden) => command.includes(forbidden)),
  );
  const timeoutPolicyViolations = evaluateHookTimeoutPolicy(parsed);
  const ontologyEngineeringWorkflowPolicyViolations =
    evaluateOntologyEngineeringWorkflowHookPolicy(parsed);
  const hookTimeoutBypassInvoked = process.env.PALANTIR_MINI_HOOK_TIMEOUT_SELFCHECK_BYPASS === "1";
  if (hookTimeoutBypassInvoked) {
    await emit({
      type: "validation_phase_completed",
      payload: {
        phase: "hooks",
        passed: true,
        errorClass: "hook_timeout_selfcheck_bypass_invoked",
        violationCount: timeoutPolicyViolations.length,
        violations: timeoutPolicyViolations,
      } as Record<string, unknown>,
      toolName: "pm_plugin_self_check",
      cwd: options.project ?? PLUGIN_ROOT,
      agentName: options.agentName,
      reasoning: "PALANTIR_MINI_HOOK_TIMEOUT_SELFCHECK_BYPASS=1 bypassed strict hook timeout self-check enforcement.",
      memoryLayers: ["procedural"],
    });
  }
  const effectiveTimeoutPolicyViolations = hookTimeoutBypassInvoked ? [] : timeoutPolicyViolations;
  const allViolations = [
    ...forbiddenLifecycleCommands,
    ...effectiveTimeoutPolicyViolations,
    ...ontologyEngineeringWorkflowPolicyViolations,
  ];
  return {
    status: allViolations.length > 0 ? "fail" : "pass",
    details: allViolations.length > 0
      ? `Lifecycle hook policy violation(s): ${allViolations.join("; ")}`
      : `Lifecycle hook registry contains ${commands.length} command(s); workflow-control-plane enforcement is registered and hook timeout policy passed.`,
    hookCommandCount: commands.length,
    forbiddenLifecycleCommands,
    timeoutPolicyViolations,
    ontologyEngineeringWorkflowPolicyViolations,
    hookTimeoutBypassInvoked,
  };
}
