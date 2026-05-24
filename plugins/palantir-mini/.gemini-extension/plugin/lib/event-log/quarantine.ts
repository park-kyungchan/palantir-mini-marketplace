/**
 * palantir-mini v6.44.0 — Malformed-row quarantine
 * @owner palantirkc-plugin-events
 * @purpose Redirect malformed event-log rows to a quarantine file + manifest
 *          instead of silently discarding them.
 *
 * HARD INVARIANT (canonical §10): NEVER blind-delete events.
 * Malformed rows go to <sessionDir>/quarantine/malformed-rows.jsonl
 * + <sessionDir>/quarantine/manifest.json and are excluded from the
 * default read result.  They are accessible via readEvents({includeQuarantine: true}).
 */
// Domain: LEARN (prim-learn-01 AppendOnlyEventLog) + DATA (prim-data-01 EventEnvelope)

import * as fs from "fs";
import * as path from "path";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface QuarantineRecord {
  /** The verbatim original line that failed parsing / validation. */
  originalLine:  string;
  /** 1-based line number within the source file. */
  lineNumber:    number;
  /** Absolute path to the source file that contained the malformed row. */
  sourceFile:    string;
  /** ISO8601 timestamp of when the quarantine decision was made. */
  detectedAt:    string;
  /**
   * Machine-readable error class.
   *   "json_parse_error"        — JSON.parse threw.
   *   "missing_required_field"  — 5-dim envelope field absent.
   *   "validation_error"        — other schema validation failure.
   */
  errorClass:    "json_parse_error" | "missing_required_field" | "validation_error";
  /** Human-readable description of the error. */
  errorMessage:  string;
}

export interface QuarantineManifest {
  /** ISO8601 of the first entry ever written to this manifest. */
  createdAt:    string;
  /** ISO8601 of the most recent write. */
  updatedAt:    string;
  /** Total number of quarantined rows (length of malformed-rows.jsonl). */
  totalCount:   number;
  /** Running tally per errorClass for fast forensic triage. */
  byClass: {
    json_parse_error:       number;
    missing_required_field: number;
    validation_error:       number;
  };
  /** Source files that contributed quarantined rows (de-duplicated). */
  sourceFiles:  string[];
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function quarantineDir(sessionDir: string): string {
  return path.join(sessionDir, "quarantine");
}

function malformedRowsPath(sessionDir: string): string {
  return path.join(quarantineDir(sessionDir), "malformed-rows.jsonl");
}

function manifestPath(sessionDir: string): string {
  return path.join(quarantineDir(sessionDir), "manifest.json");
}

function loadManifest(sessionDir: string): QuarantineManifest {
  const mp = manifestPath(sessionDir);
  if (fs.existsSync(mp)) {
    try {
      return JSON.parse(fs.readFileSync(mp, "utf8")) as QuarantineManifest;
    } catch {
      // Manifest itself corrupted — start fresh (will be overwritten atomically below).
    }
  }
  const now = new Date().toISOString();
  return {
    createdAt:  now,
    updatedAt:  now,
    totalCount: 0,
    byClass: { json_parse_error: 0, missing_required_field: 0, validation_error: 0 },
    sourceFiles: [],
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Quarantine a single malformed event-log row.
 *
 * Steps:
 *   1. Ensure <sessionDir>/quarantine/ exists.
 *   2. Atomically append the QuarantineRecord to malformed-rows.jsonl.
 *   3. Load the current manifest, update counters, write it back atomically.
 *
 * Returns the QuarantineRecord that was written.
 * Throws on I/O error (callers should handle + emit advisory).
 */
export function quarantineMalformedRow(opts: {
  sessionDir:   string;
  originalLine: string;
  lineNumber:   number;
  sourceFile:   string;
  errorClass:   "json_parse_error" | "missing_required_field" | "validation_error";
  errorMessage: string;
}): QuarantineRecord {
  const { sessionDir, originalLine, lineNumber, sourceFile, errorClass, errorMessage } = opts;

  // 1. Ensure directory exists
  const qDir = quarantineDir(sessionDir);
  fs.mkdirSync(qDir, { recursive: true });

  const record: QuarantineRecord = {
    originalLine,
    lineNumber,
    sourceFile,
    detectedAt:  new Date().toISOString(),
    errorClass,
    errorMessage,
  };

  // 2. Append record to malformed-rows.jsonl (atomic via write + rename)
  const rowsPath = malformedRowsPath(sessionDir);
  const newLine  = JSON.stringify(record) + "\n";

  // Use append-safe write: read existing content if present, append, write-rename.
  let existing = "";
  if (fs.existsSync(rowsPath)) {
    try { existing = fs.readFileSync(rowsPath, "utf8"); } catch { /* best-effort */ }
  }
  const tmpRows = rowsPath + ".tmp." + process.pid;
  fs.writeFileSync(tmpRows, existing + newLine, "utf8");
  fs.renameSync(tmpRows, rowsPath);

  // 3. Update manifest atomically
  const manifest = loadManifest(sessionDir);
  manifest.updatedAt = new Date().toISOString();
  manifest.totalCount += 1;
  manifest.byClass[errorClass] = (manifest.byClass[errorClass] ?? 0) + 1;
  if (!manifest.sourceFiles.includes(sourceFile)) {
    manifest.sourceFiles.push(sourceFile);
  }

  const tmpManifest = manifestPath(sessionDir) + ".tmp." + process.pid;
  fs.writeFileSync(tmpManifest, JSON.stringify(manifest, null, 2), "utf8");
  fs.renameSync(tmpManifest, manifestPath(sessionDir));

  return record;
}

/**
 * Read all quarantined records from <sessionDir>/quarantine/malformed-rows.jsonl.
 *
 * Returns an empty array when the quarantine directory does not exist or is empty.
 * Best-effort: unparseable lines within the quarantine file itself are skipped
 * (they would otherwise create an infinite regress — we cannot quarantine
 * quarantine-file corruption).
 */
export function readQuarantine(sessionDir: string): QuarantineRecord[] {
  const rowsPath = malformedRowsPath(sessionDir);
  if (!fs.existsSync(rowsPath)) return [];
  const content = fs.readFileSync(rowsPath, "utf8");
  const records: QuarantineRecord[] = [];
  for (const line of content.split("\n")) {
    if (line.trim().length === 0) continue;
    try {
      records.push(JSON.parse(line) as QuarantineRecord);
    } catch {
      // Skip corrupt quarantine lines — cannot recurse.
    }
  }
  return records;
}

/**
 * Read the quarantine manifest from <sessionDir>/quarantine/manifest.json.
 *
 * Returns null if the quarantine directory does not exist or the manifest
 * is absent / unreadable.
 */
export function readQuarantineManifest(sessionDir: string): QuarantineManifest | null {
  const mp = manifestPath(sessionDir);
  if (!fs.existsSync(mp)) return null;
  try {
    return JSON.parse(fs.readFileSync(mp, "utf8")) as QuarantineManifest;
  } catch {
    return null;
  }
}
