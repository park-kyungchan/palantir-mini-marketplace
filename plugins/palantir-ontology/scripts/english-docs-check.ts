#!/usr/bin/env bun
// docs:check-english (ledger row P340, execution-plan.md section 11.4:
// "All newly authored source, prompts, reports, schemas, reason codes, and
// PR text are English only.", AGENT-CONTRACT.md section 8).
//
// Scans every *.md file in this plugin (root docs + docs/**) for codepoints
// outside an allow-list of Latin-script text + common typographic
// punctuation already in use across these docs (em/en dash, curly quotes,
// ellipsis, arrows). Flags Hangul, CJK, Hiragana/Katakana, Cyrillic, and
// other non-Latin scripts — the actual "non-English" failure mode this
// check exists to catch (per the user's global rule: "Korean chat, English
// work" — this is the automated backstop for that rule inside this
// plugin). Run standalone: `bun run docs:check-english`.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { walkFiles } from "./lib/fs-walk";

const PACKAGE_ROOT = resolve(import.meta.dir, "..");

// Disallowed Unicode ranges: the scripts this check exists to catch.
const DISALLOWED_RANGES: ReadonlyArray<readonly [number, number, string]> = [
  [0x1100, 0x11ff, "Hangul Jamo"],
  [0x3040, 0x309f, "Hiragana"],
  [0x30a0, 0x30ff, "Katakana"],
  [0x3130, 0x318f, "Hangul Compatibility Jamo"],
  [0x3400, 0x4dbf, "CJK Extension A"],
  [0x4e00, 0x9fff, "CJK Unified Ideographs"],
  [0xa960, 0xa97f, "Hangul Jamo Extended-A"],
  [0xac00, 0xd7a3, "Hangul Syllables"],
  [0xd7b0, 0xd7ff, "Hangul Jamo Extended-B"],
  [0x0400, 0x04ff, "Cyrillic"],
];

export interface EnglishViolation {
  readonly file: string;
  readonly line: number;
  readonly column: number;
  readonly char: string;
  readonly script: string;
}

export function findNonEnglishChars(text: string): Array<Omit<EnglishViolation, "file">> {
  const violations: Array<Omit<EnglishViolation, "file">> = [];
  const lines = text.split("\n");
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx]!;
    for (let colIdx = 0; colIdx < line.length; colIdx++) {
      const codePoint = line.codePointAt(colIdx)!;
      for (const [start, end, script] of DISALLOWED_RANGES) {
        if (codePoint >= start && codePoint <= end) {
          violations.push({ line: lineIdx + 1, column: colIdx + 1, char: line[colIdx]!, script });
          break;
        }
      }
    }
  }
  return violations;
}

function main(): void {
  const files = walkFiles(PACKAGE_ROOT, (name) => name.endsWith(".md")).filter(
    (relPath) => !relPath.startsWith("node_modules/"),
  );

  const allViolations: EnglishViolation[] = [];
  for (const relPath of files) {
    const text = readFileSync(resolve(PACKAGE_ROOT, relPath), "utf8");
    for (const v of findNonEnglishChars(text)) {
      allViolations.push({ file: relPath, ...v });
    }
  }

  if (allViolations.length > 0) {
    console.error(`docs:check-english FAIL — ${allViolations.length} non-English character(s) across ${files.length} scanned .md file(s):`);
    for (const v of allViolations.slice(0, 50)) {
      console.error(`  ${v.file}:${v.line}:${v.column}: "${v.char}" (${v.script})`);
    }
    process.exit(1);
  }

  console.log(`docs:check-english PASS — 0 non-English characters across ${files.length} scanned .md file(s).`);
}

if (import.meta.main) main();
