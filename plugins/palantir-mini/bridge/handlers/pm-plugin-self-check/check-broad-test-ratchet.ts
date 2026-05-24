import * as fs from "fs";
import { eventsPathFor } from "../../../scripts/log";
import { readEvents } from "../../../lib/event-log/read";
import type { EventEnvelope } from "../../../lib/event-log/types";
import {
  classifyHarnessFailure,
  harnessFailureObservationId,
  readHarnessFailureLedger,
  summarizeHarnessFailureClassifications,
  type HarnessFailureClassificationResult,
  type HarnessFailureLedgerEntry,
  type HarnessFailureObservation,
} from "../../../lib/harness/failure-ledger";
import type { PmPluginSelfCheckResult } from "./types";

type BroadTestRatchetResult = PmPluginSelfCheckResult["broadTestRatchetResult"];

function eventType(event: EventEnvelope): string {
  return String((event as { type?: unknown }).type ?? "");
}

function payload(event: EventEnvelope): Record<string, unknown> {
  const value = (event as { payload?: unknown }).payload;
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function isBroadFailureEvent(event: EventEnvelope): boolean {
  const data = payload(event);
  return eventType(event) === "broad_test_failure_observed" ||
    data.errorClass === "broad_test_failure_observed";
}

function observationFromEvent(
  event: EventEnvelope,
  missingMetadata: string[],
): HarnessFailureObservation | undefined {
  const data = payload(event);
  const eventId = String((event as { eventId?: unknown }).eventId ?? event.when);
  if (typeof data.testPath !== "string" || data.testPath.trim().length === 0) {
    missingMetadata.push(`${eventId}: broad_test_failure_observed payload requires testPath`);
    return undefined;
  }
  return {
    testPath: data.testPath,
    ...(typeof data.testName === "string" && data.testName.trim().length > 0
      ? { testName: data.testName }
      : {}),
    ...(typeof data.failureClass === "string" && data.failureClass.trim().length > 0
      ? { failureClass: data.failureClass }
      : {}),
  };
}

function missingEntryMetadata(entry: HarnessFailureLedgerEntry | undefined): string[] {
  if (!entry) return [];
  const fields: Array<[keyof HarnessFailureLedgerEntry, string]> = [
    ["testPath", "test_path"],
    ["failureClass", "failure_class"],
    ["ownerSurface", "owner_surface"],
    ["introduced", "introduced"],
    ["severity", "severity"],
    ["requiredFix", "required_fix"],
    ["removalTarget", "removal_target"],
  ];
  return fields
    .filter(([field]) => String(entry[field] ?? "").trim().length === 0)
    .map(([, label]) => `${entry.testPath}: ledger entry missing ${label}`);
}

function findRawBlocksReleaseMetadataIssues(ledgerPath: string): string[] {
  if (!fs.existsSync(ledgerPath)) return [];
  return fs
    .readFileSync(ledgerPath, "utf8")
    .split("\n")
    .filter((line) => line.trim().startsWith("| `"))
    .flatMap((line) => {
      const cells = line.slice(1, -1).split("|").map((cell) => cell.trim());
      const testPath = cells[0]?.replace(/^`|`$/g, "").trim() || "(unknown)";
      const blocksRelease = cells[5]?.trim();
      return blocksRelease ? [] : [`${testPath}: ledger entry missing blocks_release`];
    });
}

export function checkBroadTestRatchet(project: string): BroadTestRatchetResult {
  const ledger = readHarnessFailureLedger(project);
  const eventsPath = eventsPathFor(project);
  const missingMetadata: string[] = [];
  const observations = readEvents(eventsPath)
    .filter(isBroadFailureEvent)
    .flatMap((event) => {
      const observation = observationFromEvent(event, missingMetadata);
      return observation ? [observation] : [];
    });

  const classifications: HarnessFailureClassificationResult[] = observations.map((observation) =>
    classifyHarnessFailure(observation, ledger)
  );
  const summary = summarizeHarnessFailureClassifications(classifications);

  const observedIds = new Set(observations.map(harnessFailureObservationId));
  const matchedEntries = classifications
    .map((classification) => classification.ledgerEntry)
    .filter((entry): entry is HarnessFailureLedgerEntry => Boolean(entry));
  const matchedEntryIds = new Set(matchedEntries.map((entry) => entry.testPath));
  const ledgerMetadataIssues = [
    ...matchedEntries.flatMap(missingEntryMetadata),
    ...findRawBlocksReleaseMetadataIssues(ledger.sourcePath)
      .filter((issue) => {
        const [testPath] = issue.split(": ledger entry missing ");
        return testPath !== undefined && matchedEntryIds.has(testPath);
      }),
  ];
  missingMetadata.push(...ledgerMetadataIssues);

  const status: BroadTestRatchetResult["status"] =
    missingMetadata.length > 0 || summary.releaseBlocking > 0 ? "fail" : "pass";
  const visibleKnownBaselines = classifications.filter((item) =>
    item.classification === "known-ledgered" || item.classification === "known-release-blocking"
  ).length;

  return {
    status,
    details: observations.length === 0
      ? `No broad_test_failure_observed events found; ledger entries visible=${ledger.entries.length}.`
      : `Observed ${observations.length} broad failure(s); releaseBlocking=${summary.releaseBlocking}; knownBaselines=${visibleKnownBaselines}.`,
    ledgerPath: ledger.sourcePath,
    ledgerEntryCount: ledger.entries.length,
    observedFailureCount: observations.length,
    releaseBlockingCount: summary.releaseBlocking,
    missingMetadata,
    classifications: classifications.map((classification, index) => ({
      testId: observations[index] ? harnessFailureObservationId(observations[index]!) : "(unknown)",
      classification: classification.classification,
      releaseBlocking: classification.releaseBlocking,
      reason: classification.reason,
    })),
    observedIds: [...observedIds].sort(),
  };
}
