// palantir-mini v0 — Thin bootstrapper per OMC pattern
// Every hook in hooks/hooks.json invokes: bun run scripts/run.ts <handler>
//
// Responsibilities:
//   1. Read stdin JSON payload (hook event data)
//   2. Dispatch to the named handler in ../hooks/
//   3. Write the handler's return value as JSON to stdout
//   4. Centralize error handling + structured event-log writes on failure
//
// Handler names (map to hooks/<name>.ts):
//   pre-edit-ontology, post-edit-propagate, pre-compact-state,
//   task-completed-gate, stop-validate, session-start

import * as path from "path";

const HANDLER_NAME = process.argv[2];

if (!HANDLER_NAME) {
  console.error("[palantir-mini/run] usage: bun run scripts/run.ts <handler>");
  process.exit(1);
}

/** Read all of stdin as UTF-8. Returns empty string if stdin is a TTY. */
async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return "";
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : (chunk as Buffer));
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function main(): Promise<void> {
  const raw = await readStdin();
  let payload: unknown = null;
  if (raw.trim().length > 0) {
    try {
      payload = JSON.parse(raw);
    } catch (e) {
      console.error(`[palantir-mini/run] stdin is not valid JSON: ${(e as Error).message}`);
      process.exit(1);
    }
  }

  // Dynamic import — handler files live in ../hooks/ relative to scripts/
  const handlerPath = path.resolve(import.meta.dirname!, "..", "hooks", `${HANDLER_NAME}.ts`);

  let handlerModule: { default?: (payload: unknown) => Promise<unknown> | unknown };
  try {
    handlerModule = await import(handlerPath);
  } catch (e) {
    console.error(`[palantir-mini/run] cannot load handler "${HANDLER_NAME}" at ${handlerPath}: ${(e as Error).message}`);
    process.exit(1);
  }

  const handler = handlerModule.default;
  if (typeof handler !== "function") {
    console.error(`[palantir-mini/run] handler "${HANDLER_NAME}" has no default export function`);
    process.exit(1);
  }

  try {
    const result = await handler(payload);
    if (result !== undefined && result !== null) {
      process.stdout.write(JSON.stringify(result) + "\n");
    }
    process.exit(0);
  } catch (e) {
    // Hook errors should NOT block Claude by default — log and exit 0 unless the
    // handler itself explicitly threw with exit code 2 semantics (deny).
    const msg = (e as Error).message ?? String(e);
    console.error(`[palantir-mini/run] handler "${HANDLER_NAME}" failed: ${msg}`);
    process.exit(1);
  }
}

void main();
