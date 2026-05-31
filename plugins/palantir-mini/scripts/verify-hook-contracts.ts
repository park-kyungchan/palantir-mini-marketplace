import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const PLUGIN_ROOT = join(import.meta.dir, "..");
const HOOKS_JSON = join(PLUGIN_ROOT, "hooks", "hooks.json");
const REQUIRED_INPUT_SCHEMA = "schemas/hooks/pretooluse.input.schema.json";
const REQUIRED_OUTPUT_SCHEMA = "schemas/hooks/governance-hook.output.schema.json";

interface HookConfig {
  readonly type?: string;
  readonly command?: string;
  readonly failureMode?: string;
  readonly permissionDecision?: string;
  readonly inputSchemaRef?: string;
  readonly outputSchemaRef?: string;
}

interface HookGroup {
  readonly policyRef?: string;
  readonly hooks?: readonly HookConfig[];
}

interface HooksDocument {
  readonly hooks?: Record<string, readonly HookGroup[]>;
}

function loadHooks(): HooksDocument {
  return JSON.parse(readFileSync(HOOKS_JSON, "utf8")) as HooksDocument;
}

function isMutationRequiredHook(eventName: string, hook: HookConfig): boolean {
  return (
    eventName === "PreToolUse" &&
    hook.type === "command" &&
    hook.failureMode === "fail-closed" &&
    hook.permissionDecision === "defer"
  );
}

function main(): void {
  const errors: string[] = [];
  const hooks = loadHooks();

  for (const schemaRef of [REQUIRED_INPUT_SCHEMA, REQUIRED_OUTPUT_SCHEMA]) {
    if (!existsSync(join(PLUGIN_ROOT, schemaRef))) {
      errors.push(`missing schema ${schemaRef}`);
    }
  }

  for (const [eventName, groups] of Object.entries(hooks.hooks ?? {})) {
    for (const group of groups) {
      for (const hook of group.hooks ?? []) {
        if (!isMutationRequiredHook(eventName, hook)) continue;
        const label = `${eventName}/${group.policyRef ?? "unknown-policy"}/${hook.command ?? "unknown-command"}`;
        if (hook.inputSchemaRef !== REQUIRED_INPUT_SCHEMA) {
          errors.push(`${label}: mutation-required hook must declare ${REQUIRED_INPUT_SCHEMA}`);
        }
        if (hook.outputSchemaRef !== REQUIRED_OUTPUT_SCHEMA) {
          errors.push(`${label}: mutation-required hook must declare ${REQUIRED_OUTPUT_SCHEMA}`);
        }
      }
    }
  }

  if (errors.length > 0) {
    for (const error of errors) console.error(`[hook-contracts] ${error}`);
    process.exit(1);
  }
  console.log("[hook-contracts] OK: mutation-required hooks are schema-backed");
}

main();
