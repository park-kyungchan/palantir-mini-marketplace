// palantir-mini — tests/hooks/ontology-import-guard-subprocess.ts
//
// Standalone subprocess helper for ontology-import-guard.test.ts's FIX-2 case.
//
// isTargetedFile() calls isExcludedProjectRoot() (lib/project/find-root.ts),
// which reads os.homedir() — see ontology-drift-fold-subprocess.ts's header
// comment for why an in-process HOME reassignment cannot redirect it in Bun,
// and why a genuinely separate child process is required instead.
//
// Usage: bun run ontology-import-guard-subprocess.ts <filePath>
// Prints "true" or "false" (JSON boolean) on stdout.

import { isTargetedFile } from "../../hooks/ontology-import-guard";

const filePath = process.argv[2] ?? "";
process.stdout.write(JSON.stringify(isTargetedFile(filePath)));
