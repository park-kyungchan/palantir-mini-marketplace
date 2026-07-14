// palantir-mini — tests/hooks/session-start-subprocess.ts
//
// Standalone subprocess helper for session-start.test.ts's second-brain
// fold-trigger cases.
//
// sessionStart() delegates transcript-path resolution to code that reads
// `os.homedir()/.claude/projects/<slug>/`, which does NOT reflect an
// in-process `process.env.HOME = ...` reassignment in Bun (see
// ontology-drift-fold-subprocess.ts's header comment for the full rationale).
// Running this file as a genuinely separate child process (spawned with HOME
// already set in its `env`) resolves it correctly against the fixture HOME.
//
// Usage: bun run session-start-subprocess.ts <payloadJson>
// Prints the HookResult as JSON on stdout.

import sessionStart from "../../hooks/session-start";

const payload = JSON.parse(process.argv[2] ?? "{}");
const result = await sessionStart(payload);
process.stdout.write(JSON.stringify(result));
