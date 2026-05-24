import * as fs from "node:fs";
import * as path from "node:path";

export type HarnessFailureSeverity = "low" | "medium" | "high" | "critical";

export type HarnessFailureClassification =
  | "known-ledgered"
  | "known-release-blocking"
  | "changed-known"
  | "new-release-blocking";

export interface HarnessFailureLedgerEntry {
  readonly testPath: string;
  readonly failureClass: string;
  readonly ownerSurface: string;
  readonly introduced: string;
  readonly severity: HarnessFailureSeverity | string;
  readonly blocksRelease: boolean;
  readonly requiredFix: string;
  readonly removalTarget: string;
}

export interface HarnessFailureObservation {
  readonly testPath: string;
  readonly testName?: string;
  readonly failureClass?: string;
}

export interface HarnessFailureClassificationResult {
  readonly classification: HarnessFailureClassification;
  readonly releaseBlocking: boolean;
  readonly ledgerEntry?: HarnessFailureLedgerEntry;
  readonly reason: string;
}

export interface HarnessFailureLedger {
  readonly sourcePath: string;
  readonly entries: readonly HarnessFailureLedgerEntry[];
}

function stripMarkdownCell(value: string): string {
  return value
    .trim()
    .replace(/^`/, "")
    .replace(/`$/, "")
    .trim();
}

function parseBoolean(value: string): boolean {
  return ["yes", "true", "1"].includes(value.trim().toLowerCase());
}

function normalizeTestId(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function harnessFailureObservationId(
  observation: HarnessFailureObservation,
): string {
  return normalizeTestId(
    observation.testName
      ? `${observation.testPath}::${observation.testName}`
      : observation.testPath,
  );
}

export function parseHarnessFailureLedgerMarkdown(
  markdown: string,
  sourcePath = "tests/KNOWN_BROAD_SUITE_FAILURES.md",
): HarnessFailureLedger {
  const entries: HarnessFailureLedgerEntry[] = [];
  for (const line of markdown.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("| `")) continue;
    const cells = trimmed
      .slice(1, -1)
      .split("|")
      .map(stripMarkdownCell);
    if (cells.length < 8) continue;
    entries.push({
      testPath: normalizeTestId(cells[0]!),
      failureClass: cells[1]!,
      ownerSurface: cells[2]!,
      introduced: cells[3]!,
      severity: cells[4]!,
      blocksRelease: parseBoolean(cells[5]!),
      requiredFix: cells[6]!,
      removalTarget: cells[7]!,
    });
  }
  return { sourcePath, entries };
}

export function readHarnessFailureLedger(
  projectRoot: string,
  relativePath = path.join("tests", "KNOWN_BROAD_SUITE_FAILURES.md"),
): HarnessFailureLedger {
  const sourcePath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(sourcePath)) return { sourcePath, entries: [] };
  return parseHarnessFailureLedgerMarkdown(
    fs.readFileSync(sourcePath, "utf8"),
    sourcePath,
  );
}

export function classifyHarnessFailure(
  observation: HarnessFailureObservation,
  ledger: HarnessFailureLedger,
): HarnessFailureClassificationResult {
  const observedId = harnessFailureObservationId(observation);
  const ledgerEntry = ledger.entries.find((entry) =>
    normalizeTestId(entry.testPath) === observedId
  );

  if (!ledgerEntry) {
    return {
      classification: "new-release-blocking",
      releaseBlocking: true,
      reason: `No ledger entry found for ${observedId}; treat as new broad-suite failure.`,
    };
  }

  if (
    observation.failureClass &&
    observation.failureClass !== ledgerEntry.failureClass
  ) {
    return {
      classification: "changed-known",
      releaseBlocking: true,
      ledgerEntry,
      reason:
        `Failure class changed for ${observedId}: observed=${observation.failureClass} ledger=${ledgerEntry.failureClass}.`,
    };
  }

  if (ledgerEntry.blocksRelease) {
    return {
      classification: "known-release-blocking",
      releaseBlocking: true,
      ledgerEntry,
      reason: `Ledger marks ${observedId} as release-blocking.`,
    };
  }

  return {
    classification: "known-ledgered",
    releaseBlocking: false,
    ledgerEntry,
    reason: `Known broad-suite debt ledgered at ${ledger.sourcePath}.`,
  };
}

export function summarizeHarnessFailureClassifications(
  results: readonly HarnessFailureClassificationResult[],
): {
  readonly total: number;
  readonly releaseBlocking: number;
  readonly knownLedgered: number;
  readonly changedKnown: number;
  readonly newReleaseBlocking: number;
} {
  return {
    total: results.length,
    releaseBlocking: results.filter((result) => result.releaseBlocking).length,
    knownLedgered: results.filter((result) => result.classification === "known-ledgered").length,
    changedKnown: results.filter((result) => result.classification === "changed-known").length,
    newReleaseBlocking: results.filter((result) =>
      result.classification === "new-release-blocking"
    ).length,
  };
}
