// palantir-mini — tests/integration/fresh-home-resolve-rule-subprocess.ts
//
// Standalone subprocess helper for fresh-home.test.ts.
//
// lib/runtime-overlay/resolve-rule.ts computes its EXTERNAL_RULES_DIR as a
// MODULE-LEVEL constant (`resolveExternalRoots().rulesDir`, evaluated once at
// import time against whatever process.env.HOME is at that moment). An
// in-process `process.env.HOME = tmpDir` override in a test file that has
// already imported resolve-rule.ts has NO effect on that cached value. Running
// this file as a genuinely separate child process (spawned with `HOME` set in
// its `env`) guarantees resolve-rule.ts is imported for the FIRST time in a
// process that already has the fixture HOME, so EXTERNAL_RULES_DIR resolves
// against the fixture instead of the real ~/.claude/rules.
//
// Usage: bun run fresh-home-resolve-rule-subprocess.ts <numericRuleId>
// Prints the ResolveRuleResult as JSON on stdout.

import { resolveRule } from "../../lib/runtime-overlay/resolve-rule";

const idArg = process.argv[2];
const id = Number(idArg);

const result = await resolveRule(id);
process.stdout.write(JSON.stringify(result));
