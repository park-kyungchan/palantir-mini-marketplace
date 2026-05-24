import * as fs from "node:fs";
import * as path from "node:path";

export interface SubrepoReadOnlyEntry {
  readonly path: string;
  readonly displayName?: string;
  readonly status?: "clean" | "dirty" | "unknown" | string;
  readonly branch?: string;
  readonly head?: string;
  readonly expectedHead?: string;
  readonly remoteBranch?: string;
  readonly remoteHead?: string;
  readonly remoteBranchMatchesLocal?: boolean;
  readonly dirtyEntryCount?: number;
  readonly dirtyEntries?: readonly {
    readonly path?: string;
    readonly status?: string;
  }[];
  readonly dirty?: boolean;
  readonly mismatch?: boolean;
  readonly readOnly?: boolean;
  readonly sourceRef?: string;
}

export interface SubrepoReadOnlyApplicationState {
  readonly available: boolean;
  readonly manifestPath: string;
  readonly entries: readonly SubrepoReadOnlyEntry[];
  readonly dirtyPaths: readonly string[];
  readonly mismatchPaths: readonly string[];
  readonly dirtyDetails: readonly {
    readonly path: string;
    readonly status?: string;
    readonly dirtyEntryCount?: number;
    readonly dirtyEntries: readonly string[];
  }[];
  readonly mismatchDetails: readonly {
    readonly path: string;
    readonly head?: string;
    readonly expectedHead?: string;
    readonly remoteBranch?: string;
    readonly remoteHead?: string;
    readonly remoteBranchMatchesLocal?: boolean;
  }[];
  readonly readOnly: true;
  readonly error?: string;
}

interface ManifestShape {
  readonly subrepos?: readonly SubrepoReadOnlyEntry[];
  readonly entries?: readonly SubrepoReadOnlyEntry[];
}

function normalizeEntry(projectRoot: string, entry: SubrepoReadOnlyEntry): SubrepoReadOnlyEntry {
  const normalizedPath = path.isAbsolute(entry.path)
    ? entry.path
    : path.resolve(projectRoot, entry.path);
  const dirtyEntryCount = entry.dirtyEntryCount ?? entry.dirtyEntries?.length ?? 0;
  const statusDirty = typeof entry.status === "string" && entry.status.toLowerCase() !== "clean";
  const dirty = entry.dirty ?? (statusDirty || dirtyEntryCount > 0);
  const headMismatch = (
    typeof entry.head === "string" &&
    typeof entry.expectedHead === "string" &&
    entry.head !== entry.expectedHead
  );
  const remoteMismatch = entry.remoteBranchMatchesLocal === false;
  return {
    ...entry,
    path: normalizedPath,
    dirty,
    mismatch: entry.mismatch ?? (headMismatch || remoteMismatch),
    ...(dirtyEntryCount > 0 ? { dirtyEntryCount } : {}),
    readOnly: true,
  };
}

export function subrepoReadOnlyIndexPath(projectRoot: string): string {
  return path.join(projectRoot, ".palantir-mini", "subrepos", "read-only-index.json");
}

export function composeSubrepoReadOnlyApplicationState(
  projectRoot: string,
): SubrepoReadOnlyApplicationState {
  const manifestPath = subrepoReadOnlyIndexPath(projectRoot);
  if (!fs.existsSync(manifestPath)) {
    return {
      available: false,
      manifestPath,
      entries: [],
      dirtyPaths: [],
      mismatchPaths: [],
      dirtyDetails: [],
      mismatchDetails: [],
      readOnly: true,
      error: "read-only subrepo index not found",
    };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as ManifestShape;
    const rawEntries = Array.isArray(parsed.subrepos)
      ? parsed.subrepos
      : Array.isArray(parsed.entries)
        ? parsed.entries
        : [];
    const entries = rawEntries
      .filter((entry) => typeof entry?.path === "string" && entry.path.trim().length > 0)
      .map((entry) => normalizeEntry(projectRoot, entry));
    return {
      available: true,
      manifestPath,
      entries,
      dirtyPaths: entries.filter((entry) => entry.dirty).map((entry) => entry.path),
      mismatchPaths: entries.filter((entry) => entry.mismatch).map((entry) => entry.path),
      dirtyDetails: entries
        .filter((entry) => entry.dirty)
        .map((entry) => ({
          path: entry.path,
          ...(entry.status ? { status: entry.status } : {}),
          ...(entry.dirtyEntryCount !== undefined ? { dirtyEntryCount: entry.dirtyEntryCount } : {}),
          dirtyEntries: (entry.dirtyEntries ?? [])
            .map((dirtyEntry) => dirtyEntry.path ?? dirtyEntry.status ?? "")
            .filter((value) => value.trim().length > 0),
        })),
      mismatchDetails: entries
        .filter((entry) => entry.mismatch)
        .map((entry) => ({
          path: entry.path,
          ...(entry.head ? { head: entry.head } : {}),
          ...(entry.expectedHead ? { expectedHead: entry.expectedHead } : {}),
          ...(entry.remoteBranch ? { remoteBranch: entry.remoteBranch } : {}),
          ...(entry.remoteHead ? { remoteHead: entry.remoteHead } : {}),
          ...(entry.remoteBranchMatchesLocal !== undefined
            ? { remoteBranchMatchesLocal: entry.remoteBranchMatchesLocal }
            : {}),
        })),
      readOnly: true,
    };
  } catch (err) {
    return {
      available: false,
      manifestPath,
      entries: [],
      dirtyPaths: [],
      mismatchPaths: [],
      dirtyDetails: [],
      mismatchDetails: [],
      readOnly: true,
      error: String(err),
    };
  }
}
