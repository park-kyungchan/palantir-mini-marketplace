export interface KnownIssue {
  readonly issueId: string;
  readonly projectId: string;
  readonly title: string;
  readonly source: string;
  readonly firstObservedAt: string;
  readonly lastObservedAt: string;
  readonly observedCount: number;
  readonly mitigationStatus: "unmitigated" | "mitigating" | "mitigated" | "accepted-risk";

  readonly triggerPatterns: readonly string[];
  readonly affectedCapabilityRefs: readonly string[];
  readonly affectedSurfaceRefs: readonly string[];
  readonly validationPackRefs: readonly string[];

  readonly severity: "low" | "medium" | "high" | "blocking";
  readonly status: "open" | "watching" | "mitigated" | "closed";

  readonly recommendedAction: string;
  readonly sourceRefs: readonly string[];
}
