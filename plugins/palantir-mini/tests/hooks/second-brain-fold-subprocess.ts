// palantir-mini — tests/hooks/second-brain-fold-subprocess.ts
//
// Standalone subprocess helper for second-brain-fold.test.ts.
//
// secondBrainFold() resolves both isExcludedProjectRoot() (lib/project/find-root.ts)
// and the transcript path under `os.homedir()/.claude/projects/<slug>/` — both
// read os.homedir(), which does NOT reflect an in-process
// `process.env.HOME = ...` reassignment in Bun (see
// ontology-drift-fold-subprocess.ts's header comment for the full rationale).
// Running this file as a genuinely separate child process (spawned with HOME
// already set in its `env`) resolves both correctly against the fixture HOME.
//
// Usage: bun run second-brain-fold-subprocess.ts <payloadJson>
// Prints the HookResult as JSON on stdout.

import secondBrainFold from "../../hooks/second-brain-fold";

const payload = JSON.parse(process.argv[2] ?? "{}");
const result = await secondBrainFold(payload);
process.stdout.write(JSON.stringify(result));
