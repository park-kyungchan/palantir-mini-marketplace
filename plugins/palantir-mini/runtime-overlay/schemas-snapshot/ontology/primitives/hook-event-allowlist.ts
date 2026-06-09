/**
 * palantir-mini — HookEventAllowlist primitive (prim-hooks-01)
 *
 * Types the set of event names plugin `hooks.json` files may reference.
 * Binds an allowlist to a specific ClaudeCodeVersion so drift between the
 * runtime's real hook surface and plugin-declared handlers is caught at
 * verify-time rather than at session boot.
 *
 * Authority chain:
 *   research/claude-code/hook-events-v2.md -> schemas/ontology/primitives/hook-event-allowlist.ts (this file)
 *   -> palantir-mini/mcp handlers: validate_hook_event_allowlist
 *   -> plugin hooks: session-drift-check, events-5d-gate
 *
 * Branded RID pattern (zero runtime cost):
 *   type HookEventAllowlistRid = string & { __brand: "HookEventAllowlistRid" };
 *
 * This file is STABLE CONTRACT. Do not change without a migration plan.
  * @owner palantirkc-ontology
 * @purpose HookEventAllowlist primitive (prim-hooks-01)
 */

export type HookEventAllowlistRid = string & { readonly __brand: "HookEventAllowlistRid" };

export const hookEventAllowlistRid = (s: string): HookEventAllowlistRid =>
  s as HookEventAllowlistRid;

export interface DeprecatedHookEvent {
  readonly name: string;
  readonly replacement: string;
  /** Semver version in which the event was removed */
  readonly removedIn: string;
  readonly reason?: string;
}

export interface HookEventAllowlistDeclaration {
  readonly rid: HookEventAllowlistRid;
  /** Semver of the ClaudeCodeVersion this allowlist belongs to */
  readonly forCCVersion: string;
  readonly validEvents: ReadonlySet<string>;
  readonly deprecatedEvents: ReadonlyArray<DeprecatedHookEvent>;
}

/**
 * 14 confirmed-invalid event names that have appeared in prior plugin
 * hooks.json files but do not exist in the Claude Code runtime. Any
 * reference to one of these names is a hard verify-failure.
 */
export const KNOWN_INVALID_EVENTS: ReadonlyArray<string> = [
  "MemoryWrite",
  "MemoryRead",
  "AgentStart",
  "AgentStop",
  "AgentError",
  "AgentMessage",
  "TeamCreated",
  "TeamDeleted",
  "TeammateJoin",
  "TeammateLeave",
  "TeammateError",
  "ShutdownRequest",
  "ShutdownResponse",
  "PlanApproval",
];

export interface HookEventAllowlistValidationResult {
  readonly invalidEvents: ReadonlyArray<{ readonly file: string; readonly event: string }>;
  readonly deprecatedEvents: ReadonlyArray<{
    readonly file: string;
    readonly event: string;
    readonly replacement: string;
  }>;
}

export interface HookEventAllowlistValidationContext {
  /** Pluggable reader returning the event names referenced by a hooks.json file */
  readonly readEvents: (hookJsonPath: string) => ReadonlyArray<string>;
}

/** Registry helper — v0 minimal registry via plain Map */
export class HookEventAllowlistRegistry {
  private readonly allowlists = new Map<HookEventAllowlistRid, HookEventAllowlistDeclaration>();

  register(decl: HookEventAllowlistDeclaration): void {
    this.allowlists.set(decl.rid, decl);
  }

  get(rid: HookEventAllowlistRid): HookEventAllowlistDeclaration | undefined {
    return this.allowlists.get(rid);
  }

  list(): HookEventAllowlistDeclaration[] {
    return [...this.allowlists.values()];
  }

  /** Looks up the allowlist bound to a given CC version (exact match). */
  getByCCVersion(version: string): HookEventAllowlistDeclaration | undefined {
    for (const decl of this.allowlists.values()) {
      if (decl.forCCVersion === version) return decl;
    }
    return undefined;
  }

  /**
   * Validates a list of plugin hooks.json file paths against the registered
   * allowlists. An event is "invalid" if it is not in `validEvents` for
   * any registered allowlist, or matches KNOWN_INVALID_EVENTS. An event is
   * "deprecated" if it appears in a `deprecatedEvents` entry.
   */
  validate(
    hookJsonPaths: ReadonlyArray<string>,
    ccVersion: string,
    context: HookEventAllowlistValidationContext,
  ): HookEventAllowlistValidationResult {
    const allowlist = this.getByCCVersion(ccVersion);
    const invalidEvents: Array<{ file: string; event: string }> = [];
    const deprecatedEvents: Array<{ file: string; event: string; replacement: string }> = [];

    const valid = allowlist?.validEvents ?? new Set<string>();
    const deprecatedMap = new Map<string, DeprecatedHookEvent>();
    for (const d of allowlist?.deprecatedEvents ?? []) {
      deprecatedMap.set(d.name, d);
    }
    const invalidSet = new Set(KNOWN_INVALID_EVENTS);

    for (const file of hookJsonPaths) {
      const events = context.readEvents(file);
      for (const event of events) {
        const deprecated = deprecatedMap.get(event);
        if (deprecated !== undefined) {
          deprecatedEvents.push({ file, event, replacement: deprecated.replacement });
          continue;
        }
        if (invalidSet.has(event) || !valid.has(event)) {
          invalidEvents.push({ file, event });
        }
      }
    }

    return { invalidEvents, deprecatedEvents };
  }
}

export const HOOK_EVENT_ALLOWLIST_REGISTRY = new HookEventAllowlistRegistry();
