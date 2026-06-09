# In-plugin SSoT — INDEX (primitive catalog)

palantir-mini canonical runtime SSoT. Resolve #schemas/* here. Query router: BROWSE.md.

## Primitives

| primitive | description |
|---|---|
| action-type | palantir-mini — ActionType primitive (prim-action-01, prim-action-02) |
| agent-definition | AgentDefinition primitive (prim-ops-22, v1.27.0) |
| agentic-memory-layer | AgenticMemoryLayer enum primitive (prim-learn-16, v1.35.0) |
| aip-evaluation | AIPEvaluation primitives (prim-learn-20, v1.37.0) |
| aip-logic-function | AIPLogicFunction primitive (prim-logic-03, v1.0) |
| approval-ref | ApprovalRef primitive (prim-learn-22, v1.51.0) |
| automation-declaration | AutomationDeclaration primitive (prim-action-03, v1.0) |
| back-prop-value-index | BackPropValueIndex primitive (prim-data-NN, sprint-101 PR 4.1b) |
| capability-token | CapabilityToken primitive (prim-security-02, v1.0) |
| claude-code-version | palantir-mini — ClaudeCodeVersion primitive (prim-version-01) |
| codegen-header-contract | palantir-mini — CodegenHeaderContract primitive (prim-learn-11) |
| commit | Commit primitive (prim-data-19, v1.0.0) |
| context-capsule | ContextCapsule primitive (prim-learn-26, v1.0.0) |
| dead-code-marker | palantir-mini — DeadCodeMarker primitive (prim-learn-08) |
| derived-property | DerivedPropertyDeclaration primitive (prim-data-26, v1.46.0) |
| digital-twin-change-contract | DigitalTwinChangeContract primitive (prim-learn-26, v1.51.0) |
| dispatch-contract | DispatchContract primitive (prim-action-12, v1.48.0) |
| document-corpus | DocumentCorpus primitive (prim-context-02, v1.56.0) |
| edge-base-type | EdgeBaseDeclaration primitive (prim-logic-01, v1.59.0) |
| failure-category | FailureCategory enum primitive (prim-data-13, v1.32.0) |
| failure-mode | FailureMode primitive (prim-data-23, v1.0.0) |
| fde-gap-report | palantir-mini schema primitive — FDEGapReportDetailed (Slice 3.A extension) |
| fde-grading-rubric | palantir-mini schema primitive — FDE 17-Criterion Grading Rubric |
| fde-naming-classification | palantir-mini schema primitive — FDE Naming Classification |
| fde-ontology-build-session | palantir-mini schema primitive — FDEOntologyBuildSession + FDEGapReport |
| fde-panel | palantir-mini schema primitive — FDE Workbench Panel Projection |
| feedback-loop | FeedbackLoop primitive (prim-logic-04, v1.35.0) |
| feedback-loop-closed | FeedbackLoopClosed event payload primitive (prim-data-09, v1.15.0) |
| file-complexity-budget | palantir-mini — FileComplexityBudget primitive (prim-learn-07) |
| function | Function primitive (prim-logic-04, v1.0.0) |
| generated-artifact | GeneratedArtifact primitive (prim-data-22, v1.0.0) |
| global-branching-proposal | GlobalBranchingProposal primitive (prim-learn-21, v1.40.0) |
| grader | Grader primitive (prim-harness-11, v1.0.0) |
| grader-effort | GraderEffort primitive (prim-harness-10, v1.42.0) |
| grading-criterion | GradingCriterion primitive (prim-data-08, v1.42.0) |
| grading-rubric | GradingRubric primitive (prim-data-NN, v1.61.0 — schemas 1.60→1.61) |
| hands-manifest | HandsManifest primitive (prim-harness-11, v1.42.0) |
| harness-agent | HarnessAgent primitive (prim-learn-11, v1.14.0) |
| harness-species-cost-profile | HarnessSpeciesCostProfile primitive (prim-harness-12, v1.42.0) |
| harness-species-enum | HarnessSpeciesEnum primitive (prim-meta-02, v1.50.0) |
| hook | Hook primitive (prim-ops-24, v1.0.0) |
| hook-event-allowlist | palantir-mini — HookEventAllowlist primitive (prim-hooks-01) |
| impact-edge | palantir-mini — ImpactEdge primitive (prim-learn-12) |
| interface-type | palantir-mini — InterfaceType primitive (prim-logic-02) |
| lineage-conformance-policy | palantir-mini — LineageConformancePolicy primitive (prim-learn-09) |
| lineage-refs | LineageRefs interface primitive (prim-learn-17, v1.35.0) |
| link-type | palantir-mini — LinkType / Object-Backed LinkType primitive (prim-logic-03) |
| managed-settings-fragment | palantir-mini — ManagedSettingsFragment primitive (prim-learn-10) |
| marking-declaration | MarkingDeclaration primitive (prim-security-03, v1.0) |
| mcp-handler | McpHandler primitive (prim-ops-25, v1.0.0) |
| mcp-tool-declaration | MCPToolDeclaration primitive (prim-action-07, v1.40.0) |
| memory-index-entry | palantir-mini — MEMORYIndexEntry primitive (prim-memory-01) |
| model-trust-profile | ModelTrustProfile primitive (prim-trust-01, v1.57.0) |
| object-security-policy | ObjectSecurityPolicy primitive (prim-security-04, v1.40.0) |
| object-type | palantir-mini — ObjectType primitive (prim-data-02) |
| object-view | ObjectView primitive (prim-data-22, v1.37.0) |
| official-research-doc | OfficialResearchDoc primitive (prim-data-21, v1.0.0) |
| ontology-branch-proposal | OntologyBranchProposal primitives (prim-learn-19, v1.37.0) |
| ontology-context-approval | OntologyContextApproval primitive (prim-context-01, v1.55.0) |
| ontology-context-seed | OntologyContextSeed primitive (prim-data-NN, v1.62.0) |
| ontology-engineering-ref | OntologyEngineeringRef primitive (prim-learn-23, v1.51.0) |
| ontology-simulation | OntologySimulation primitive (prim-data-23, v1.40.0) |
| outcome-pairing | OutcomePairing primitive (prim-logic-05, v1.35.0) |
| pedagogy-contract | PedagogyContract primitive (prim-learn-12, v1.15.0) |
| playwright-scenario | PlaywrightScenario primitive (prim-learn-04, v1.14.0) |
| plugin-manifest | palantir-mini — PluginManifest primitive (prim-plugin-01) |
| project-browse-doc | ProjectBrowseDoc primitive (prim-data-15, v1.0.0) |
| project-index-doc | ProjectIndexDoc primitive (prim-data-16, v1.0.0) |
| project-ontology-index | ProjectOntologyIndex primitive (prim-learn-NN, v1.53.0) |
| project-schema-pin | palantir-mini — ProjectSchemaPin primitive (prim-learn-06) |
| prompt-contract-record | PromptContractRecord primitive (prim-learn-27, v1.51.0) |
| prompt-envelope | PromptEnvelope primitive (prim-learn-24, v1.51.0) |
| propagation-audit | PropagationAuditPayload primitive (prim-data-18, v1.34.0) |
| propagation-health | PropagationHealthPayload primitive (prim-data-20, v1.34.0) |
| propagation-replay | PropagationReplayPayload primitive (prim-data-19, v1.34.0) |
| property-security-policy | PropertySecurityPolicy primitive (prim-security-05, v1.40.0) |
| property-type | palantir-mini — PropertyType primitive (prim-data-03) |
| pull-request | PullRequest primitive (prim-data-20, v1.0.0) |
| refinement-target | RefinementTarget interface primitive (prim-learn-18, v1.35.0) |
| research-document | palantir-mini — ResearchDocument primitive (prim-research-01) |
| research-source-manifest | ResearchSourceManifest primitive (prim-research-09, v1.39.0) |
| retention-manifest | RetentionManifest primitive — per-tier event retention policy + provenance |
| retry-policy | RetryPolicy primitive (prim-action-09, v1.40.0) |
| rule | palantir-mini — Rule primitive (prim-ops-19) |
| runtime-entrypoint | RuntimeEntrypoint primitive (prim-ops-26, v1.0.0) |
| runtime-fingerprint | RuntimeFingerprint primitive (prim-data-NN, v1.63.0) |
| scenario-sandbox | ScenarioSandbox primitive (prim-learn-03, v1.0) |
| semantic-intent-contract | SemanticIntentContract primitive (prim-learn-25, v1.62.0) |
| semantic-rid | palantir-mini — SemanticRid primitive (prim-learn-13) |
| shared-property-type | SharedPropertyType primitive (prim-data-07, v1.0) |
| skill | Skill primitive (prim-ops-27, v1.0.0) |
| skill-definition | SkillDefinition primitive (prim-ops-23, v1.27.0) |
| source-executor | SourceExecutor primitive (prim-action-08, v1.40.0) |
| source-file | SourceFile primitive (prim-data-17, v1.0.0) |
| sprint-contract | SprintContract primitive (prim-action-05, v1.48.0) |
| struct | Struct primitive (prim-data-05, v1.0) |
| test | Test primitive (prim-data-18, v1.0.0) |
| tool | Tool primitive (prim-action-08, v1.0.0) |
| universal-ontology-entry | UniversalOntologyEntry primitive (prim-learn-28, v1.54.0) |
| user-prompt | UserPrompt primitive (prim-learn-25, v1.0.0) |
| value-grade | ValueGrade enum primitive (prim-data-21, v1.35.0) |
| value-type | ValueType primitive (prim-data-06, v1.0) |
| webhook-declaration | WebhookDeclaration primitive (prim-action-04, v1.0) |
| workflow-lineage-graph | WorkflowLineageGraph primitive (prim-data-24, v1.40.0) |

## Subtrees

| subtree | .ts file count |
|---|---|
| ontology/action | 1 |
| ontology/codegen | 10 |
| ontology/data | 1 |
| ontology/functions | 3 |
| ontology/generators | 2 |
| ontology/lineage | 2 |
| ontology/logic | 1 |
| ontology/policies | 3 |
| ontology/project-validator | 9 |
| ontology/security | 1 |
| ontology/seeds | 2 |
| ontology/semantic-audit | 4 |
| ontology/semantics | 7 |
| ontology/types | 7 |
| interaction/ | 4 |
| rendering/ | 3 |
| meta/ | 2 |
