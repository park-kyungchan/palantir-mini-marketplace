// palantir-mini v3.3.0 — pm-plugin-self-check schema pin check (B.3)
// Extracted from pm-plugin-self-check.ts.

import {
  resolveInstalledSchemaVersion,
  resolvePluginCompatibleRange,
  semverSatisfies,
} from "../verify-schema-pin";
import type { PmPluginSelfCheckResult } from "./types";

export function checkSchemaPin(): PmPluginSelfCheckResult["schemaPinResult"] {
  try {
    const installedVersion = resolveInstalledSchemaVersion();
    const compatibleRange = resolvePluginCompatibleRange();

    // Verify the installed schema version satisfies the plugin's declared
    // compatibleSchemaVersions range.
    const ok = semverSatisfies(installedVersion, compatibleRange);
    if (ok) {
      return {
        status: "pass",
        details: `installed ${installedVersion} satisfies plugin range "${compatibleRange}"`,
      };
    }
    return {
      status: "fail",
      details: `installed ${installedVersion} does NOT satisfy plugin range "${compatibleRange}" — update schemas or pin range`,
    };
  } catch (err) {
    return {
      status: "fail",
      details: `schema pin check error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
