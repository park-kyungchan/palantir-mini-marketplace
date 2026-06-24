/**
 * Single source of truth for the palantir-mini marketplace version-field set.
 *
 * Both the verify gate (verify-marketplace-integrity.ts) and the writer
 * (sync-marketplace-version.ts) import CANONICAL + TARGETS from here, so the
 * checked set and the synced set can never drift apart again.
 *
 * Each ref names a file RELATIVE to the repository root plus the dot-path of
 * the version field inside that JSON. The repository root is a parameter
 * (default = the real repo, resolved from this file's location) so the same
 * logic can run against a throwaway fixture root in tests without ever
 * touching the real manifest files.
 */
import { resolve } from "node:path";

/** Default repository root: ci/ is one level below the repo root. */
export const DEFAULT_REPOSITORY_ROOT = resolve(import.meta.dir, "..");

/** A single version field: a repo-relative file path + a dot/bracket json-path. */
export interface VersionFieldRef {
  /** Repo-root-relative POSIX path to the JSON file. */
  readonly file: string;
  /** Dot/bracket path to the version field, e.g. ".plugins[0].version". */
  readonly jsonPath: string;
}

/**
 * The canonical source of the version. Everything else must equal this value.
 * (plugins/palantir-mini/.claude-plugin/plugin.json -> .version)
 */
export const CANONICAL: VersionFieldRef = {
  file: "plugins/palantir-mini/.claude-plugin/plugin.json",
  jsonPath: ".version",
};

/**
 * Every field that must equal CANONICAL. Mirrors the field set the verify gate
 * historically checked inline (8 fields total across 4 files, canonical
 * excluded here and added back where a full pass is needed).
 */
export const TARGETS: readonly VersionFieldRef[] = [
  // repo-root marketplace manifest
  { file: ".claude-plugin/marketplace.json", jsonPath: ".version" },
  { file: ".claude-plugin/marketplace.json", jsonPath: ".metadata.version" },
  { file: ".claude-plugin/marketplace.json", jsonPath: ".plugins[0].version" },
  // in-plugin marketplace manifest
  { file: "plugins/palantir-mini/.claude-plugin/marketplace.json", jsonPath: ".version" },
  { file: "plugins/palantir-mini/.claude-plugin/marketplace.json", jsonPath: ".metadata.version" },
  { file: "plugins/palantir-mini/.claude-plugin/marketplace.json", jsonPath: ".plugins[0].version" },
  // codex plugin manifest
  { file: "plugins/palantir-mini/.codex-plugin/plugin.json", jsonPath: ".version" },
  // plugin package.json
  { file: "plugins/palantir-mini/package.json", jsonPath: ".version" },
];

/** CANONICAL followed by every TARGET — the complete set to write/check. */
export const ALL_VERSION_FIELDS: readonly VersionFieldRef[] = [CANONICAL, ...TARGETS];

/** Validates X.Y.Z (numeric semver core, no pre-release/build suffix). */
export function isValidVersion(value: string): boolean {
  return /^\d+\.\d+\.\d+$/.test(value);
}

/** Parse a dot/bracket json-path into ordered segments (string keys / array indices). */
export function parseJsonPath(jsonPath: string): Array<string | number> {
  const segments: Array<string | number> = [];
  // Matches  .key  or  [0]
  const re = /\.([A-Za-z_$][\w$]*)|\[(\d+)\]/g;
  let match: RegExpExecArray | null;
  let consumed = 0;
  while ((match = re.exec(jsonPath)) !== null) {
    if (match.index !== consumed) {
      throw new Error(`unparseable json-path segment near index ${consumed} in "${jsonPath}"`);
    }
    if (match[1] !== undefined) segments.push(match[1]);
    else segments.push(Number(match[2]));
    consumed = re.lastIndex;
  }
  if (consumed !== jsonPath.length || segments.length === 0) {
    throw new Error(`invalid json-path: "${jsonPath}"`);
  }
  return segments;
}

/** Read the value at a dot/bracket json-path from a parsed object. */
export function getAtPath(root: unknown, jsonPath: string): unknown {
  let cursor: unknown = root;
  for (const seg of parseJsonPath(jsonPath)) {
    if (cursor == null || typeof cursor !== "object") return undefined;
    cursor = (cursor as Record<string | number, unknown>)[seg];
  }
  return cursor;
}

/** Set the value at a dot/bracket json-path on a parsed object (mutates in place). */
export function setAtPath(root: unknown, jsonPath: string, value: unknown): void {
  const segments = parseJsonPath(jsonPath);
  let cursor: unknown = root;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i] as string | number;
    if (cursor == null || typeof cursor !== "object") {
      throw new Error(`cannot descend into "${String(seg)}" of json-path "${jsonPath}"`);
    }
    cursor = (cursor as Record<string | number, unknown>)[seg];
  }
  const last = segments[segments.length - 1] as string | number;
  if (cursor == null || typeof cursor !== "object") {
    throw new Error(`cannot set "${String(last)}" of json-path "${jsonPath}"`);
  }
  (cursor as Record<string | number, unknown>)[last] = value;
}

/**
 * Locate the exact character span [start, end) of the STRING value at a
 * dot/bracket json-path inside raw JSON text, EXCLUDING the surrounding quotes.
 * This enables a format-preserving surgical edit that touches only the value
 * token and leaves every other byte (indentation, unicode escapes, ordering,
 * trailing newline) untouched.
 *
 * Returns null if the path does not resolve to a string value.
 */
export function findStringValueSpan(
  text: string,
  jsonPath: string,
): { start: number; end: number; value: string } | null {
  const segments = parseJsonPath(jsonPath);
  let pos = 0;

  const skipWs = (): void => {
    while (pos < text.length && /\s/.test(text[pos] as string)) pos++;
  };

  // Reads a JSON string starting at text[pos] === '"'. Returns the decoded
  // value plus the [start,end) of the inner content (between the quotes).
  const readString = (): { value: string; innerStart: number; innerEnd: number } => {
    if (text[pos] !== '"') throw new Error(`expected string at ${pos}`);
    pos++; // opening quote
    const innerStart = pos;
    let value = "";
    while (pos < text.length) {
      const ch = text[pos] as string;
      if (ch === "\\") {
        const next = text[pos + 1] as string;
        switch (next) {
          case '"': value += '"'; break;
          case "\\": value += "\\"; break;
          case "/": value += "/"; break;
          case "b": value += "\b"; break;
          case "f": value += "\f"; break;
          case "n": value += "\n"; break;
          case "r": value += "\r"; break;
          case "t": value += "\t"; break;
          case "u": {
            value += String.fromCharCode(parseInt(text.slice(pos + 2, pos + 6), 16));
            pos += 4;
            break;
          }
          default: value += next; break;
        }
        pos += 2;
      } else if (ch === '"') {
        const innerEnd = pos;
        pos++; // closing quote
        return { value, innerStart, innerEnd };
      } else {
        value += ch;
        pos++;
      }
    }
    throw new Error("unterminated string");
  };

  // Skips one JSON value (object/array/string/number/true/false/null) at pos.
  const skipValue = (): void => {
    skipWs();
    const ch = text[pos] as string;
    if (ch === '"') {
      readString();
    } else if (ch === "{") {
      skipObject();
    } else if (ch === "[") {
      skipArray();
    } else {
      // primitive: number / true / false / null
      while (pos < text.length && !/[,}\]\s]/.test(text[pos] as string)) pos++;
    }
  };

  // Descends into an object looking for `key`, then positions pos at its value.
  // If found returns true (pos at the value); else consumes the object and returns false.
  const enterObjectKey = (key: string): boolean => {
    skipWs();
    if (text[pos] !== "{") throw new Error(`expected object at ${pos}`);
    pos++; // {
    skipWs();
    if (text[pos] === "}") { pos++; return false; }
    while (pos < text.length) {
      skipWs();
      const k = readString().value;
      skipWs();
      if (text[pos] !== ":") throw new Error(`expected ':' at ${pos}`);
      pos++; // :
      if (k === key) {
        skipWs();
        return true;
      }
      skipValue();
      skipWs();
      if (text[pos] === ",") { pos++; continue; }
      if (text[pos] === "}") { pos++; return false; }
      throw new Error(`unexpected char '${text[pos]}' at ${pos}`);
    }
    return false;
  };

  // Consumes the rest of an object body starting at '{'.
  function skipObject(): void {
    if (text[pos] !== "{") throw new Error(`expected object at ${pos}`);
    pos++;
    skipWs();
    if (text[pos] === "}") { pos++; return; }
    while (pos < text.length) {
      skipWs();
      readString(); // key
      skipWs();
      pos++; // :
      skipValue();
      skipWs();
      if (text[pos] === ",") { pos++; continue; }
      if (text[pos] === "}") { pos++; return; }
      throw new Error(`unexpected char '${text[pos]}' at ${pos}`);
    }
  }

  // Descends into an array to element `index`, positioning pos at that value.
  // Returns true if reached; else consumes the array and returns false.
  const enterArrayIndex = (index: number): boolean => {
    skipWs();
    if (text[pos] !== "[") throw new Error(`expected array at ${pos}`);
    pos++; // [
    skipWs();
    if (text[pos] === "]") { pos++; return false; }
    let i = 0;
    while (pos < text.length) {
      skipWs();
      if (i === index) return true;
      skipValue();
      skipWs();
      if (text[pos] === ",") { pos++; i++; continue; }
      if (text[pos] === "]") { pos++; return false; }
      throw new Error(`unexpected char '${text[pos]}' at ${pos}`);
    }
    return false;
  };

  function skipArray(): void {
    if (text[pos] !== "[") throw new Error(`expected array at ${pos}`);
    pos++;
    skipWs();
    if (text[pos] === "]") { pos++; return; }
    while (pos < text.length) {
      skipValue();
      skipWs();
      if (text[pos] === ",") { pos++; continue; }
      if (text[pos] === "]") { pos++; return; }
      throw new Error(`unexpected char '${text[pos]}' at ${pos}`);
    }
  }

  skipWs();
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i] as string | number;
    if (typeof seg === "string") {
      if (!enterObjectKey(seg)) return null;
    } else {
      if (!enterArrayIndex(seg)) return null;
    }
  }
  skipWs();
  if (text[pos] !== '"') return null; // value at path is not a string
  const { value, innerStart, innerEnd } = readString();
  return { start: innerStart, end: innerEnd, value };
}
