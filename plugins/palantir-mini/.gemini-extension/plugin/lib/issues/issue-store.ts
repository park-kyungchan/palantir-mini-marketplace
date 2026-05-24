import * as fs from "node:fs";
import * as path from "node:path";
import type { KnownIssue } from "./known-issue";

const LEGACY_OBSERVED_AT = "1970-01-01T00:00:00.000Z";

function isKnownIssueLike(value: unknown): value is Omit<KnownIssue, "source" | "firstObservedAt" | "lastObservedAt" | "observedCount" | "mitigationStatus"> & Partial<KnownIssue> {
  if (typeof value !== "object" || value === null) return false;
  const issue = value as Partial<KnownIssue>;
  return (
    typeof issue.issueId === "string" &&
    typeof issue.projectId === "string" &&
    typeof issue.title === "string" &&
    Array.isArray(issue.triggerPatterns) &&
    Array.isArray(issue.affectedCapabilityRefs) &&
    Array.isArray(issue.affectedSurfaceRefs) &&
    Array.isArray(issue.validationPackRefs) &&
    typeof issue.recommendedAction === "string" &&
    Array.isArray(issue.sourceRefs)
  );
}

function mitigationStatusFor(issue: Partial<KnownIssue>): KnownIssue["mitigationStatus"] {
  if (issue.mitigationStatus === "unmitigated" ||
    issue.mitigationStatus === "mitigating" ||
    issue.mitigationStatus === "mitigated" ||
    issue.mitigationStatus === "accepted-risk") {
    return issue.mitigationStatus;
  }
  return issue.status === "mitigated" || issue.status === "closed"
    ? "mitigated"
    : "unmitigated";
}

export function normalizeKnownIssue(value: unknown): KnownIssue | null {
  if (!isKnownIssueLike(value)) return null;
  const issue = value as Partial<KnownIssue> & Omit<KnownIssue, "source" | "firstObservedAt" | "lastObservedAt" | "observedCount" | "mitigationStatus">;
  const source = typeof issue.source === "string" && issue.source.trim().length > 0
    ? issue.source
    : issue.sourceRefs[0] ?? "legacy-known-issues-json";
  const firstObservedAt = typeof issue.firstObservedAt === "string" && issue.firstObservedAt.trim().length > 0
    ? issue.firstObservedAt
    : typeof issue.lastObservedAt === "string" && issue.lastObservedAt.trim().length > 0
      ? issue.lastObservedAt
      : LEGACY_OBSERVED_AT;
  const lastObservedAt = typeof issue.lastObservedAt === "string" && issue.lastObservedAt.trim().length > 0
    ? issue.lastObservedAt
    : firstObservedAt;
  const observedCount = typeof issue.observedCount === "number" && Number.isFinite(issue.observedCount) && issue.observedCount > 0
    ? Math.floor(issue.observedCount)
    : 1;

  return {
    ...issue,
    source,
    firstObservedAt,
    lastObservedAt,
    observedCount,
    mitigationStatus: mitigationStatusFor(issue),
  };
}

export function knownIssueStorePath(projectRoot: string): string {
  return path.join(projectRoot, ".palantir-mini", "issues", "known-issues.json");
}

export function loadKnownIssues(projectRoot: string): readonly KnownIssue[] {
  const filePath = knownIssueStorePath(projectRoot);
  if (!fs.existsSync(filePath)) return [];
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
  const issues = Array.isArray(parsed)
    ? parsed
    : typeof parsed === "object" && parsed !== null &&
      Array.isArray((parsed as { issues?: unknown }).issues)
      ? (parsed as { issues: unknown[] }).issues
      : [];
  return issues
    .map(normalizeKnownIssue)
    .filter((issue): issue is KnownIssue => issue !== null);
}

function atomicWriteJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(tmpPath, filePath);
}

export function upsertKnownIssue(projectRoot: string, issue: KnownIssue): KnownIssue {
  const filePath = knownIssueStorePath(projectRoot);
  const existingIssues = loadKnownIssues(projectRoot);
  const nextIssues = [...existingIssues];
  const index = nextIssues.findIndex((item) => item.issueId === issue.issueId);
  let nextIssue = issue;

  if (index >= 0) {
    const existing = nextIssues[index]!;
    const sourceRefs = Array.from(new Set([...existing.sourceRefs, ...issue.sourceRefs])).sort();
    nextIssue = {
      ...existing,
      ...issue,
      firstObservedAt: existing.firstObservedAt < issue.firstObservedAt
        ? existing.firstObservedAt
        : issue.firstObservedAt,
      lastObservedAt: existing.lastObservedAt > issue.lastObservedAt
        ? existing.lastObservedAt
        : issue.lastObservedAt,
      observedCount: Math.max(existing.observedCount, issue.observedCount, sourceRefs.length),
      mitigationStatus: existing.mitigationStatus === "mitigated" && issue.lastObservedAt > existing.lastObservedAt
        ? "mitigating"
        : issue.mitigationStatus,
      sourceRefs,
    };
    nextIssues[index] = nextIssue;
  } else {
    nextIssues.push(nextIssue);
  }

  atomicWriteJson(filePath, {
    schemaVersion: "palantir-mini/known-issues/v1",
    projectId: issue.projectId,
    issues: nextIssues.sort((left, right) => left.issueId.localeCompare(right.issueId)),
  });

  return nextIssue;
}
