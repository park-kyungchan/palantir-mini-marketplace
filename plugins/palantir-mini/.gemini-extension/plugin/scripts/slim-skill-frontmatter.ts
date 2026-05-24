#!/usr/bin/env bun
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dir, "..");
const SKILLS_ROOT = path.join(ROOT, "skills");
const MAX_DESCRIPTION_CHARS = 180;
const STOP_MARKERS = [
  " Use when ",
  " Use to ",
  " Useful for ",
  " Proactively ",
  " Inputs ",
  " Creates ",
  " Calls ",
  " Wraps ",
  " Given ",
] as const;

function unquote(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    try {
      return JSON.parse(trimmed) as string;
    } catch {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
}

function compactDescription(raw: string): string {
  let text = unquote(raw)
    .replace(/\s+/g, " ")
    .replace(/\s*\(palantir-mini\)\s*$/i, "")
    .trim();

  for (const marker of STOP_MARKERS) {
    const index = text.indexOf(marker);
    if (index >= 80) {
      text = text.slice(0, index).trim();
      break;
    }
  }

  if (text.length <= MAX_DESCRIPTION_CHARS) {
    return text;
  }

  const sliced = text.slice(0, MAX_DESCRIPTION_CHARS - 3);
  const boundary = Math.max(
    sliced.lastIndexOf(" "),
    sliced.lastIndexOf(";"),
    sliced.lastIndexOf(","),
  );
  return `${sliced.slice(0, boundary > 120 ? boundary : sliced.length).trimEnd()}...`;
}

function isTopLevelKey(line: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_-]*\s*:/.test(line);
}

function rewriteFrontmatter(content: string, skillName: string): { text: string; changed: boolean } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) {
    return { text: content, changed: false };
  }

  const lines = (match[1] ?? "").split("\n");
  const next: string[] = [];
  let changed = false;

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index] ?? "";

    if (/^name\s*:/.test(line)) {
      const replacement = `name: ${skillName}`;
      next.push(replacement);
      changed ||= line !== replacement;
      continue;
    }

    if (/^description\s*:/.test(line)) {
      const rawAfterColon = line.replace(/^description\s*:\s*/, "");
      let rawDescription = rawAfterColon;
      let consumedUntil = index;

      if (rawAfterColon === ">" || rawAfterColon === "|" || rawAfterColon === "") {
        const block: string[] = [];
        for (let nextIndex = index + 1; nextIndex < lines.length; nextIndex++) {
          const candidate = lines[nextIndex] ?? "";
          if (isTopLevelKey(candidate)) {
            break;
          }
          block.push(candidate.trim());
          consumedUntil = nextIndex;
        }
        rawDescription = block.join(" ");
      }

      const replacement = `description: ${JSON.stringify(compactDescription(rawDescription))}`;
      next.push(replacement);
      changed ||= lines.slice(index, consumedUntil + 1).join("\n") !== replacement;
      index = consumedUntil;
      continue;
    }

    next.push(line);
  }

  return {
    text: `---\n${next.join("\n")}\n---\n${content.slice(match[0].length)}`,
    changed,
  };
}

function main(): void {
  const dryRun = process.argv.includes("--dry-run");
  const skillNames = readdirSync(SKILLS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  let changedFiles = 0;
  for (const skillName of skillNames) {
    for (const filename of ["SKILL.md", "SKILL.md.tmpl"]) {
      const filePath = path.join(SKILLS_ROOT, skillName, filename);
      if (!existsSync(filePath)) {
        continue;
      }

      const current = readFileSync(filePath, "utf8");
      const rewritten = rewriteFrontmatter(current, skillName);
      if (!rewritten.changed) {
        continue;
      }

      changedFiles++;
      console.log(`${dryRun ? "WOULD_UPDATE" : "UPDATED"} ${path.relative(ROOT, filePath)}`);
      if (!dryRun) {
        writeFileSync(filePath, rewritten.text);
      }
    }
  }

  if (dryRun && changedFiles > 0) {
    process.exitCode = 1;
  }
  console.log(`changedFiles=${changedFiles}`);
}

main();
