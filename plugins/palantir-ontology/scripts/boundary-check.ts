#!/usr/bin/env bun
// boundary:check (ledger row P340, docs/architecture.md ADR-002).
//
// Enforces the one-way dependency direction: no file under `src/**` OTHER
// THAN `src/adapters/**` may import anything that resolves into
// `src/adapters/**`, and no such file may branch on runtime identity via a
// literal `claude`/`codex`/`gemini`/`anthropic`/`openai`/`google` mention
// (ADR-002: "No semantic-core file may branch on runtime identity... a
// boundary violation, not a style issue."). Adapters ARE allowed to import
// semantic-core/public contracts (the reverse direction), so only
// non-adapter files are scanned.
//
// Also enforces ADR-005's "the writer primitive itself must not be exported
// from a public module path any other successor subsystem can import": no
// file under `src/**` OTHER THAN `src/governance/**` itself may import
// `src/governance/atomic-write` or `src/governance/mint-ledger` directly —
// the ONE sanctioned entry point into governance is `src/governance/index.ts`
// (which re-exports the gate's public API, never the raw writer/ledger
// internals). Unlike the adapter check, governance files are NOT skipped
// wholesale from scanning — they are still checked for adapter-import and
// runtime-identity violations, only exempted from THIS specific rule (since
// governance's own internal files legitimately import each other). This is
// the structural half of P430's "bypass census" proof: the callgraph
// evidence lives in `outputs/p430-mutation-authority.md`, but this check is
// what keeps that proof from silently rotting on the next commit.
//
// P450 addition: `src/control-plane/**` is exempted from the
// runtime-identity-literal rule only (still fully scanned for adapter-import
// and governance-writer-import) — ADR-003 fixes every catalog entry's
// `runtimeScope` field as literal Codex/Claude/Gemini/all DATA ("the only
// place runtime-surface variation is expressed", R210 §Applicability
// Notes), which is not the runtime-identity LOGIC branching ADR-002's rule
// forbids. See `isControlPlaneFile` below and
// `outputs/p450-control-plane-catalog.md` for the full grounding.
//
// Also from P450: `boundary:check` additionally runs
// `scanControlPlaneKindCollisions`, `scanControlPlaneCompleteness`, and
// `scanForObjectTypeShapedFiles` (`src/control-plane/boundary-validator.ts`)
// against the real `CONTROL_PLANE_CATALOG` and the on-disk tree — ADR-003's
// "the boundary validator (P450) must reject any attempt to register [a
// control-plane node] as a product primitive (and any product primitive as
// a control-plane node)", wired into this same section-11.2 command rather
// than a script section-11.2 does not already run.
//
// P460 addition (decisions/pm2-core-safety-correction.md FIX 2): the
// control-plane exemption above is for the runtime-identity-LITERAL rule
// only. The P460 adversarial verifier's finding 3 was a separate,
// content-narrow gap in the runtime-identity-literal rule itself: it never
// checked whether `src/control-plane/**` files branch (LOGIC) on runtime
// identity via a comparison operator, `if`/`switch`/`case`, or a ternary
// condition — only ADR-003's inert catalog DATA forms
// (`runtimeScope: "claude"`, `["claude","codex","gemini"]`, type unions)
// are meant to be exempt there. `scanBoundaries` below now runs a SEPARATE
// `runtime-identity-branch` rule scoped to `src/control-plane/**` alone
// that catches exactly those LOGIC forms (see `RUNTIME_BRANCH_RE`), while
// leaving the DATA forms silent.
//
// P460 addition (FIX 2): also forbids any non-test `src/**` file from
// importing `src/governance/testing/**` (the guarded test-only oracle-
// installer module — `src/governance/testing/trusted-oracle.ts`) — the
// structural half of "a caller cannot install a permissive security
// oracle", mirroring the existing `governance-writer-import` rule's
// pattern for `atomic-write`/`mint-ledger`.
//
// P460 v2 addition (decisions/pm2-core-safety-correction.md "v2
// Correction" item 2): the fresh P460 re-verifier found that banning
// `src/governance/testing/**` was not enough — `src/governance/security-
// oracle.ts` ITSELF was still reachable by a direct deep import
// (`import { installSecurityOracle } from "../governance/security-oracle"`)
// from any production `src/**` file, bypassing both the barrel omission
// and the testing-directory ban. `scanBoundaries` below gains a SEPARATE
// `governance-security-oracle-import` rule, mirroring the existing
// `governance-writer-import` rule's pattern: no file outside
// `src/governance/**` AND no non-`*.test.ts` file may import a specifier
// resolving to `src/governance/security-oracle.ts`. `src/governance/testing/
// trusted-oracle.ts` (a `src/governance/**` file) stays exempt via the
// first clause; a hypothetical co-located `*.test.ts` file would stay
// exempt via the second.
//
// P460 v3 addition (decisions/pm2-gate-threat-model-escalation.md "User
// Ruling and Lead Selection — Option 1+", item 2): `createCommitGate`
// (`src/governance/commit-gate.ts`'s gate FACTORY) is governance/test-only,
// mirroring `security-oracle.ts`'s pattern — `scanBoundaries` gains a
// SEPARATE `governance-commit-gate-factory-import` rule: no file outside
// `src/governance/**`, and no `*.test.ts` file, may import a specifier
// resolving to `src/governance/commit-gate.ts`. (`resolvesIntoGovernanceWriter`/
// `GOVERNANCE_WRITER_MODULES` is left untouched — commit-gate.ts is not a
// "writer primitive" in that rule's sense; this is a distinct rule for a
// distinct module, same as security-oracle got its own rule one file over.)
//
// P460 v3 addition (item 5, the surviving finding from
// decisions/pm2-gate-threat-model-escalation.md "The surviving finding
// (irreducible in-language)"): every prior boundary rule above is a regex
// scan over LITERAL import specifiers — invisible to a computed one
// (`import(["..", "governance", "security-oracle"].join("/"))`). No static
// or AST scanner can resolve a string only known at runtime, so this rule
// does not try to resolve it — it flags the SHAPE itself: `scanBoundaries`
// gains a `computed-dynamic-import` rule that forbids any production
// `src/**` file (excluding `*.test.ts`/`*.test.tsx` and excluding
// `src/governance/testing/**`) from calling `import(...)`/`require(...)`
// with an argument that is not a single quoted string literal. A literal
// specifier (`import("./foo")`) is fine; a variable, a template
// interpolation, a concatenation, or an `Array.join()` result is a
// violation. This closes the class of bypass at the syntax level: an actor
// who writes a computed dynamic import to evade the OTHER literal-specifier
// rules above now fails THIS rule instead, on the same `boundary:check` run.
//
// P460 v4 addition (decisions/pm2-gate-threat-model-escalation.md "Fifth
// Finding (aliased require)" / "v4 hygiene"): every rule above matches the
// LITERAL text `import(`/`require(` — invisible to an ALIASED reference:
//
//     const req = require;
//     req("../governance/atomic-write").atomicWriteFile(...);
//
// contains neither literal token, so it evades every governance-*-import
// and computed-dynamic-import rule above even with a pure string-literal
// argument. `scanBoundaries` gains an `indirect-module-access` rule: in
// production `src/**` (excluding `*.test.ts`/`*.test.tsx` and
// `src/governance/testing/**`), the bare identifiers `require`/`import` may
// appear ONLY as:
//   (a) a static ESM declaration — `import ... from "literal"` (any clause
//       shape: default, named, namespace, `type`-only, combined) or the
//       bare side-effect form `import "literal"`; or
//   (b) a direct call, `require(...)`/`import(...)`, immediately adjacent
//       (whitespace allowed) and NOT preceded by a `.` (which would make it
//       a property-access call like `globalThis.require(...)`, not the
//       identifier itself). This rule does not re-judge whether the call's
//       ARGUMENT is a literal — that axis is `computed-dynamic-import`'s
//       job (kept exactly as-is); a call-shaped occurrence is "allowed" here
//       regardless of its argument, so the two rules never double-report
//       the same token.
// ANY other bare appearance is a violation: assignment (`const req =
// require`), destructuring/rename off a module or off `globalThis`
// (`const { require } = globalThis`), indirect/comma-operator invocation
// (`(0, require)("x")`), passing require/import as a call argument or
// return value, and property/element access that yields require
// (`globalThis.require`, `globalThis["require"]`).
//
// P460 v5 addition (decisions/pm2-gate-threat-model-escalation.md "Sixth
// Finding (module[\"require\"]) — Lead Adjudication + v5"): a sixth
// spelling reaches the module-loader reference by a literal bracket
// property access on the CommonJS module object:
//
//     const r = module["require"]; r("../../governance/commit-gate");
//
// `stripLineAndBlockComments` blanks the quoted string `"require"`, so
// v4's bare-token scan (which only ever looks AT the `require`/`import`
// tokens themselves) never sees this shape — the token it needed to catch
// was never `require`/`import` here, it was `module`. The Lead adjudicated
// this as one instance of a wider, enumerable-but-bounded CommonJS
// module-loader-handle family (module.createRequire; require.main;
// require.cache; process.mainModule; a static/dynamic import of the
// `module`/`node:module` built-in) and confirmed `src/**` has ZERO
// legitimate use of any member of that family (only the English word
// "module" in prose comments) — so the whole family is bannable outright.
// `scanBoundaries` gains a `module-loader-handle` rule, scoped identically
// to `indirect-module-access` (production `src/**`, excluding
// `*.test.ts`/`*.test.tsx` and `src/governance/testing/**`), reusing the
// SAME comment/string-stripped copy of the file text so prose mentioning
// "module" does not false-positive. It flags, on the stripped text:
//   (a) the bare identifier `module` used as an object/value — `module`
//       immediately followed by `.` or `[` (covers `module.require`,
//       `module.createRequire`, `module["require"]`, `module.exports`);
//   (b) a static or dynamic import specifier equal to exactly `"module"`
//       or `"node:module"` (checked inline in the specifier loop above,
//       against the same `IMPORT_SPECIFIER_RE` matches every other
//       specifier-based rule already uses);
//   (c) the bare identifier `createRequire`;
//   (d) `require` immediately followed by `.main` or `.cache` (the
//       identifier used as an object, not called directly — distinct from,
//       and layered on top of, `indirect-module-access`'s existing
//       property-access catch for this same token);
//   (e) `process.mainModule`.
// After v5 the only residual is genuine dynamic-code-execution reflection
// — `Function("return require")()`, `eval(...)`, `globalThis[computedName]`
// — unambiguous arbitrary in-process code execution, outside the
// in-process gate's threat model by construction (see docs/architecture.md
// ADR-005's residual note, updated for v5).
//
// Implementation: `stripLineAndBlockComments` first produces a same-length
// copy of the file text with `//`/`/* */` comment bodies AND every quoted
// string/template-literal BODY (single/double/backtick, escape-aware, quote
// delimiters themselves left in place) replaced by whitespace — this is
// required, not cosmetic: the real `src/altitude2/reads.ts` contains the
// English word "require" three times (twice in `//` comment prose, once
// inside a template-literal error message), and an un-stripped bare-word
// scan would misflag all three. `\b(require|import)\b` is then matched
// against the STRIPPED copy; for each match, `isAllowedModuleTokenOccurrence`
// looks only at the nearest non-whitespace character before and after the
// token (plus, for `import`, a sticky re-match of the static-declaration
// shape anchored at that exact offset) to classify it per (a)/(b) above.
// Still a regex/token scan, not an AST parse, consistent with every rule
// above — see the module-doc paragraph immediately below.
//
// Deliberately a regex-based import-specifier scan, not a full TS/AST
// parse — sufficient for this scaffold's import shapes (`import ... from
// "..."`, `import("...")`, `require("...")`) and consistent with this
// package's existing hand-rolled-checker precedent
// (tests/support/schema-validate.ts). Run standalone: `bun run boundary:check`.

import { readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { walkFiles } from "./lib/fs-walk";
import { CONTROL_PLANE_CATALOG } from "../src/control-plane/registry";
import { scanControlPlaneCompleteness, scanControlPlaneKindCollisions, scanForObjectTypeShapedFiles } from "../src/control-plane/boundary-validator";

const PACKAGE_ROOT = resolve(import.meta.dir, "..");
const SRC_DIR = join(PACKAGE_ROOT, "src");
const IMPORT_SPECIFIER_RE =
  /(?:import\s+(?:[^'";]*?\bfrom\s+)?|import\s*\(|require\s*\()\s*["']([^"']+)["']/g;
const RUNTIME_TERM_RE = /\b(claude|codex|gemini|anthropic|openai|google)\b/i;

// P460 FIX 3: a runtime-identity literal used as a branching CONDITION
// (never a bare data position) inside `src/control-plane/**`. Five
// alternative forms, matching the spec's "comparison operators / if /
// switch / case / ternary condition" list:
//   1. `=== "claude"` / `"claude" ===` (and !==/==/!=, either operand order)
//   2. `if (...claude...)`
//   3. `switch (...claude...)`
//   4. `case "claude":`
//   5. `"claude" ? ...` (a literal feeding a ternary condition)
// Data forms (`runtimeScope: "claude"`, `["claude","codex","gemini"]`, a
// `"codex" | "claude" | "gemini" | "all"` type union) contain none of these
// operator/keyword adjacencies and stay silent.
const RUNTIME_TERMS_GROUP = "(claude|codex|gemini|anthropic|openai|google)";
const RUNTIME_BRANCH_RE = new RegExp(
  [
    `(?:===|!==|==|!=)\\s*["']${RUNTIME_TERMS_GROUP}["']`,
    `["']${RUNTIME_TERMS_GROUP}["']\\s*(?:===|!==|==|!=)`,
    `\\bif\\s*\\([^)]*\\b${RUNTIME_TERMS_GROUP}\\b[^)]*\\)`,
    `\\bswitch\\s*\\([^)]*\\b${RUNTIME_TERMS_GROUP}\\b[^)]*\\)`,
    `\\bcase\\s+["']${RUNTIME_TERMS_GROUP}["']\\s*:`,
    `["']${RUNTIME_TERMS_GROUP}["'][^?:;{}]{0,40}\\?`,
  ].join("|"),
  "i",
);

// The one guarded test-only module FIX 2 introduces
// (`src/governance/testing/**`, currently just `trusted-oracle.ts`): no
// non-test `src/**` file may import from it — mirrors
// `GOVERNANCE_WRITER_MODULES`'s pattern one directory up.
const GOVERNANCE_TESTING_DIR = "governance/testing";

// P460 v2: the security-oracle module itself. Basename only (no
// extension), matched the same way `GOVERNANCE_WRITER_MODULES` is —
// resolved-and-stripped so both `./security-oracle` and
// `./security-oracle.ts` are caught.
const GOVERNANCE_SECURITY_ORACLE_MODULE = "governance/security-oracle";

// P460 v3: the commit-gate FACTORY module. Same basename-matching
// convention as `GOVERNANCE_SECURITY_ORACLE_MODULE` one line up.
const GOVERNANCE_COMMIT_GATE_MODULE = "governance/commit-gate";

// P460 v3: a computed/non-literal dynamic import()/require() argument. Only
// a single quoted string literal (no interpolation, concatenation, method
// call, or bare identifier) is permitted — see module doc above.
const DYNAMIC_CALL_RE = /\b(?:import|require)\s*\(\s*([^)]*)\)/g;
const SINGLE_STRING_LITERAL_RE = /^(["'])(?:\\.|(?!\1)[^\\])*\1$/;

// P460 v4: bare `require`/`import` token scan (see module doc above), run
// against a comment/string-stripped copy of the file text.
const BARE_MODULE_TOKEN_RE = /\b(require|import)\b/g;

// P460 v5: the CommonJS module-loader-handle family — see module doc
// "P460 v5 addition" above for the (a)-(e) enumeration. Matched against the
// SAME comment/string-stripped copy `indirect-module-access` already
// computes; one alternation, first match per file is enough to flag it
// (the `detail` records exactly which alternative fired).
const MODULE_LOADER_HANDLE_RE =
  /\bmodule\b\s*[.[]|\bcreateRequire\b|\brequire\b\s*\.\s*(?:main|cache)\b|\bprocess\s*\.\s*mainModule\b/g;

// P460 v5: the two banned import specifiers for the module-loader-handle
// rule's clause (b) — a static or dynamic import of the CommonJS `module`
// built-in itself (or its `node:` prefixed form).
const MODULE_BUILTIN_SPECIFIERS = new Set(["module", "node:module"]);

// P460 v4: the static ESM declaration shapes allowed at (a) above — any
// import-clause combination (default/namespace/named/type, in either
// order, with or without a trailing default+named comma) followed by
// `from "literal"`, or the bare side-effect form `import "literal"`.
// Sticky (`y`) so a caller can anchor the match to one exact offset via
// `.lastIndex` rather than searching forward.
const IMPORT_CLAUSE_SRC = String.raw`(?:[\w$]+\s*(?:,\s*(?:\*\s+as\s+[\w$]+|\{[^}]*\}))?|\*\s+as\s+[\w$]+|\{[^}]*\})`;
const STATIC_IMPORT_FORM_RE = new RegExp(
  String.raw`import\s*(?:type\s+)?${IMPORT_CLAUSE_SRC}\s*from\s*["'][^"']*["']|import\s*["'][^"']*["']`,
  "y",
);

export interface BoundaryViolation {
  readonly file: string;
  readonly kind:
    | "adapter-import"
    | "runtime-identity-literal"
    | "runtime-identity-branch"
    | "governance-writer-import"
    | "governance-testing-import"
    | "governance-security-oracle-import"
    | "governance-commit-gate-factory-import"
    | "computed-dynamic-import"
    | "indirect-module-access"
    | "module-loader-handle";
  readonly detail: string;
}

/** Pure predicate: does this import specifier, resolved from `fromFileDir`, land inside src/adapters/**? */
export function resolvesIntoAdapters(specifier: string, fromFileDir: string, srcDir: string): boolean {
  if (!specifier.startsWith(".")) return false; // bare/package specifiers are never src-internal here
  const resolved = resolve(fromFileDir, specifier);
  const relFromSrc = relative(srcDir, resolved);
  return relFromSrc === "adapters" || relFromSrc.startsWith(`adapters${"/"}`) || relFromSrc.startsWith("adapters\\");
}

function isAdapterFile(relFromSrc: string): boolean {
  return relFromSrc === "adapters" || relFromSrc.startsWith("adapters/") || relFromSrc.startsWith("adapters\\");
}

function isGovernanceFile(relFromSrc: string): boolean {
  return relFromSrc === "governance" || relFromSrc.startsWith("governance/") || relFromSrc.startsWith("governance\\");
}

// P450 addition (docs/architecture.md ADR-003, R210 §Applicability Notes
// "Authority boundary held constant": "ControlPlaneNodeKind is the only
// place runtime-surface variation is expressed; it never reclassifies a
// runtime surface as a product Ontology primitive"). ADR-003 itself fixes
// every catalog entry's `runtimeScope` field as "which of Codex/Claude/
// Gemini/all it applies to" — that is inert catalog DATA naming a runtime,
// not semantic-core LOGIC branching on runtime identity, which is what this
// scan's runtime-identity-literal rule exists to forbid. `src/control-plane/`
// is therefore exempt from that ONE rule only — it remains fully scanned for
// adapter-import and governance-writer-import violations, the same as every
// other non-adapter directory.
function isControlPlaneFile(relFromSrc: string): boolean {
  return relFromSrc === "control-plane" || relFromSrc.startsWith("control-plane/") || relFromSrc.startsWith("control-plane\\");
}

// The two writer-primitive modules ADR-005 forbids any non-governance file
// from importing directly. Basenames only (no extension) — matched against
// the import specifier's resolved path with any trailing `.ts`/`.tsx`
// stripped, so both `./atomic-write` and `./atomic-write.ts` are caught.
const GOVERNANCE_WRITER_MODULES = ["governance/atomic-write", "governance/mint-ledger"];

/** Pure predicate: does this import specifier, resolved from `fromFileDir`, land on one of the governance writer-primitive modules? */
export function resolvesIntoGovernanceWriter(specifier: string, fromFileDir: string, srcDir: string): boolean {
  if (!specifier.startsWith(".")) return false;
  const resolved = resolve(fromFileDir, specifier);
  const relFromSrc = relative(srcDir, resolved).replace(/\\/g, "/").replace(/\.tsx?$/, "");
  return GOVERNANCE_WRITER_MODULES.includes(relFromSrc);
}

function isGovernanceTestingFile(relFromSrc: string): boolean {
  const normalized = relFromSrc.replace(/\\/g, "/");
  return normalized === GOVERNANCE_TESTING_DIR || normalized.startsWith(`${GOVERNANCE_TESTING_DIR}/`);
}

/** Pure predicate: does this import specifier, resolved from `fromFileDir`, land inside src/governance/testing/**? (P460 FIX 2) */
export function resolvesIntoGovernanceTesting(specifier: string, fromFileDir: string, srcDir: string): boolean {
  if (!specifier.startsWith(".")) return false;
  const resolved = resolve(fromFileDir, specifier);
  const relFromSrc = relative(srcDir, resolved).replace(/\\/g, "/");
  return isGovernanceTestingFile(relFromSrc);
}

/** Pure predicate: does this file path (relative to srcDir) end in `.test.ts`/`.test.tsx`? (P460 v2 — the one non-`src/governance/**` carve-out the security-oracle-import rule allows.) */
function isTestFile(relFromSrc: string): boolean {
  const normalized = relFromSrc.replace(/\\/g, "/");
  return normalized.endsWith(".test.ts") || normalized.endsWith(".test.tsx");
}

/** Pure predicate: does this import specifier, resolved from `fromFileDir`, land exactly on src/governance/security-oracle? (P460 v2) */
export function resolvesIntoGovernanceSecurityOracle(specifier: string, fromFileDir: string, srcDir: string): boolean {
  if (!specifier.startsWith(".")) return false;
  const resolved = resolve(fromFileDir, specifier);
  const relFromSrc = relative(srcDir, resolved).replace(/\\/g, "/").replace(/\.tsx?$/, "");
  return relFromSrc === GOVERNANCE_SECURITY_ORACLE_MODULE;
}

/** Pure predicate: does this import specifier, resolved from `fromFileDir`, land exactly on src/governance/commit-gate? (P460 v3 — createCommitGate is governance/test-only) */
export function resolvesIntoGovernanceCommitGate(specifier: string, fromFileDir: string, srcDir: string): boolean {
  if (!specifier.startsWith(".")) return false;
  const resolved = resolve(fromFileDir, specifier);
  const relFromSrc = relative(srcDir, resolved).replace(/\\/g, "/").replace(/\.tsx?$/, "");
  return relFromSrc === GOVERNANCE_COMMIT_GATE_MODULE;
}

/** Pure predicate: is `arg` (a raw import()/require() call argument, untrimmed) exactly one quoted string literal and nothing else? (P460 v3) */
export function isSingleStringLiteralArg(arg: string): boolean {
  return SINGLE_STRING_LITERAL_RE.test(arg.trim());
}

/**
 * Return a SAME-LENGTH copy of `text` with every `//`/`/* *​/` comment body
 * and every quoted string/template-literal BODY (single, double, or
 * backtick-delimited; escape-pair-aware; the delimiter characters
 * themselves are left in place) replaced by whitespace. All other offsets
 * are unchanged, so a match index into the returned string is also a valid
 * index into `text`. (P460 v4 — see module doc "Implementation" above for
 * why this is required, not cosmetic: `bare-word` scans without it
 * misfire on ordinary prose/string content containing "require"/"import".)
 */
export function stripLineAndBlockComments(text: string): string {
  let out = "";
  let i = 0;
  const n = text.length;
  while (i < n) {
    const two = text.slice(i, i + 2);
    if (two === "//") {
      while (i < n && text[i] !== "\n") {
        out += " ";
        i++;
      }
      continue;
    }
    if (two === "/*") {
      out += "  ";
      i += 2;
      while (i < n && text.slice(i, i + 2) !== "*/") {
        out += text[i] === "\n" ? "\n" : " ";
        i++;
      }
      if (i < n) {
        out += "  ";
        i += 2;
      }
      continue;
    }
    const ch = text[i]!;
    if (ch === '"' || ch === "'" || ch === "`") {
      out += ch; // keep the opening delimiter — STATIC_IMPORT_FORM_RE needs ["'] to still bound the literal
      i++;
      while (i < n && text[i] !== ch) {
        if (text[i] === "\\" && i + 1 < n) {
          out += "  "; // blank the escape pair, preserve length
          i += 2;
          continue;
        }
        out += text[i] === "\n" ? "\n" : " ";
        i++;
      }
      if (i < n) {
        out += text[i]; // keep the closing delimiter
        i++;
      }
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

function prevNonWhitespaceChar(text: string, beforeIndex: number): string | undefined {
  let i = beforeIndex - 1;
  while (i >= 0 && /\s/.test(text[i]!)) i--;
  return i >= 0 ? text[i] : undefined;
}

function nextNonWhitespaceIndex(text: string, fromIndex: number): number {
  let i = fromIndex;
  while (i < text.length && /\s/.test(text[i]!)) i++;
  return i;
}

/**
 * Pure predicate over an ALREADY comment/string-stripped text (see
 * `stripLineAndBlockComments`): is the `require`/`import` token at
 * `strippedText[index..index+word.length)` one of the two allowed shapes —
 * (a) a static `import ... from "literal"` / bare `import "literal"`
 * declaration, or (b) a direct call `require(...)`/`import(...)` not
 * preceded by `.`? Literal-vs-computed call ARGUMENT is deliberately not
 * judged here (that's `computed-dynamic-import`'s job). (P460 v4)
 */
export function isAllowedModuleTokenOccurrence(strippedText: string, index: number, word: "require" | "import"): boolean {
  const nextIdx = nextNonWhitespaceIndex(strippedText, index + word.length);
  const nextChar = nextIdx < strippedText.length ? strippedText[nextIdx] : undefined;
  const prevChar = prevNonWhitespaceChar(strippedText, index);

  if (nextChar === "(" && prevChar !== ".") return true; // (b) direct call, not a property-access call
  if (word === "require") return false; // require has no static-declaration form
  STATIC_IMPORT_FORM_RE.lastIndex = index;
  return STATIC_IMPORT_FORM_RE.test(strippedText); // (a) static declaration, anchored exactly at this offset
}

export function scanBoundaries(srcDir: string): BoundaryViolation[] {
  const violations: BoundaryViolation[] = [];
  const files = walkFiles(srcDir, (name) => name.endsWith(".ts") || name.endsWith(".tsx"));

  for (const relPath of files) {
    if (isAdapterFile(relPath)) continue; // adapters may import core; not scanned
    const fullPath = join(srcDir, relPath);
    const text = readFileSync(fullPath, "utf8");

    for (const match of text.matchAll(IMPORT_SPECIFIER_RE)) {
      const specifier = match[1]!;
      if (resolvesIntoAdapters(specifier, dirname(fullPath), srcDir)) {
        violations.push({
          file: relPath,
          kind: "adapter-import",
          detail: `imports "${specifier}" which resolves under src/adapters/**`,
        });
      }
      if (!isGovernanceFile(relPath) && resolvesIntoGovernanceWriter(specifier, dirname(fullPath), srcDir)) {
        violations.push({
          file: relPath,
          kind: "governance-writer-import",
          detail: `imports "${specifier}" — a governance writer primitive reachable only via src/governance/index.ts (ADR-005)`,
        });
      }
      if (!isGovernanceTestingFile(relPath) && resolvesIntoGovernanceTesting(specifier, dirname(fullPath), srcDir)) {
        violations.push({
          file: relPath,
          kind: "governance-testing-import",
          detail: `imports "${specifier}" — src/governance/testing/** is test-only (P460 FIX 2: no non-test src/** file may install a security oracle)`,
        });
      }
      if (!isGovernanceFile(relPath) && !isTestFile(relPath) && resolvesIntoGovernanceSecurityOracle(specifier, dirname(fullPath), srcDir)) {
        violations.push({
          file: relPath,
          kind: "governance-security-oracle-import",
          detail: `imports "${specifier}" — src/governance/security-oracle.ts is governance-internal/test-only (P460 v2: no production src/** file outside src/governance/** may read or install the security oracle directly)`,
        });
      }
      if (!isGovernanceFile(relPath) && !isTestFile(relPath) && resolvesIntoGovernanceCommitGate(specifier, dirname(fullPath), srcDir)) {
        violations.push({
          file: relPath,
          kind: "governance-commit-gate-factory-import",
          detail: `imports "${specifier}" — src/governance/commit-gate.ts's createCommitGate is governance-internal/test-only (P460 v3: no production src/** file outside src/governance/** may build its own commit gate; use PRODUCTION_COMMIT_GATE from src/governance/index.ts)`,
        });
      }
      if (!isTestFile(relPath) && !isGovernanceTestingFile(relPath) && MODULE_BUILTIN_SPECIFIERS.has(specifier)) {
        violations.push({
          file: relPath,
          kind: "module-loader-handle",
          detail: `imports "${specifier}" — a static or dynamic import of the CommonJS module built-in is a module-loader-handle (P460 v5: the whole module-object/createRequire/require.main/require.cache/process.mainModule family is banned outside *.test.ts and src/governance/testing/**)`,
        });
      }
    }

    // P460 v3: no production src/** file (excluding *.test.ts/*.test.tsx and
    // src/governance/testing/**) may call import()/require() with a
    // computed/non-literal argument — see module doc above ("the surviving
    // finding"). Scanned independently of IMPORT_SPECIFIER_RE above, which
    // only ever matches when the argument IS a literal.
    if (!isTestFile(relPath) && !isGovernanceTestingFile(relPath)) {
      for (const callMatch of text.matchAll(DYNAMIC_CALL_RE)) {
        const arg = callMatch[1] ?? "";
        // An empty argument list (`import()`) is not a real call any
        // JS/TS runtime accepts — it shows up here only as prose inside a
        // comment (e.g. this very file's module doc, describing the
        // exploit shape). Skip it rather than flag it; every REAL call
        // this rule cares about has a non-empty argument.
        if (arg.trim().length > 0 && !isSingleStringLiteralArg(arg)) {
          violations.push({
            file: relPath,
            kind: "computed-dynamic-import",
            detail: `calls ${callMatch[0].trim()} — import()/require() with a computed/non-literal argument is banned outside *.test.ts and src/governance/testing/** (P460 v3: the surviving dynamic-import bypass, closed at the syntax level)`,
          });
        }
      }
    }

    // P460 v4: no production src/** file (excluding *.test.ts/*.test.tsx and
    // src/governance/testing/**) may use the bare identifier `require`/
    // `import` outside a static declaration or a direct call — see module
    // doc above ("Fifth Finding"). Independent of every rule above; scanned
    // over the comment/string-stripped copy so prose/string content
    // containing the word "require"/"import" is not misread as the token.
    if (!isTestFile(relPath) && !isGovernanceTestingFile(relPath)) {
      const stripped = stripLineAndBlockComments(text);
      for (const tokenMatch of stripped.matchAll(BARE_MODULE_TOKEN_RE)) {
        const word = tokenMatch[1] as "require" | "import";
        const idx = tokenMatch.index!;
        if (!isAllowedModuleTokenOccurrence(stripped, idx, word)) {
          const snippetStart = Math.max(0, idx - 24);
          const snippetEnd = Math.min(text.length, idx + word.length + 24);
          const snippet = text.slice(snippetStart, snippetEnd).replace(/\s+/g, " ").trim();
          violations.push({
            file: relPath,
            kind: "indirect-module-access",
            detail: `bare identifier "${word}" appears outside a static "import ... from" declaration or a direct require()/import() call (near: "${snippet}") — aliasing, destructuring, indirect/comma-operator calls, and property/element access that yield require/import are banned outside *.test.ts and src/governance/testing/** (P460 v4: closes the aliased-require evasion)`,
          });
        }
      }

      // P460 v5: the module-loader-handle family — see module doc "P460 v5
      // addition" above. Same stripped copy, independent regex/rule.
      for (const handleMatch of stripped.matchAll(MODULE_LOADER_HANDLE_RE)) {
        const idx = handleMatch.index!;
        const matchLen = handleMatch[0].length;
        const snippetStart = Math.max(0, idx - 24);
        const snippetEnd = Math.min(text.length, idx + matchLen + 24);
        const snippet = text.slice(snippetStart, snippetEnd).replace(/\s+/g, " ").trim();
        violations.push({
          file: relPath,
          kind: "module-loader-handle",
          detail: `matches a banned CommonJS module-loader-handle shape (near: "${snippet}") — module.X/module[...], createRequire, require.main/require.cache, and process.mainModule are all banned outside *.test.ts and src/governance/testing/** (P460 v5: closes the module["require"] evasion and the wider handle family)`,
        });
      }
    }

    if (isControlPlaneFile(relPath)) {
      // P460 FIX 3: the runtime-identity-LITERAL rule stays exempt here
      // (ADR-003 catalog DATA), but a runtime-identity literal used as a
      // branching CONDITION is still a violation — see RUNTIME_BRANCH_RE.
      const branchMatch = RUNTIME_BRANCH_RE.exec(text);
      if (branchMatch) {
        violations.push({
          file: relPath,
          kind: "runtime-identity-branch",
          detail: `contains a runtime-identity literal in a branching condition (comparison/if/switch/case/ternary) inside src/control-plane/** — ADR-003 permits runtime identity as catalog DATA only, never LOGIC: "${branchMatch[0].trim()}"`,
        });
      }
    } else {
      const runtimeMatch = RUNTIME_TERM_RE.exec(text);
      if (runtimeMatch) {
        violations.push({
          file: relPath,
          kind: "runtime-identity-literal",
          detail: `contains runtime-identity literal "${runtimeMatch[1]}" (ADR-002: no branching on runtime identity outside src/adapters/**)`,
        });
      }
    }
  }

  return violations;
}

function main(): void {
  const violations = scanBoundaries(SRC_DIR);
  const filesScanned = walkFiles(SRC_DIR, (n) => n.endsWith(".ts") || n.endsWith(".tsx")).length;

  // P450: ADR-003's control-plane/product-primitive boundary, wired into
  // this same section-11.2 command (see module doc above).
  const kindCollisions = scanControlPlaneKindCollisions(CONTROL_PLANE_CATALOG);
  const completenessGaps = scanControlPlaneCompleteness(PACKAGE_ROOT, CONTROL_PLANE_CATALOG);
  const objectTypeFiles = scanForObjectTypeShapedFiles(PACKAGE_ROOT);

  const totalFailures = violations.length + kindCollisions.length + completenessGaps.length + objectTypeFiles.length;

  if (totalFailures > 0) {
    console.error(`boundary:check FAIL — ${totalFailures} total violation(s):`);
    for (const v of violations) {
      console.error(`  [${v.kind}] ${v.file}: ${v.detail}`);
    }
    for (const v of kindCollisions) {
      console.error(`  [control-plane-kind-collision:${v.reasonCode}] ${v.nodeId}: ${v.detail}`);
    }
    for (const g of completenessGaps) {
      console.error(`  [control-plane-completeness:${g.kind}] ${g.detail}`);
    }
    for (const f of objectTypeFiles) {
      console.error(`  [object-type-shaped-file] ${f}`);
    }
    process.exit(1);
  }

  console.log(
    `boundary:check PASS — 0 violations across ${filesScanned} scanned file(s) under src/** (excluding src/adapters/**); ` +
      `0 control-plane/product-primitive kind collisions across ${CONTROL_PLANE_CATALOG.length} catalog entries; ` +
      `0 catalog completeness gaps; 0 *.objecttype.ts files in the successor tree.`,
  );
}

if (import.meta.main) main();
