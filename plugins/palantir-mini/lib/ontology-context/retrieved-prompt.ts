import type { OntologyContextQueryResult } from "./query";

function line(label: string, values: readonly string[]): string {
  return `${label}: ${values.length > 0 ? values.join(", ") : "none"}`;
}

export function buildOntologyRetrievedPrompt(
  result: Omit<OntologyContextQueryResult, "retrievedPrompt">,
): string {
  return [
    `Universal entry: ${result.entryId}`,
    `Context approval: ${result.contextSeed.approvalState}`,
    line("Ontology objects", result.ontologyContext.objectRefs),
    line("Ontology actions", result.ontologyContext.actionRefs),
    line("Function refs", result.ontologyContext.functionRefs),
    line("Project lanes", result.ontologyContext.laneRefs),
    line("Selected skills", result.skillContext.selectedSkillIds),
    line("Rejected skills", result.skillContext.rejectedSkillIds),
    line("Selected capabilities", result.capabilityContext.selectedCapabilityIds),
    line("Rejected capabilities", result.capabilityContext.rejectedCapabilityIds),
    `Capability DTC required: ${result.capabilityContext.requiredDtc}`,
    line("Direct impact", result.impactContext.directSurfaceRefs),
    line("Downstream impact", result.impactContext.downstreamSurfaceRefs),
    `Impact confidence: ${result.impactContext.confidence}`,
    line("Known issues", result.issueContext.knownIssueIds),
    line("Warnings", result.issueContext.warnings),
    line("Required validation packs", result.validationContext.requiredValidationPacks),
    line("Suggested commands", result.validationContext.suggestedCommands),
  ].join("\n");
}
