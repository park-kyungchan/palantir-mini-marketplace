import type { UniversalOntologyEntry } from "../ontology-entry/universal-entry";
import type { KnownIssue } from "./known-issue";

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function includesAny(haystack: string, needles: readonly string[]): boolean {
  const normalizedHaystack = normalize(haystack);
  return needles.some((needle) => normalizedHaystack.includes(normalize(needle)));
}

function intersects(left: readonly string[], right: readonly string[]): boolean {
  const normalizedRight = new Set(right.map(normalize));
  return left.some((value) => normalizedRight.has(normalize(value)));
}

export function forecastKnownIssues(input: {
  readonly entry: UniversalOntologyEntry;
  readonly directSurfaceRefs: readonly string[];
  readonly selectedCapabilityRefs: readonly string[];
  readonly knownIssues: readonly KnownIssue[];
}): readonly KnownIssue[] {
  const entryText = [
    input.entry.prompt.excerpt,
    ...input.entry.ontologySeed.nouns,
    ...input.entry.ontologySeed.verbs,
    ...input.entry.ontologySeed.surfaceHints,
    ...input.entry.ontologySeed.capabilityHints,
  ].join("\n");

  return input.knownIssues
    .filter((issue) => issue.status !== "closed")
    .filter((issue) =>
      includesAny(entryText, issue.triggerPatterns) ||
      intersects(input.directSurfaceRefs, issue.affectedSurfaceRefs) ||
      intersects(input.selectedCapabilityRefs, issue.affectedCapabilityRefs)
    )
    .sort((left, right) => {
      const severityRank = { blocking: 4, high: 3, medium: 2, low: 1 };
      return severityRank[right.severity] - severityRank[left.severity] ||
        left.issueId.localeCompare(right.issueId);
    });
}
