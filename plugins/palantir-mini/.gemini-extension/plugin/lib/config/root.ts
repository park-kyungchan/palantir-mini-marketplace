import * as fs from "node:fs";
import * as path from "node:path";

const ROOT_ENV_PRECEDENCE = [
  "PALANTIR_MINI_ROOT",
  "PALANTIR_MINI_PLUGIN_ROOT",
  "PLUGIN_ROOT",
  "CLAUDE_PLUGIN_ROOT",
] as const;

const CANONICAL_PALANTIR_MINI_ROOT = "/home/palantirkc/palantir-mini";
const DEV_FALLBACK_ROOT = CANONICAL_PALANTIR_MINI_ROOT;

export type PalantirMiniRootEnv = Partial<
  Record<(typeof ROOT_ENV_PRECEDENCE)[number], string | undefined>
> & Readonly<Record<string, string | undefined>>;

export function resolvePalantirMiniRoot(
  env: PalantirMiniRootEnv = process.env,
): string {
  for (const key of ROOT_ENV_PRECEDENCE) {
    const value = env[key]?.trim();
    if (value) return path.resolve(value);
  }

  const canonicalRoot = path.resolve(CANONICAL_PALANTIR_MINI_ROOT);
  if (isPalantirMiniSourceRoot(canonicalRoot)) {
    return canonicalRoot;
  }

  const packageRelativeRoot = path.resolve(import.meta.dir, "..", "..");
  if (isPalantirMiniSourceRoot(packageRelativeRoot)) {
    return packageRelativeRoot;
  }

  return DEV_FALLBACK_ROOT;
}

function isPalantirMiniSourceRoot(candidate: string): boolean {
  return (
    fs.existsSync(path.join(candidate, "package.json")) &&
    fs.existsSync(path.join(candidate, "bridge", "mcp-server.ts"))
  );
}

export { CANONICAL_PALANTIR_MINI_ROOT, ROOT_ENV_PRECEDENCE };
