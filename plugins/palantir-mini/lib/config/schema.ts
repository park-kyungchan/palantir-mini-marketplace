/**
 * Config schema (unified config.json, replaces ~/.gstack/* state files)
 * @owner palantirkc-plugin-config
 * @purpose Config schema (unified config.json, replaces ~/.gstack/* state files)
 */
// palantir-mini v1.5 — Config schema (unified config.json, replaces ~/.gstack/* state files)
// Domain: DATA (prim-data-06 ConfigDocument) + LEARN (session preferences substrate)
//
// Collapses 11 gstack state-presence files into a single schema-validated JSON
// document under the resolved palantir-mini source root. Read/written via
// pm-config-get / pm-config-set MCP tools.
//
// Authority: plans/luminous-wondering-kettle.md §Architecture decision 4.
// All fields are REQUIRED — DEFAULT_CONFIG provides the baseline; validateConfig
// enforces structural integrity on every read/write.

export type TelemetryMode = "off" | "anonymous" | "full";
export type ExplainLevel  = "default" | "terse";
export type RepoMode      = "local" | "team" | "ci";

export interface Config {
  proactive:           boolean;
  skillPrefix:         boolean;
  telemetry:           TelemetryMode;
  explainLevel:        ExplainLevel;
  questionTuning:      boolean;
  repoMode:            RepoMode;
  routingDeclined:     boolean;
  writingStylePending: boolean;
}

export const DEFAULT_CONFIG: Config = {
  proactive:           true,
  skillPrefix:         false,
  telemetry:           "off",
  explainLevel:        "default",
  questionTuning:      false,
  repoMode:            "local",
  routingDeclined:     false,
  writingStylePending: false,
};

export const CONFIG_KEYS: ReadonlyArray<keyof Config> = [
  "proactive",
  "skillPrefix",
  "telemetry",
  "explainLevel",
  "questionTuning",
  "repoMode",
  "routingDeclined",
  "writingStylePending",
];

const TELEMETRY_VALUES: ReadonlyArray<TelemetryMode> = ["off", "anonymous", "full"];
const EXPLAIN_VALUES:   ReadonlyArray<ExplainLevel>  = ["default", "terse"];
const REPO_MODE_VALUES: ReadonlyArray<RepoMode>      = ["local", "team", "ci"];

export type ValidationResult = Config | { error: string };

/**
 * Structural validator — returns the typed Config on success, or { error } on
 * failure. Called by every pm-config-* handler and on every read.
 * Missing keys fall back to DEFAULT_CONFIG (forward-compat for schema growth).
 */
export function validateConfig(raw: unknown): ValidationResult {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { error: "config must be a JSON object" };
  }

  const obj = raw as Record<string, unknown>;
  const out: Config = { ...DEFAULT_CONFIG };

  for (const key of CONFIG_KEYS) {
    if (!(key in obj)) continue; // forward-compat: absent keys → default
    const val = obj[key];
    const err = validateField(key, val);
    if (err) return { error: err };
    // Validated — safe to assign via any narrowed path
    (out as unknown as Record<string, unknown>)[key] = val;
  }

  return out;
}

/**
 * Validate a single field by key. Returns null on success, string error on
 * failure. Exposed for pm-config-set — caller passes {key, value} pairs and
 * the handler validates the pair before writing.
 */
export function validateField(key: string, value: unknown): string | null {
  if (!CONFIG_KEYS.includes(key as keyof Config)) {
    return `unknown config key: ${key}`;
  }

  switch (key as keyof Config) {
    case "proactive":
    case "skillPrefix":
    case "questionTuning":
    case "routingDeclined":
    case "writingStylePending":
      if (typeof value !== "boolean") return `${key} must be boolean`;
      return null;
    case "telemetry":
      if (typeof value !== "string" || !TELEMETRY_VALUES.includes(value as TelemetryMode)) {
        return `telemetry must be one of ${TELEMETRY_VALUES.join("|")}`;
      }
      return null;
    case "explainLevel":
      if (typeof value !== "string" || !EXPLAIN_VALUES.includes(value as ExplainLevel)) {
        return `explainLevel must be one of ${EXPLAIN_VALUES.join("|")}`;
      }
      return null;
    case "repoMode":
      if (typeof value !== "string" || !REPO_MODE_VALUES.includes(value as RepoMode)) {
        return `repoMode must be one of ${REPO_MODE_VALUES.join("|")}`;
      }
      return null;
    default: {
      const _exhaustive: never = key as never;
      void _exhaustive;
      return `unhandled key: ${key}`;
    }
  }
}
