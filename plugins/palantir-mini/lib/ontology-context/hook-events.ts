// Shared hook-event projections for ontology context surfaces.

import * as fs from "node:fs";
import * as path from "node:path";

import { resolvePalantirMiniRoot } from "../config/root";

export interface HookEventsSubField {
  readonly available: boolean;
  readonly eventCount?: number;
  readonly events?: ReadonlyArray<string>;
  readonly source?: string;
  readonly meaning?: string;
  readonly error?: string;
}

export interface HookEventsCompatibilitySubField extends HookEventsSubField {
  readonly compatibilityNote?: string;
}

interface HooksJsonDocument {
  readonly hooks?: Record<string, unknown>;
}

interface CodexRuntimeAdapterContract {
  readonly mountedHookEvents?: ReadonlyArray<unknown>;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

export function composeSharedHookIntentEvents(): HookEventsSubField {
  try {
    const hooksPath = path.join(resolvePalantirMiniRoot(), "hooks", "hooks.json");
    const parsed = readJson<HooksJsonDocument>(hooksPath);
    if (!parsed.hooks || typeof parsed.hooks !== "object") {
      return { available: false, error: "hooks.json missing `hooks` object" };
    }
    const events = Object.keys(parsed.hooks);
    return {
      available: true,
      eventCount: events.length,
      events,
      source: "hooks/hooks.json",
      meaning: "shared hook intent registry events; not proof that a runtime mounts each event",
    };
  } catch (err) {
    return { available: false, error: String(err) };
  }
}

export function composeCodexMountedHookEvents(): HookEventsSubField {
  try {
    const contractPath = path.join(
      resolvePalantirMiniRoot(),
      "runtime-adapters",
      "codex",
      "contract.json",
    );
    const parsed = readJson<CodexRuntimeAdapterContract>(contractPath);
    if (!Array.isArray(parsed.mountedHookEvents)) {
      return {
        available: false,
        error: "codex runtime adapter contract missing `mountedHookEvents` array",
      };
    }
    const events: string[] = [];
    for (const event of parsed.mountedHookEvents) {
      if (typeof event !== "string") {
        return {
          available: false,
          error: "codex runtime adapter contract has non-string mounted hook event",
        };
      }
      events.push(event);
    }
    return {
      available: true,
      eventCount: events.length,
      events,
      source: "runtime-adapters/codex/contract.json",
      meaning: "Codex lifecycle events mounted by the Codex plugin hook registry",
    };
  } catch (err) {
    return { available: false, error: String(err) };
  }
}

export function composeCompatibilityHookEventsAlias(
  sharedHookIntentEvents: HookEventsSubField,
  aliasName: string,
): HookEventsCompatibilitySubField {
  return {
    ...sharedHookIntentEvents,
    compatibilityNote:
      `${aliasName} is a compatibility alias for sharedHookIntentEvents; ` +
      "it is not Codex-mounted hook evidence.",
  };
}
