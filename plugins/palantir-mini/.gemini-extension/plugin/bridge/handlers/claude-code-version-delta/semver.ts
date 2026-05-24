// palantir-mini v3.3.0 — claude-code-version-delta semver helpers (B.4)
// Extracted from claude_code_version_delta.ts.

/**
 * Semver comparison: returns negative if a < b, 0 if equal, positive if a > b.
 * Accepts "v"-prefixed strings.
 */
export function semverCompare(a: string, b: string): number {
  const parse = (v: string): [number, number, number] => {
    const clean = v.replace(/^v/, "");
    const parts = clean.split(".").map((p) => parseInt(p, 10));
    return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
  };
  const [aMaj, aMin, aPat] = parse(a);
  const [bMaj, bMin, bPat] = parse(b);
  if (aMaj !== bMaj) return aMaj - bMaj;
  if (aMin !== bMin) return aMin - bMin;
  return aPat - bPat;
}

/** Extract all semver-like version strings from text (e.g. "2.1.114"). */
const VERSION_RE = /\bv?(\d+\.\d{1,3}\.\d{1,3})\b/g;

export function extractVersions(text: string): string[] {
  const found: string[] = [];
  let m: RegExpExecArray | null;
  VERSION_RE.lastIndex = 0;
  while ((m = VERSION_RE.exec(text)) !== null) {
    const v = m[1];
    if (v !== undefined) found.push(v);
    VERSION_RE.lastIndex = m.index + 1;
  }
  return found;
}

/**
 * Heuristic filter: accept only versions that look like Claude Code releases
 * (major=2, minor=1, patch >= 30). Filters out asset hashes and CSS versions
 * that happen to match the regex in raw HTML.
 */
export function isClaudeCodeVersion(v: string): boolean {
  const parts = v.replace(/^v/, "").split(".").map((p) => parseInt(p, 10));
  if (parts.length !== 3) return false;
  const [maj, min, pat] = parts;
  return maj === 2 && min === 1 && (pat ?? 0) >= 30;
}
