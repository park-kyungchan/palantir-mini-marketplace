// palantir-mini v3.7.0 — hooks/rule-audit/shared.ts
// Shared helpers + constants for rule-audit modes.
// Extracted from rule-audit.ts during A.1 decomposition.

import * as path from "path";
import type { AuditResult, KnownRule } from "./types";

export const CITATION_REGEX = /\brule[ -]?(\d{1,3})\b/gi;

/** Invoke pm-rule-audit handler dynamically. Shared by bottleneck + drift modes. */
export async function runAudit(): Promise<AuditResult | null> {
  const handlerPath = path.resolve(
    import.meta.dirname!,
    "..",
    "..",
    "bridge",
    "handlers",
    "pm-rule-audit",
  );
  try {
    const mod = (await import(handlerPath)) as {
      default?: (args: unknown) => Promise<unknown>;
    };
    if (typeof mod.default !== "function") return null;
    return (await mod.default({})) as AuditResult;
  } catch {
    return null;
  }
}

/** Load the generated rule registry. Used by citation mode. */
export async function loadKnownRules(): Promise<Map<number, KnownRule> | null> {
  const regPath = path.resolve(
    import.meta.dirname!,
    "..",
    "..",
    "..",
    "..",
    "schemas",
    "src",
    "generated",
    "rule-registry",
  );
  try {
    const mod = (await import(regPath)) as {
      RULE_REGISTRY_ENTRIES?: ReadonlyArray<{
        ruleId:       number;
        supersededBy: number | null;
      }>;
    };
    if (!mod.RULE_REGISTRY_ENTRIES) return null;
    const m = new Map<number, KnownRule>();
    for (const r of mod.RULE_REGISTRY_ENTRIES) {
      m.set(r.ruleId, { ruleId: r.ruleId, supersededBy: r.supersededBy });
    }
    return m;
  } catch {
    return null;
  }
}
