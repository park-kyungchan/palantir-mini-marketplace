// palantir-mini — real-home-mutation regression guard (a1-hermetic-plugin-tests)
//
// Incident this guards against: tests/integration/fresh-home.test.ts used to
// renameSync() the developer's REAL ~/.claude/rules/ and
// ~/.claude/projects/<slug>/memory/ directories (moveDir/restore pattern,
// fallback copy+rmSync) — a killed run orphaned the user's live runtime dirs
// while a live Claude session depends on them right now. See that file's
// header comment and the a1-hermetic-plugin-tests slice card for the full
// incident. This guard makes reintroducing that shape ANYWHERE under
// `tests/` a test failure, not just a fix to the one file that had it.
//
// Everything the scanner needs lives in THIS file (not a companion
// `scripts/` module): this slice's write boundary is `tests/**` +
// `package.json` only, `scripts/**` is out of scope for A1.
//
// Static-scan heuristic, NOT a real tokenizer or full data-flow pass:
// `cleanCode()` blanks out comments and string/template-literal bodies
// (preserving newlines so line numbers stay stable) so identifier checks
// never fire on a coincidental substring inside prose or a string value
// (e.g. a test label "under-home-still-guarded", or a doc-comment mentioning
// "rmSync"). `extractHomeRootedVars` tracks `const`/`let`/`var` declarations
// whose RHS directly references `homedir()`/`process.env.HOME`, then walks a
// fixpoint closure over `path.join(...)`/`path.resolve(...)` re-derivations
// and bare aliases of an already-home-rooted var — a decl built from a fresh
// `mkdtempSync(...)` call is explicitly EXCLUDED even if its RHS also
// mentions HOME elsewhere (a tmp fixture is never home-rooted). This is a
// deliberately NARROW closure: an arbitrary function call that merely takes a
// home-rooted var as one argument (e.g. `someHookFn({ cwd: home })`) does
// NOT make that call's return value home-rooted.
//
// Two detection passes:
//   1. Any line matching a mutating fs call that also references
//      `homedir()`/`process.env.HOME` directly, or a home-rooted var within
//      a same-line-through-3-lines-later window.
//   2. Local `function NAME(params) { ... }` wrapper bodies that apply a
//      mutating fs call to one of their OWN parameters are treated as
//      "mutating wrappers"; every call site passing a home-rooted argument
//      at that parameter position is flagged too.
//
// Non-goal (stated honestly): this cannot see through an imported library
// function — if a test passes a home-rooted string into `lib/`- or
// `hooks/`-resident code that itself performs the mutation, this scanner
// will not catch it (out of the test-boundary this slice is scoped to; the
// census for that class of risk was done by hand-tracing call graphs — see
// the slice report's classification table). This scanner's job is catching
// the DIRECT-in-test-file shape that actually occurred, not full
// whole-program static analysis.
//
// Table-driven style (mirrors tests/hooks/pretooluse-output-shape-conformance.test.ts):
// one test per scanned file, so a future regression fails CI on a specific,
// named file rather than a single opaque blob assertion.

import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const TESTS_ROOT = resolve(import.meta.dir, "../..", "tests");
const FIXTURE_PATH = resolve(
  import.meta.dir,
  "fixtures/real-home-mutation-violation.fixture.ts.txt",
);

const MUTATING_FN = /\b(?:renameSync|rmSync|writeFileSync|appendFileSync|mkdirSync|cpSync|copyFileSync)\s*\(/;
const HOME_REF = /homedir\(\)|process\.env\.HOME\b|process\.env\[["']HOME["']\]/;
const DECL_RE = /^\s*(?:export\s+)?(?:const|let|var)\s+(\w+)\s*(?::[^=]+)?=\s*(.+)$/;
const FN_DECL_RE = /^\s*function\s+(\w+)\s*\(([^)]*)\)/;

interface RealHomeMutationFinding {
  readonly line: number;
  readonly snippet: string;
  readonly reason: string;
}

/**
 * Blank out comment and string-literal content (preserving newlines/length so
 * line numbers and column layout stay stable) so identifier/word-boundary
 * checks never fire on coincidental substrings inside prose or string
 * values. Heuristic: does not special-case regex-literal `/…/` bodies or
 * template `${expr}` interpolation. Acceptable for a REGRESSION GUARD whose
 * job is catching the known dangerous shape, not full static analysis.
 */
function cleanCode(source: string): string {
  const noBlockComments = source.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  const lines = noBlockComments.split("\n");
  const cleanedLines = lines.map((line) => {
    let result = "";
    let i = 0;
    let inStr: '"' | "'" | "`" | null = null;
    while (i < line.length) {
      const ch = line[i]!;
      if (inStr) {
        if (ch === "\\") { result += "  "; i += 2; continue; }
        if (ch === inStr) { inStr = null; result += " "; i++; continue; }
        result += " ";
        i++;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === "`") { inStr = ch; result += " "; i++; continue; }
      if (ch === "/" && line[i + 1] === "/") { result += " ".repeat(line.length - i); break; }
      result += ch;
      i++;
    }
    return result;
  });
  return cleanedLines.join("\n");
}

function paramNames(paramList: string): string[] {
  if (!paramList.trim()) return [];
  return paramList.split(",").map((p) => p.trim().split(":")[0]!.trim()).filter(Boolean);
}

function extractHomeRootedVars(cleanLines: string[]): Set<string> {
  const vars = new Set<string>();
  const decls: Array<{ name: string; rhs: string }> = [];
  for (const line of cleanLines) {
    const m = DECL_RE.exec(line);
    if (!m) continue;
    const [, name, rhs] = m;
    if (/mkdtemp/.test(rhs!)) continue; // a fresh tmp dir is never home-rooted, even if the RHS also mentions HOME elsewhere
    decls.push({ name: name!, rhs: rhs! });
    if (HOME_REF.test(rhs!)) vars.add(name!);
  }
  // Fixpoint/transitive closure: a decl built FROM an already-known home-rooted
  // var (e.g. `const EXTERNAL_RULES_DIR = path.join(HOME, ...)` where `HOME` is
  // itself `process.env.HOME ?? os.homedir()`) is home-rooted too. Deliberately
  // NARROW: only a path.join(...)/path.resolve(...) call or a bare alias counts
  // as "deriving a path FROM" the var — an arbitrary function call that merely
  // takes the var as one property/argument does NOT make its return value
  // home-rooted.
  let changed = true;
  while (changed) {
    changed = false;
    for (const { name, rhs } of decls) {
      if (vars.has(name)) continue;
      const trimmed = rhs.trim().replace(/;\s*$/, "");
      const isPathBuilder = /^path\.(?:join|resolve)\(/.test(trimmed);
      for (const v of vars) {
        const isBareAlias = trimmed === v;
        const refsVar = new RegExp(`\\b${v}\\b`).test(trimmed);
        if (isBareAlias || (isPathBuilder && refsVar)) {
          vars.add(name);
          changed = true;
          break;
        }
      }
    }
  }
  return vars;
}

/** Find local `function NAME(params) { ... }` bodies via brace-depth matching on cleaned code. */
function findLocalMutatingWrappers(cleanLines: string[]): Map<string, Set<number>> {
  const wrappers = new Map<string, Set<number>>();

  for (let i = 0; i < cleanLines.length; i++) {
    const m = FN_DECL_RE.exec(cleanLines[i]!);
    if (!m) continue;
    const fnName = m[1]!;
    const params = paramNames(m[2]!);
    if (params.length === 0) continue;

    let depth = 0;
    let started = false;
    const bodyLines: string[] = [];
    for (let j = i; j < cleanLines.length; j++) {
      const line = cleanLines[j]!;
      for (const ch of line) {
        if (ch === "{") { depth++; started = true; }
        else if (ch === "}") { depth--; }
      }
      bodyLines.push(line);
      if (started && depth <= 0) break;
    }

    const dangerousParamIdx = new Set<number>();
    for (const bLine of bodyLines) {
      if (!MUTATING_FN.test(bLine)) continue;
      params.forEach((p, idx) => {
        if (new RegExp(`\\b${p}\\b`).test(bLine)) dangerousParamIdx.add(idx);
      });
    }
    if (dangerousParamIdx.size > 0) wrappers.set(fnName, dangerousParamIdx);
  }
  return wrappers;
}

/** Scan one file's already-read source for real-HOME-derived mutating fs calls. */
function scanForRealHomeMutation(source: string): RealHomeMutationFinding[] {
  const originalLines = source.split("\n");
  const cleanLines = cleanCode(source).split("\n");
  const homeVars = extractHomeRootedVars(cleanLines);
  const findings: RealHomeMutationFinding[] = [];

  for (let i = 0; i < cleanLines.length; i++) {
    const cLine = cleanLines[i]!;
    if (!MUTATING_FN.test(cLine)) continue;

    if (HOME_REF.test(cLine)) {
      findings.push({ line: i + 1, snippet: originalLines[i]!.trim(), reason: "direct inline real-HOME reference" });
      continue;
    }

    const window = cleanLines.slice(i, i + 4).join("\n");
    for (const v of homeVars) {
      if (new RegExp(`\\b${v}\\b`).test(window)) {
        findings.push({ line: i + 1, snippet: originalLines[i]!.trim(), reason: `references home-rooted var "${v}"` });
        break;
      }
    }
  }

  const wrappers = findLocalMutatingWrappers(cleanLines);
  if (wrappers.size > 0) {
    for (let i = 0; i < cleanLines.length; i++) {
      const cLine = cleanLines[i]!;
      if (/^\s*function\s/.test(cLine)) continue;
      for (const [fnName, dangerousIdx] of wrappers) {
        const callMatch = new RegExp(`\\b${fnName}\\s*\\(([^)]*)\\)`).exec(cLine);
        if (!callMatch) continue;
        const args = callMatch[1]!.split(",").map((a) => a.trim());
        for (const idx of dangerousIdx) {
          const arg = args[idx];
          if (!arg) continue;
          if (HOME_REF.test(arg) || [...homeVars].some((v) => new RegExp(`\\b${v}\\b`).test(arg))) {
            findings.push({
              line: i + 1,
              snippet: cLine.trim(),
              reason: `calls local mutating helper "${fnName}(...)" with a real-HOME-derived argument at position ${idx}`,
            });
          }
        }
      }
    }
  }

  return findings;
}

/**
 * List every `.ts` file under `dir` (recursive). A fixture file saved with a
 * non-`.ts` extension (e.g. `*.fixture.ts.txt`) is deliberately NOT a `.ts`
 * file so it is excluded from this walk — it is read directly by its own
 * dedicated negative-fixture test below instead.
 */
function listScannableTestFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = resolve(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith(".ts")) out.push(full);
    }
  };
  walk(dir);
  return out;
}

describe("real-home mutation guard (a1-hermetic-plugin-tests regression)", () => {
  const files = listScannableTestFiles(TESTS_ROOT);

  test("tests/** registry has the expected number of scannable .ts files", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  test("the negative fixture is NOT itself part of the scanned registry (.ts.txt boundary holds)", () => {
    expect(files).not.toContain(FIXTURE_PATH);
  });

  for (const file of files) {
    const label = file.slice(TESTS_ROOT.length + 1);
    test(`no real-home mutation: ${label}`, () => {
      const source = readFileSync(file, "utf8");
      expect(scanForRealHomeMutation(source)).toEqual([]);
    });
  }

  test("negative fixture: scanner FLAGS a planted real-home-mutation violation", () => {
    const source = readFileSync(FIXTURE_PATH, "utf8");
    const findings = scanForRealHomeMutation(source);

    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0]?.snippet).toContain("renameSync");
    expect(findings[0]?.reason).toMatch(/home-rooted|real-HOME/);
  });
});
