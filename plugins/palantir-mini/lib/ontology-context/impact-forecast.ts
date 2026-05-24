import { walkForward } from "../impact-graph/registry-loader";
import { projectScopePolicyForFiles } from "../lead-intent/project-scope-policy";
import type { UniversalOntologyEntry } from "../ontology-entry/universal-entry";
import type { CapabilityContract } from "../capability/capability-contract";
import type { SkillOntologyContract } from "../skills/skill-ontology-contract";

export interface OntologyImpactForecast {
  readonly directSurfaceRefs: readonly string[];
  readonly downstreamSurfaceRefs: readonly string[];
  readonly confidence: "low" | "medium" | "high";
}

function unique(values: readonly (string | undefined)[]): string[] {
  return Array.from(new Set(values.filter((value): value is string =>
    typeof value === "string" && value.trim().length > 0
  )));
}

function surfaceRefsFromSkills(skills: readonly SkillOntologyContract[]): string[] {
  return unique(skills.flatMap((skill) => [
    ...(skill.readSurfaces ?? []),
    ...(skill.writeSurfaces ?? []),
    ...skill.actionBoundary.mutationSurfaces,
  ]));
}

function surfaceRefsFromCapabilities(capabilities: readonly CapabilityContract[]): string[] {
  return unique(capabilities.flatMap((capability) => [
    ...capability.readSurfaces,
    ...capability.writeSurfaces,
    ...capability.actionBoundary.mutationSurfaces,
  ]));
}

export function forecastOntologyImpact(input: {
  readonly entry: UniversalOntologyEntry;
  readonly projectRoot: string;
  readonly selectedSkills: readonly SkillOntologyContract[];
  readonly selectedCapabilities?: readonly CapabilityContract[];
}): OntologyImpactForecast {
  const skillSurfaces = surfaceRefsFromSkills(input.selectedSkills);
  const capabilitySurfaces = surfaceRefsFromCapabilities(input.selectedCapabilities ?? []);
  const directSurfaceRefs = unique([
    ...input.entry.ontologySeed.surfaceHints,
    ...skillSurfaces,
    ...capabilitySurfaces,
  ]);
  const policy = projectScopePolicyForFiles(directSurfaceRefs, input.projectRoot);
  const laneSurfaces = unique(policy.matches.flatMap((match) => [
    ...match.readerSurfaces,
    ...match.writerSurfaces,
    ...match.currentAuthority,
    ...match.descenders,
  ]));
  const graphSurfaces = unique(directSurfaceRefs.flatMap((surface) =>
    walkForward(input.projectRoot, surface, 2).nodes
      .filter((node) => node.depth > 0)
      .map((node) => node.rid)
  ));
  const downstreamSurfaceRefs = unique([...laneSurfaces, ...graphSurfaces])
    .filter((surface) => !directSurfaceRefs.includes(surface));
  const confidence: OntologyImpactForecast["confidence"] =
    directSurfaceRefs.length === 0
      ? "low"
      : policy.matches.length > 0 || graphSurfaces.length > 0 || input.selectedSkills.length > 0
        || (input.selectedCapabilities?.length ?? 0) > 0
        ? "high"
        : "medium";

  return {
    directSurfaceRefs,
    downstreamSurfaceRefs,
    confidence,
  };
}
