// palantir-mini — tests/integration/fresh-home-research-anchor-subprocess.ts
//
// Standalone subprocess helper for fresh-home.test.ts.
//
// lib/runtime-overlay/research-core-select.ts caches its `HOME` value as a
// MODULE-LEVEL constant (`process.env.HOME ?? os.homedir()`, evaluated once
// at import time) — the same "module-level HOME caching" hazard that
// lib/runtime-overlay/resolve-rule.ts has (see
// fresh-home-resolve-rule-subprocess.ts). Additionally, resolveResearchAnchor()
// unconditionally performs read-only fs.existsSync/fs.readFileSync checks
// against `<HOME>/.claude/research/<topic>/` BEFORE its forcePlugin gate is
// evaluated, regardless of the requested authority mode. An in-process
// `process.env.HOME` override in a test file that has already imported
// research-core-select.ts would have NO effect on the cached constant, and
// even a correctly-retargeted HOME must point at an empty fixture directory
// (never the real ~/.claude/research/) so this unconditional check cannot
// read live user content. Running this file as a genuinely separate child
// process (spawned with a fresh, empty fixture HOME already set in its env)
// guarantees both: research-core-select.ts is imported for the first time
// against the fixture, and the unconditional existsSync/readFileSync checks
// land on an empty directory instead of any real research content.
//
// Usage: bun run fresh-home-research-anchor-subprocess.ts <query> <topic>
// Prints the ResearchAnchorResult as JSON on stdout.

import { resolveResearchAnchor } from "../../lib/runtime-overlay/research-core-select";

const query = process.argv[2] ?? "";
const topic = process.argv[3] ?? "";

const result = await resolveResearchAnchor(query, topic);
process.stdout.write(JSON.stringify(result));
