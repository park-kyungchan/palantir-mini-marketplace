/**
 * palantir-mini v3.6.0 — complete_playwright_scenario sibling: auto-grade dispatch (A3 split).
 * Sibling of complete-playwright-scenario.test.ts (which retains arg validation + outcome resolution).
 *
 * Covers: auto-grade dispatch with rubricPath, rubric file errors, rule-domain criterion.
 */

import { test, expect, describe, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import completePlaywrightScenario from "../../../bridge/handlers/complete-playwright-scenario";
import { cleanupTmpDirs, makeEvidenceDir } from "./complete-playwright-scenario/fixtures";

afterEach(() => {
  cleanupTmpDirs();
});

// Auto-grade dispatch tests removed in Wave 2G rationalization.
// grade_outcome_with_rubric was cut in Wave 2E; grading.ts is a no-op stub.
// The 3 rubricPath test cases have been removed.
