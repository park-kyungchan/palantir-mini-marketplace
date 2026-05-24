// palantir-mini v3.7.0 — lib/semantic-graph/producer-verification/constants.ts
// Plugin root constant.
// Extracted from producer-verification.ts during A.2 decomposition.
// @sprint-063 C18: MON_SCOPE_CAP + MONITOR_SCAN_ROOTS removed (monitors sunset).

import * as path from "path";
import { resolvePalantirMiniRoot } from "../../config/root";

export const PLUGIN_ROOT = resolvePalantirMiniRoot();
