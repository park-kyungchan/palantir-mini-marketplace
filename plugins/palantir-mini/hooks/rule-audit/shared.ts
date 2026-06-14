// palantir-mini v3.7.0 — hooks/rule-audit/shared.ts
// Shared helpers + constants for rule-audit modes.
// Extracted from rule-audit.ts during A.1 decomposition.

import * as path from "path";
import type { AuditResult } from "./types";

/** Invoke pm-rule-audit handler dynamically. Used by bottleneck mode. */
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
