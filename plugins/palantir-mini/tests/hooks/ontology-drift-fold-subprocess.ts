// palantir-mini — tests/hooks/ontology-drift-fold-subprocess.ts
//
// Standalone subprocess helper for ontology-drift-fold.test.ts's T6 case.
//
// ontologyDriftFold() calls isExcludedProjectRoot() (lib/project/find-root.ts),
// which reads os.homedir() to decide whether `cwd` IS the user's real HOME.
// Bun's os.homedir() does NOT reflect an in-process `process.env.HOME = ...`
// reassignment (confirmed empirically: a live env mutation in the same
// process leaves a later os.homedir() call still returning the ORIGINAL
// value). Running this file as a genuinely separate child process (spawned
// with HOME already set in its `env`) guarantees os.homedir() resolves
// against the fixture HOME from cold start — mirrors the SAME technique
// tests/integration/fresh-home-resolve-rule-subprocess.ts uses for the
// analogous "module-level HOME constant" flavor of this problem.
//
// Usage: bun run ontology-drift-fold-subprocess.ts <payloadJson>
// Prints the HookResult as JSON on stdout.

import ontologyDriftFold from "../../hooks/ontology-drift-fold";

const payload = JSON.parse(process.argv[2] ?? "{}");
const result = await ontologyDriftFold(payload);
process.stdout.write(JSON.stringify(result));
