// palantir-mini — pm-plugin-self-check consumer peerDep alignment check
// Axis: consumerPeerDepResult (I.7 architecture review P1.M2)
//
// Verifies that all consumer project package.json files declare the same
// @palantirKC/claude-schemas peerDependency range. Misalignment causes silent
// breakage on schema bumps (e.g. one project pins >=1.45.0 while another
// pins >=1.47.0, leading to divergent runtime behaviour).
//
// Authority:
//   - rules/08-schema-versioning.md (schema semver as tracked interface)
//   - ~/.claude/plans/2026-05-07-palantir-mini-architecture-review.md §5.I.7

import {
  scanConsumerPeerDeps,
  SCHEMA_PACKAGE_NAME,
} from "../../../lib/consumer-peerdep-scanner";
import type { PmPluginSelfCheckResult } from "./types";

export function checkConsumerPeerDeps(): PmPluginSelfCheckResult["consumerPeerDepResult"] {
  try {
    const { entries, distinctRanges } = scanConsumerPeerDeps();

    if (distinctRanges.length === 0) {
      return {
        status: "skipped",
        details: `no consumers found declaring ${SCHEMA_PACKAGE_NAME} peerDependency`,
      };
    }

    if (distinctRanges.length === 1) {
      const range = distinctRanges[0]!;
      return {
        status: "pass",
        details: `all consumers aligned on peerDep range "${range}" for ${SCHEMA_PACKAGE_NAME}`,
      };
    }

    // Divergent: ≥2 distinct ranges.
    const divergentEntries = entries
      .filter(
        (e): e is { projectPath: string; peerDepRange: string } =>
          e.peerDepRange !== null && !e.peerDepRange.startsWith("workspace:"),
      )
      .map((e) => ({ projectPath: e.projectPath, peerDepRange: e.peerDepRange }));

    const rangeList = distinctRanges.map((r) => `"${r}"`).join(", ");
    return {
      status: "fail",
      details: `${distinctRanges.length} distinct peerDep ranges found for ${SCHEMA_PACKAGE_NAME}: ${rangeList} — align all consumers to the same range`,
      divergentEntries,
    };
  } catch (err) {
    return {
      status: "fail",
      details: `consumer peerDep check error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
