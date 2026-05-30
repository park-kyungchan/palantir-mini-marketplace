import * as fs from "node:fs";
import * as path from "node:path";

const ROOT_ENV_PRECEDENCE = [
  "PALANTIR_MINI_ROOT",
  "PALANTIR_MINI_PLUGIN_ROOT",
  "PLUGIN_ROOT",
] as const;

const PACKAGE_RELATIVE_ROOT = path.resolve(import.meta.dir, "..", "..");
const CANONICAL_PALANTIR_MINI_ROOT = PACKAGE_RELATIVE_ROOT;
const DEV_FALLBACK_ROOT = PACKAGE_RELATIVE_ROOT;

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

  const packageRelativeRoot = path.resolve(PACKAGE_RELATIVE_ROOT);
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

export { CANONICAL_PALANTIR_MINI_ROOT, PACKAGE_RELATIVE_ROOT, ROOT_ENV_PRECEDENCE };
