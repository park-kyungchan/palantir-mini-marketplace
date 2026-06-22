// @domain: LEARN
// Tiny CLI wrapper over pending-fold.ts so the second-brain-fold subagent (and any
// deterministic caller) can read/clear the pending bookmark via Bash:
//   bun run lib/second-brain/pending-fold-cli.ts list  <root>            -> JSON array of listPending
//   bun run lib/second-brain/pending-fold-cli.ts clear <root> <session>  -> clearPending
// Best-effort: always exits 0; errors go to stderr.

import { listPending, clearPending } from "./pending-fold";

if (import.meta.main) {
  const [, , cmd, root, sessionId] = process.argv;
  try {
    if (cmd === "list" && root) {
      process.stdout.write(JSON.stringify(listPending(root)) + "\n");
    } else if (cmd === "clear" && root && sessionId) {
      clearPending(root, sessionId);
    } else {
      process.stderr.write("usage: pending-fold-cli.ts list <root> | clear <root> <sessionId>\n");
    }
  } catch (e) {
    process.stderr.write(`pending-fold-cli: ${(e as Error).message}\n`);
  }
  process.exit(0);
}
