import * as fs from "node:fs";
import * as path from "node:path";
import type { UniversalOntologyEntry } from "./universal-entry";

export interface UniversalOntologyEntryStoreWriteResult {
  readonly entryPath: string;
  readonly currentPath: string;
  readonly entryRef: string;
}

function safeFileSegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96) || "entry";
}

export function universalOntologyEntryStoreDir(projectRoot: string): string {
  return path.join(projectRoot, ".palantir-mini", "session", "ontology-entry");
}

export function universalOntologyEntryPluralStoreDir(projectRoot: string): string {
  return path.join(projectRoot, ".palantir-mini", "session", "ontology-entries");
}

export function universalOntologyEntryPath(
  projectRoot: string,
  entryId: string,
): string {
  return path.join(universalOntologyEntryStoreDir(projectRoot), `${safeFileSegment(entryId)}.json`);
}

export function universalOntologyEntryRef(entry: UniversalOntologyEntry): string {
  return `universal-ontology-entry://${safeFileSegment(entry.entryId)}`;
}

function universalOntologyEntryFallbackPaths(
  projectRoot: string,
  entryId: string,
): string[] {
  const segment = safeFileSegment(entryId);
  return [
    path.join(universalOntologyEntryStoreDir(projectRoot), `${segment}.json`),
    path.join(universalOntologyEntryPluralStoreDir(projectRoot), `${segment}.json`),
  ];
}

function entryIdFromRef(entryRef: string): string {
  return entryRef.replace(/^universal-ontology-entry:\/\//, "");
}

export function writeUniversalOntologyEntry(
  entry: UniversalOntologyEntry,
): UniversalOntologyEntryStoreWriteResult {
  const dir = universalOntologyEntryStoreDir(entry.project.projectRoot);
  fs.mkdirSync(dir, { recursive: true });
  const entryPath = universalOntologyEntryPath(entry.project.projectRoot, entry.entryId);
  const currentPath = path.join(dir, "current.json");
  const payload = `${JSON.stringify(entry, null, 2)}\n`;
  fs.writeFileSync(entryPath, payload, "utf8");
  fs.writeFileSync(currentPath, payload, "utf8");
  return { entryPath, currentPath, entryRef: universalOntologyEntryRef(entry) };
}

export function readUniversalOntologyEntry(
  projectRoot: string,
  entryId: string,
): UniversalOntologyEntry | undefined {
  for (const entryPath of universalOntologyEntryFallbackPaths(projectRoot, entryId)) {
    if (!fs.existsSync(entryPath)) continue;
    return JSON.parse(fs.readFileSync(entryPath, "utf8")) as UniversalOntologyEntry;
  }
  return undefined;
}

export function readUniversalOntologyEntryByRef(
  projectRoot: string,
  entryRef: string,
): UniversalOntologyEntry | undefined {
  return readUniversalOntologyEntry(projectRoot, entryIdFromRef(entryRef));
}

export function readCurrentUniversalOntologyEntry(
  projectRoot: string,
): UniversalOntologyEntry | undefined {
  for (const dir of [
    universalOntologyEntryStoreDir(projectRoot),
    universalOntologyEntryPluralStoreDir(projectRoot),
  ]) {
    const currentPath = path.join(dir, "current.json");
    if (!fs.existsSync(currentPath)) continue;
    return JSON.parse(fs.readFileSync(currentPath, "utf8")) as UniversalOntologyEntry;
  }
  return undefined;
}
