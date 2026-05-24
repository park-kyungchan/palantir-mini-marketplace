// palantir-mini v1.3 — task-created-granularity-gate tests
// A9.2 coverage: 4-section validation, file path requirement, VERIFY command check, 3-path warning.

import { test, expect, describe } from "bun:test";
import { checkGranularity } from "../../hooks/task-created-granularity-gate";

const GOOD_DESC = `
DELETE /home/palantirkc/.claude/plugins/palantir-mini/hooks/old-hook.ts
ADD /home/palantirkc/.claude/plugins/palantir-mini/hooks/new-hook.ts
KEEP hooks/hooks.json untouched
VERIFY cd /home/palantirkc/.claude/plugins/palantir-mini && bunx tsc --noEmit
`;

describe("checkGranularity — happy paths", () => {
  test("valid description passes with no violations", () => {
    const { violations, warnings } = checkGranularity(GOOD_DESC);
    expect(violations).toHaveLength(0);
  });

  test("ADD/MODIFY variant accepted for ADD section", () => {
    const desc = GOOD_DESC.replace("ADD ", "ADD/MODIFY ");
    const { violations } = checkGranularity(desc);
    expect(violations.some((v) => v.includes("ADD"))).toBe(false);
  });

  test("single file path emits no warning", () => {
    const { warnings } = checkGranularity(GOOD_DESC);
    expect(warnings).toHaveLength(0);
  });
});

describe("checkGranularity — reject cases", () => {
  test("missing DELETE section produces violation", () => {
    const desc = GOOD_DESC.replace("DELETE", "REMOVE");
    const { violations } = checkGranularity(desc);
    expect(violations.some((v) => v.includes("DELETE"))).toBe(true);
  });

  test("missing VERIFY section produces violation", () => {
    const desc = GOOD_DESC.replace("VERIFY", "CHECK");
    const { violations } = checkGranularity(desc);
    expect(violations.some((v) => v.includes("VERIFY"))).toBe(true);
  });

  test("no absolute file path produces violation", () => {
    const desc = `
DELETE old stuff
ADD new stuff
KEEP something
VERIFY bunx tsc --noEmit
`;
    const { violations } = checkGranularity(desc);
    expect(violations.some((v) => v.includes("absolute file path"))).toBe(true);
  });

  test("VERIFY with no runnable command produces violation", () => {
    const desc = GOOD_DESC.replace("bunx tsc --noEmit", "manually check the output");
    const { violations } = checkGranularity(desc);
    expect(violations.some((v) => v.includes("runnable command"))).toBe(true);
  });

  test("3 distinct paths triggers warning", () => {
    const desc = `
DELETE /home/palantirkc/a.ts
ADD /home/palantirkc/b.ts
KEEP /home/palantirkc/c.ts
VERIFY bunx tsc --noEmit and check /home/palantirkc/d.ts
`;
    const { warnings } = checkGranularity(desc);
    expect(warnings.some((w) => w.includes("distinct file paths"))).toBe(true);
  });
});
