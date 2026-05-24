// palantir-mini v1.3 — MCP tool handler: validate_hook_event_allowlist
// Domain: LEARN (HookEventAllowlist prim-hooks-01)
//
// Validates events referenced in hooks.json against the CC runtime allowlist.
// Authority chain: research/claude-code/hook-events-v2.md → schemas/ontology/primitives/hook-event-allowlist.ts

import * as fs from "fs";
import * as path from "path";
import {
  HOOK_EVENT_ALLOWLIST_REGISTRY,
  KNOWN_INVALID_EVENTS,
  hookEventAllowlistRid,
} from "#schemas/ontology/primitives/hook-event-allowlist";
import type { HookEventAllowlistDeclaration } from "#schemas/ontology/primitives/hook-event-allowlist";
import {
  validateHookPolicyRefsFromHooksJson,
  type HookPolicyReferenceIssue,
} from "../../lib/hooks/policy-registry";

// Register the canonical CC v2.1.114 allowlist
// TaskUpdate removed: not a valid hook event name in CC runtime (tool name only).
// Use PreToolUse + matcher:"TaskUpdate" for tool-scoped gating instead.
const VALID_EVENTS_V2 = new Set([
  "PreToolUse",
  "PostToolUse",
  "UserPromptSubmit",
  "Stop",
  "SubagentStop",
  "SubagentStart",
  "SessionStart",
  "SessionStop",
  "PreCompact",
  "PostCompact",
  "Notification",
  "TaskCompleted",
  "TaskCreated",
  "TeammateIdle",
]);

const CANONICAL_ALLOWLIST: HookEventAllowlistDeclaration = {
  rid: hookEventAllowlistRid("hook-allowlist:cc-2.1.114"),
  forCCVersion: "2.1.114",
  validEvents: VALID_EVENTS_V2,
  deprecatedEvents: [],
};
HOOK_EVENT_ALLOWLIST_REGISTRY.register(CANONICAL_ALLOWLIST);

interface ValidateHookEventAllowlistArgs {
  pluginManifestPath: string;
}

interface InvalidEvent {
  event: string;
  line: number;
}

interface DeprecatedEvent {
  event: string;
  replacement: string;
}

interface ValidateHookEventAllowlistResult {
  invalidEvents: InvalidEvent[];
  deprecatedEvents: DeprecatedEvent[];
  policyRefIssues: HookPolicyReferenceIssue[];
}

function readHooksJson(hooksJsonPath: string): unknown {
  if (!fs.existsSync(hooksJsonPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(hooksJsonPath, "utf8")) as unknown;
  } catch {
    return [];
  }
}

function readEventsFromHooksJson(hooksJsonPath: string): ReadonlyArray<string> {
  const raw = readHooksJson(hooksJsonPath);
  try {
    if (typeof raw !== "object" || raw === null) return [];
    const hooks = (raw as Record<string, unknown>).hooks;
    if (typeof hooks !== "object" || hooks === null) return [];
    return Object.keys(hooks as Record<string, unknown>);
  } catch {
    return [];
  }
}

function getLineNumber(content: string, event: string): number {
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]?.includes(`"${event}"`)) return i + 1;
  }
  return -1;
}

export default async function validateHookEventAllowlist(
  rawArgs: unknown,
): Promise<ValidateHookEventAllowlistResult> {
  const args = (rawArgs ?? {}) as ValidateHookEventAllowlistArgs;
  if (!args.pluginManifestPath || typeof args.pluginManifestPath !== "string") {
    throw new Error("validate_hook_event_allowlist: `pluginManifestPath` is required");
  }

  const manifestDir = path.dirname(args.pluginManifestPath);
  const hooksJsonPath = path.join(manifestDir, "..", "hooks", "hooks.json");
  const resolvedHooksJson = path.resolve(hooksJsonPath);

  const hooksJsonContent = fs.existsSync(resolvedHooksJson)
    ? fs.readFileSync(resolvedHooksJson, "utf8")
    : "{}";

  const result = HOOK_EVENT_ALLOWLIST_REGISTRY.validate(
    [resolvedHooksJson],
    "2.1.114",
    { readEvents: readEventsFromHooksJson },
  );

  const invalidEvents: InvalidEvent[] = result.invalidEvents.map(({ event }) => ({
    event: event ?? "",
    line: getLineNumber(hooksJsonContent, event ?? ""),
  }));

  const deprecatedEvents: DeprecatedEvent[] = result.deprecatedEvents.map(({ event, replacement }) => ({
    event,
    replacement,
  }));

  // Also flag KNOWN_INVALID_EVENTS that appear in the hooks.json
  const events = readEventsFromHooksJson(resolvedHooksJson);
  const knownInvalidSet = new Set(KNOWN_INVALID_EVENTS);
  for (const event of events) {
    if (knownInvalidSet.has(event) && !invalidEvents.some((e) => e.event === event)) {
      invalidEvents.push({ event, line: getLineNumber(hooksJsonContent, event) });
    }
  }

  const policyRefIssues = validateHookPolicyRefsFromHooksJson(
    readHooksJson(resolvedHooksJson),
    hooksJsonContent,
  );

  return { invalidEvents, deprecatedEvents, policyRefIssues: [...policyRefIssues] };
}
