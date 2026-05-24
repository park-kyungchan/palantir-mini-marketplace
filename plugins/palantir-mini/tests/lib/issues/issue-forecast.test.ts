import { describe, expect, test } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { createUniversalOntologyEntry } from "../../../lib/ontology-entry/universal-entry";
import { forecastKnownIssues } from "../../../lib/issues/issue-forecast";
import { loadKnownIssues } from "../../../lib/issues/issue-store";
import type { KnownIssue } from "../../../lib/issues/known-issue";

const KNOWN_ISSUES: readonly KnownIssue[] = [
  {
    issueId: "hyperframes-vrew-timeline-authority",
    projectId: "hyperframes",
    title: "Vrew SRT must remain timeline authority",
    source: "manual-regression-ledger",
    firstObservedAt: "2026-05-12T00:00:00.000Z",
    lastObservedAt: "2026-05-12T00:00:00.000Z",
    observedCount: 2,
    mitigationStatus: "unmitigated",
    triggerPatterns: ["Vrew", "SRT", "review video", "caption"],
    affectedCapabilityRefs: ["hyperframes.review-intent-plan"],
    affectedSurfaceRefs: ["video-framework/ontology/vrew-source.ts"],
    validationPackRefs: ["vrew-source-integrity", "no-whisper-overwrite"],
    severity: "high",
    status: "watching",
    recommendedAction:
      "Do not use Whisper output to replace Vrew captions; use it only as validation/fallback.",
    sourceRefs: ["issue:hyperframes-vrew-timeline-authority"],
  },
  {
    issueId: "closed-issue",
    projectId: "hyperframes",
    title: "Closed issue",
    source: "manual-regression-ledger",
    firstObservedAt: "2026-05-12T00:00:00.000Z",
    lastObservedAt: "2026-05-12T00:00:00.000Z",
    observedCount: 1,
    mitigationStatus: "mitigated",
    triggerPatterns: ["Vrew"],
    affectedCapabilityRefs: [],
    affectedSurfaceRefs: [],
    validationPackRefs: [],
    severity: "blocking",
    status: "closed",
    recommendedAction: "No action.",
    sourceRefs: [],
  },
];

describe("KnownIssueForecast", () => {
  test("matches prompt triggers, surfaces, and selected capabilities while ignoring closed issues", () => {
    const entry = createUniversalOntologyEntry({
      rawUserRequest: "Vrew SRT caption handoff를 검토해줘.",
      projectRoot: "/tmp/hyperframes",
      createdAt: "2026-05-12T00:00:00.000Z",
    });

    const forecast = forecastKnownIssues({
      entry,
      directSurfaceRefs: ["video-framework/ontology/vrew-source.ts"],
      selectedCapabilityRefs: ["hyperframes.review-intent-plan"],
      knownIssues: KNOWN_ISSUES,
    });

    expect(forecast.map((issue) => issue.issueId)).toEqual([
      "hyperframes-vrew-timeline-authority",
    ]);
  });

  test("loader normalizes legacy issue JSON with lifecycle fields", () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "pm-known-issue-"));
    try {
      const issueDir = path.join(project, ".palantir-mini", "issues");
      fs.mkdirSync(issueDir, { recursive: true });
      fs.writeFileSync(
        path.join(issueDir, "known-issues.json"),
        `${JSON.stringify({
          schemaVersion: "palantir-mini/known-issues/v1",
          projectId: "legacy",
          issues: [
            {
              issueId: "legacy-issue",
              projectId: "legacy",
              title: "Legacy issue",
              triggerPatterns: ["legacy"],
              affectedCapabilityRefs: [],
              affectedSurfaceRefs: [],
              validationPackRefs: [],
              severity: "medium",
              status: "watching",
              recommendedAction: "Watch it.",
              sourceRefs: ["legacy-ref"],
            },
          ],
        })}\n`,
        "utf8",
      );

      const issues = loadKnownIssues(project);

      expect(issues[0]?.source).toBe("legacy-ref");
      expect(issues[0]?.firstObservedAt).toBe("1970-01-01T00:00:00.000Z");
      expect(issues[0]?.observedCount).toBe(1);
      expect(issues[0]?.mitigationStatus).toBe("unmitigated");
    } finally {
      fs.rmSync(project, { recursive: true, force: true });
    }
  });
});
