import * as fs from "node:fs";
import * as path from "node:path";

export type EvidencePromotionScope = "project" | "shared-core";

export interface EvidencePromotionRecord {
  readonly sourcePath: string;
  readonly normalizedSourcePath?: string;
  readonly scope: EvidencePromotionScope;
  readonly target: string;
  readonly approvedContractRef: string;
  readonly timestamp: string;
  readonly stillReferenceOnlyOutsideScope: true;
}

export interface EvidencePromotionLedger {
  readonly schemaVersion?: "palantir-mini/evidence-promotions/v1";
  readonly promotions?: readonly EvidencePromotionRecord[];
}

export interface EvidencePromotionLedgerSignal {
  readonly signalId: "evidence-promotion-ledger-drift";
  readonly sourcePath: string;
  readonly expected: string;
  readonly observed: string;
}

export function evidencePromotionLedgerPath(projectRoot: string): string {
  return path.join(projectRoot, ".palantir-mini", "evidence", "promotions.json");
}

export function normalizeEvidencePath(projectRoot: string, sourcePath: string): string {
  return path.resolve(
    path.isAbsolute(sourcePath) ? sourcePath : path.join(projectRoot, sourcePath),
  );
}

export function readEvidencePromotionLedger(projectRoot: string): EvidencePromotionLedger {
  const ledgerPath = evidencePromotionLedgerPath(projectRoot);
  if (!fs.existsSync(ledgerPath)) return {};
  return JSON.parse(fs.readFileSync(ledgerPath, "utf8")) as EvidencePromotionLedger;
}

export function findEvidencePromotionRecord(
  projectRoot: string,
  sourcePath: string,
): EvidencePromotionRecord | undefined {
  const normalized = normalizeEvidencePath(projectRoot, sourcePath);
  const ledger = readEvidencePromotionLedger(projectRoot);
  return (ledger.promotions ?? []).find((record) => {
    const recordPath = record.normalizedSourcePath ??
      normalizeEvidencePath(projectRoot, record.sourcePath);
    return recordPath === normalized;
  });
}

export function validateEvidencePromotionLedger(
  projectRoot: string,
): readonly EvidencePromotionLedgerSignal[] {
  const ledger = readEvidencePromotionLedger(projectRoot);
  const signals: EvidencePromotionLedgerSignal[] = [];
  for (const record of ledger.promotions ?? []) {
    const normalized = record.normalizedSourcePath ??
      normalizeEvidencePath(projectRoot, record.sourcePath);
    if (!record.approvedContractRef.trim()) {
      signals.push({
        signalId: "evidence-promotion-ledger-drift",
        sourcePath: record.sourcePath,
        expected: "promotion record requires approvedContractRef",
        observed: "missing",
      });
    }
    if (!record.target.trim()) {
      signals.push({
        signalId: "evidence-promotion-ledger-drift",
        sourcePath: record.sourcePath,
        expected: "promotion record requires target",
        observed: "missing",
      });
    }
    if (!record.timestamp.trim()) {
      signals.push({
        signalId: "evidence-promotion-ledger-drift",
        sourcePath: record.sourcePath,
        expected: "promotion record requires timestamp",
        observed: "missing",
      });
    }
    if (record.stillReferenceOnlyOutsideScope !== true) {
      signals.push({
        signalId: "evidence-promotion-ledger-drift",
        sourcePath: record.sourcePath,
        expected: "stillReferenceOnlyOutsideScope must be true",
        observed: String(record.stillReferenceOnlyOutsideScope),
      });
    }
    if (!fs.existsSync(normalized)) {
      signals.push({
        signalId: "evidence-promotion-ledger-drift",
        sourcePath: record.sourcePath,
        expected: "promoted source path should exist",
        observed: `missing: ${normalized}`,
      });
    }
  }
  return signals;
}
