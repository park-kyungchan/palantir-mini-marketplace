/**
 * Config I/O (atomic read/write/merge for config.json)
 * @owner palantirkc-plugin-config
 * @purpose Config I/O (atomic read/write/merge for config.json)
 */
// palantir-mini v1.5 — Config I/O (atomic read/write/merge for config.json)
// Domain: ACTION (prim-action-03 AtomicCommit) + DATA (prim-data-06 ConfigDocument)
//
// Atomic write: tmp file + rename. Safe under concurrent readers.
// Env override: PALANTIR_MINI_CONFIG_PATH allows test isolation without HOME hacks.
// Plugin root resolution is runtime-independent; see resolvePalantirMiniRoot().

import * as fs   from "fs";
import * as path from "path";
import {
  DEFAULT_CONFIG,
  validateConfig,
  validateField,
  type Config,
  type ValidationResult,
} from "./schema";
import { resolvePalantirMiniRoot } from "./root";

/** Canonical config.json path — env-overridable for tests. */
export function configPath(): string {
  const override = process.env["PALANTIR_MINI_CONFIG_PATH"];
  if (override && path.isAbsolute(override)) return override;

  return path.join(resolvePalantirMiniRoot(), "config.json");
}

/**
 * Read + validate the config. Missing file → DEFAULT_CONFIG (no throw — pm is
 * expected to bootstrap on first invocation). Corrupt file → throws with the
 * validator error so the caller can surface it.
 */
export function getConfig(): Config {
  const p = configPath();
  if (!fs.existsSync(p)) return { ...DEFAULT_CONFIG };

  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    throw new Error(`getConfig: malformed JSON at ${p}: ${(e as Error).message}`);
  }

  const result: ValidationResult = validateConfig(raw);
  if ("error" in result) {
    throw new Error(`getConfig: ${result.error}`);
  }
  return result;
}

/**
 * Atomically set a single config key. Writes via tmp + rename so concurrent
 * readers never see a torn file. Validates the (key, value) pair before write.
 */
export function setConfig<K extends keyof Config>(key: K, value: Config[K]): Config {
  const err = validateField(key as string, value);
  if (err) throw new Error(`setConfig: ${err}`);

  const current = getConfig();
  const next: Config = { ...current, [key]: value };

  writeAtomic(next);
  return next;
}

/**
 * Reset the config file to baseline defaults. Used by fresh-machine bootstrap
 * and tests.
 */
export function resetConfig(): Config {
  writeAtomic(DEFAULT_CONFIG);
  return { ...DEFAULT_CONFIG };
}

/** tmp + rename atomic write. Parent dir auto-created. */
function writeAtomic(cfg: Config): void {
  const p = configPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const tmp = p + `.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, JSON.stringify(cfg, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, p);
}

// Re-exports so handlers import from a single surface.
export { DEFAULT_CONFIG, validateConfig, validateField } from "./schema";
export { resolvePalantirMiniRoot, ROOT_ENV_PRECEDENCE } from "./root";
export type { Config, TelemetryMode, ExplainLevel, RepoMode } from "./schema";
