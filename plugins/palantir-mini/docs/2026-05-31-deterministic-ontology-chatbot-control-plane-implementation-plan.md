# Deterministic Ontology Chatbot Control Plane Implementation Plan

PLAN-0001 Document status: implementation plan only; no product code is changed by this document.
PLAN-0002 Document language: English, by explicit user request for the implementation plan artifact.
PLAN-0003 Repository root: /home/palantirkc/palantir-mini-marketplace.
PLAN-0004 Canonical plugin source root: /home/palantirkc/palantir-mini-marketplace/plugins/palantir-mini.
PLAN-0005 Marketplace root role: packaging, distribution, and integrity orchestration only.
PLAN-0006 Runtime cache role: installed payload only, never semantic authority.
PLAN-0007 Runtime used for authoring: Codex native runtime.
PLAN-0008 Plugin usage boundary for this plan: palantir-mini plugin tools, skills, MCP handlers, and workflows were not used to produce the analysis.
PLAN-0009 Implementation execution boundary after final review: do not use palantir-mini plugin tools, workflow routing, Prompt-DTC gates, response-template enforcement, or plugin MCP handlers while executing this plan unless the user explicitly opts back in. Use ordinary Codex filesystem, shell, git, Bun tests, and code review.
PLAN-0010 Primary outcome: convert proposal-level guidance into an executable, release-blocking implementation sequence.
PLAN-0011 Primary safety objective: prevent LLM text, runtime adapters, environment variables, and runtime caches from authorizing mutation.
PLAN-0012 Primary ontology objective: separate ContextEngineering review domains from Ontology primitive definitions throughout prompt, FDE, SIC, DTC, routing, and commit flows.
PLAN-0013 Primary user-experience objective: preserve non-programmer Korean-facing FDE cards while moving authorization into deterministic plugin gates.
PLAN-0014 Primary release objective: make missing evidence, unsupported parity claims, semantic conflicts, and hook schema drift fail release self-checks.
PLAN-0015 Scope is limited to the palantir-mini plugin source and marketplace integrity surfaces.
PLAN-0016 Scope excludes direct edits to generated files.
PLAN-0017 Scope excludes direct edits to runtime plugin caches.
PLAN-0018 Scope excludes Claude and Gemini installation packaging unless separate evidence-backed runtime packages are added later.
PLAN-0019 Scope excludes changing the LLM provider layer into a semantic authority.
PLAN-0020 Scope excludes adding bypass behavior for ontology-write, external-command, commit, PR, or release mutations.
PLAN-0021 Every mutation-capable surface must converge on a single deterministic governance decision envelope.
PLAN-0022 Every LLM-visible control surface must be derived from SemanticConversationState or a schema-compatible projection.
PLAN-0023 Every runtime parity statement must be backed by runtime evidence, not by provider identity metadata.
PLAN-0024 Every semantic term promotion must be backed by deterministic resolver output and approval evidence.
PLAN-0025 Every DTC approval must distinguish review-domain closure from typed ontology primitive references.
PLAN-0026 Every hook required for mutation must fail closed on exception, timeout, invalid input, invalid output, or nonzero failure.
PLAN-0027 Every environment variable override must strengthen gates or leave them unchanged.
PLAN-0028 No environment variable may weaken the project gate policy for protected mutations.
PLAN-0029 No LLM may mark mutationAuthorized, dtcReady, promotionReady, approved, or runtime parity fields true.
PLAN-0030 No runtime adapter may invent workflow semantics or weaken plugin decisions.
PLAN-0031 No root-level file may become a semantic fork of plugin hooks, handlers, agents, skills, schemas, or workflow family definitions.
PLAN-0032 No cache file may be treated as the source of truth for plugin behavior.
PLAN-0033 No advisory status may authorize a mutation.
PLAN-0034 No missing SIC may authorize an ontology-affecting mutation.
PLAN-0035 No missing DTC may authorize ontology-write, external-command, commit, PR, or release mutations.
PLAN-0036 No missing WorkContract may authorize commit_edits for protected mutation classes.
PLAN-0037 No missing dry-run evidence may authorize commit or release.
PLAN-0038 No missing eval evidence may authorize release.
PLAN-0039 No unresolved blocking semantic conflict may authorize SIC or DTC promotion.
PLAN-0040 No unsupported runtime may be described as native, adapter-native, or parity-complete.
PLAN-0041 No hook schema mismatch may be downgraded to advisory for mutation-required hooks.
PLAN-0042 No unhandled exception in a mutation hook may return continue.
PLAN-0043 No invalid stdin for a mutation hook may return continue.
PLAN-0044 No timeout for a mutation hook may return continue.
PLAN-0045 No quick sprint inline grade failure may silently become allow for plugin-source, ontology-write, commit, PR, or release mutations.
PLAN-0046 No dry-run grace period may authorize protected mutation after this hardening sequence.
PLAN-0047 Implementation sequence is PR-0 through PR-9.
PLAN-0048 Each PR is intentionally narrow enough to review, test, rollback, and release independently.
PLAN-0049 Each PR must preserve append-only lineage semantics for events.
PLAN-0050 Each PR must keep human-readable documents synchronized with machine-readable contracts where applicable.
PLAN-0051 Each PR must include targeted tests that fail before implementation and pass after implementation.
## Final Review Execution Override

PLAN-0051A Final review verdict: the original proposal is directionally correct but must not be executed exactly as written.
PLAN-0051B Execution override: plan execution must be plugin-free by default because palantir-mini workflow gates add too much meta-governance overhead for this self-improvement sequence.
PLAN-0051C Plugin-free means no palantir-mini MCP calls, no pm_semantic_intent_gate, no pm_intent_router, no pm_plugin_self_check, no palantir-mini skill invocation, no Prompt-DTC approval collection, and no palantir-mini response-template enforcement during implementation.
PLAN-0051D Plugin-free does not weaken the product target: the code being changed must still make protected mutation fail closed.
PLAN-0051E Implementation authority remains the source checkout at /home/palantirkc/palantir-mini-marketplace/plugins/palantir-mini, not runtime cache payloads under ~/.codex/plugins/cache.
PLAN-0051F Official Palantir source authority for terminology review is ~/.claude/research/palantir-official/BROWSE.md and ~/.claude/research/palantir-official/INDEX.md first; generated body files under palantir-official/ are local evidence mirrors generated on 2026-05-12 and are not live-current upstream proof.
PLAN-0051G The next implementation session must start with PR-0 only, use a fresh branch or worktree, avoid the existing dirty main worktree, and stop after PR-0 verification.
PLAN-0051H The implementation session must not include this plan document, .palantir-mini/session artifacts, runtime caches, generated files, or unrelated overlays in the PR unless the user explicitly expands scope.
PLAN-0051I PR-level release proof is local and test-based: targeted Bun tests, git diff --check, explicit changed-file review, and PR-body evidence are sufficient for PR-0. Full palantir-mini release-gate automation is deferred.
PLAN-0051J The final program release gate is not ready yet; before claiming program completion, add an acceptance-id to verifier-command to artifact-path to failure-reason-code matrix.
## Source Ledger

PLAN-0052 Source ledger item: Root marketplace README.
PLAN-0053 Source path or URL: README.md.
PLAN-0054 Evidence purpose: Declares private Codex marketplace role and plugin implementation path.
PLAN-0055 Implementation implication: any code change touching this topic MUST verify the source again before landing.
PLAN-0056 Source ledger item: Plugin README.
PLAN-0057 Source path or URL: plugins/palantir-mini/README.md.
PLAN-0058 Evidence purpose: Declares Ontology-First control plane, source authority, prompt-to-DTC path, and self-check expectations.
PLAN-0059 Implementation implication: any code change touching this topic MUST verify the source again before landing.
PLAN-0060 Source ledger item: SSoT authority file.
PLAN-0061 Source path or URL: plugins/palantir-mini/.ssot-authority.json.
PLAN-0062 Evidence purpose: Declares plugin authority, upstream authority, Codex consumer runtime, and forbidden runtime semantic forks.
PLAN-0063 Implementation implication: any code change touching this topic MUST verify the source again before landing.
PLAN-0064 Source ledger item: Runtime layer boundary doc.
PLAN-0065 Source path or URL: plugins/palantir-mini/docs/RUNTIME_LAYER_BOUNDARY.md.
PLAN-0066 Evidence purpose: Declares Codex-only local install and runtime/provider/plugin separation.
PLAN-0067 Implementation implication: any code change touching this topic MUST verify the source again before landing.
PLAN-0068 Source ledger item: Commit edits governance hook.
PLAN-0069 Source path or URL: plugins/palantir-mini/hooks/commit-edits-governance.ts.
PLAN-0070 Evidence purpose: Contains protected mutation gating and current fail-open paths.
PLAN-0071 Implementation implication: any code change touching this topic MUST verify the source again before landing.
PLAN-0072 Source ledger item: Prompt DTC enforcement hook.
PLAN-0073 Source path or URL: plugins/palantir-mini/hooks/prompt-dtc-enforcement-gate.ts.
PLAN-0074 Evidence purpose: Contains prompt-to-DTC gate modes, bypass behavior, and pre-mutation assessment.
PLAN-0075 Implementation implication: any code change touching this topic MUST verify the source again before landing.
PLAN-0076 Source ledger item: Hook intent registry.
PLAN-0077 Source path or URL: plugins/palantir-mini/hooks/hooks.json.
PLAN-0078 Evidence purpose: Contains runtime-neutral hook intent and current fail-closed metadata gaps.
PLAN-0079 Implementation implication: any code change touching this topic MUST verify the source again before landing.
PLAN-0080 Source ledger item: Codex hook adapter.
PLAN-0081 Source path or URL: plugins/palantir-mini/lib/codex/codex-hook-adapter.ts.
PLAN-0082 Evidence purpose: Live-reads hook intent and maps hook results into Codex-native responses.
PLAN-0083 Implementation implication: any code change touching this topic MUST verify the source again before landing.
PLAN-0084 Source ledger item: Pre mutation governance helper.
PLAN-0085 Source path or URL: plugins/palantir-mini/lib/governance/pre-mutation-governance.ts.
PLAN-0086 Evidence purpose: Currently wraps a caller-provided allowed boolean rather than computing authorization.
PLAN-0087 Implementation implication: any code change touching this topic MUST verify the source again before landing.
PLAN-0088 Source ledger item: Pre mutation impact gate.
PLAN-0089 Source path or URL: plugins/palantir-mini/lib/governance/pre-mutation-impact-gate.ts.
PLAN-0090 Evidence purpose: Checks protected mutation, DTC approval, work contract, and semantic conflict signals.
PLAN-0091 Implementation implication: any code change touching this topic MUST verify the source again before landing.
PLAN-0092 Source ledger item: FDE governance policy.
PLAN-0093 Source path or URL: plugins/palantir-mini/lib/governance/fde-governance-policy.ts.
PLAN-0094 Evidence purpose: Infers review domains and compiles pre-mutation policy.
PLAN-0095 Implementation implication: any code change touching this topic MUST verify the source again before landing.
PLAN-0096 Source ledger item: Workflow family contract.
PLAN-0097 Source path or URL: plugins/palantir-mini/core/contracts/workflow-family-enforcement.ts.
PLAN-0098 Evidence purpose: Defines workflow families, runtime projections, scenarios, and current parity defaults.
PLAN-0099 Implementation implication: any code change touching this topic MUST verify the source again before landing.
PLAN-0100 Source ledger item: Runtime boundary test.
PLAN-0101 Source path or URL: plugins/palantir-mini/tests/runtime-boundary/runtime-boundary.test.ts.
PLAN-0102 Evidence purpose: Asserts Codex-only native overlay expectations.
PLAN-0103 Implementation implication: any code change touching this topic MUST verify the source again before landing.
PLAN-0104 Source ledger item: Semantic consistency types.
PLAN-0105 Source path or URL: plugins/palantir-mini/lib/semantic-consistency/types.ts.
PLAN-0106 Evidence purpose: Defines canonical terms, source terms, mappings, conflicts, and deterministic resolver output.
PLAN-0107 Implementation implication: any code change touching this topic MUST verify the source again before landing.
PLAN-0108 Source ledger item: Semantic consistency resolver.
PLAN-0109 Source path or URL: plugins/palantir-mini/lib/semantic-consistency/resolver.ts.
PLAN-0110 Evidence purpose: Produces deterministic mappings, conflicts, hashes, and resolver run IDs.
PLAN-0111 Implementation implication: any code change touching this topic MUST verify the source again before landing.
PLAN-0112 Source ledger item: Semantic consistency policy.
PLAN-0113 Source path or URL: plugins/palantir-mini/lib/semantic-consistency/policy.ts.
PLAN-0114 Evidence purpose: Currently allows environment-selected off, advisory, or blocking modes.
PLAN-0115 Implementation implication: any code change touching this topic MUST verify the source again before landing.
PLAN-0116 Source ledger item: Semantic conversation state.
PLAN-0117 Source path or URL: plugins/palantir-mini/lib/chatbot-studio/semantic-conversation-state.ts.
PLAN-0118 Evidence purpose: Defines LLM-facing state projection and default Korean non-programmer UX fields.
PLAN-0119 Implementation implication: any code change touching this topic MUST verify the source again before landing.
PLAN-0120 Source ledger item: Chatbot application state.
PLAN-0121 Source path or URL: plugins/palantir-mini/lib/chatbot-studio/application-state.ts.
PLAN-0122 Evidence purpose: Builds deterministic application variables from SemanticConversationState.
PLAN-0123 Implementation implication: any code change touching this topic MUST verify the source again before landing.
PLAN-0124 Source ledger item: Chatbot retrieval context.
PLAN-0125 Source path or URL: plugins/palantir-mini/lib/chatbot-studio/retrieval-context.ts.
PLAN-0126 Evidence purpose: Builds retrieval context from SemanticConversationState.
PLAN-0127 Implementation implication: any code change touching this topic MUST verify the source again before landing.
PLAN-0128 Source ledger item: Lead intent contracts.
PLAN-0129 Source path or URL: plugins/palantir-mini/lib/lead-intent/contracts.ts.
PLAN-0130 Evidence purpose: Defines SIC, DTC, Palantir architecture terms, validation, and current env-sensitive severity.
PLAN-0131 Implementation implication: any code change touching this topic MUST verify the source again before landing.
PLAN-0132 Source ledger item: Semantic intent gate handler.
PLAN-0133 Source path or URL: plugins/palantir-mini/bridge/handlers/pm-semantic-intent-gate.ts.
PLAN-0134 Evidence purpose: Builds FDE/SIC/DTC state and includes semantic resolver evidence.
PLAN-0135 Implementation implication: any code change touching this topic MUST verify the source again before landing.
PLAN-0136 Source ledger item: MCP server registry.
PLAN-0137 Source path or URL: plugins/palantir-mini/bridge/mcp-server.ts.
PLAN-0138 Evidence purpose: Current public MCP registry does not include pm_pre_mutation_governance or pm_semantic_consistency_gate.
PLAN-0139 Implementation implication: any code change touching this topic MUST verify the source again before landing.
PLAN-0140 Source ledger item: Plugin self check handler.
PLAN-0141 Source path or URL: plugins/palantir-mini/bridge/handlers/pm-plugin-self-check.ts.
PLAN-0142 Evidence purpose: Current release checks omit layer boundary, runtime parity linter, hook IO schema, and workflow-family release gate.
PLAN-0143 Implementation implication: any code change touching this topic MUST verify the source again before landing.
PLAN-0144 Source ledger item: Hook self check helper.
PLAN-0145 Source path or URL: plugins/palantir-mini/bridge/handlers/pm-plugin-self-check/check-hooks.ts.
PLAN-0146 Evidence purpose: Current hook checks do not validate schema-backed mutation hook contracts.
PLAN-0147 Implementation implication: any code change touching this topic MUST verify the source again before landing.
PLAN-0148 Source ledger item: Commit governance test.
PLAN-0149 Source path or URL: plugins/palantir-mini/tests/hooks/commit-edits-governance.test.ts.
PLAN-0150 Evidence purpose: Current tests encode bypass and dry-run grace behavior that must change.
PLAN-0151 Implementation implication: any code change touching this topic MUST verify the source again before landing.
PLAN-0152 Source ledger item: Prompt DTC gate test.
PLAN-0153 Source path or URL: plugins/palantir-mini/tests/hooks/prompt-dtc-enforcement-gate.test.ts.
PLAN-0154 Evidence purpose: Current tests encode off and bypass behavior that must change for protected mutations.
PLAN-0155 Implementation implication: any code change touching this topic MUST verify the source again before landing.
PLAN-0156 Source ledger item: Workflow family test.
PLAN-0157 Source path or URL: plugins/palantir-mini/tests/core/workflow-family-enforcement-contract.test.ts.
PLAN-0158 Evidence purpose: Current tests ratchet inventory but not release-blocking semantics.
PLAN-0159 Implementation implication: any code change touching this topic MUST verify the source again before landing.
PLAN-0160 Source ledger item: Semantic resolver test.
PLAN-0161 Source path or URL: plugins/palantir-mini/tests/lib/semantic-consistency/resolver.test.ts.
PLAN-0162 Evidence purpose: Already proves repeated resolver output stability.
PLAN-0163 Implementation implication: any code change touching this topic MUST verify the source again before landing.
PLAN-0164 Source ledger item: Semantic intent gate test.
PLAN-0165 Source path or URL: plugins/palantir-mini/tests/bridge/handlers/pm-semantic-intent-gate.test.ts.
PLAN-0166 Evidence purpose: Already checks semantic resolver evidence in conversation state.
PLAN-0167 Implementation implication: any code change touching this topic MUST verify the source again before landing.
PLAN-0168 Source ledger item: Palantir AIP architecture.
PLAN-0169 Source path or URL: https://www.palantir.com/docs/foundry/architecture-center/aip-architecture/.
PLAN-0170 Evidence purpose: Defines AIP as generative AI connected to operational domains, with context engineering, Ontology, evals, governance, and agents.
PLAN-0171 Implementation implication: any code change touching this topic MUST verify the source again before landing.
PLAN-0172 Source ledger item: Palantir Ontology system.
PLAN-0173 Source path or URL: https://www.palantir.com/docs/foundry/architecture-center/ontology-system/.
PLAN-0174 Evidence purpose: Defines Ontology as enterprise decision system integrating data, logic, action, and security into nouns and verbs.
PLAN-0175 Implementation implication: any code change touching this topic MUST verify the source again before landing.
PLAN-0176 Source ledger item: Palantir Chatbot Studio overview.
PLAN-0177 Source path or URL: https://www.palantir.com/docs/foundry/chatbot-studio/overview/.
PLAN-0178 Evidence purpose: Defines chatbots powered by LLMs, Ontology, documents, tools, and security-scoped access.
PLAN-0179 Implementation implication: any code change touching this topic MUST verify the source again before landing.
PLAN-0180 Source ledger item: Palantir Chatbot Studio core concepts.
PLAN-0181 Source path or URL: https://www.palantir.com/docs/foundry/chatbot-studio/core-concepts/.
PLAN-0182 Evidence purpose: Defines application state, retrieval context, tools, context window, and chatbots as functions.
PLAN-0183 Implementation implication: any code change touching this topic MUST verify the source again before landing.
PLAN-0184 Source ledger item: Palantir Chatbot Studio application state.
PLAN-0185 Source path or URL: https://www.palantir.com/docs/foundry/chatbot-studio/application-state/.
PLAN-0186 Evidence purpose: Recommends deterministic variable updates and limiting LLM-visible values.
PLAN-0187 Implementation implication: any code change touching this topic MUST verify the source again before landing.
PLAN-0188 Source ledger item: Palantir Chatbot Studio tools.
PLAN-0189 Source path or URL: https://www.palantir.com/docs/foundry/chatbot-studio/tools/.
PLAN-0190 Evidence purpose: Defines action, object query, function, update variable, command, and clarification tools.
PLAN-0191 Implementation implication: any code change touching this topic MUST verify the source again before landing.
PLAN-0191A Source ledger item: Palantir Chatbot Studio retrieval context.
PLAN-0191B Source path or URL: ~/.claude/research/palantir-official/foundry/chatbot-studio/retrieval-context.md and https://www.palantir.com/docs/foundry/chatbot-studio/retrieval-context/.
PLAN-0191C Evidence purpose: Defines ontology, document, and function-backed retrieval context as LLM context inputs, not source-of-truth project state.
PLAN-0191D Implementation implication: local RetrievalContext gates must cite this page when distinguishing retrieved context from authority.
PLAN-0191E Source ledger item: Palantir Ontology overview.
PLAN-0191F Source path or URL: ~/.claude/research/palantir-official/foundry/ontology/overview.md and https://www.palantir.com/docs/foundry/ontology/overview/.
PLAN-0191G Evidence purpose: Names object types, properties, links, action types, and functions as ontology modeling concepts.
PLAN-0191H Implementation implication: local terminology checks must distinguish official ontology primitive concepts from ContextEngineering review domains.
PLAN-0192 Source ledger item: Palantir AIP Evals overview.
PLAN-0193 Source path or URL: https://www.palantir.com/docs/foundry/aip-evals/overview/.
PLAN-0194 Evidence purpose: Frames evals as confidence-building for non-deterministic LLM-backed functions.
PLAN-0195 Implementation implication: any code change touching this topic MUST verify the source again before landing.
## Official Palantir Model Interpreted For This Plugin

PLAN-0196 Palantir AIP architecture is treated as a reference model for AI connected to operational domains, not as executable palantir-mini policy.
PLAN-0197 AIP ContextEngineering is treated as the layer that supplies contextual data, logic, action, governance, provenance, and runtime guarantees into downstream workflows.
PLAN-0198 AIP ContextEngineering domains are review and evidence lanes, not ontology primitive type names.
PLAN-0198A ContextEngineering TECHNOLOGY and ContextEngineering GOVERNANCE are local palantir-mini review domains derived from official technology, security, governance, provenance, release, and audit concerns; they are not claims that Palantir official docs define TECHNOLOGY or GOVERNANCE as peer ContextEngineering product categories.
PLAN-0199 The Ontology system is treated as the operational decision model that represents nouns, verbs, links, properties, actions, logic, and security.
PLAN-0200 Ontology primitive kinds are typed semantic entities and relationships, not review-domain checklist buckets.
PLAN-0201 AIP Chatbot Studio is treated as the UX and control-state inspiration for LLM-facing interaction, not as authorization authority.
PLAN-0202 Chatbot Studio application state is interpreted as a controlled, minimal, schema-backed LLM context projection.
PLAN-0203 Chatbot Studio deterministic variable updates are interpreted as a requirement to prefer plugin-computed state over LLM-written state.
PLAN-0204 Chatbot Studio tools are interpreted as LLM-callable capabilities; palantir-mini protected-mutation policy adds local policy, schema, and confirmation gates rather than claiming those gates are official Chatbot Studio product requirements.
PLAN-0205 AIP Evals are interpreted as evidence-gathering for non-deterministic proposal layers, not as proof that LLM output is deterministic.
PLAN-0206 Security and governance are interpreted as release-blocking controls for protected mutation classes.
PLAN-0207 Observability is interpreted as append-only lineage and replay evidence for prompt, FDE, SIC, DTC, dry-run, eval, and release decisions.
PLAN-0208 Operational automation is interpreted as allowed only after deterministic gate decisions authorize execution.
PLAN-0209 Human and AI applications are interpreted as clients of the same deterministic ontology control plane.
PLAN-0210 Package, release, and deploy are interpreted as requiring self-check, eval, replay, and boundary-contract evidence.
PLAN-0211 Enterprise automation is interpreted as requiring agents to operate on the same governance foundation as human users.
PLAN-0212 The plugin MUST NOT claim official Palantir product parity unless evidence-backed runtime and capability contracts exist.
PLAN-0213 The plugin MAY mirror official concepts as local contracts, provided the local contracts clearly state their authority and limits.
PLAN-0214 The plugin SHOULD cite official docs in design documents, but release gates must execute local validators.
PLAN-0215 The plugin MUST keep local terminology explicit where official docs use broad terms such as data, logic, action, and security.
PLAN-0216 The plugin MUST distinguish Ontology ActionType from ContextEngineering ACTION review domain in all workflow prompts and schemas.
PLAN-0217 The plugin MUST distinguish Ontology ObjectType from ContextEngineering DATA review domain in all workflow prompts and schemas.
PLAN-0218 The plugin MUST distinguish Ontology Function from ContextEngineering LOGIC review domain in all workflow prompts and schemas.
PLAN-0219 The plugin MUST distinguish runtime command execution from Ontology ActionType execution in all gate decisions.
PLAN-0220 The plugin MUST distinguish a user approval card from mutation authorization in all non-programmer UX surfaces.
PLAN-0221 The plugin MUST distinguish DTC review-domain closure from typed ontology primitive coverage.
PLAN-0222 The plugin MUST distinguish LLM tool selection from plugin authorization.
PLAN-0223 The plugin MUST distinguish retrieval context from source-of-truth project state.
PLAN-0224 The plugin MUST distinguish application state visibility from application state authority.
PLAN-0225 The plugin MUST distinguish eval confidence from mutation permission.
PLAN-0226 The plugin MUST distinguish runtime support declarations from runtime parity claims.
PLAN-0227 The plugin MUST distinguish package installation from source authority.
PLAN-0228 The plugin MUST distinguish hook intent registry from runtime hook execution evidence.
PLAN-0229 The plugin MUST distinguish schema-only support from native runtime support.
PLAN-0230 The plugin MUST distinguish proposal-only flows from mutation-capable flows.
PLAN-0231 The plugin MUST distinguish read-only audit from project-state update.
PLAN-0232 The plugin MUST distinguish append-only event emission from semantic state mutation.
PLAN-0233 The plugin MUST distinguish FDE meaning discovery from approved SIC boundary.
PLAN-0234 The plugin MUST distinguish SIC boundary from DTC change boundary.
PLAN-0235 The plugin MUST distinguish DTC change boundary from WorkContract execution boundary.
PLAN-0236 The plugin MUST distinguish WorkContract execution boundary from commit_edits final submission.
PLAN-0237 The plugin MUST distinguish compute_edits_dry_run evidence from committed edits.
PLAN-0238 The plugin MUST distinguish release evidence from release approval.
PLAN-0239 The plugin MUST distinguish manual runtime gap disclosure from machine-supported parity.
PLAN-0240 The plugin MUST distinguish raw user prompt from prompt envelope.
PLAN-0241 The plugin MUST distinguish prompt hash continuity from semantic approval.
PLAN-0242 The plugin MUST distinguish source-system term recognition from canonical ontology term promotion.
PLAN-0243 The plugin MUST distinguish canonical term registry entries from LLM-drafted candidate terms.
PLAN-0244 The plugin MUST distinguish alias matching from canonical term approval.
PLAN-0245 The plugin MUST distinguish ambiguous conflict detection from conflict resolution.
PLAN-0246 The plugin MUST distinguish no conflict found from promotion readiness.
PLAN-0247 The plugin MUST distinguish promotion readiness from DTC readiness.
PLAN-0248 The plugin MUST distinguish DTC readiness from mutation authorization.
PLAN-0249 The plugin MUST distinguish governance denial reason codes from human explanation text.
PLAN-0250 The plugin MUST distinguish allowed next actions from automatic retries.
PLAN-0251 The plugin MUST distinguish emergency evidence from bypass permission.
PLAN-0252 The plugin MUST distinguish strengthening an environment gate from weakening a project gate.
PLAN-0253 The plugin MUST distinguish root marketplace integrity from plugin workflow semantics.
PLAN-0254 The plugin MUST distinguish local test fixture evidence from runtime smoke evidence.
PLAN-0255 The plugin MUST distinguish generated artifacts from editable source artifacts.
PLAN-0256 The plugin MUST distinguish branch-local implementation from installed payload verification.
PLAN-0257 The plugin MUST distinguish acceptance criteria from implementation suggestions.
PLAN-0258 The plugin MUST distinguish release-blocking criteria from advisory diagnostics.
## Terminology Boundary Required For User Prompt To FDE To SIC To DTC

PLAN-0259 Term boundary: ContextEngineering DATA.
PLAN-0260 Definition: A review and evidence domain for data sources, datasets, object materialization, provenance, and data quality.
PLAN-0261 Required distinction: It is not the same thing as Ontology ObjectType.
PLAN-0262 Workflow rule: A DTC DATA closure can say source data is understood while ObjectType refs are still missing.
PLAN-0263 Prompt-stage rule: user-facing text MUST name ContextEngineering DATA only when the workflow has evidence for that term.
PLAN-0264 FDE-stage rule: hypotheses MUST store ContextEngineering DATA evidence separately from look-alike terms.
PLAN-0265 SIC-stage rule: approved meaning MUST include ContextEngineering DATA evidence only in the correct field family.
PLAN-0266 DTC-stage rule: approved change boundary MUST validate ContextEngineering DATA before routing or mutation if the change touches that surface.
PLAN-0267 Router-stage rule: pm_intent_router or equivalent routing MUST consume ContextEngineering DATA as structured evidence, never as LLM prose.
PLAN-0268 Mutation-stage rule: pm_pre_mutation_governance MUST decide with enum fields for ContextEngineering DATA, not natural-language inference.
PLAN-0269 Release-stage rule: self-check MUST fail if ContextEngineering DATA is conflated with a forbidden neighboring concept.
PLAN-0270 Term boundary: ContextEngineering LOGIC.
PLAN-0271 Definition: A review and evidence domain for business rules, functions, algorithms, transforms, model logic, and reasoning plans.
PLAN-0272 Required distinction: It is not the same thing as Ontology Function only.
PLAN-0273 Workflow rule: A DTC LOGIC closure can cover implementation logic while typed Function refs remain separate.
PLAN-0274 Prompt-stage rule: user-facing text MUST name ContextEngineering LOGIC only when the workflow has evidence for that term.
PLAN-0275 FDE-stage rule: hypotheses MUST store ContextEngineering LOGIC evidence separately from look-alike terms.
PLAN-0276 SIC-stage rule: approved meaning MUST include ContextEngineering LOGIC evidence only in the correct field family.
PLAN-0277 DTC-stage rule: approved change boundary MUST validate ContextEngineering LOGIC before routing or mutation if the change touches that surface.
PLAN-0278 Router-stage rule: pm_intent_router or equivalent routing MUST consume ContextEngineering LOGIC as structured evidence, never as LLM prose.
PLAN-0279 Mutation-stage rule: pm_pre_mutation_governance MUST decide with enum fields for ContextEngineering LOGIC, not natural-language inference.
PLAN-0280 Release-stage rule: self-check MUST fail if ContextEngineering LOGIC is conflated with a forbidden neighboring concept.
PLAN-0281 Term boundary: ContextEngineering ACTION.
PLAN-0282 Definition: A review and evidence domain for operational verbs, write paths, external commands, action execution, and user-facing tasks.
PLAN-0283 Required distinction: It is not the same thing as Ontology ActionType only.
PLAN-0284 Workflow rule: A DTC ACTION closure can close action design risk while ActionType refs still require ontology coverage.
PLAN-0285 Prompt-stage rule: user-facing text MUST name ContextEngineering ACTION only when the workflow has evidence for that term.
PLAN-0286 FDE-stage rule: hypotheses MUST store ContextEngineering ACTION evidence separately from look-alike terms.
PLAN-0287 SIC-stage rule: approved meaning MUST include ContextEngineering ACTION evidence only in the correct field family.
PLAN-0288 DTC-stage rule: approved change boundary MUST validate ContextEngineering ACTION before routing or mutation if the change touches that surface.
PLAN-0289 Router-stage rule: pm_intent_router or equivalent routing MUST consume ContextEngineering ACTION as structured evidence, never as LLM prose.
PLAN-0290 Mutation-stage rule: pm_pre_mutation_governance MUST decide with enum fields for ContextEngineering ACTION, not natural-language inference.
PLAN-0291 Release-stage rule: self-check MUST fail if ContextEngineering ACTION is conflated with a forbidden neighboring concept.
PLAN-0292 Term boundary: ContextEngineering TECHNOLOGY.
PLAN-0293 Definition: A review and evidence domain for runtime, adapter, package, MCP, hook, release, deployment, and integration constraints.
PLAN-0294 Required distinction: It is not an Ontology primitive kind.
PLAN-0295 Workflow rule: A DTC TECHNOLOGY closure can approve Codex-only scope without claiming Claude or Gemini parity.
PLAN-0296 Prompt-stage rule: user-facing text MUST name ContextEngineering TECHNOLOGY only when the workflow has evidence for that term.
PLAN-0297 FDE-stage rule: hypotheses MUST store ContextEngineering TECHNOLOGY evidence separately from look-alike terms.
PLAN-0298 SIC-stage rule: approved meaning MUST include ContextEngineering TECHNOLOGY evidence only in the correct field family.
PLAN-0299 DTC-stage rule: approved change boundary MUST validate ContextEngineering TECHNOLOGY before routing or mutation if the change touches that surface.
PLAN-0300 Router-stage rule: pm_intent_router or equivalent routing MUST consume ContextEngineering TECHNOLOGY as structured evidence, never as LLM prose.
PLAN-0301 Mutation-stage rule: pm_pre_mutation_governance MUST decide with enum fields for ContextEngineering TECHNOLOGY, not natural-language inference.
PLAN-0302 Release-stage rule: self-check MUST fail if ContextEngineering TECHNOLOGY is conflated with a forbidden neighboring concept.
PLAN-0303 Term boundary: ContextEngineering GOVERNANCE.
PLAN-0304 Definition: A review and evidence domain for approvals, policy, security, evals, lineage, release, and auditability.
PLAN-0305 Required distinction: It is not an Ontology primitive kind.
PLAN-0306 Workflow rule: A DTC GOVERNANCE closure can require self-check and eval evidence before commit.
PLAN-0307 Prompt-stage rule: user-facing text MUST name ContextEngineering GOVERNANCE only when the workflow has evidence for that term.
PLAN-0308 FDE-stage rule: hypotheses MUST store ContextEngineering GOVERNANCE evidence separately from look-alike terms.
PLAN-0309 SIC-stage rule: approved meaning MUST include ContextEngineering GOVERNANCE evidence only in the correct field family.
PLAN-0310 DTC-stage rule: approved change boundary MUST validate ContextEngineering GOVERNANCE before routing or mutation if the change touches that surface.
PLAN-0311 Router-stage rule: pm_intent_router or equivalent routing MUST consume ContextEngineering GOVERNANCE as structured evidence, never as LLM prose.
PLAN-0312 Mutation-stage rule: pm_pre_mutation_governance MUST decide with enum fields for ContextEngineering GOVERNANCE, not natural-language inference.
PLAN-0313 Release-stage rule: self-check MUST fail if ContextEngineering GOVERNANCE is conflated with a forbidden neighboring concept.
PLAN-0314 Term boundary: Ontology ObjectType.
PLAN-0315 Definition: A typed noun model in the operational ontology.
PLAN-0316 Required distinction: It is not the same thing as DATA review closure.
PLAN-0317 Workflow rule: SIC/DTC typed refs must identify ObjectType separately from DATA evidence.
PLAN-0318 Prompt-stage rule: user-facing text MUST name Ontology ObjectType only when the workflow has evidence for that term.
PLAN-0319 FDE-stage rule: hypotheses MUST store Ontology ObjectType evidence separately from look-alike terms.
PLAN-0320 SIC-stage rule: approved meaning MUST include Ontology ObjectType evidence only in the correct field family.
PLAN-0321 DTC-stage rule: approved change boundary MUST validate Ontology ObjectType before routing or mutation if the change touches that surface.
PLAN-0322 Router-stage rule: pm_intent_router or equivalent routing MUST consume Ontology ObjectType as structured evidence, never as LLM prose.
PLAN-0323 Mutation-stage rule: pm_pre_mutation_governance MUST decide with enum fields for Ontology ObjectType, not natural-language inference.
PLAN-0324 Release-stage rule: self-check MUST fail if Ontology ObjectType is conflated with a forbidden neighboring concept.
PLAN-0325 Term boundary: Ontology LinkType.
PLAN-0326 Definition: A typed relationship between ontology object types.
PLAN-0327 Required distinction: It is not a ContextEngineering domain.
PLAN-0328 Workflow rule: DTC touchedOntologyRefs must list LinkType refs when relationship semantics change.
PLAN-0329 Prompt-stage rule: user-facing text MUST name Ontology LinkType only when the workflow has evidence for that term.
PLAN-0330 FDE-stage rule: hypotheses MUST store Ontology LinkType evidence separately from look-alike terms.
PLAN-0331 SIC-stage rule: approved meaning MUST include Ontology LinkType evidence only in the correct field family.
PLAN-0332 DTC-stage rule: approved change boundary MUST validate Ontology LinkType before routing or mutation if the change touches that surface.
PLAN-0333 Router-stage rule: pm_intent_router or equivalent routing MUST consume Ontology LinkType as structured evidence, never as LLM prose.
PLAN-0334 Mutation-stage rule: pm_pre_mutation_governance MUST decide with enum fields for Ontology LinkType, not natural-language inference.
PLAN-0335 Release-stage rule: self-check MUST fail if Ontology LinkType is conflated with a forbidden neighboring concept.
PLAN-0336 Term boundary: Ontology ActionType.
PLAN-0337 Definition: A typed ontology edit or action surface for operational verbs; runtime commands and Chatbot Studio command tools remain separate concepts.
PLAN-0338 Required distinction: It is not the same thing as ACTION review closure.
PLAN-0339 Workflow rule: Mutation gates must treat ActionType writes as protected even if ACTION review text looks complete.
PLAN-0340 Prompt-stage rule: user-facing text MUST name Ontology ActionType only when the workflow has evidence for that term.
PLAN-0341 FDE-stage rule: hypotheses MUST store Ontology ActionType evidence separately from look-alike terms.
PLAN-0342 SIC-stage rule: approved meaning MUST include Ontology ActionType evidence only in the correct field family.
PLAN-0343 DTC-stage rule: approved change boundary MUST validate Ontology ActionType before routing or mutation if the change touches that surface.
PLAN-0344 Router-stage rule: pm_intent_router or equivalent routing MUST consume Ontology ActionType as structured evidence, never as LLM prose.
PLAN-0345 Mutation-stage rule: pm_pre_mutation_governance MUST decide with enum fields for Ontology ActionType, not natural-language inference.
PLAN-0346 Release-stage rule: self-check MUST fail if Ontology ActionType is conflated with a forbidden neighboring concept.
PLAN-0347 Term boundary: Ontology Function.
PLAN-0348 Definition: A typed logic/function surface in the ontology or platform function layer.
PLAN-0349 Required distinction: It is not the same thing as LOGIC review closure.
PLAN-0350 Workflow rule: Function changes may require LOGIC review and Function typed refs.
PLAN-0351 Prompt-stage rule: user-facing text MUST name Ontology Function only when the workflow has evidence for that term.
PLAN-0352 FDE-stage rule: hypotheses MUST store Ontology Function evidence separately from look-alike terms.
PLAN-0353 SIC-stage rule: approved meaning MUST include Ontology Function evidence only in the correct field family.
PLAN-0354 DTC-stage rule: approved change boundary MUST validate Ontology Function before routing or mutation if the change touches that surface.
PLAN-0355 Router-stage rule: pm_intent_router or equivalent routing MUST consume Ontology Function as structured evidence, never as LLM prose.
PLAN-0356 Mutation-stage rule: pm_pre_mutation_governance MUST decide with enum fields for Ontology Function, not natural-language inference.
PLAN-0357 Release-stage rule: self-check MUST fail if Ontology Function is conflated with a forbidden neighboring concept.
PLAN-0358 Term boundary: Ontology Property.
PLAN-0359 Definition: A typed attribute on an object or related primitive.
PLAN-0360 Required distinction: It is not a ContextEngineering domain.
PLAN-0361 Workflow rule: Property changes require typed refs and data/logic review depending on the change.
PLAN-0362 Prompt-stage rule: user-facing text MUST name Ontology Property only when the workflow has evidence for that term.
PLAN-0363 FDE-stage rule: hypotheses MUST store Ontology Property evidence separately from look-alike terms.
PLAN-0364 SIC-stage rule: approved meaning MUST include Ontology Property evidence only in the correct field family.
PLAN-0365 DTC-stage rule: approved change boundary MUST validate Ontology Property before routing or mutation if the change touches that surface.
PLAN-0366 Router-stage rule: pm_intent_router or equivalent routing MUST consume Ontology Property as structured evidence, never as LLM prose.
PLAN-0367 Mutation-stage rule: pm_pre_mutation_governance MUST decide with enum fields for Ontology Property, not natural-language inference.
PLAN-0368 Release-stage rule: self-check MUST fail if Ontology Property is conflated with a forbidden neighboring concept.
PLAN-0369 Term boundary: ApplicationState.
PLAN-0370 Definition: A Chatbot Studio style state variable or plugin projection used to condition LLM behavior.
PLAN-0371 Required distinction: It is not authority by itself.
PLAN-0372 Workflow rule: SemanticConversationState may expose application state while plugin code owns readiness booleans.
PLAN-0373 Prompt-stage rule: user-facing text MUST name ApplicationState only when the workflow has evidence for that term.
PLAN-0374 FDE-stage rule: hypotheses MUST store ApplicationState evidence separately from look-alike terms.
PLAN-0375 SIC-stage rule: approved meaning MUST include ApplicationState evidence only in the correct field family.
PLAN-0376 DTC-stage rule: approved change boundary MUST validate ApplicationState before routing or mutation if the change touches that surface.
PLAN-0377 Router-stage rule: pm_intent_router or equivalent routing MUST consume ApplicationState as structured evidence, never as LLM prose.
PLAN-0378 Mutation-stage rule: pm_pre_mutation_governance MUST decide with enum fields for ApplicationState, not natural-language inference.
PLAN-0379 Release-stage rule: self-check MUST fail if ApplicationState is conflated with a forbidden neighboring concept.
PLAN-0380 Term boundary: RetrievalContext.
PLAN-0381 Definition: Retrieved context injected for answering or drafting.
PLAN-0382 Required distinction: It is not source-of-truth project state.
PLAN-0383 Workflow rule: Retrieved context cannot approve SIC or DTC.
PLAN-0384 Prompt-stage rule: user-facing text MUST name RetrievalContext only when the workflow has evidence for that term.
PLAN-0385 FDE-stage rule: hypotheses MUST store RetrievalContext evidence separately from look-alike terms.
PLAN-0386 SIC-stage rule: approved meaning MUST include RetrievalContext evidence only in the correct field family.
PLAN-0387 DTC-stage rule: approved change boundary MUST validate RetrievalContext before routing or mutation if the change touches that surface.
PLAN-0388 Router-stage rule: pm_intent_router or equivalent routing MUST consume RetrievalContext as structured evidence, never as LLM prose.
PLAN-0389 Mutation-stage rule: pm_pre_mutation_governance MUST decide with enum fields for RetrievalContext, not natural-language inference.
PLAN-0390 Release-stage rule: self-check MUST fail if RetrievalContext is conflated with a forbidden neighboring concept.
PLAN-0391 Term boundary: SemanticIntentContract.
PLAN-0392 Definition: Approved meaning boundary derived from FDE outcomes and user approval.
PLAN-0393 Required distinction: It is not a raw prompt summary.
PLAN-0394 Workflow rule: SIC approval must require prompt continuity and semantic consistency readiness.
PLAN-0395 Prompt-stage rule: user-facing text MUST name SemanticIntentContract only when the workflow has evidence for that term.
PLAN-0396 FDE-stage rule: hypotheses MUST store SemanticIntentContract evidence separately from look-alike terms.
PLAN-0397 SIC-stage rule: approved meaning MUST include SemanticIntentContract evidence only in the correct field family.
PLAN-0398 DTC-stage rule: approved change boundary MUST validate SemanticIntentContract before routing or mutation if the change touches that surface.
PLAN-0399 Router-stage rule: pm_intent_router or equivalent routing MUST consume SemanticIntentContract as structured evidence, never as LLM prose.
PLAN-0400 Mutation-stage rule: pm_pre_mutation_governance MUST decide with enum fields for SemanticIntentContract, not natural-language inference.
PLAN-0401 Release-stage rule: self-check MUST fail if SemanticIntentContract is conflated with a forbidden neighboring concept.
PLAN-0402 Term boundary: DigitalTwinChangeContract.
PLAN-0403 Definition: Approved change boundary derived from approved SIC, FDE evidence, context engineering closure, and validation plan.
PLAN-0404 Required distinction: It is not mutation execution permission.
PLAN-0405 Workflow rule: DTC readiness is necessary but insufficient for commit_edits.
PLAN-0406 Prompt-stage rule: user-facing text MUST name DigitalTwinChangeContract only when the workflow has evidence for that term.
PLAN-0407 FDE-stage rule: hypotheses MUST store DigitalTwinChangeContract evidence separately from look-alike terms.
PLAN-0408 SIC-stage rule: approved meaning MUST include DigitalTwinChangeContract evidence only in the correct field family.
PLAN-0409 DTC-stage rule: approved change boundary MUST validate DigitalTwinChangeContract before routing or mutation if the change touches that surface.
PLAN-0410 Router-stage rule: pm_intent_router or equivalent routing MUST consume DigitalTwinChangeContract as structured evidence, never as LLM prose.
PLAN-0411 Mutation-stage rule: pm_pre_mutation_governance MUST decide with enum fields for DigitalTwinChangeContract, not natural-language inference.
PLAN-0412 Release-stage rule: self-check MUST fail if DigitalTwinChangeContract is conflated with a forbidden neighboring concept.
PLAN-0413 Term boundary: WorkContract.
PLAN-0414 Definition: Execution boundary for specific work after SIC and DTC are approved.
PLAN-0415 Required distinction: It is not semantic meaning discovery.
PLAN-0416 Workflow rule: WorkContract refs must be present for protected mutations.
PLAN-0417 Prompt-stage rule: user-facing text MUST name WorkContract only when the workflow has evidence for that term.
PLAN-0418 FDE-stage rule: hypotheses MUST store WorkContract evidence separately from look-alike terms.
PLAN-0419 SIC-stage rule: approved meaning MUST include WorkContract evidence only in the correct field family.
PLAN-0420 DTC-stage rule: approved change boundary MUST validate WorkContract before routing or mutation if the change touches that surface.
PLAN-0421 Router-stage rule: pm_intent_router or equivalent routing MUST consume WorkContract as structured evidence, never as LLM prose.
PLAN-0422 Mutation-stage rule: pm_pre_mutation_governance MUST decide with enum fields for WorkContract, not natural-language inference.
PLAN-0423 Release-stage rule: self-check MUST fail if WorkContract is conflated with a forbidden neighboring concept.
PLAN-0424 Term boundary: GovernanceDecision.
PLAN-0425 Definition: Plugin-computed allow or deny decision envelope.
PLAN-0426 Required distinction: It is not a human explanation.
PLAN-0427 Workflow rule: Only this envelope can authorize mutation.
PLAN-0428 Prompt-stage rule: user-facing text MUST name GovernanceDecision only when the workflow has evidence for that term.
PLAN-0429 FDE-stage rule: hypotheses MUST store GovernanceDecision evidence separately from look-alike terms.
PLAN-0430 SIC-stage rule: approved meaning MUST include GovernanceDecision evidence only in the correct field family.
PLAN-0431 DTC-stage rule: approved change boundary MUST validate GovernanceDecision before routing or mutation if the change touches that surface.
PLAN-0432 Router-stage rule: pm_intent_router or equivalent routing MUST consume GovernanceDecision as structured evidence, never as LLM prose.
PLAN-0433 Mutation-stage rule: pm_pre_mutation_governance MUST decide with enum fields for GovernanceDecision, not natural-language inference.
PLAN-0434 Release-stage rule: self-check MUST fail if GovernanceDecision is conflated with a forbidden neighboring concept.
## Current Codebase Evidence Summary

PLAN-0435 Codebase evidence surface: Root README.
PLAN-0436 Observed state: Root already states that the marketplace root is not the semantic plugin authority.
PLAN-0437 Implementation gap: Gap is not root declaration; gap is release-blocking root semantic fork detection.
PLAN-0438 Required action: convert this gap into a failing test before changing implementation where practical.
PLAN-0439 Required action: preserve existing behavior for read-only and proposal-only flows unless the PR explicitly says otherwise.
PLAN-0440 Required action: document any behavior change in the PR body under Scope and Recovery.
PLAN-0441 Required action: include a regression fixture when the gap concerns bypass, parity, hook output, or semantic promotion.
PLAN-0442 Required action: include release self-check coverage when the gap can reappear as repo drift.
PLAN-0443 Codebase evidence surface: Plugin README.
PLAN-0444 Observed state: Plugin already describes prompt-to-DTC, non-programmer cards, DTC policy, and self-check surface.
PLAN-0445 Implementation gap: Gap is not narrative; gap is machine enforcement.
PLAN-0446 Required action: convert this gap into a failing test before changing implementation where practical.
PLAN-0447 Required action: preserve existing behavior for read-only and proposal-only flows unless the PR explicitly says otherwise.
PLAN-0448 Required action: document any behavior change in the PR body under Scope and Recovery.
PLAN-0449 Required action: include a regression fixture when the gap concerns bypass, parity, hook output, or semantic promotion.
PLAN-0450 Required action: include release self-check coverage when the gap can reappear as repo drift.
PLAN-0451 Codebase evidence surface: .ssot-authority.json.
PLAN-0452 Observed state: Machine-readable authority exists for plugin root and forbidden runtime semantic forks.
PLAN-0453 Implementation gap: Gap is that no release gate compares all boundary docs and source paths.
PLAN-0454 Required action: convert this gap into a failing test before changing implementation where practical.
PLAN-0455 Required action: preserve existing behavior for read-only and proposal-only flows unless the PR explicitly says otherwise.
PLAN-0456 Required action: document any behavior change in the PR body under Scope and Recovery.
PLAN-0457 Required action: include a regression fixture when the gap concerns bypass, parity, hook output, or semantic promotion.
PLAN-0458 Required action: include release self-check coverage when the gap can reappear as repo drift.
PLAN-0459 Codebase evidence surface: RUNTIME_LAYER_BOUNDARY.md.
PLAN-0460 Observed state: Runtime/provider/plugin separation is documented and Codex-only local support is clear.
PLAN-0461 Implementation gap: Gap is that workflow-family code still creates unsupported parity defaults.
PLAN-0462 Required action: convert this gap into a failing test before changing implementation where practical.
PLAN-0463 Required action: preserve existing behavior for read-only and proposal-only flows unless the PR explicitly says otherwise.
PLAN-0464 Required action: document any behavior change in the PR body under Scope and Recovery.
PLAN-0465 Required action: include a regression fixture when the gap concerns bypass, parity, hook output, or semantic promotion.
PLAN-0466 Required action: include release self-check coverage when the gap can reappear as repo drift.
PLAN-0467 Codebase evidence surface: commit-edits-governance.ts.
PLAN-0468 Observed state: Protected mutation hook exists and checks DTC, FDE policy, impact gate, dry-run events, and sprint contract.
PLAN-0469 Implementation gap: Gap is fatal fail-open on invalid stdin and unhandled errors, plus bypass and grace paths.
PLAN-0470 Required action: convert this gap into a failing test before changing implementation where practical.
PLAN-0471 Required action: preserve existing behavior for read-only and proposal-only flows unless the PR explicitly says otherwise.
PLAN-0472 Required action: document any behavior change in the PR body under Scope and Recovery.
PLAN-0473 Required action: include a regression fixture when the gap concerns bypass, parity, hook output, or semantic promotion.
PLAN-0474 Required action: include release self-check coverage when the gap can reappear as repo drift.
PLAN-0475 Codebase evidence surface: prompt-dtc-enforcement-gate.ts.
PLAN-0476 Observed state: Prompt-to-DTC enforcement exists and emits assessment events.
PLAN-0477 Implementation gap: Gap is environment-controlled off/bypass and advisory downgrade behavior.
PLAN-0478 Required action: convert this gap into a failing test before changing implementation where practical.
PLAN-0479 Required action: preserve existing behavior for read-only and proposal-only flows unless the PR explicitly says otherwise.
PLAN-0480 Required action: document any behavior change in the PR body under Scope and Recovery.
PLAN-0481 Required action: include a regression fixture when the gap concerns bypass, parity, hook output, or semantic promotion.
PLAN-0482 Required action: include release self-check coverage when the gap can reappear as repo drift.
PLAN-0483 Codebase evidence surface: pre-mutation-governance.ts.
PLAN-0484 Observed state: Pre-mutation decision envelope exists.
PLAN-0485 Implementation gap: Gap is that the caller supplies allowed boolean; the library does not compute single authorization.
PLAN-0486 Required action: convert this gap into a failing test before changing implementation where practical.
PLAN-0487 Required action: preserve existing behavior for read-only and proposal-only flows unless the PR explicitly says otherwise.
PLAN-0488 Required action: document any behavior change in the PR body under Scope and Recovery.
PLAN-0489 Required action: include a regression fixture when the gap concerns bypass, parity, hook output, or semantic promotion.
PLAN-0490 Required action: include release self-check coverage when the gap can reappear as repo drift.
PLAN-0491 Codebase evidence surface: pre-mutation-impact-gate.ts.
PLAN-0492 Observed state: Impact gate checks protected mutation, DTC, WorkContract, and semantic conflicts.
PLAN-0493 Implementation gap: Gap is that gate mode can be advisory/off and is not the single authority.
PLAN-0494 Required action: convert this gap into a failing test before changing implementation where practical.
PLAN-0495 Required action: preserve existing behavior for read-only and proposal-only flows unless the PR explicitly says otherwise.
PLAN-0496 Required action: document any behavior change in the PR body under Scope and Recovery.
PLAN-0497 Required action: include a regression fixture when the gap concerns bypass, parity, hook output, or semantic promotion.
PLAN-0498 Required action: include release self-check coverage when the gap can reappear as repo drift.
PLAN-0499 Codebase evidence surface: fde-governance-policy.ts.
PLAN-0500 Observed state: FDE governance policy derives missing approvals and required review domains.
PLAN-0501 Implementation gap: Gap is string-heuristic review domain inference, not explicit ContextEngineering-vs-Ontology separation.
PLAN-0502 Required action: convert this gap into a failing test before changing implementation where practical.
PLAN-0503 Required action: preserve existing behavior for read-only and proposal-only flows unless the PR explicitly says otherwise.
PLAN-0504 Required action: document any behavior change in the PR body under Scope and Recovery.
PLAN-0505 Required action: include a regression fixture when the gap concerns bypass, parity, hook output, or semantic promotion.
PLAN-0506 Required action: include release self-check coverage when the gap can reappear as repo drift.
PLAN-0507 Codebase evidence surface: hooks.json.
PLAN-0508 Observed state: Canonical hook intent registry exists with some fail-closed entries.
PLAN-0509 Implementation gap: Gap is missing schema refs, required mutation class metadata, onError deny, deny reason codes, and side-effect contracts.
PLAN-0510 Required action: convert this gap into a failing test before changing implementation where practical.
PLAN-0511 Required action: preserve existing behavior for read-only and proposal-only flows unless the PR explicitly says otherwise.
PLAN-0512 Required action: document any behavior change in the PR body under Scope and Recovery.
PLAN-0513 Required action: include a regression fixture when the gap concerns bypass, parity, hook output, or semantic promotion.
PLAN-0514 Required action: include release self-check coverage when the gap can reappear as repo drift.
PLAN-0515 Codebase evidence surface: codex-hook-adapter.ts.
PLAN-0516 Observed state: Adapter live-reads hooks.json and can deny on fail-closed nonzero hook results.
PLAN-0517 Implementation gap: Gap is missing output schema validation and async hook failure visibility.
PLAN-0518 Required action: convert this gap into a failing test before changing implementation where practical.
PLAN-0519 Required action: preserve existing behavior for read-only and proposal-only flows unless the PR explicitly says otherwise.
PLAN-0520 Required action: document any behavior change in the PR body under Scope and Recovery.
PLAN-0521 Required action: include a regression fixture when the gap concerns bypass, parity, hook output, or semantic promotion.
PLAN-0522 Required action: include release self-check coverage when the gap can reappear as repo drift.
PLAN-0523 Codebase evidence surface: workflow-family-enforcement.ts.
PLAN-0524 Observed state: Workflow family registry is rich and typed.
PLAN-0525 Implementation gap: Gap is unsupported runtime parity defaults and no release-blocking evidence gate.
PLAN-0526 Required action: convert this gap into a failing test before changing implementation where practical.
PLAN-0527 Required action: preserve existing behavior for read-only and proposal-only flows unless the PR explicitly says otherwise.
PLAN-0528 Required action: document any behavior change in the PR body under Scope and Recovery.
PLAN-0529 Required action: include a regression fixture when the gap concerns bypass, parity, hook output, or semantic promotion.
PLAN-0530 Required action: include release self-check coverage when the gap can reappear as repo drift.
PLAN-0531 Codebase evidence surface: runtime-boundary contract.
PLAN-0532 Observed state: Runtime boundary contract lists Codex overlay and inactive Claude/Gemini paths.
PLAN-0533 Implementation gap: Gap is that workflow family helpers must consume this contract or equivalent evidence.
PLAN-0534 Required action: convert this gap into a failing test before changing implementation where practical.
PLAN-0535 Required action: preserve existing behavior for read-only and proposal-only flows unless the PR explicitly says otherwise.
PLAN-0536 Required action: document any behavior change in the PR body under Scope and Recovery.
PLAN-0537 Required action: include a regression fixture when the gap concerns bypass, parity, hook output, or semantic promotion.
PLAN-0538 Required action: include release self-check coverage when the gap can reappear as repo drift.
PLAN-0539 Codebase evidence surface: semantic-consistency resolver.
PLAN-0540 Observed state: Resolver is deterministic, hash-based, and already has byte-identical tests.
PLAN-0541 Implementation gap: Gap is promotion enforcement before SIC/DTC approval.
PLAN-0542 Required action: convert this gap into a failing test before changing implementation where practical.
PLAN-0543 Required action: preserve existing behavior for read-only and proposal-only flows unless the PR explicitly says otherwise.
PLAN-0544 Required action: document any behavior change in the PR body under Scope and Recovery.
PLAN-0545 Required action: include a regression fixture when the gap concerns bypass, parity, hook output, or semantic promotion.
PLAN-0546 Required action: include release self-check coverage when the gap can reappear as repo drift.
PLAN-0547 Codebase evidence surface: semantic-consistency policy.
PLAN-0548 Observed state: Semantic gate mode exists.
PLAN-0549 Implementation gap: Gap is env-controlled off/advisory for protected promotion paths.
PLAN-0550 Required action: convert this gap into a failing test before changing implementation where practical.
PLAN-0551 Required action: preserve existing behavior for read-only and proposal-only flows unless the PR explicitly says otherwise.
PLAN-0552 Required action: document any behavior change in the PR body under Scope and Recovery.
PLAN-0553 Required action: include a regression fixture when the gap concerns bypass, parity, hook output, or semantic promotion.
PLAN-0554 Required action: include release self-check coverage when the gap can reappear as repo drift.
PLAN-0555 Codebase evidence surface: SemanticConversationState.
PLAN-0556 Observed state: Chatbot-style state exists with user, ontology, skill, capability, semantic, contract, project, impact, validation, and lifecycle facets.
PLAN-0557 Implementation gap: Gap is schema and exclusivity enforcement for LLM-facing control state.
PLAN-0558 Required action: convert this gap into a failing test before changing implementation where practical.
PLAN-0559 Required action: preserve existing behavior for read-only and proposal-only flows unless the PR explicitly says otherwise.
PLAN-0560 Required action: document any behavior change in the PR body under Scope and Recovery.
PLAN-0561 Required action: include a regression fixture when the gap concerns bypass, parity, hook output, or semantic promotion.
PLAN-0562 Required action: include release self-check coverage when the gap can reappear as repo drift.
PLAN-0563 Codebase evidence surface: application-state.ts.
PLAN-0564 Observed state: Application variables are deterministically derived from SemanticConversationState.
PLAN-0565 Implementation gap: Gap is ensuring hidden/read-only state cannot be changed by LLM text.
PLAN-0566 Required action: convert this gap into a failing test before changing implementation where practical.
PLAN-0567 Required action: preserve existing behavior for read-only and proposal-only flows unless the PR explicitly says otherwise.
PLAN-0568 Required action: document any behavior change in the PR body under Scope and Recovery.
PLAN-0569 Required action: include a regression fixture when the gap concerns bypass, parity, hook output, or semantic promotion.
PLAN-0570 Required action: include release self-check coverage when the gap can reappear as repo drift.
PLAN-0571 Codebase evidence surface: retrieval-context.ts.
PLAN-0572 Observed state: Retrieval context is derived from SemanticConversationState.
PLAN-0573 Implementation gap: Gap is ensuring retrieval text never becomes approval evidence.
PLAN-0574 Required action: convert this gap into a failing test before changing implementation where practical.
PLAN-0575 Required action: preserve existing behavior for read-only and proposal-only flows unless the PR explicitly says otherwise.
PLAN-0576 Required action: document any behavior change in the PR body under Scope and Recovery.
PLAN-0577 Required action: include a regression fixture when the gap concerns bypass, parity, hook output, or semantic promotion.
PLAN-0578 Required action: include release self-check coverage when the gap can reappear as repo drift.
PLAN-0579 Codebase evidence surface: lead-intent contracts.
PLAN-0580 Observed state: SIC and DTC include typed refs, review domains, and semantic consistency refs.
PLAN-0581 Implementation gap: Gap is env-sensitive validation severity and mixed PalantirArchitectureTerm categories.
PLAN-0582 Required action: convert this gap into a failing test before changing implementation where practical.
PLAN-0583 Required action: preserve existing behavior for read-only and proposal-only flows unless the PR explicitly says otherwise.
PLAN-0584 Required action: document any behavior change in the PR body under Scope and Recovery.
PLAN-0585 Required action: include a regression fixture when the gap concerns bypass, parity, hook output, or semantic promotion.
PLAN-0586 Required action: include release self-check coverage when the gap can reappear as repo drift.
PLAN-0587 Codebase evidence surface: pm-semantic-intent-gate.ts.
PLAN-0588 Observed state: Handler already integrates FDE, SIC, DTC, conversation state, and resolver evidence.
PLAN-0589 Implementation gap: Gap is that resolver readiness is not a hard promotion gate in all ontology-affecting flows.
PLAN-0590 Required action: convert this gap into a failing test before changing implementation where practical.
PLAN-0591 Required action: preserve existing behavior for read-only and proposal-only flows unless the PR explicitly says otherwise.
PLAN-0592 Required action: document any behavior change in the PR body under Scope and Recovery.
PLAN-0593 Required action: include a regression fixture when the gap concerns bypass, parity, hook output, or semantic promotion.
PLAN-0594 Required action: include release self-check coverage when the gap can reappear as repo drift.
PLAN-0595 Codebase evidence surface: mcp-server.ts.
PLAN-0596 Observed state: Public MCP registry exposes many governance tools.
PLAN-0597 Implementation gap: Gap is missing pm_pre_mutation_governance and pm_semantic_consistency_gate public surfaces.
PLAN-0598 Required action: convert this gap into a failing test before changing implementation where practical.
PLAN-0599 Required action: preserve existing behavior for read-only and proposal-only flows unless the PR explicitly says otherwise.
PLAN-0600 Required action: document any behavior change in the PR body under Scope and Recovery.
PLAN-0601 Required action: include a regression fixture when the gap concerns bypass, parity, hook output, or semantic promotion.
PLAN-0602 Required action: include release self-check coverage when the gap can reappear as repo drift.
PLAN-0603 Codebase evidence surface: pm-plugin-self-check.ts.
PLAN-0604 Observed state: Release self-check aggregates many existing validators.
PLAN-0605 Implementation gap: Gap is missing validators for this control-plane hardening effort.
PLAN-0606 Required action: convert this gap into a failing test before changing implementation where practical.
PLAN-0607 Required action: preserve existing behavior for read-only and proposal-only flows unless the PR explicitly says otherwise.
PLAN-0608 Required action: document any behavior change in the PR body under Scope and Recovery.
PLAN-0609 Required action: include a regression fixture when the gap concerns bypass, parity, hook output, or semantic promotion.
PLAN-0610 Required action: include release self-check coverage when the gap can reappear as repo drift.
PLAN-0611 Codebase evidence surface: Existing tests.
PLAN-0612 Observed state: Current tests cover many happy and blocking paths.
PLAN-0613 Implementation gap: Gap is several tests still encode bypass and advisory behavior that should become protected-deny behavior.
PLAN-0614 Required action: convert this gap into a failing test before changing implementation where practical.
PLAN-0615 Required action: preserve existing behavior for read-only and proposal-only flows unless the PR explicitly says otherwise.
PLAN-0616 Required action: document any behavior change in the PR body under Scope and Recovery.
PLAN-0617 Required action: include a regression fixture when the gap concerns bypass, parity, hook output, or semantic promotion.
PLAN-0618 Required action: include release self-check coverage when the gap can reappear as repo drift.
## Deep Dive Gap Analysis

### G01 - Mutation hook fail-open on invalid stdin and unhandled exceptions

PLAN-0619 G01 severity: critical.
PLAN-0620 G01 affected files: plugins/palantir-mini/hooks/commit-edits-governance.ts; plugins/palantir-mini/tests/hooks/commit-edits-governance.test.ts.
PLAN-0621 G01 owner: Lead implementation PR that first touches the listed files.
PLAN-0622 G01 policy stance: fail closed for protected mutation unless this gap explicitly concerns read-only behavior.
PLAN-0623 G01 current evidence: Invalid stdin JSON currently logs a skip path.
PLAN-0624 G01 current evidence: Unhandled errors currently return continue.
PLAN-0625 G01 current evidence: The hook exits with success even after governance computation failure.
PLAN-0626 G01 target state: Invalid stdin for mutation hook returns permissionDecision deny.
PLAN-0627 G01 target state: Unhandled errors return block and exit code 2.
PLAN-0628 G01 target state: Governance computation failure never returns continue for protected mutation.
PLAN-0629 G01 root cause: implementation and tests currently allow a human-readable or environment-driven policy surface to outrank deterministic plugin policy.
PLAN-0630 G01 blast radius: mutation authorization, release confidence, runtime parity claims, or LLM-facing state may become ambiguous if unfixed.
PLAN-0631 G01 rule 01: write a failing test or verifier fixture before changing behavior where the code path is directly testable.
PLAN-0632 G01 rule 02: prefer versioned schema additions over implicit object-shape checks.
PLAN-0633 G01 rule 03: prefer enum reason codes over free-text reason matching.
PLAN-0634 G01 rule 04: return stable reason codes and human-readable context for every new denial path.
PLAN-0635 G01 rule 05: identify evidence refs for every new allow path.
PLAN-0636 G01 rule 06: deny protected mutation when evidence cannot be loaded.
PLAN-0637 G01 rule 07: default unproven runtime support to unsupported or schema-only.
PLAN-0638 G01 rule 08: deny DTC approval when SemanticConversationState cannot prove promotion readiness.
PLAN-0639 G01 rule 09: include a negative fixture that demonstrates the previous unsafe behavior is gone.
PLAN-0640 G01 rule 10: include a positive fixture that shows legitimate protected work can proceed with complete evidence.
PLAN-0641 G01 rule 11: include stable snapshots or schema validation where output shape is contractual.
PLAN-0642 G01 rule 12: avoid updating tests to accept weaker behavior unless a narrower mutation class exemption is explicit.
PLAN-0643 G01 rule 13: run targeted Bun tests for the changed library, hook, adapter, or handler.
PLAN-0644 G01 rule 14: run static verifier scripts before release self-check.
PLAN-0645 G01 rule 15: make rollback possible by reverting the PR without changing unrelated workflow families.
PLAN-0646 G01 rule 16: update docs only after machine contracts exist.
PLAN-0647 G01 rule 17: mention runtime gaps honestly when Codex-only support remains the only verified install target.
PLAN-0648 G01 rule 18: prove that no LLM sentence can flip deny to allow.
PLAN-0649 G01 rule 19: prove that no environment variable can weaken a protected gate.
PLAN-0650 G01 rule 20: prove that unsupported runtime cannot be described as parity-complete.
PLAN-0651 G01 rule 21: prove that ContextEngineering ACTION cannot count as Ontology ActionType coverage.
PLAN-0652 G01 acceptance criterion 01: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0653 G01 acceptance criterion 02: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0654 G01 acceptance criterion 03: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0655 G01 acceptance criterion 04: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0656 G01 acceptance criterion 05: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0657 G01 acceptance criterion 06: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0658 G01 acceptance criterion 07: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0659 G01 acceptance criterion 08: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0660 G01 acceptance criterion 09: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0661 G01 acceptance criterion 10: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0662 G01 acceptance criterion 11: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0663 G01 acceptance criterion 12: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0664 G01 acceptance criterion 13: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0665 G01 acceptance criterion 14: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0666 G01 acceptance criterion 15: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0667 G01 acceptance criterion 16: the implementation must produce deterministic evidence that this gap cannot regress silently.
### G02 - Environment variables can downgrade or bypass gates

PLAN-0668 G02 severity: critical.
PLAN-0669 G02 affected files: prompt-dtc-enforcement-gate.ts; commit-edits-governance.ts; semantic-consistency/policy.ts; pre-mutation-impact-gate.ts.
PLAN-0670 G02 owner: Lead implementation PR that first touches the listed files.
PLAN-0671 G02 policy stance: fail closed for protected mutation unless this gap explicitly concerns read-only behavior.
PLAN-0672 G02 current evidence: Gate mode can be off, advisory, or blocking based on env.
PLAN-0673 G02 current evidence: Explicit bypass env vars return continue for protected flows.
PLAN-0674 G02 current evidence: Current tests expect bypass to succeed.
PLAN-0675 G02 target state: Project gate policy establishes minimum mode per mutation class.
PLAN-0676 G02 target state: Environment variables can strengthen effective mode only.
PLAN-0677 G02 target state: Bypass env vars cannot authorize protected mutation classes.
PLAN-0678 G02 root cause: implementation and tests currently allow a human-readable or environment-driven policy surface to outrank deterministic plugin policy.
PLAN-0679 G02 blast radius: mutation authorization, release confidence, runtime parity claims, or LLM-facing state may become ambiguous if unfixed.
PLAN-0680 G02 rule 01: write a failing test or verifier fixture before changing behavior where the code path is directly testable.
PLAN-0681 G02 rule 02: prefer versioned schema additions over implicit object-shape checks.
PLAN-0682 G02 rule 03: prefer enum reason codes over free-text reason matching.
PLAN-0683 G02 rule 04: return stable reason codes and human-readable context for every new denial path.
PLAN-0684 G02 rule 05: identify evidence refs for every new allow path.
PLAN-0685 G02 rule 06: deny protected mutation when evidence cannot be loaded.
PLAN-0686 G02 rule 07: default unproven runtime support to unsupported or schema-only.
PLAN-0687 G02 rule 08: deny DTC approval when SemanticConversationState cannot prove promotion readiness.
PLAN-0688 G02 rule 09: include a negative fixture that demonstrates the previous unsafe behavior is gone.
PLAN-0689 G02 rule 10: include a positive fixture that shows legitimate protected work can proceed with complete evidence.
PLAN-0690 G02 rule 11: include stable snapshots or schema validation where output shape is contractual.
PLAN-0691 G02 rule 12: avoid updating tests to accept weaker behavior unless a narrower mutation class exemption is explicit.
PLAN-0692 G02 rule 13: run targeted Bun tests for the changed library, hook, adapter, or handler.
PLAN-0693 G02 rule 14: run static verifier scripts before release self-check.
PLAN-0694 G02 rule 15: make rollback possible by reverting the PR without changing unrelated workflow families.
PLAN-0695 G02 rule 16: update docs only after machine contracts exist.
PLAN-0696 G02 rule 17: mention runtime gaps honestly when Codex-only support remains the only verified install target.
PLAN-0697 G02 rule 18: prove that no LLM sentence can flip deny to allow.
PLAN-0698 G02 rule 19: prove that no environment variable can weaken a protected gate.
PLAN-0699 G02 rule 20: prove that unsupported runtime cannot be described as parity-complete.
PLAN-0700 G02 rule 21: prove that ContextEngineering ACTION cannot count as Ontology ActionType coverage.
PLAN-0701 G02 acceptance criterion 01: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0702 G02 acceptance criterion 02: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0703 G02 acceptance criterion 03: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0704 G02 acceptance criterion 04: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0705 G02 acceptance criterion 05: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0706 G02 acceptance criterion 06: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0707 G02 acceptance criterion 07: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0708 G02 acceptance criterion 08: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0709 G02 acceptance criterion 09: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0710 G02 acceptance criterion 10: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0711 G02 acceptance criterion 11: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0712 G02 acceptance criterion 12: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0713 G02 acceptance criterion 13: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0714 G02 acceptance criterion 14: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0715 G02 acceptance criterion 15: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0716 G02 acceptance criterion 16: the implementation must produce deterministic evidence that this gap cannot regress silently.
### G03 - Pre-mutation governance is a helper rather than a single deterministic gate

PLAN-0717 G03 severity: critical.
PLAN-0718 G03 affected files: lib/governance/pre-mutation-governance.ts; bridge/mcp-server.ts.
PLAN-0719 G03 owner: Lead implementation PR that first touches the listed files.
PLAN-0720 G03 policy stance: fail closed for protected mutation unless this gap explicitly concerns read-only behavior.
PLAN-0721 G03 current evidence: Decision envelope trusts caller-provided allowed boolean.
PLAN-0722 G03 current evidence: No public pm_pre_mutation_governance tool exists.
PLAN-0723 G03 current evidence: Core evidence is not computed in one place.
PLAN-0724 G03 target state: A v2 governance gate computes allow or deny from structured inputs.
PLAN-0725 G03 target state: Public MCP surface exposes compute-only governance decision.
PLAN-0726 G03 target state: Hooks and handlers share the same gate library.
PLAN-0727 G03 root cause: implementation and tests currently allow a human-readable or environment-driven policy surface to outrank deterministic plugin policy.
PLAN-0728 G03 blast radius: mutation authorization, release confidence, runtime parity claims, or LLM-facing state may become ambiguous if unfixed.
PLAN-0729 G03 rule 01: write a failing test or verifier fixture before changing behavior where the code path is directly testable.
PLAN-0730 G03 rule 02: prefer versioned schema additions over implicit object-shape checks.
PLAN-0731 G03 rule 03: prefer enum reason codes over free-text reason matching.
PLAN-0732 G03 rule 04: return stable reason codes and human-readable context for every new denial path.
PLAN-0733 G03 rule 05: identify evidence refs for every new allow path.
PLAN-0734 G03 rule 06: deny protected mutation when evidence cannot be loaded.
PLAN-0735 G03 rule 07: default unproven runtime support to unsupported or schema-only.
PLAN-0736 G03 rule 08: deny DTC approval when SemanticConversationState cannot prove promotion readiness.
PLAN-0737 G03 rule 09: include a negative fixture that demonstrates the previous unsafe behavior is gone.
PLAN-0738 G03 rule 10: include a positive fixture that shows legitimate protected work can proceed with complete evidence.
PLAN-0739 G03 rule 11: include stable snapshots or schema validation where output shape is contractual.
PLAN-0740 G03 rule 12: avoid updating tests to accept weaker behavior unless a narrower mutation class exemption is explicit.
PLAN-0741 G03 rule 13: run targeted Bun tests for the changed library, hook, adapter, or handler.
PLAN-0742 G03 rule 14: run static verifier scripts before release self-check.
PLAN-0743 G03 rule 15: make rollback possible by reverting the PR without changing unrelated workflow families.
PLAN-0744 G03 rule 16: update docs only after machine contracts exist.
PLAN-0745 G03 rule 17: mention runtime gaps honestly when Codex-only support remains the only verified install target.
PLAN-0746 G03 rule 18: prove that no LLM sentence can flip deny to allow.
PLAN-0747 G03 rule 19: prove that no environment variable can weaken a protected gate.
PLAN-0748 G03 rule 20: prove that unsupported runtime cannot be described as parity-complete.
PLAN-0749 G03 rule 21: prove that ContextEngineering ACTION cannot count as Ontology ActionType coverage.
PLAN-0750 G03 acceptance criterion 01: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0751 G03 acceptance criterion 02: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0752 G03 acceptance criterion 03: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0753 G03 acceptance criterion 04: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0754 G03 acceptance criterion 05: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0755 G03 acceptance criterion 06: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0756 G03 acceptance criterion 07: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0757 G03 acceptance criterion 08: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0758 G03 acceptance criterion 09: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0759 G03 acceptance criterion 10: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0760 G03 acceptance criterion 11: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0761 G03 acceptance criterion 12: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0762 G03 acceptance criterion 13: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0763 G03 acceptance criterion 14: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0764 G03 acceptance criterion 15: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0765 G03 acceptance criterion 16: the implementation must produce deterministic evidence that this gap cannot regress silently.
### G04 - Runtime parity helper defaults conflict with Codex-only local checkout

PLAN-0766 G04 severity: high.
PLAN-0767 G04 affected files: core/contracts/workflow-family-enforcement.ts; tests/runtime-boundary/runtime-boundary.test.ts.
PLAN-0768 G04 owner: Lead implementation PR that first touches the listed files.
PLAN-0769 G04 policy stance: fail closed for protected mutation unless this gap explicitly concerns read-only behavior.
PLAN-0770 G04 current evidence: runtimeProjection defaults Claude to native.
PLAN-0771 G04 current evidence: runtimeProjection defaults Gemini to adapter-native.
PLAN-0772 G04 current evidence: complexE2EScenario auto-adds Gemini runtime refs.
PLAN-0773 G04 target state: Unsupported runtimes default to unsupported or schema-only.
PLAN-0774 G04 target state: Native or adapter-native requires evidence refs.
PLAN-0775 G04 target state: Complex E2E scenarios list only evidence-backed runtime refs.
PLAN-0776 G04 root cause: implementation and tests currently allow a human-readable or environment-driven policy surface to outrank deterministic plugin policy.
PLAN-0777 G04 blast radius: mutation authorization, release confidence, runtime parity claims, or LLM-facing state may become ambiguous if unfixed.
PLAN-0778 G04 rule 01: write a failing test or verifier fixture before changing behavior where the code path is directly testable.
PLAN-0779 G04 rule 02: prefer versioned schema additions over implicit object-shape checks.
PLAN-0780 G04 rule 03: prefer enum reason codes over free-text reason matching.
PLAN-0781 G04 rule 04: return stable reason codes and human-readable context for every new denial path.
PLAN-0782 G04 rule 05: identify evidence refs for every new allow path.
PLAN-0783 G04 rule 06: deny protected mutation when evidence cannot be loaded.
PLAN-0784 G04 rule 07: default unproven runtime support to unsupported or schema-only.
PLAN-0785 G04 rule 08: deny DTC approval when SemanticConversationState cannot prove promotion readiness.
PLAN-0786 G04 rule 09: include a negative fixture that demonstrates the previous unsafe behavior is gone.
PLAN-0787 G04 rule 10: include a positive fixture that shows legitimate protected work can proceed with complete evidence.
PLAN-0788 G04 rule 11: include stable snapshots or schema validation where output shape is contractual.
PLAN-0789 G04 rule 12: avoid updating tests to accept weaker behavior unless a narrower mutation class exemption is explicit.
PLAN-0790 G04 rule 13: run targeted Bun tests for the changed library, hook, adapter, or handler.
PLAN-0791 G04 rule 14: run static verifier scripts before release self-check.
PLAN-0792 G04 rule 15: make rollback possible by reverting the PR without changing unrelated workflow families.
PLAN-0793 G04 rule 16: update docs only after machine contracts exist.
PLAN-0794 G04 rule 17: mention runtime gaps honestly when Codex-only support remains the only verified install target.
PLAN-0795 G04 rule 18: prove that no LLM sentence can flip deny to allow.
PLAN-0796 G04 rule 19: prove that no environment variable can weaken a protected gate.
PLAN-0797 G04 rule 20: prove that unsupported runtime cannot be described as parity-complete.
PLAN-0798 G04 rule 21: prove that ContextEngineering ACTION cannot count as Ontology ActionType coverage.
PLAN-0799 G04 acceptance criterion 01: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0800 G04 acceptance criterion 02: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0801 G04 acceptance criterion 03: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0802 G04 acceptance criterion 04: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0803 G04 acceptance criterion 05: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0804 G04 acceptance criterion 06: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0805 G04 acceptance criterion 07: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0806 G04 acceptance criterion 08: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0807 G04 acceptance criterion 09: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0808 G04 acceptance criterion 10: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0809 G04 acceptance criterion 11: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0810 G04 acceptance criterion 12: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0811 G04 acceptance criterion 13: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0812 G04 acceptance criterion 14: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0813 G04 acceptance criterion 15: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0814 G04 acceptance criterion 16: the implementation must produce deterministic evidence that this gap cannot regress silently.
### G05 - Workflow family contract is inventory-rich but not release-blocking enough

PLAN-0815 G05 severity: high.
PLAN-0816 G05 affected files: core/contracts/workflow-family-enforcement.ts; bridge/handlers/pm-plugin-self-check.ts.
PLAN-0817 G05 owner: Lead implementation PR that first touches the listed files.
PLAN-0818 G05 policy stance: fail closed for protected mutation unless this gap explicitly concerns read-only behavior.
PLAN-0819 G05 current evidence: Tests ratchet presence of families, phases, AIP refs, and scenarios.
PLAN-0820 G05 current evidence: Mutation-capable phases can exist without release-blocking dry-run or replay evidence checks.
PLAN-0821 G05 current evidence: Runtime support claims can exist without evidence.
PLAN-0822 G05 target state: Release self-check fails missing blocking gates for mutation-capable surfaces.
PLAN-0823 G05 target state: Release self-check fails replayRequired without evidence.
PLAN-0824 G05 target state: Release self-check fails unsupported parity claims.
PLAN-0825 G05 root cause: implementation and tests currently allow a human-readable or environment-driven policy surface to outrank deterministic plugin policy.
PLAN-0826 G05 blast radius: mutation authorization, release confidence, runtime parity claims, or LLM-facing state may become ambiguous if unfixed.
PLAN-0827 G05 rule 01: write a failing test or verifier fixture before changing behavior where the code path is directly testable.
PLAN-0828 G05 rule 02: prefer versioned schema additions over implicit object-shape checks.
PLAN-0829 G05 rule 03: prefer enum reason codes over free-text reason matching.
PLAN-0830 G05 rule 04: return stable reason codes and human-readable context for every new denial path.
PLAN-0831 G05 rule 05: identify evidence refs for every new allow path.
PLAN-0832 G05 rule 06: deny protected mutation when evidence cannot be loaded.
PLAN-0833 G05 rule 07: default unproven runtime support to unsupported or schema-only.
PLAN-0834 G05 rule 08: deny DTC approval when SemanticConversationState cannot prove promotion readiness.
PLAN-0835 G05 rule 09: include a negative fixture that demonstrates the previous unsafe behavior is gone.
PLAN-0836 G05 rule 10: include a positive fixture that shows legitimate protected work can proceed with complete evidence.
PLAN-0837 G05 rule 11: include stable snapshots or schema validation where output shape is contractual.
PLAN-0838 G05 rule 12: avoid updating tests to accept weaker behavior unless a narrower mutation class exemption is explicit.
PLAN-0839 G05 rule 13: run targeted Bun tests for the changed library, hook, adapter, or handler.
PLAN-0840 G05 rule 14: run static verifier scripts before release self-check.
PLAN-0841 G05 rule 15: make rollback possible by reverting the PR without changing unrelated workflow families.
PLAN-0842 G05 rule 16: update docs only after machine contracts exist.
PLAN-0843 G05 rule 17: mention runtime gaps honestly when Codex-only support remains the only verified install target.
PLAN-0844 G05 rule 18: prove that no LLM sentence can flip deny to allow.
PLAN-0845 G05 rule 19: prove that no environment variable can weaken a protected gate.
PLAN-0846 G05 rule 20: prove that unsupported runtime cannot be described as parity-complete.
PLAN-0847 G05 rule 21: prove that ContextEngineering ACTION cannot count as Ontology ActionType coverage.
PLAN-0848 G05 acceptance criterion 01: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0849 G05 acceptance criterion 02: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0850 G05 acceptance criterion 03: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0851 G05 acceptance criterion 04: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0852 G05 acceptance criterion 05: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0853 G05 acceptance criterion 06: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0854 G05 acceptance criterion 07: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0855 G05 acceptance criterion 08: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0856 G05 acceptance criterion 09: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0857 G05 acceptance criterion 10: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0858 G05 acceptance criterion 11: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0859 G05 acceptance criterion 12: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0860 G05 acceptance criterion 13: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0861 G05 acceptance criterion 14: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0862 G05 acceptance criterion 15: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0863 G05 acceptance criterion 16: the implementation must produce deterministic evidence that this gap cannot regress silently.
### G06 - Hook registry lacks schema-backed mutation hook contracts

PLAN-0864 G06 severity: high.
PLAN-0865 G06 affected files: hooks/hooks.json; lib/codex/codex-hook-adapter.ts; check-hooks.ts.
PLAN-0866 G06 owner: Lead implementation PR that first touches the listed files.
PLAN-0867 G06 policy stance: fail closed for protected mutation unless this gap explicitly concerns read-only behavior.
PLAN-0868 G06 current evidence: Hook registry has commands, matchers, permissions, and some failure modes.
PLAN-0869 G06 current evidence: Mutation-required hooks lack inputSchemaRef and outputSchemaRef.
PLAN-0870 G06 current evidence: Adapter does not validate output schema before honoring a decision.
PLAN-0871 G06 target state: Mutation-required hooks declare schemas and required mutation classes.
PLAN-0872 G06 target state: Adapter rejects schema mismatch for mutation-required hooks.
PLAN-0873 G06 target state: Self-check validates hook contracts.
PLAN-0874 G06 root cause: implementation and tests currently allow a human-readable or environment-driven policy surface to outrank deterministic plugin policy.
PLAN-0875 G06 blast radius: mutation authorization, release confidence, runtime parity claims, or LLM-facing state may become ambiguous if unfixed.
PLAN-0876 G06 rule 01: write a failing test or verifier fixture before changing behavior where the code path is directly testable.
PLAN-0877 G06 rule 02: prefer versioned schema additions over implicit object-shape checks.
PLAN-0878 G06 rule 03: prefer enum reason codes over free-text reason matching.
PLAN-0879 G06 rule 04: return stable reason codes and human-readable context for every new denial path.
PLAN-0880 G06 rule 05: identify evidence refs for every new allow path.
PLAN-0881 G06 rule 06: deny protected mutation when evidence cannot be loaded.
PLAN-0882 G06 rule 07: default unproven runtime support to unsupported or schema-only.
PLAN-0883 G06 rule 08: deny DTC approval when SemanticConversationState cannot prove promotion readiness.
PLAN-0884 G06 rule 09: include a negative fixture that demonstrates the previous unsafe behavior is gone.
PLAN-0885 G06 rule 10: include a positive fixture that shows legitimate protected work can proceed with complete evidence.
PLAN-0886 G06 rule 11: include stable snapshots or schema validation where output shape is contractual.
PLAN-0887 G06 rule 12: avoid updating tests to accept weaker behavior unless a narrower mutation class exemption is explicit.
PLAN-0888 G06 rule 13: run targeted Bun tests for the changed library, hook, adapter, or handler.
PLAN-0889 G06 rule 14: run static verifier scripts before release self-check.
PLAN-0890 G06 rule 15: make rollback possible by reverting the PR without changing unrelated workflow families.
PLAN-0891 G06 rule 16: update docs only after machine contracts exist.
PLAN-0892 G06 rule 17: mention runtime gaps honestly when Codex-only support remains the only verified install target.
PLAN-0893 G06 rule 18: prove that no LLM sentence can flip deny to allow.
PLAN-0894 G06 rule 19: prove that no environment variable can weaken a protected gate.
PLAN-0895 G06 rule 20: prove that unsupported runtime cannot be described as parity-complete.
PLAN-0896 G06 rule 21: prove that ContextEngineering ACTION cannot count as Ontology ActionType coverage.
PLAN-0897 G06 acceptance criterion 01: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0898 G06 acceptance criterion 02: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0899 G06 acceptance criterion 03: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0900 G06 acceptance criterion 04: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0901 G06 acceptance criterion 05: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0902 G06 acceptance criterion 06: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0903 G06 acceptance criterion 07: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0904 G06 acceptance criterion 08: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0905 G06 acceptance criterion 09: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0906 G06 acceptance criterion 10: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0907 G06 acceptance criterion 11: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0908 G06 acceptance criterion 12: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0909 G06 acceptance criterion 13: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0910 G06 acceptance criterion 14: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0911 G06 acceptance criterion 15: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0912 G06 acceptance criterion 16: the implementation must produce deterministic evidence that this gap cannot regress silently.
### G07 - Semantic consistency resolver is deterministic but not a hard promotion gate

PLAN-0913 G07 severity: high.
PLAN-0914 G07 affected files: semantic-consistency; lead-intent/contracts.ts; pm-semantic-intent-gate.ts.
PLAN-0915 G07 owner: Lead implementation PR that first touches the listed files.
PLAN-0916 G07 policy stance: fail closed for protected mutation unless this gap explicitly concerns read-only behavior.
PLAN-0917 G07 current evidence: Resolver output is deterministic and hash-based.
PLAN-0918 G07 current evidence: Validation severity can be advisory depending on env.
PLAN-0919 G07 current evidence: Promotion readiness exists but not as a universal hard gate.
PLAN-0920 G07 target state: Ontology-affecting SIC/DTC promotion requires resolver output.
PLAN-0921 G07 target state: Conflict and LLM promotion fixtures deny promotion.
PLAN-0922 G07 target state: Repeated resolver output remains byte-identical.
PLAN-0923 G07 root cause: implementation and tests currently allow a human-readable or environment-driven policy surface to outrank deterministic plugin policy.
PLAN-0924 G07 blast radius: mutation authorization, release confidence, runtime parity claims, or LLM-facing state may become ambiguous if unfixed.
PLAN-0925 G07 rule 01: write a failing test or verifier fixture before changing behavior where the code path is directly testable.
PLAN-0926 G07 rule 02: prefer versioned schema additions over implicit object-shape checks.
PLAN-0927 G07 rule 03: prefer enum reason codes over free-text reason matching.
PLAN-0928 G07 rule 04: return stable reason codes and human-readable context for every new denial path.
PLAN-0929 G07 rule 05: identify evidence refs for every new allow path.
PLAN-0930 G07 rule 06: deny protected mutation when evidence cannot be loaded.
PLAN-0931 G07 rule 07: default unproven runtime support to unsupported or schema-only.
PLAN-0932 G07 rule 08: deny DTC approval when SemanticConversationState cannot prove promotion readiness.
PLAN-0933 G07 rule 09: include a negative fixture that demonstrates the previous unsafe behavior is gone.
PLAN-0934 G07 rule 10: include a positive fixture that shows legitimate protected work can proceed with complete evidence.
PLAN-0935 G07 rule 11: include stable snapshots or schema validation where output shape is contractual.
PLAN-0936 G07 rule 12: avoid updating tests to accept weaker behavior unless a narrower mutation class exemption is explicit.
PLAN-0937 G07 rule 13: run targeted Bun tests for the changed library, hook, adapter, or handler.
PLAN-0938 G07 rule 14: run static verifier scripts before release self-check.
PLAN-0939 G07 rule 15: make rollback possible by reverting the PR without changing unrelated workflow families.
PLAN-0940 G07 rule 16: update docs only after machine contracts exist.
PLAN-0941 G07 rule 17: mention runtime gaps honestly when Codex-only support remains the only verified install target.
PLAN-0942 G07 rule 18: prove that no LLM sentence can flip deny to allow.
PLAN-0943 G07 rule 19: prove that no environment variable can weaken a protected gate.
PLAN-0944 G07 rule 20: prove that unsupported runtime cannot be described as parity-complete.
PLAN-0945 G07 rule 21: prove that ContextEngineering ACTION cannot count as Ontology ActionType coverage.
PLAN-0946 G07 acceptance criterion 01: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0947 G07 acceptance criterion 02: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0948 G07 acceptance criterion 03: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0949 G07 acceptance criterion 04: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0950 G07 acceptance criterion 05: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0951 G07 acceptance criterion 06: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0952 G07 acceptance criterion 07: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0953 G07 acceptance criterion 08: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0954 G07 acceptance criterion 09: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0955 G07 acceptance criterion 10: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0956 G07 acceptance criterion 11: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0957 G07 acceptance criterion 12: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0958 G07 acceptance criterion 13: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0959 G07 acceptance criterion 14: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0960 G07 acceptance criterion 15: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0961 G07 acceptance criterion 16: the implementation must produce deterministic evidence that this gap cannot regress silently.
### G08 - SemanticConversationState is not yet enforced as the only LLM-facing control state

PLAN-0962 G08 severity: high.
PLAN-0963 G08 affected files: chatbot-studio/semantic-conversation-state.ts; application-state.ts; retrieval-context.ts.
PLAN-0964 G08 owner: Lead implementation PR that first touches the listed files.
PLAN-0965 G08 policy stance: fail closed for protected mutation unless this gap explicitly concerns read-only behavior.
PLAN-0966 G08 current evidence: State projection exists and defaults to Korean non-programmer UX.
PLAN-0967 G08 current evidence: Application state and retrieval context derive from the projection.
PLAN-0968 G08 current evidence: No schema or linter proves all LLM-facing prompts use only this projection.
PLAN-0969 G08 target state: Schema-backed SemanticConversationState projection is the only LLM-facing control state.
PLAN-0970 G08 target state: LLM cannot set readiness booleans or approval refs.
PLAN-0971 G08 target state: Prompt templates and handlers consume projection only.
PLAN-0972 G08 root cause: implementation and tests currently allow a human-readable or environment-driven policy surface to outrank deterministic plugin policy.
PLAN-0973 G08 blast radius: mutation authorization, release confidence, runtime parity claims, or LLM-facing state may become ambiguous if unfixed.
PLAN-0974 G08 rule 01: write a failing test or verifier fixture before changing behavior where the code path is directly testable.
PLAN-0975 G08 rule 02: prefer versioned schema additions over implicit object-shape checks.
PLAN-0976 G08 rule 03: prefer enum reason codes over free-text reason matching.
PLAN-0977 G08 rule 04: return stable reason codes and human-readable context for every new denial path.
PLAN-0978 G08 rule 05: identify evidence refs for every new allow path.
PLAN-0979 G08 rule 06: deny protected mutation when evidence cannot be loaded.
PLAN-0980 G08 rule 07: default unproven runtime support to unsupported or schema-only.
PLAN-0981 G08 rule 08: deny DTC approval when SemanticConversationState cannot prove promotion readiness.
PLAN-0982 G08 rule 09: include a negative fixture that demonstrates the previous unsafe behavior is gone.
PLAN-0983 G08 rule 10: include a positive fixture that shows legitimate protected work can proceed with complete evidence.
PLAN-0984 G08 rule 11: include stable snapshots or schema validation where output shape is contractual.
PLAN-0985 G08 rule 12: avoid updating tests to accept weaker behavior unless a narrower mutation class exemption is explicit.
PLAN-0986 G08 rule 13: run targeted Bun tests for the changed library, hook, adapter, or handler.
PLAN-0987 G08 rule 14: run static verifier scripts before release self-check.
PLAN-0988 G08 rule 15: make rollback possible by reverting the PR without changing unrelated workflow families.
PLAN-0989 G08 rule 16: update docs only after machine contracts exist.
PLAN-0990 G08 rule 17: mention runtime gaps honestly when Codex-only support remains the only verified install target.
PLAN-0991 G08 rule 18: prove that no LLM sentence can flip deny to allow.
PLAN-0992 G08 rule 19: prove that no environment variable can weaken a protected gate.
PLAN-0993 G08 rule 20: prove that unsupported runtime cannot be described as parity-complete.
PLAN-0994 G08 rule 21: prove that ContextEngineering ACTION cannot count as Ontology ActionType coverage.
PLAN-0995 G08 acceptance criterion 01: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0996 G08 acceptance criterion 02: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0997 G08 acceptance criterion 03: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0998 G08 acceptance criterion 04: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-0999 G08 acceptance criterion 05: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1000 G08 acceptance criterion 06: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1001 G08 acceptance criterion 07: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1002 G08 acceptance criterion 08: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1003 G08 acceptance criterion 09: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1004 G08 acceptance criterion 10: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1005 G08 acceptance criterion 11: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1006 G08 acceptance criterion 12: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1007 G08 acceptance criterion 13: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1008 G08 acceptance criterion 14: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1009 G08 acceptance criterion 15: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1010 G08 acceptance criterion 16: the implementation must produce deterministic evidence that this gap cannot regress silently.
### G09 - Root semantic fork detection is missing

PLAN-1011 G09 severity: medium.
PLAN-1012 G09 affected files: README.md; plugins/palantir-mini/scripts; ci.
PLAN-1013 G09 owner: Lead implementation PR that first touches the listed files.
PLAN-1014 G09 policy stance: fail closed for protected mutation unless this gap explicitly concerns read-only behavior.
PLAN-1015 G09 current evidence: Root README says root is marketplace role only.
PLAN-1016 G09 current evidence: No verifier blocks root-level semantic forks.
PLAN-1017 G09 current evidence: No root CI delegates plugin self-check with root integrity checks.
PLAN-1018 G09 target state: Root semantic fork detector fails duplicate semantic source outside plugin root.
PLAN-1019 G09 target state: Root CI calls plugin self-check only.
PLAN-1020 G09 target state: Runtime cache and generated artifact commits are blocked.
PLAN-1021 G09 root cause: implementation and tests currently allow a human-readable or environment-driven policy surface to outrank deterministic plugin policy.
PLAN-1022 G09 blast radius: mutation authorization, release confidence, runtime parity claims, or LLM-facing state may become ambiguous if unfixed.
PLAN-1023 G09 rule 01: write a failing test or verifier fixture before changing behavior where the code path is directly testable.
PLAN-1024 G09 rule 02: prefer versioned schema additions over implicit object-shape checks.
PLAN-1025 G09 rule 03: prefer enum reason codes over free-text reason matching.
PLAN-1026 G09 rule 04: return stable reason codes and human-readable context for every new denial path.
PLAN-1027 G09 rule 05: identify evidence refs for every new allow path.
PLAN-1028 G09 rule 06: deny protected mutation when evidence cannot be loaded.
PLAN-1029 G09 rule 07: default unproven runtime support to unsupported or schema-only.
PLAN-1030 G09 rule 08: deny DTC approval when SemanticConversationState cannot prove promotion readiness.
PLAN-1031 G09 rule 09: include a negative fixture that demonstrates the previous unsafe behavior is gone.
PLAN-1032 G09 rule 10: include a positive fixture that shows legitimate protected work can proceed with complete evidence.
PLAN-1033 G09 rule 11: include stable snapshots or schema validation where output shape is contractual.
PLAN-1034 G09 rule 12: avoid updating tests to accept weaker behavior unless a narrower mutation class exemption is explicit.
PLAN-1035 G09 rule 13: run targeted Bun tests for the changed library, hook, adapter, or handler.
PLAN-1036 G09 rule 14: run static verifier scripts before release self-check.
PLAN-1037 G09 rule 15: make rollback possible by reverting the PR without changing unrelated workflow families.
PLAN-1038 G09 rule 16: update docs only after machine contracts exist.
PLAN-1039 G09 rule 17: mention runtime gaps honestly when Codex-only support remains the only verified install target.
PLAN-1040 G09 rule 18: prove that no LLM sentence can flip deny to allow.
PLAN-1041 G09 rule 19: prove that no environment variable can weaken a protected gate.
PLAN-1042 G09 rule 20: prove that unsupported runtime cannot be described as parity-complete.
PLAN-1043 G09 rule 21: prove that ContextEngineering ACTION cannot count as Ontology ActionType coverage.
PLAN-1044 G09 acceptance criterion 01: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1045 G09 acceptance criterion 02: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1046 G09 acceptance criterion 03: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1047 G09 acceptance criterion 04: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1048 G09 acceptance criterion 05: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1049 G09 acceptance criterion 06: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1050 G09 acceptance criterion 07: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1051 G09 acceptance criterion 08: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1052 G09 acceptance criterion 09: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1053 G09 acceptance criterion 10: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1054 G09 acceptance criterion 11: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1055 G09 acceptance criterion 12: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1056 G09 acceptance criterion 13: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1057 G09 acceptance criterion 14: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1058 G09 acceptance criterion 15: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1059 G09 acceptance criterion 16: the implementation must produce deterministic evidence that this gap cannot regress silently.
### G10 - ContextEngineering domains and Ontology primitives can be conflated

PLAN-1060 G10 severity: critical.
PLAN-1061 G10 affected files: fde-governance-policy.ts; lead-intent/contracts.ts; pm-semantic-intent-gate.ts.
PLAN-1062 G10 owner: Lead implementation PR that first touches the listed files.
PLAN-1063 G10 policy stance: fail closed for protected mutation unless this gap explicitly concerns read-only behavior.
PLAN-1064 G10 current evidence: DTC review domains are DATA, LOGIC, ACTION, TECHNOLOGY, GOVERNANCE.
PLAN-1065 G10 current evidence: PalantirArchitectureTerm mixes ontology primitives and AIP/Chatbot concepts.
PLAN-1066 G10 current evidence: Review domain inference is largely path and tool-name based.
PLAN-1067 G10 target state: Separate enums and schemas for ContextEngineering domains and Ontology primitive kinds.
PLAN-1068 G10 target state: FDE cards display the distinction clearly.
PLAN-1069 G10 target state: SIC/DTC validation requires both domain closure and typed primitive coverage where relevant.
PLAN-1070 G10 root cause: implementation and tests currently allow a human-readable or environment-driven policy surface to outrank deterministic plugin policy.
PLAN-1071 G10 blast radius: mutation authorization, release confidence, runtime parity claims, or LLM-facing state may become ambiguous if unfixed.
PLAN-1072 G10 rule 01: write a failing test or verifier fixture before changing behavior where the code path is directly testable.
PLAN-1073 G10 rule 02: prefer versioned schema additions over implicit object-shape checks.
PLAN-1074 G10 rule 03: prefer enum reason codes over free-text reason matching.
PLAN-1075 G10 rule 04: return stable reason codes and human-readable context for every new denial path.
PLAN-1076 G10 rule 05: identify evidence refs for every new allow path.
PLAN-1077 G10 rule 06: deny protected mutation when evidence cannot be loaded.
PLAN-1078 G10 rule 07: default unproven runtime support to unsupported or schema-only.
PLAN-1079 G10 rule 08: deny DTC approval when SemanticConversationState cannot prove promotion readiness.
PLAN-1080 G10 rule 09: include a negative fixture that demonstrates the previous unsafe behavior is gone.
PLAN-1081 G10 rule 10: include a positive fixture that shows legitimate protected work can proceed with complete evidence.
PLAN-1082 G10 rule 11: include stable snapshots or schema validation where output shape is contractual.
PLAN-1083 G10 rule 12: avoid updating tests to accept weaker behavior unless a narrower mutation class exemption is explicit.
PLAN-1084 G10 rule 13: run targeted Bun tests for the changed library, hook, adapter, or handler.
PLAN-1085 G10 rule 14: run static verifier scripts before release self-check.
PLAN-1086 G10 rule 15: make rollback possible by reverting the PR without changing unrelated workflow families.
PLAN-1087 G10 rule 16: update docs only after machine contracts exist.
PLAN-1088 G10 rule 17: mention runtime gaps honestly when Codex-only support remains the only verified install target.
PLAN-1089 G10 rule 18: prove that no LLM sentence can flip deny to allow.
PLAN-1090 G10 rule 19: prove that no environment variable can weaken a protected gate.
PLAN-1091 G10 rule 20: prove that unsupported runtime cannot be described as parity-complete.
PLAN-1092 G10 rule 21: prove that ContextEngineering ACTION cannot count as Ontology ActionType coverage.
PLAN-1093 G10 acceptance criterion 01: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1094 G10 acceptance criterion 02: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1095 G10 acceptance criterion 03: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1096 G10 acceptance criterion 04: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1097 G10 acceptance criterion 05: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1098 G10 acceptance criterion 06: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1099 G10 acceptance criterion 07: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1100 G10 acceptance criterion 08: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1101 G10 acceptance criterion 09: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1102 G10 acceptance criterion 10: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1103 G10 acceptance criterion 11: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1104 G10 acceptance criterion 12: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1105 G10 acceptance criterion 13: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1106 G10 acceptance criterion 14: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1107 G10 acceptance criterion 15: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1108 G10 acceptance criterion 16: the implementation must produce deterministic evidence that this gap cannot regress silently.
### G11 - DTC and SIC validation severities remain env-sensitive for protected flows

PLAN-1109 G11 severity: high.
PLAN-1110 G11 affected files: lead-intent/contracts.ts; tests/lib/lead-intent/contracts.test.ts.
PLAN-1111 G11 owner: Lead implementation PR that first touches the listed files.
PLAN-1112 G11 policy stance: fail closed for protected mutation unless this gap explicitly concerns read-only behavior.
PLAN-1113 G11 current evidence: Semantic consistency issues can be advisory under env policy.
PLAN-1114 G11 current evidence: DTC eval refs can be bypassed by env for some paths.
PLAN-1115 G11 current evidence: Ontology-affecting typed ref checks have bypass conditions.
PLAN-1116 G11 target state: Protected mutation classes require blocking severity.
PLAN-1117 G11 target state: Release and commit require eval evidence without env downgrade.
PLAN-1118 G11 target state: Bypasses require signed emergency evidence and still cannot authorize forbidden classes.
PLAN-1119 G11 root cause: implementation and tests currently allow a human-readable or environment-driven policy surface to outrank deterministic plugin policy.
PLAN-1120 G11 blast radius: mutation authorization, release confidence, runtime parity claims, or LLM-facing state may become ambiguous if unfixed.
PLAN-1121 G11 rule 01: write a failing test or verifier fixture before changing behavior where the code path is directly testable.
PLAN-1122 G11 rule 02: prefer versioned schema additions over implicit object-shape checks.
PLAN-1123 G11 rule 03: prefer enum reason codes over free-text reason matching.
PLAN-1124 G11 rule 04: return stable reason codes and human-readable context for every new denial path.
PLAN-1125 G11 rule 05: identify evidence refs for every new allow path.
PLAN-1126 G11 rule 06: deny protected mutation when evidence cannot be loaded.
PLAN-1127 G11 rule 07: default unproven runtime support to unsupported or schema-only.
PLAN-1128 G11 rule 08: deny DTC approval when SemanticConversationState cannot prove promotion readiness.
PLAN-1129 G11 rule 09: include a negative fixture that demonstrates the previous unsafe behavior is gone.
PLAN-1130 G11 rule 10: include a positive fixture that shows legitimate protected work can proceed with complete evidence.
PLAN-1131 G11 rule 11: include stable snapshots or schema validation where output shape is contractual.
PLAN-1132 G11 rule 12: avoid updating tests to accept weaker behavior unless a narrower mutation class exemption is explicit.
PLAN-1133 G11 rule 13: run targeted Bun tests for the changed library, hook, adapter, or handler.
PLAN-1134 G11 rule 14: run static verifier scripts before release self-check.
PLAN-1135 G11 rule 15: make rollback possible by reverting the PR without changing unrelated workflow families.
PLAN-1136 G11 rule 16: update docs only after machine contracts exist.
PLAN-1137 G11 rule 17: mention runtime gaps honestly when Codex-only support remains the only verified install target.
PLAN-1138 G11 rule 18: prove that no LLM sentence can flip deny to allow.
PLAN-1139 G11 rule 19: prove that no environment variable can weaken a protected gate.
PLAN-1140 G11 rule 20: prove that unsupported runtime cannot be described as parity-complete.
PLAN-1141 G11 rule 21: prove that ContextEngineering ACTION cannot count as Ontology ActionType coverage.
PLAN-1142 G11 acceptance criterion 01: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1143 G11 acceptance criterion 02: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1144 G11 acceptance criterion 03: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1145 G11 acceptance criterion 04: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1146 G11 acceptance criterion 05: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1147 G11 acceptance criterion 06: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1148 G11 acceptance criterion 07: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1149 G11 acceptance criterion 08: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1150 G11 acceptance criterion 09: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1151 G11 acceptance criterion 10: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1152 G11 acceptance criterion 11: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1153 G11 acceptance criterion 12: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1154 G11 acceptance criterion 13: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1155 G11 acceptance criterion 14: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1156 G11 acceptance criterion 15: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1157 G11 acceptance criterion 16: the implementation must produce deterministic evidence that this gap cannot regress silently.
### G12 - Release self-check does not aggregate new deterministic control-plane gates

PLAN-1158 G12 severity: high.
PLAN-1159 G12 affected files: bridge/handlers/pm-plugin-self-check.ts.
PLAN-1160 G12 owner: Lead implementation PR that first touches the listed files.
PLAN-1161 G12 policy stance: fail closed for protected mutation unless this gap explicitly concerns read-only behavior.
PLAN-1162 G12 current evidence: Release mode aggregates existing checks.
PLAN-1163 G12 current evidence: It omits layer boundary, runtime parity, hook IO schema, workflow-family release, semantic promotion, and root fork gates.
PLAN-1164 G12 target state: Release mode fails when any deterministic control-plane verifier fails.
PLAN-1165 G12 target state: Each verifier reports stable finding IDs.
PLAN-1166 G12 target state: Self-check output states runtime gap vs failure explicitly.
PLAN-1167 G12 root cause: implementation and tests currently allow a human-readable or environment-driven policy surface to outrank deterministic plugin policy.
PLAN-1168 G12 blast radius: mutation authorization, release confidence, runtime parity claims, or LLM-facing state may become ambiguous if unfixed.
PLAN-1169 G12 rule 01: write a failing test or verifier fixture before changing behavior where the code path is directly testable.
PLAN-1170 G12 rule 02: prefer versioned schema additions over implicit object-shape checks.
PLAN-1171 G12 rule 03: prefer enum reason codes over free-text reason matching.
PLAN-1172 G12 rule 04: return stable reason codes and human-readable context for every new denial path.
PLAN-1173 G12 rule 05: identify evidence refs for every new allow path.
PLAN-1174 G12 rule 06: deny protected mutation when evidence cannot be loaded.
PLAN-1175 G12 rule 07: default unproven runtime support to unsupported or schema-only.
PLAN-1176 G12 rule 08: deny DTC approval when SemanticConversationState cannot prove promotion readiness.
PLAN-1177 G12 rule 09: include a negative fixture that demonstrates the previous unsafe behavior is gone.
PLAN-1178 G12 rule 10: include a positive fixture that shows legitimate protected work can proceed with complete evidence.
PLAN-1179 G12 rule 11: include stable snapshots or schema validation where output shape is contractual.
PLAN-1180 G12 rule 12: avoid updating tests to accept weaker behavior unless a narrower mutation class exemption is explicit.
PLAN-1181 G12 rule 13: run targeted Bun tests for the changed library, hook, adapter, or handler.
PLAN-1182 G12 rule 14: run static verifier scripts before release self-check.
PLAN-1183 G12 rule 15: make rollback possible by reverting the PR without changing unrelated workflow families.
PLAN-1184 G12 rule 16: update docs only after machine contracts exist.
PLAN-1185 G12 rule 17: mention runtime gaps honestly when Codex-only support remains the only verified install target.
PLAN-1186 G12 rule 18: prove that no LLM sentence can flip deny to allow.
PLAN-1187 G12 rule 19: prove that no environment variable can weaken a protected gate.
PLAN-1188 G12 rule 20: prove that unsupported runtime cannot be described as parity-complete.
PLAN-1189 G12 rule 21: prove that ContextEngineering ACTION cannot count as Ontology ActionType coverage.
PLAN-1190 G12 acceptance criterion 01: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1191 G12 acceptance criterion 02: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1192 G12 acceptance criterion 03: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1193 G12 acceptance criterion 04: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1194 G12 acceptance criterion 05: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1195 G12 acceptance criterion 06: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1196 G12 acceptance criterion 07: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1197 G12 acceptance criterion 08: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1198 G12 acceptance criterion 09: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1199 G12 acceptance criterion 10: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1200 G12 acceptance criterion 11: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1201 G12 acceptance criterion 12: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1202 G12 acceptance criterion 13: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1203 G12 acceptance criterion 14: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1204 G12 acceptance criterion 15: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1205 G12 acceptance criterion 16: the implementation must produce deterministic evidence that this gap cannot regress silently.
### G13 - Adapter output schema validation is absent for mutation-required hook decisions

PLAN-1206 G13 severity: high.
PLAN-1207 G13 affected files: lib/codex/codex-hook-adapter.ts; tests/lib/codex/codex-hook-adapter.test.ts.
PLAN-1208 G13 owner: Lead implementation PR that first touches the listed files.
PLAN-1209 G13 policy stance: fail closed for protected mutation unless this gap explicitly concerns read-only behavior.
PLAN-1210 G13 current evidence: Adapter parses hook JSON opportunistically.
PLAN-1211 G13 current evidence: Adapter honors decision fields when present.
PLAN-1212 G13 current evidence: Adapter does not validate governance-hook output schema.
PLAN-1213 G13 target state: Mutation-required hook output schema mismatch maps to deny.
PLAN-1214 G13 target state: Malformed output from required hooks cannot be treated as allow.
PLAN-1215 G13 target state: Schema validation errors are surfaced in adapter response context.
PLAN-1216 G13 root cause: implementation and tests currently allow a human-readable or environment-driven policy surface to outrank deterministic plugin policy.
PLAN-1217 G13 blast radius: mutation authorization, release confidence, runtime parity claims, or LLM-facing state may become ambiguous if unfixed.
PLAN-1218 G13 rule 01: write a failing test or verifier fixture before changing behavior where the code path is directly testable.
PLAN-1219 G13 rule 02: prefer versioned schema additions over implicit object-shape checks.
PLAN-1220 G13 rule 03: prefer enum reason codes over free-text reason matching.
PLAN-1221 G13 rule 04: return stable reason codes and human-readable context for every new denial path.
PLAN-1222 G13 rule 05: identify evidence refs for every new allow path.
PLAN-1223 G13 rule 06: deny protected mutation when evidence cannot be loaded.
PLAN-1224 G13 rule 07: default unproven runtime support to unsupported or schema-only.
PLAN-1225 G13 rule 08: deny DTC approval when SemanticConversationState cannot prove promotion readiness.
PLAN-1226 G13 rule 09: include a negative fixture that demonstrates the previous unsafe behavior is gone.
PLAN-1227 G13 rule 10: include a positive fixture that shows legitimate protected work can proceed with complete evidence.
PLAN-1228 G13 rule 11: include stable snapshots or schema validation where output shape is contractual.
PLAN-1229 G13 rule 12: avoid updating tests to accept weaker behavior unless a narrower mutation class exemption is explicit.
PLAN-1230 G13 rule 13: run targeted Bun tests for the changed library, hook, adapter, or handler.
PLAN-1231 G13 rule 14: run static verifier scripts before release self-check.
PLAN-1232 G13 rule 15: make rollback possible by reverting the PR without changing unrelated workflow families.
PLAN-1233 G13 rule 16: update docs only after machine contracts exist.
PLAN-1234 G13 rule 17: mention runtime gaps honestly when Codex-only support remains the only verified install target.
PLAN-1235 G13 rule 18: prove that no LLM sentence can flip deny to allow.
PLAN-1236 G13 rule 19: prove that no environment variable can weaken a protected gate.
PLAN-1237 G13 rule 20: prove that unsupported runtime cannot be described as parity-complete.
PLAN-1238 G13 rule 21: prove that ContextEngineering ACTION cannot count as Ontology ActionType coverage.
PLAN-1239 G13 acceptance criterion 01: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1240 G13 acceptance criterion 02: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1241 G13 acceptance criterion 03: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1242 G13 acceptance criterion 04: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1243 G13 acceptance criterion 05: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1244 G13 acceptance criterion 06: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1245 G13 acceptance criterion 07: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1246 G13 acceptance criterion 08: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1247 G13 acceptance criterion 09: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1248 G13 acceptance criterion 10: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1249 G13 acceptance criterion 11: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1250 G13 acceptance criterion 12: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1251 G13 acceptance criterion 13: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1252 G13 acceptance criterion 14: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1253 G13 acceptance criterion 15: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1254 G13 acceptance criterion 16: the implementation must produce deterministic evidence that this gap cannot regress silently.
### G14 - Quick sprint inline grade failures can remain advisory in commit governance

PLAN-1255 G14 severity: medium.
PLAN-1256 G14 affected files: hooks/commit-edits-governance.ts.
PLAN-1257 G14 owner: Lead implementation PR that first touches the listed files.
PLAN-1258 G14 policy stance: fail closed for protected mutation unless this gap explicitly concerns read-only behavior.
PLAN-1259 G14 current evidence: Quick sprint inline grader can produce failed grade.
PLAN-1260 G14 current evidence: Current code logs the grade but still allows under the quick-sprint path.
PLAN-1261 G14 current evidence: This conflicts with release-blocking deterministic policy.
PLAN-1262 G14 target state: Failed inline grade blocks protected mutation classes.
PLAN-1263 G14 target state: Advisory grade remains advisory only for read-only or proposal-only classes.
PLAN-1264 G14 target state: Tests cover failed grade deny path.
PLAN-1265 G14 root cause: implementation and tests currently allow a human-readable or environment-driven policy surface to outrank deterministic plugin policy.
PLAN-1266 G14 blast radius: mutation authorization, release confidence, runtime parity claims, or LLM-facing state may become ambiguous if unfixed.
PLAN-1267 G14 rule 01: write a failing test or verifier fixture before changing behavior where the code path is directly testable.
PLAN-1268 G14 rule 02: prefer versioned schema additions over implicit object-shape checks.
PLAN-1269 G14 rule 03: prefer enum reason codes over free-text reason matching.
PLAN-1270 G14 rule 04: return stable reason codes and human-readable context for every new denial path.
PLAN-1271 G14 rule 05: identify evidence refs for every new allow path.
PLAN-1272 G14 rule 06: deny protected mutation when evidence cannot be loaded.
PLAN-1273 G14 rule 07: default unproven runtime support to unsupported or schema-only.
PLAN-1274 G14 rule 08: deny DTC approval when SemanticConversationState cannot prove promotion readiness.
PLAN-1275 G14 rule 09: include a negative fixture that demonstrates the previous unsafe behavior is gone.
PLAN-1276 G14 rule 10: include a positive fixture that shows legitimate protected work can proceed with complete evidence.
PLAN-1277 G14 rule 11: include stable snapshots or schema validation where output shape is contractual.
PLAN-1278 G14 rule 12: avoid updating tests to accept weaker behavior unless a narrower mutation class exemption is explicit.
PLAN-1279 G14 rule 13: run targeted Bun tests for the changed library, hook, adapter, or handler.
PLAN-1280 G14 rule 14: run static verifier scripts before release self-check.
PLAN-1281 G14 rule 15: make rollback possible by reverting the PR without changing unrelated workflow families.
PLAN-1282 G14 rule 16: update docs only after machine contracts exist.
PLAN-1283 G14 rule 17: mention runtime gaps honestly when Codex-only support remains the only verified install target.
PLAN-1284 G14 rule 18: prove that no LLM sentence can flip deny to allow.
PLAN-1285 G14 rule 19: prove that no environment variable can weaken a protected gate.
PLAN-1286 G14 rule 20: prove that unsupported runtime cannot be described as parity-complete.
PLAN-1287 G14 rule 21: prove that ContextEngineering ACTION cannot count as Ontology ActionType coverage.
PLAN-1288 G14 acceptance criterion 01: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1289 G14 acceptance criterion 02: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1290 G14 acceptance criterion 03: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1291 G14 acceptance criterion 04: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1292 G14 acceptance criterion 05: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1293 G14 acceptance criterion 06: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1294 G14 acceptance criterion 07: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1295 G14 acceptance criterion 08: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1296 G14 acceptance criterion 09: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1297 G14 acceptance criterion 10: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1298 G14 acceptance criterion 11: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1299 G14 acceptance criterion 12: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1300 G14 acceptance criterion 13: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1301 G14 acceptance criterion 14: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1302 G14 acceptance criterion 15: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1303 G14 acceptance criterion 16: the implementation must produce deterministic evidence that this gap cannot regress silently.
### G15 - Dry-run grace period is too permissive for protected mutation

PLAN-1304 G15 severity: medium.
PLAN-1305 G15 affected files: hooks/commit-edits-governance.ts; tests/hooks/commit-edits-governance.test.ts.
PLAN-1306 G15 owner: Lead implementation PR that first touches the listed files.
PLAN-1307 G15 policy stance: fail closed for protected mutation unless this gap explicitly concerns read-only behavior.
PLAN-1308 G15 current evidence: The first commit_edits call can allow when no compute_edits_dry_run event exists.
PLAN-1309 G15 current evidence: After dry-run events exist, dryRunRef is required.
PLAN-1310 G15 current evidence: Protected mutation policy should require evidence before mutation.
PLAN-1311 G15 target state: Ontology-write, external-command, commit, PR, and release require dry-run evidence before mutation.
PLAN-1312 G15 target state: Read-only and proposal-only flows remain unaffected.
PLAN-1313 G15 target state: Tests replace grace allow with deny for protected mutation.
PLAN-1314 G15 root cause: implementation and tests currently allow a human-readable or environment-driven policy surface to outrank deterministic plugin policy.
PLAN-1315 G15 blast radius: mutation authorization, release confidence, runtime parity claims, or LLM-facing state may become ambiguous if unfixed.
PLAN-1316 G15 rule 01: write a failing test or verifier fixture before changing behavior where the code path is directly testable.
PLAN-1317 G15 rule 02: prefer versioned schema additions over implicit object-shape checks.
PLAN-1318 G15 rule 03: prefer enum reason codes over free-text reason matching.
PLAN-1319 G15 rule 04: return stable reason codes and human-readable context for every new denial path.
PLAN-1320 G15 rule 05: identify evidence refs for every new allow path.
PLAN-1321 G15 rule 06: deny protected mutation when evidence cannot be loaded.
PLAN-1322 G15 rule 07: default unproven runtime support to unsupported or schema-only.
PLAN-1323 G15 rule 08: deny DTC approval when SemanticConversationState cannot prove promotion readiness.
PLAN-1324 G15 rule 09: include a negative fixture that demonstrates the previous unsafe behavior is gone.
PLAN-1325 G15 rule 10: include a positive fixture that shows legitimate protected work can proceed with complete evidence.
PLAN-1326 G15 rule 11: include stable snapshots or schema validation where output shape is contractual.
PLAN-1327 G15 rule 12: avoid updating tests to accept weaker behavior unless a narrower mutation class exemption is explicit.
PLAN-1328 G15 rule 13: run targeted Bun tests for the changed library, hook, adapter, or handler.
PLAN-1329 G15 rule 14: run static verifier scripts before release self-check.
PLAN-1330 G15 rule 15: make rollback possible by reverting the PR without changing unrelated workflow families.
PLAN-1331 G15 rule 16: update docs only after machine contracts exist.
PLAN-1332 G15 rule 17: mention runtime gaps honestly when Codex-only support remains the only verified install target.
PLAN-1333 G15 rule 18: prove that no LLM sentence can flip deny to allow.
PLAN-1334 G15 rule 19: prove that no environment variable can weaken a protected gate.
PLAN-1335 G15 rule 20: prove that unsupported runtime cannot be described as parity-complete.
PLAN-1336 G15 rule 21: prove that ContextEngineering ACTION cannot count as Ontology ActionType coverage.
PLAN-1337 G15 acceptance criterion 01: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1338 G15 acceptance criterion 02: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1339 G15 acceptance criterion 03: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1340 G15 acceptance criterion 04: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1341 G15 acceptance criterion 05: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1342 G15 acceptance criterion 06: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1343 G15 acceptance criterion 07: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1344 G15 acceptance criterion 08: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1345 G15 acceptance criterion 09: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1346 G15 acceptance criterion 10: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1347 G15 acceptance criterion 11: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1348 G15 acceptance criterion 12: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1349 G15 acceptance criterion 13: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1350 G15 acceptance criterion 14: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1351 G15 acceptance criterion 15: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1352 G15 acceptance criterion 16: the implementation must produce deterministic evidence that this gap cannot regress silently.
### G16 - Public MCP registry lacks proposed governance and semantic consistency gates

PLAN-1353 G16 severity: medium.
PLAN-1354 G16 affected files: bridge/mcp-server.ts; bridge/handlers.
PLAN-1355 G16 owner: Lead implementation PR that first touches the listed files.
PLAN-1356 G16 policy stance: fail closed for protected mutation unless this gap explicitly concerns read-only behavior.
PLAN-1357 G16 current evidence: Public tools include many governance tools.
PLAN-1358 G16 current evidence: No pm_pre_mutation_governance handler exists.
PLAN-1359 G16 current evidence: No pm_semantic_consistency_gate handler exists.
PLAN-1360 G16 target state: Add compute-only public handlers that call shared deterministic libraries.
PLAN-1361 G16 target state: Handlers must not commit or mutate project state except append-only audit events when explicitly requested.
PLAN-1362 G16 target state: Tool schemas must be stable and versioned.
PLAN-1363 G16 root cause: implementation and tests currently allow a human-readable or environment-driven policy surface to outrank deterministic plugin policy.
PLAN-1364 G16 blast radius: mutation authorization, release confidence, runtime parity claims, or LLM-facing state may become ambiguous if unfixed.
PLAN-1365 G16 rule 01: write a failing test or verifier fixture before changing behavior where the code path is directly testable.
PLAN-1366 G16 rule 02: prefer versioned schema additions over implicit object-shape checks.
PLAN-1367 G16 rule 03: prefer enum reason codes over free-text reason matching.
PLAN-1368 G16 rule 04: return stable reason codes and human-readable context for every new denial path.
PLAN-1369 G16 rule 05: identify evidence refs for every new allow path.
PLAN-1370 G16 rule 06: deny protected mutation when evidence cannot be loaded.
PLAN-1371 G16 rule 07: default unproven runtime support to unsupported or schema-only.
PLAN-1372 G16 rule 08: deny DTC approval when SemanticConversationState cannot prove promotion readiness.
PLAN-1373 G16 rule 09: include a negative fixture that demonstrates the previous unsafe behavior is gone.
PLAN-1374 G16 rule 10: include a positive fixture that shows legitimate protected work can proceed with complete evidence.
PLAN-1375 G16 rule 11: include stable snapshots or schema validation where output shape is contractual.
PLAN-1376 G16 rule 12: avoid updating tests to accept weaker behavior unless a narrower mutation class exemption is explicit.
PLAN-1377 G16 rule 13: run targeted Bun tests for the changed library, hook, adapter, or handler.
PLAN-1378 G16 rule 14: run static verifier scripts before release self-check.
PLAN-1379 G16 rule 15: make rollback possible by reverting the PR without changing unrelated workflow families.
PLAN-1380 G16 rule 16: update docs only after machine contracts exist.
PLAN-1381 G16 rule 17: mention runtime gaps honestly when Codex-only support remains the only verified install target.
PLAN-1382 G16 rule 18: prove that no LLM sentence can flip deny to allow.
PLAN-1383 G16 rule 19: prove that no environment variable can weaken a protected gate.
PLAN-1384 G16 rule 20: prove that unsupported runtime cannot be described as parity-complete.
PLAN-1385 G16 rule 21: prove that ContextEngineering ACTION cannot count as Ontology ActionType coverage.
PLAN-1386 G16 acceptance criterion 01: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1387 G16 acceptance criterion 02: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1388 G16 acceptance criterion 03: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1389 G16 acceptance criterion 04: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1390 G16 acceptance criterion 05: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1391 G16 acceptance criterion 06: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1392 G16 acceptance criterion 07: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1393 G16 acceptance criterion 08: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1394 G16 acceptance criterion 09: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1395 G16 acceptance criterion 10: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1396 G16 acceptance criterion 11: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1397 G16 acceptance criterion 12: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1398 G16 acceptance criterion 13: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1399 G16 acceptance criterion 14: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1400 G16 acceptance criterion 15: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1401 G16 acceptance criterion 16: the implementation must produce deterministic evidence that this gap cannot regress silently.
### G17 - Hook async failure semantics can hide important policy failures

PLAN-1402 G17 severity: medium.
PLAN-1403 G17 affected files: lib/codex/codex-hook-adapter.ts; hooks/hooks.json.
PLAN-1404 G17 owner: Lead implementation PR that first touches the listed files.
PLAN-1405 G17 policy stance: fail closed for protected mutation unless this gap explicitly concerns read-only behavior.
PLAN-1406 G17 current evidence: Async hooks are run fire-and-forget with caught errors.
PLAN-1407 G17 current evidence: Some async hooks are audit-only and safe to observe.
PLAN-1408 G17 current evidence: Mutation-required hooks must never be async.
PLAN-1409 G17 target state: Self-check fails async hooks required for protected mutation.
PLAN-1410 G17 target state: Adapter records async failure as audit evidence where appropriate.
PLAN-1411 G17 target state: Required hook contract forbids async true.
PLAN-1412 G17 root cause: implementation and tests currently allow a human-readable or environment-driven policy surface to outrank deterministic plugin policy.
PLAN-1413 G17 blast radius: mutation authorization, release confidence, runtime parity claims, or LLM-facing state may become ambiguous if unfixed.
PLAN-1414 G17 rule 01: write a failing test or verifier fixture before changing behavior where the code path is directly testable.
PLAN-1415 G17 rule 02: prefer versioned schema additions over implicit object-shape checks.
PLAN-1416 G17 rule 03: prefer enum reason codes over free-text reason matching.
PLAN-1417 G17 rule 04: return stable reason codes and human-readable context for every new denial path.
PLAN-1418 G17 rule 05: identify evidence refs for every new allow path.
PLAN-1419 G17 rule 06: deny protected mutation when evidence cannot be loaded.
PLAN-1420 G17 rule 07: default unproven runtime support to unsupported or schema-only.
PLAN-1421 G17 rule 08: deny DTC approval when SemanticConversationState cannot prove promotion readiness.
PLAN-1422 G17 rule 09: include a negative fixture that demonstrates the previous unsafe behavior is gone.
PLAN-1423 G17 rule 10: include a positive fixture that shows legitimate protected work can proceed with complete evidence.
PLAN-1424 G17 rule 11: include stable snapshots or schema validation where output shape is contractual.
PLAN-1425 G17 rule 12: avoid updating tests to accept weaker behavior unless a narrower mutation class exemption is explicit.
PLAN-1426 G17 rule 13: run targeted Bun tests for the changed library, hook, adapter, or handler.
PLAN-1427 G17 rule 14: run static verifier scripts before release self-check.
PLAN-1428 G17 rule 15: make rollback possible by reverting the PR without changing unrelated workflow families.
PLAN-1429 G17 rule 16: update docs only after machine contracts exist.
PLAN-1430 G17 rule 17: mention runtime gaps honestly when Codex-only support remains the only verified install target.
PLAN-1431 G17 rule 18: prove that no LLM sentence can flip deny to allow.
PLAN-1432 G17 rule 19: prove that no environment variable can weaken a protected gate.
PLAN-1433 G17 rule 20: prove that unsupported runtime cannot be described as parity-complete.
PLAN-1434 G17 rule 21: prove that ContextEngineering ACTION cannot count as Ontology ActionType coverage.
PLAN-1435 G17 acceptance criterion 01: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1436 G17 acceptance criterion 02: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1437 G17 acceptance criterion 03: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1438 G17 acceptance criterion 04: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1439 G17 acceptance criterion 05: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1440 G17 acceptance criterion 06: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1441 G17 acceptance criterion 07: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1442 G17 acceptance criterion 08: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1443 G17 acceptance criterion 09: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1444 G17 acceptance criterion 10: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1445 G17 acceptance criterion 11: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1446 G17 acceptance criterion 12: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1447 G17 acceptance criterion 13: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1448 G17 acceptance criterion 14: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1449 G17 acceptance criterion 15: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1450 G17 acceptance criterion 16: the implementation must produce deterministic evidence that this gap cannot regress silently.
### G18 - Documentation is stronger than machine enforcement

PLAN-1451 G18 severity: medium.
PLAN-1452 G18 affected files: README.md; docs/RUNTIME_LAYER_BOUNDARY.md; .ssot-authority.json.
PLAN-1453 G18 owner: Lead implementation PR that first touches the listed files.
PLAN-1454 G18 policy stance: fail closed for protected mutation unless this gap explicitly concerns read-only behavior.
PLAN-1455 G18 current evidence: Documents already state the desired architecture well.
PLAN-1456 G18 current evidence: Machine checks do not enforce every stated boundary.
PLAN-1457 G18 current evidence: Humans could accidentally drift docs and code apart.
PLAN-1458 G18 target state: Layer boundary verifier compares docs, authority JSON, runtime boundary contract, hook adapter, and root layout.
PLAN-1459 G18 target state: Self-check reports doc-machine mismatches.
PLAN-1460 G18 target state: Release gate fails stale or contradictory authority statements.
PLAN-1461 G18 root cause: implementation and tests currently allow a human-readable or environment-driven policy surface to outrank deterministic plugin policy.
PLAN-1462 G18 blast radius: mutation authorization, release confidence, runtime parity claims, or LLM-facing state may become ambiguous if unfixed.
PLAN-1463 G18 rule 01: write a failing test or verifier fixture before changing behavior where the code path is directly testable.
PLAN-1464 G18 rule 02: prefer versioned schema additions over implicit object-shape checks.
PLAN-1465 G18 rule 03: prefer enum reason codes over free-text reason matching.
PLAN-1466 G18 rule 04: return stable reason codes and human-readable context for every new denial path.
PLAN-1467 G18 rule 05: identify evidence refs for every new allow path.
PLAN-1468 G18 rule 06: deny protected mutation when evidence cannot be loaded.
PLAN-1469 G18 rule 07: default unproven runtime support to unsupported or schema-only.
PLAN-1470 G18 rule 08: deny DTC approval when SemanticConversationState cannot prove promotion readiness.
PLAN-1471 G18 rule 09: include a negative fixture that demonstrates the previous unsafe behavior is gone.
PLAN-1472 G18 rule 10: include a positive fixture that shows legitimate protected work can proceed with complete evidence.
PLAN-1473 G18 rule 11: include stable snapshots or schema validation where output shape is contractual.
PLAN-1474 G18 rule 12: avoid updating tests to accept weaker behavior unless a narrower mutation class exemption is explicit.
PLAN-1475 G18 rule 13: run targeted Bun tests for the changed library, hook, adapter, or handler.
PLAN-1476 G18 rule 14: run static verifier scripts before release self-check.
PLAN-1477 G18 rule 15: make rollback possible by reverting the PR without changing unrelated workflow families.
PLAN-1478 G18 rule 16: update docs only after machine contracts exist.
PLAN-1479 G18 rule 17: mention runtime gaps honestly when Codex-only support remains the only verified install target.
PLAN-1480 G18 rule 18: prove that no LLM sentence can flip deny to allow.
PLAN-1481 G18 rule 19: prove that no environment variable can weaken a protected gate.
PLAN-1482 G18 rule 20: prove that unsupported runtime cannot be described as parity-complete.
PLAN-1483 G18 rule 21: prove that ContextEngineering ACTION cannot count as Ontology ActionType coverage.
PLAN-1484 G18 acceptance criterion 01: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1485 G18 acceptance criterion 02: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1486 G18 acceptance criterion 03: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1487 G18 acceptance criterion 04: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1488 G18 acceptance criterion 05: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1489 G18 acceptance criterion 06: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1490 G18 acceptance criterion 07: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1491 G18 acceptance criterion 08: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1492 G18 acceptance criterion 09: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1493 G18 acceptance criterion 10: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1494 G18 acceptance criterion 11: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1495 G18 acceptance criterion 12: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1496 G18 acceptance criterion 13: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1497 G18 acceptance criterion 14: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1498 G18 acceptance criterion 15: the implementation must produce deterministic evidence that this gap cannot regress silently.
PLAN-1499 G18 acceptance criterion 16: the implementation must produce deterministic evidence that this gap cannot regress silently.
## Implementation Sequence Overview

PLAN-1500 Revised execution order after final review: PR-0 -> PR-1 -> PR-3 -> PR-2 -> PR-5 and PR-9 preparation -> PR-4 and PR-7 preparation -> PR-8 -> PR-6 final release aggregator.
PLAN-1501 PR-0 MUST land first because fail-open mutation hook behavior undermines every later governance gate.
PLAN-1502 PR-1 SHOULD land second because layer boundary contracts provide the vocabulary for subsequent verifiers.
PLAN-1503 PR-3 SHOULD land before PR-2 because project gate policy must define the minimum effective mode before a shared governance surface is exposed.
PLAN-1504 PR-2 SHOULD land after PR-3 because pre-mutation governance must compute authorization from locked policy rather than wrapping caller-supplied allowed booleans.
PLAN-1505 PR-5 and PR-9 MAY be prepared in parallel after PR-1, but their writes and merges must remain sequential unless file ownership is disjoint and reviewable.
PLAN-1506 PR-4 and PR-7 MAY be prepared in parallel after PR-2 only when hook-contract and semantic-promotion write scopes remain disjoint.
PLAN-1507 PR-8 SHOULD land after PR-7 because LLM-facing state enforcement depends on promotion and governance semantics.
PLAN-1508 PR-6 SHOULD be the final release aggregator, not an early release-readiness claim.
PLAN-1509 The sequence MUST NOT claim release readiness before PR-6 aggregates every implemented verifier and the acceptance matrix maps each final gate to a concrete command and artifact path.
PLAN-1510 The sequence MAY be compressed only if a single PR remains reviewable and rollback-safe.
PLAN-1511 The implementation session MUST NOT use palantir-mini plugin workflows or MCP gates to authorize the sequence unless the user explicitly opts back in.
PLAN-1512 The sequence MUST NOT claim cross-runtime parity before PR-5 runtime evidence exists.
PLAN-1513 The sequence MUST NOT claim LLM-only-state enforcement before PR-8 prompt and schema checks exist.
PLAN-1514 The sequence MUST stop after PR-0 unless the user explicitly requests the next risky slice.
### PR-0 - Critical Fail-Closed Hotfix

PLAN-1515 PR-0 objective: Remove fail-open behavior from mutation hooks and make protected mutation deny on invalid stdin, unhandled exception, timeout, nonzero hook failure, and bypass attempts.
PLAN-1516 PR-0 priority: highest and must land first because later gates depend on trustworthy mutation denial.
PLAN-1517 PR-0 additional hotfix objective: local PreTool MCP-first enforcement MUST respect a current prompt-front-door palantir-mini plugin opt-out and downgrade that one policy to advisory skip, so an explicit user request to proceed without the plugin can still edit files.
PLAN-1518 PR-0 write scope: plugins/palantir-mini/hooks/commit-edits-governance.ts, plugins/palantir-mini/hooks/prompt-dtc-enforcement-gate.ts, plugins/palantir-mini/hooks/pre-edit-impact-mcp-first.ts, plugins/palantir-mini/tests/hooks/commit-edits-governance.test.ts, plugins/palantir-mini/tests/hooks/prompt-dtc-enforcement-gate.test.ts, plugins/palantir-mini/tests/hooks/pre-edit-impact-mcp-first.blocking.test.ts, plugins/palantir-mini/tests/lib/codex/codex-hook-adapter.test.ts.
PLAN-1519 PR-0 conditional write scope: plugins/palantir-mini/hooks/hooks.json only if timeout or nonzero hook failure metadata requires registry adjustment.
PLAN-1520 PR-0 forbidden scope: runtime cache paths under ~/.codex/plugins/cache, generated files, plan-only docs, unrelated root overlays, inactive Claude or Gemini package surfaces, public MCP handlers, schemas, and release self-check wiring.
PLAN-1521 PR-0 source authority: /home/palantirkc/palantir-mini-marketplace/plugins/palantir-mini is the only semantic source root.
PLAN-1522 PR-0 branch rule: work on a normal branch or worktree, make a normal commit, and never push directly to main.
PLAN-1523 PR-0 dependency rule: do not widen scope beyond listed files unless a failing targeted test proves the listed scope is insufficient.
PLAN-1524 PR-0 concurrency rule: do not revert or reformat unrelated changes from other workers.
PLAN-1525 PR-0 implementation step 01: read listed hook source files and listed tests.
PLAN-1526 PR-0 implementation step 02: write failing tests for invalid stdin, unhandled exception, timeout or nonzero hook failure, bypass denial, and prompt-front-door plugin opt-out skip behavior.
PLAN-1527 PR-0 implementation step 03: implement the smallest source change that passes the focused tests without changing public MCP APIs, schemas, generated files, or response templates.
PLAN-1528 PR-0 implementation step 04: preserve read-only and proposal-only ergonomics, while protected mutation stays fail-closed.
PLAN-1529 PR-0 implementation step 05: run the focused verification commands and stop after PR-0 review.
PLAN-1530 PR-0 explicit non-goal: do not add versioned schemas in PR-0.
PLAN-1531 PR-0 explicit non-goal: do not wire release self-check in PR-0.
PLAN-1532 PR-0 explicit non-goal: do not update broad docs beyond this plan or narrow hook comments unless a test proves documentation is part of the machine contract.
PLAN-1533 PR-0 explicit non-goal: do not use palantir-mini plugin MCP/workflow tools to execute the implementation unless the user opts back in.
PLAN-1534 PR-0 verification command: bun test tests/hooks/commit-edits-governance.test.ts.
PLAN-1535 PR-0 verification command: bun test tests/hooks/prompt-dtc-enforcement-gate.test.ts.
PLAN-1536 PR-0 verification command: bun test tests/hooks/prompt-dtc-enforcement-gate-dtc-turn.test.ts.
PLAN-1537 PR-0 verification command: bun test tests/hooks/pre-edit-impact-mcp-first.blocking.test.ts.
PLAN-1538 PR-0 verification command: bun test tests/lib/codex/codex-hook-adapter.test.ts.
PLAN-1539 PR-0 conditional verification command: if hooks.json changes, run bun test tests/hooks/hooks-json-conditional-if.test.ts.
PLAN-1540 PR-0 verification command: git diff --check.
PLAN-1541 PR-0 acceptance: protected mutation remains impossible when deterministic evidence is incomplete, malformed, stale, missing, timed out, or produced by a failed hook.
PLAN-1542 PR-0 acceptance: a captured prompt that explicitly says not to use the palantir-mini plugin can proceed through ordinary Codex filesystem, shell, git, and Bun flows without the local MCP-first PreTool hook forcing palantir-mini MCP calls.
PLAN-1543 PR-0 acceptance: the opt-out skip is scoped to the current prompt-front-door envelope and does not disable product fail-closed behavior for ordinary palantir-mini workflow prompts.
PLAN-1544 PR-0 review note: reviewer must verify the PR did not turn explanation, advisory output, runtime metadata, or a plugin opt-out marker into protected mutation authorization.

### PR-1 - Layer Boundary Contract Hardening

PLAN-1612 PR-1 objective: Add machine-readable layer boundary contracts and verifiers for LLM provider, runtime adapter, plugin source, project state, runtime cache, and marketplace root roles.
PLAN-1613 PR-1 priority: ordered after previous PR dependencies.
PLAN-1614 PR-1 write scope: plugins/palantir-mini/contracts/layer-boundary.contract.json, plugins/palantir-mini/schemas/layer-boundary.schema.json, plugins/palantir-mini/scripts/verify-layer-boundary.ts, plugins/palantir-mini/tests/layer-boundary.test.ts, plugins/palantir-mini/docs/RUNTIME_LAYER_BOUNDARY.md.
PLAN-1615 PR-1 forbidden scope: runtime cache paths under ~/.codex/plugins/cache, generated files, unrelated root overlays, and inactive Claude or Gemini package surfaces.
PLAN-1616 PR-1 source authority: plugins/palantir-mini is the only semantic source root.
PLAN-1617 PR-1 branch rule: make a normal commit and never push directly to main.
PLAN-1618 PR-1 dependency rule: do not widen scope beyond listed files unless a failing test proves the listed scope is insufficient.
PLAN-1619 PR-1 concurrency rule: do not revert or reformat unrelated changes from other workers.
PLAN-1620 PR-1 implementation step 01: read listed source files and tests.
PLAN-1621 PR-1 implementation step 02: write failing tests first.
PLAN-1622 PR-1 implementation step 03: implement smallest safe change.
PLAN-1623 PR-1 implementation step 04: add versioned schemas.
PLAN-1624 PR-1 implementation step 05: add stable reason codes.
PLAN-1625 PR-1 implementation step 06: wire self-check after tests.
PLAN-1626 PR-1 implementation step 07: update docs after machine contract.
PLAN-1627 PR-1 implementation step 08: run targeted tests.
PLAN-1628 PR-1 implementation step 09: run diff hygiene.
PLAN-1629 PR-1 implementation step 10: write PR body with Why, Scope, Why Separate, Verification, Recovery, and Excluded Scope.
PLAN-1630 PR-1 file task: inspect or edit plugins/palantir-mini/contracts/layer-boundary.contract.json only as required by the objective.
PLAN-1631 PR-1 file task: inspect or edit plugins/palantir-mini/schemas/layer-boundary.schema.json only as required by the objective.
PLAN-1632 PR-1 file task: inspect or edit plugins/palantir-mini/scripts/verify-layer-boundary.ts only as required by the objective.
PLAN-1633 PR-1 file task: inspect or edit plugins/palantir-mini/tests/layer-boundary.test.ts only as required by the objective.
PLAN-1634 PR-1 file task: inspect or edit plugins/palantir-mini/docs/RUNTIME_LAYER_BOUNDARY.md only as required by the objective.
PLAN-1635 PR-1 verification command: bun test tests/layer-boundary.test.ts.
PLAN-1636 PR-1 verification command: bun run scripts/verify-layer-boundary.ts.
PLAN-1637 PR-1 verification command: git diff --check.
PLAN-1638 PR-1 detailed checklist 01: verify source authority is explicitly handled or explicitly out of scope in this PR.
PLAN-1639 PR-1 detailed checklist 02: verify schema versioning is explicitly handled or explicitly out of scope in this PR.
PLAN-1640 PR-1 detailed checklist 03: verify reason codes is explicitly handled or explicitly out of scope in this PR.
PLAN-1641 PR-1 detailed checklist 04: verify input validation is explicitly handled or explicitly out of scope in this PR.
PLAN-1642 PR-1 detailed checklist 05: verify output validation is explicitly handled or explicitly out of scope in this PR.
PLAN-1643 PR-1 detailed checklist 06: verify gate mode resolution is explicitly handled or explicitly out of scope in this PR.
PLAN-1644 PR-1 detailed checklist 07: verify runtime projection is explicitly handled or explicitly out of scope in this PR.
PLAN-1645 PR-1 detailed checklist 08: verify semantic consistency is explicitly handled or explicitly out of scope in this PR.
PLAN-1646 PR-1 detailed checklist 09: verify SIC readiness is explicitly handled or explicitly out of scope in this PR.
PLAN-1647 PR-1 detailed checklist 10: verify DTC readiness is explicitly handled or explicitly out of scope in this PR.
PLAN-1648 PR-1 detailed checklist 11: verify WorkContract readiness is explicitly handled or explicitly out of scope in this PR.
PLAN-1649 PR-1 detailed checklist 12: verify dry-run evidence is explicitly handled or explicitly out of scope in this PR.
PLAN-1650 PR-1 detailed checklist 13: verify eval evidence is explicitly handled or explicitly out of scope in this PR.
PLAN-1651 PR-1 detailed checklist 14: verify hook timeout is explicitly handled or explicitly out of scope in this PR.
PLAN-1652 PR-1 detailed checklist 15: verify hook exception is explicitly handled or explicitly out of scope in this PR.
PLAN-1653 PR-1 detailed checklist 16: verify hook stdout parsing is explicitly handled or explicitly out of scope in this PR.
PLAN-1654 PR-1 detailed checklist 17: verify append-only lineage is explicitly handled or explicitly out of scope in this PR.
PLAN-1655 PR-1 detailed checklist 18: verify release self-check is explicitly handled or explicitly out of scope in this PR.
PLAN-1656 PR-1 detailed checklist 19: verify documentation sync is explicitly handled or explicitly out of scope in this PR.
PLAN-1657 PR-1 detailed checklist 20: verify rollback safety is explicitly handled or explicitly out of scope in this PR.
PLAN-1658 PR-1 detailed checklist 21: verify non-programmer UX is explicitly handled or explicitly out of scope in this PR.
PLAN-1659 PR-1 detailed checklist 22: verify Korean user-facing card boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-1660 PR-1 detailed checklist 23: verify ContextEngineering DATA domain is explicitly handled or explicitly out of scope in this PR.
PLAN-1661 PR-1 detailed checklist 24: verify ContextEngineering LOGIC domain is explicitly handled or explicitly out of scope in this PR.
PLAN-1662 PR-1 detailed checklist 25: verify ContextEngineering ACTION domain is explicitly handled or explicitly out of scope in this PR.
PLAN-1663 PR-1 detailed checklist 26: verify ContextEngineering TECHNOLOGY domain is explicitly handled or explicitly out of scope in this PR.
PLAN-1664 PR-1 detailed checklist 27: verify ContextEngineering GOVERNANCE domain is explicitly handled or explicitly out of scope in this PR.
PLAN-1665 PR-1 detailed checklist 28: verify Ontology ObjectType refs is explicitly handled or explicitly out of scope in this PR.
PLAN-1666 PR-1 detailed checklist 29: verify Ontology LinkType refs is explicitly handled or explicitly out of scope in this PR.
PLAN-1667 PR-1 detailed checklist 30: verify Ontology ActionType refs is explicitly handled or explicitly out of scope in this PR.
PLAN-1668 PR-1 detailed checklist 31: verify Ontology Function refs is explicitly handled or explicitly out of scope in this PR.
PLAN-1669 PR-1 detailed checklist 32: verify ApplicationState projection is explicitly handled or explicitly out of scope in this PR.
PLAN-1670 PR-1 detailed checklist 33: verify RetrievalContext projection is explicitly handled or explicitly out of scope in this PR.
PLAN-1671 PR-1 detailed checklist 34: verify runtime gap disclosure is explicitly handled or explicitly out of scope in this PR.
PLAN-1672 PR-1 detailed checklist 35: verify Codex-only install boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-1673 PR-1 detailed checklist 36: verify Claude unsupported boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-1674 PR-1 detailed checklist 37: verify Gemini unsupported boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-1675 PR-1 detailed checklist 38: verify root marketplace boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-1676 PR-1 detailed checklist 39: verify runtime cache boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-1677 PR-1 detailed checklist 40: verify generated-file boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-1678 PR-1 acceptance 01: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1679 PR-1 acceptance 02: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1680 PR-1 acceptance 03: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1681 PR-1 acceptance 04: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1682 PR-1 acceptance 05: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1683 PR-1 acceptance 06: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1684 PR-1 acceptance 07: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1685 PR-1 acceptance 08: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1686 PR-1 acceptance 09: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1687 PR-1 acceptance 10: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1688 PR-1 acceptance 11: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1689 PR-1 acceptance 12: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1690 PR-1 acceptance 13: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1691 PR-1 acceptance 14: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1692 PR-1 acceptance 15: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1693 PR-1 acceptance 16: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1694 PR-1 acceptance 17: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1695 PR-1 acceptance 18: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1696 PR-1 acceptance 19: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1697 PR-1 acceptance 20: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1698 PR-1 review note 01: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-1699 PR-1 review note 02: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-1700 PR-1 review note 03: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-1701 PR-1 review note 04: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-1702 PR-1 review note 05: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-1703 PR-1 review note 06: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-1704 PR-1 review note 07: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-1705 PR-1 review note 08: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-1706 PR-1 review note 09: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-1707 PR-1 review note 10: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
### PR-2 - Single Pre-Mutation Governance Gate

PLAN-1708 PR-2 objective: Add pm_pre_mutation_governance as a public compute-only MCP handler and shared deterministic library for protected mutation authorization.
PLAN-1709 PR-2 priority: ordered after previous PR dependencies.
PLAN-1710 PR-2 write scope: plugins/palantir-mini/bridge/handlers/pm-pre-mutation-governance.ts, plugins/palantir-mini/lib/governance/pre-mutation-governance-v2.ts, plugins/palantir-mini/schemas/pm-pre-mutation-governance.input.schema.json, plugins/palantir-mini/schemas/governance-decision.output.schema.json, plugins/palantir-mini/tests/governance/pre-mutation-governance-v2.test.ts, plugins/palantir-mini/bridge/mcp-server.ts.
PLAN-1711 PR-2 forbidden scope: runtime cache paths under ~/.codex/plugins/cache, generated files, unrelated root overlays, and inactive Claude or Gemini package surfaces.
PLAN-1712 PR-2 source authority: plugins/palantir-mini is the only semantic source root.
PLAN-1713 PR-2 branch rule: make a normal commit and never push directly to main.
PLAN-1714 PR-2 dependency rule: do not widen scope beyond listed files unless a failing test proves the listed scope is insufficient.
PLAN-1715 PR-2 concurrency rule: do not revert or reformat unrelated changes from other workers.
PLAN-1716 PR-2 implementation step 01: read listed source files and tests.
PLAN-1717 PR-2 implementation step 02: write failing tests first.
PLAN-1718 PR-2 implementation step 03: implement smallest safe change.
PLAN-1719 PR-2 implementation step 04: add versioned schemas.
PLAN-1720 PR-2 implementation step 05: add stable reason codes.
PLAN-1721 PR-2 implementation step 06: wire self-check after tests.
PLAN-1722 PR-2 implementation step 07: update docs after machine contract.
PLAN-1723 PR-2 implementation step 08: run targeted tests.
PLAN-1724 PR-2 implementation step 09: run diff hygiene.
PLAN-1725 PR-2 implementation step 10: write PR body with Why, Scope, Why Separate, Verification, Recovery, and Excluded Scope.
PLAN-1726 PR-2 file task: inspect or edit plugins/palantir-mini/bridge/handlers/pm-pre-mutation-governance.ts only as required by the objective.
PLAN-1727 PR-2 file task: inspect or edit plugins/palantir-mini/lib/governance/pre-mutation-governance-v2.ts only as required by the objective.
PLAN-1728 PR-2 file task: inspect or edit plugins/palantir-mini/schemas/pm-pre-mutation-governance.input.schema.json only as required by the objective.
PLAN-1729 PR-2 file task: inspect or edit plugins/palantir-mini/schemas/governance-decision.output.schema.json only as required by the objective.
PLAN-1730 PR-2 file task: inspect or edit plugins/palantir-mini/tests/governance/pre-mutation-governance-v2.test.ts only as required by the objective.
PLAN-1731 PR-2 file task: inspect or edit plugins/palantir-mini/bridge/mcp-server.ts only as required by the objective.
PLAN-1732 PR-2 verification command: bun test tests/governance/pre-mutation-governance-v2.test.ts.
PLAN-1733 PR-2 verification command: bun test tests/bridge/handlers/pm-pre-mutation-governance.test.ts.
PLAN-1734 PR-2 verification command: git diff --check.
PLAN-1735 PR-2 detailed checklist 01: verify source authority is explicitly handled or explicitly out of scope in this PR.
PLAN-1736 PR-2 detailed checklist 02: verify schema versioning is explicitly handled or explicitly out of scope in this PR.
PLAN-1737 PR-2 detailed checklist 03: verify reason codes is explicitly handled or explicitly out of scope in this PR.
PLAN-1738 PR-2 detailed checklist 04: verify input validation is explicitly handled or explicitly out of scope in this PR.
PLAN-1739 PR-2 detailed checklist 05: verify output validation is explicitly handled or explicitly out of scope in this PR.
PLAN-1740 PR-2 detailed checklist 06: verify gate mode resolution is explicitly handled or explicitly out of scope in this PR.
PLAN-1741 PR-2 detailed checklist 07: verify runtime projection is explicitly handled or explicitly out of scope in this PR.
PLAN-1742 PR-2 detailed checklist 08: verify semantic consistency is explicitly handled or explicitly out of scope in this PR.
PLAN-1743 PR-2 detailed checklist 09: verify SIC readiness is explicitly handled or explicitly out of scope in this PR.
PLAN-1744 PR-2 detailed checklist 10: verify DTC readiness is explicitly handled or explicitly out of scope in this PR.
PLAN-1745 PR-2 detailed checklist 11: verify WorkContract readiness is explicitly handled or explicitly out of scope in this PR.
PLAN-1746 PR-2 detailed checklist 12: verify dry-run evidence is explicitly handled or explicitly out of scope in this PR.
PLAN-1747 PR-2 detailed checklist 13: verify eval evidence is explicitly handled or explicitly out of scope in this PR.
PLAN-1748 PR-2 detailed checklist 14: verify hook timeout is explicitly handled or explicitly out of scope in this PR.
PLAN-1749 PR-2 detailed checklist 15: verify hook exception is explicitly handled or explicitly out of scope in this PR.
PLAN-1750 PR-2 detailed checklist 16: verify hook stdout parsing is explicitly handled or explicitly out of scope in this PR.
PLAN-1751 PR-2 detailed checklist 17: verify append-only lineage is explicitly handled or explicitly out of scope in this PR.
PLAN-1752 PR-2 detailed checklist 18: verify release self-check is explicitly handled or explicitly out of scope in this PR.
PLAN-1753 PR-2 detailed checklist 19: verify documentation sync is explicitly handled or explicitly out of scope in this PR.
PLAN-1754 PR-2 detailed checklist 20: verify rollback safety is explicitly handled or explicitly out of scope in this PR.
PLAN-1755 PR-2 detailed checklist 21: verify non-programmer UX is explicitly handled or explicitly out of scope in this PR.
PLAN-1756 PR-2 detailed checklist 22: verify Korean user-facing card boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-1757 PR-2 detailed checklist 23: verify ContextEngineering DATA domain is explicitly handled or explicitly out of scope in this PR.
PLAN-1758 PR-2 detailed checklist 24: verify ContextEngineering LOGIC domain is explicitly handled or explicitly out of scope in this PR.
PLAN-1759 PR-2 detailed checklist 25: verify ContextEngineering ACTION domain is explicitly handled or explicitly out of scope in this PR.
PLAN-1760 PR-2 detailed checklist 26: verify ContextEngineering TECHNOLOGY domain is explicitly handled or explicitly out of scope in this PR.
PLAN-1761 PR-2 detailed checklist 27: verify ContextEngineering GOVERNANCE domain is explicitly handled or explicitly out of scope in this PR.
PLAN-1762 PR-2 detailed checklist 28: verify Ontology ObjectType refs is explicitly handled or explicitly out of scope in this PR.
PLAN-1763 PR-2 detailed checklist 29: verify Ontology LinkType refs is explicitly handled or explicitly out of scope in this PR.
PLAN-1764 PR-2 detailed checklist 30: verify Ontology ActionType refs is explicitly handled or explicitly out of scope in this PR.
PLAN-1765 PR-2 detailed checklist 31: verify Ontology Function refs is explicitly handled or explicitly out of scope in this PR.
PLAN-1766 PR-2 detailed checklist 32: verify ApplicationState projection is explicitly handled or explicitly out of scope in this PR.
PLAN-1767 PR-2 detailed checklist 33: verify RetrievalContext projection is explicitly handled or explicitly out of scope in this PR.
PLAN-1768 PR-2 detailed checklist 34: verify runtime gap disclosure is explicitly handled or explicitly out of scope in this PR.
PLAN-1769 PR-2 detailed checklist 35: verify Codex-only install boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-1770 PR-2 detailed checklist 36: verify Claude unsupported boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-1771 PR-2 detailed checklist 37: verify Gemini unsupported boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-1772 PR-2 detailed checklist 38: verify root marketplace boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-1773 PR-2 detailed checklist 39: verify runtime cache boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-1774 PR-2 detailed checklist 40: verify generated-file boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-1775 PR-2 acceptance 01: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1776 PR-2 acceptance 02: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1777 PR-2 acceptance 03: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1778 PR-2 acceptance 04: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1779 PR-2 acceptance 05: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1780 PR-2 acceptance 06: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1781 PR-2 acceptance 07: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1782 PR-2 acceptance 08: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1783 PR-2 acceptance 09: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1784 PR-2 acceptance 10: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1785 PR-2 acceptance 11: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1786 PR-2 acceptance 12: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1787 PR-2 acceptance 13: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1788 PR-2 acceptance 14: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1789 PR-2 acceptance 15: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1790 PR-2 acceptance 16: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1791 PR-2 acceptance 17: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1792 PR-2 acceptance 18: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1793 PR-2 acceptance 19: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1794 PR-2 acceptance 20: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1795 PR-2 review note 01: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-1796 PR-2 review note 02: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-1797 PR-2 review note 03: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-1798 PR-2 review note 04: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-1799 PR-2 review note 05: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-1800 PR-2 review note 06: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-1801 PR-2 review note 07: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-1802 PR-2 review note 08: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-1803 PR-2 review note 09: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-1804 PR-2 review note 10: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
### PR-3 - Project Gate Policy Lock

PLAN-1805 PR-3 objective: Add project policy minimum gate modes and make env vars strengthen-only for all protected mutation classes.
PLAN-1806 PR-3 priority: ordered after previous PR dependencies.
PLAN-1807 PR-3 write scope: plugins/palantir-mini/contracts/project-gate-policy.contract.json, plugins/palantir-mini/schemas/project-gate-policy.schema.json, plugins/palantir-mini/lib/governance/effective-gate-mode.ts, plugins/palantir-mini/tests/governance/effective-gate-mode.test.ts, plugins/palantir-mini/hooks/prompt-dtc-enforcement-gate.ts, plugins/palantir-mini/hooks/commit-edits-governance.ts.
PLAN-1808 PR-3 forbidden scope: runtime cache paths under ~/.codex/plugins/cache, generated files, unrelated root overlays, and inactive Claude or Gemini package surfaces.
PLAN-1809 PR-3 source authority: plugins/palantir-mini is the only semantic source root.
PLAN-1810 PR-3 branch rule: make a normal commit and never push directly to main.
PLAN-1811 PR-3 dependency rule: do not widen scope beyond listed files unless a failing test proves the listed scope is insufficient.
PLAN-1812 PR-3 concurrency rule: do not revert or reformat unrelated changes from other workers.
PLAN-1813 PR-3 implementation step 01: read listed source files and tests.
PLAN-1814 PR-3 implementation step 02: write failing tests first.
PLAN-1815 PR-3 implementation step 03: implement smallest safe change.
PLAN-1816 PR-3 implementation step 04: add versioned schemas.
PLAN-1817 PR-3 implementation step 05: add stable reason codes.
PLAN-1818 PR-3 implementation step 06: wire self-check after tests.
PLAN-1819 PR-3 implementation step 07: update docs after machine contract.
PLAN-1820 PR-3 implementation step 08: run targeted tests.
PLAN-1821 PR-3 implementation step 09: run diff hygiene.
PLAN-1822 PR-3 implementation step 10: write PR body with Why, Scope, Why Separate, Verification, Recovery, and Excluded Scope.
PLAN-1823 PR-3 file task: inspect or edit plugins/palantir-mini/contracts/project-gate-policy.contract.json only as required by the objective.
PLAN-1824 PR-3 file task: inspect or edit plugins/palantir-mini/schemas/project-gate-policy.schema.json only as required by the objective.
PLAN-1825 PR-3 file task: inspect or edit plugins/palantir-mini/lib/governance/effective-gate-mode.ts only as required by the objective.
PLAN-1826 PR-3 file task: inspect or edit plugins/palantir-mini/tests/governance/effective-gate-mode.test.ts only as required by the objective.
PLAN-1827 PR-3 file task: inspect or edit plugins/palantir-mini/hooks/prompt-dtc-enforcement-gate.ts only as required by the objective.
PLAN-1828 PR-3 file task: inspect or edit plugins/palantir-mini/hooks/commit-edits-governance.ts only as required by the objective.
PLAN-1829 PR-3 verification command: bun test tests/governance/effective-gate-mode.test.ts.
PLAN-1830 PR-3 verification command: bun test tests/hooks/prompt-dtc-enforcement-gate.test.ts.
PLAN-1831 PR-3 verification command: bun test tests/hooks/commit-edits-governance.test.ts.
PLAN-1832 PR-3 verification command: git diff --check.
PLAN-1833 PR-3 detailed checklist 01: verify source authority is explicitly handled or explicitly out of scope in this PR.
PLAN-1834 PR-3 detailed checklist 02: verify schema versioning is explicitly handled or explicitly out of scope in this PR.
PLAN-1835 PR-3 detailed checklist 03: verify reason codes is explicitly handled or explicitly out of scope in this PR.
PLAN-1836 PR-3 detailed checklist 04: verify input validation is explicitly handled or explicitly out of scope in this PR.
PLAN-1837 PR-3 detailed checklist 05: verify output validation is explicitly handled or explicitly out of scope in this PR.
PLAN-1838 PR-3 detailed checklist 06: verify gate mode resolution is explicitly handled or explicitly out of scope in this PR.
PLAN-1839 PR-3 detailed checklist 07: verify runtime projection is explicitly handled or explicitly out of scope in this PR.
PLAN-1840 PR-3 detailed checklist 08: verify semantic consistency is explicitly handled or explicitly out of scope in this PR.
PLAN-1841 PR-3 detailed checklist 09: verify SIC readiness is explicitly handled or explicitly out of scope in this PR.
PLAN-1842 PR-3 detailed checklist 10: verify DTC readiness is explicitly handled or explicitly out of scope in this PR.
PLAN-1843 PR-3 detailed checklist 11: verify WorkContract readiness is explicitly handled or explicitly out of scope in this PR.
PLAN-1844 PR-3 detailed checklist 12: verify dry-run evidence is explicitly handled or explicitly out of scope in this PR.
PLAN-1845 PR-3 detailed checklist 13: verify eval evidence is explicitly handled or explicitly out of scope in this PR.
PLAN-1846 PR-3 detailed checklist 14: verify hook timeout is explicitly handled or explicitly out of scope in this PR.
PLAN-1847 PR-3 detailed checklist 15: verify hook exception is explicitly handled or explicitly out of scope in this PR.
PLAN-1848 PR-3 detailed checklist 16: verify hook stdout parsing is explicitly handled or explicitly out of scope in this PR.
PLAN-1849 PR-3 detailed checklist 17: verify append-only lineage is explicitly handled or explicitly out of scope in this PR.
PLAN-1850 PR-3 detailed checklist 18: verify release self-check is explicitly handled or explicitly out of scope in this PR.
PLAN-1851 PR-3 detailed checklist 19: verify documentation sync is explicitly handled or explicitly out of scope in this PR.
PLAN-1852 PR-3 detailed checklist 20: verify rollback safety is explicitly handled or explicitly out of scope in this PR.
PLAN-1853 PR-3 detailed checklist 21: verify non-programmer UX is explicitly handled or explicitly out of scope in this PR.
PLAN-1854 PR-3 detailed checklist 22: verify Korean user-facing card boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-1855 PR-3 detailed checklist 23: verify ContextEngineering DATA domain is explicitly handled or explicitly out of scope in this PR.
PLAN-1856 PR-3 detailed checklist 24: verify ContextEngineering LOGIC domain is explicitly handled or explicitly out of scope in this PR.
PLAN-1857 PR-3 detailed checklist 25: verify ContextEngineering ACTION domain is explicitly handled or explicitly out of scope in this PR.
PLAN-1858 PR-3 detailed checklist 26: verify ContextEngineering TECHNOLOGY domain is explicitly handled or explicitly out of scope in this PR.
PLAN-1859 PR-3 detailed checklist 27: verify ContextEngineering GOVERNANCE domain is explicitly handled or explicitly out of scope in this PR.
PLAN-1860 PR-3 detailed checklist 28: verify Ontology ObjectType refs is explicitly handled or explicitly out of scope in this PR.
PLAN-1861 PR-3 detailed checklist 29: verify Ontology LinkType refs is explicitly handled or explicitly out of scope in this PR.
PLAN-1862 PR-3 detailed checklist 30: verify Ontology ActionType refs is explicitly handled or explicitly out of scope in this PR.
PLAN-1863 PR-3 detailed checklist 31: verify Ontology Function refs is explicitly handled or explicitly out of scope in this PR.
PLAN-1864 PR-3 detailed checklist 32: verify ApplicationState projection is explicitly handled or explicitly out of scope in this PR.
PLAN-1865 PR-3 detailed checklist 33: verify RetrievalContext projection is explicitly handled or explicitly out of scope in this PR.
PLAN-1866 PR-3 detailed checklist 34: verify runtime gap disclosure is explicitly handled or explicitly out of scope in this PR.
PLAN-1867 PR-3 detailed checklist 35: verify Codex-only install boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-1868 PR-3 detailed checklist 36: verify Claude unsupported boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-1869 PR-3 detailed checklist 37: verify Gemini unsupported boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-1870 PR-3 detailed checklist 38: verify root marketplace boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-1871 PR-3 detailed checklist 39: verify runtime cache boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-1872 PR-3 detailed checklist 40: verify generated-file boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-1873 PR-3 acceptance 01: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1874 PR-3 acceptance 02: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1875 PR-3 acceptance 03: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1876 PR-3 acceptance 04: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1877 PR-3 acceptance 05: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1878 PR-3 acceptance 06: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1879 PR-3 acceptance 07: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1880 PR-3 acceptance 08: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1881 PR-3 acceptance 09: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1882 PR-3 acceptance 10: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1883 PR-3 acceptance 11: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1884 PR-3 acceptance 12: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1885 PR-3 acceptance 13: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1886 PR-3 acceptance 14: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1887 PR-3 acceptance 15: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1888 PR-3 acceptance 16: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1889 PR-3 acceptance 17: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1890 PR-3 acceptance 18: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1891 PR-3 acceptance 19: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1892 PR-3 acceptance 20: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1893 PR-3 review note 01: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-1894 PR-3 review note 02: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-1895 PR-3 review note 03: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-1896 PR-3 review note 04: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-1897 PR-3 review note 05: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-1898 PR-3 review note 06: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-1899 PR-3 review note 07: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-1900 PR-3 review note 08: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-1901 PR-3 review note 09: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-1902 PR-3 review note 10: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
### PR-4 - Hook IO Schema And Fail-Closed Policy

PLAN-1903 PR-4 objective: Extend hook registry into schema-backed contracts and make mutation-required hooks fail closed on schema mismatch or execution failure.
PLAN-1904 PR-4 priority: ordered after previous PR dependencies.
PLAN-1905 PR-4 write scope: plugins/palantir-mini/hooks/hooks.json, plugins/palantir-mini/schemas/hooks/pretooluse.input.schema.json, plugins/palantir-mini/schemas/hooks/governance-hook.output.schema.json, plugins/palantir-mini/scripts/verify-hook-contracts.ts, plugins/palantir-mini/tests/hooks/hook-contracts.test.ts, plugins/palantir-mini/lib/codex/codex-hook-adapter.ts.
PLAN-1906 PR-4 forbidden scope: runtime cache paths under ~/.codex/plugins/cache, generated files, unrelated root overlays, and inactive Claude or Gemini package surfaces.
PLAN-1907 PR-4 source authority: plugins/palantir-mini is the only semantic source root.
PLAN-1908 PR-4 branch rule: make a normal commit and never push directly to main.
PLAN-1909 PR-4 dependency rule: do not widen scope beyond listed files unless a failing test proves the listed scope is insufficient.
PLAN-1910 PR-4 concurrency rule: do not revert or reformat unrelated changes from other workers.
PLAN-1911 PR-4 implementation step 01: read listed source files and tests.
PLAN-1912 PR-4 implementation step 02: write failing tests first.
PLAN-1913 PR-4 implementation step 03: implement smallest safe change.
PLAN-1914 PR-4 implementation step 04: add versioned schemas.
PLAN-1915 PR-4 implementation step 05: add stable reason codes.
PLAN-1916 PR-4 implementation step 06: wire self-check after tests.
PLAN-1917 PR-4 implementation step 07: update docs after machine contract.
PLAN-1918 PR-4 implementation step 08: run targeted tests.
PLAN-1919 PR-4 implementation step 09: run diff hygiene.
PLAN-1920 PR-4 implementation step 10: write PR body with Why, Scope, Why Separate, Verification, Recovery, and Excluded Scope.
PLAN-1921 PR-4 file task: inspect or edit plugins/palantir-mini/hooks/hooks.json only as required by the objective.
PLAN-1922 PR-4 file task: inspect or edit plugins/palantir-mini/schemas/hooks/pretooluse.input.schema.json only as required by the objective.
PLAN-1923 PR-4 file task: inspect or edit plugins/palantir-mini/schemas/hooks/governance-hook.output.schema.json only as required by the objective.
PLAN-1924 PR-4 file task: inspect or edit plugins/palantir-mini/scripts/verify-hook-contracts.ts only as required by the objective.
PLAN-1925 PR-4 file task: inspect or edit plugins/palantir-mini/tests/hooks/hook-contracts.test.ts only as required by the objective.
PLAN-1926 PR-4 file task: inspect or edit plugins/palantir-mini/lib/codex/codex-hook-adapter.ts only as required by the objective.
PLAN-1927 PR-4 verification command: bun test tests/hooks/hook-contracts.test.ts.
PLAN-1928 PR-4 verification command: bun test tests/lib/codex/codex-hook-adapter.test.ts.
PLAN-1929 PR-4 verification command: bun run scripts/verify-hook-contracts.ts.
PLAN-1930 PR-4 verification command: git diff --check.
PLAN-1931 PR-4 detailed checklist 01: verify source authority is explicitly handled or explicitly out of scope in this PR.
PLAN-1932 PR-4 detailed checklist 02: verify schema versioning is explicitly handled or explicitly out of scope in this PR.
PLAN-1933 PR-4 detailed checklist 03: verify reason codes is explicitly handled or explicitly out of scope in this PR.
PLAN-1934 PR-4 detailed checklist 04: verify input validation is explicitly handled or explicitly out of scope in this PR.
PLAN-1935 PR-4 detailed checklist 05: verify output validation is explicitly handled or explicitly out of scope in this PR.
PLAN-1936 PR-4 detailed checklist 06: verify gate mode resolution is explicitly handled or explicitly out of scope in this PR.
PLAN-1937 PR-4 detailed checklist 07: verify runtime projection is explicitly handled or explicitly out of scope in this PR.
PLAN-1938 PR-4 detailed checklist 08: verify semantic consistency is explicitly handled or explicitly out of scope in this PR.
PLAN-1939 PR-4 detailed checklist 09: verify SIC readiness is explicitly handled or explicitly out of scope in this PR.
PLAN-1940 PR-4 detailed checklist 10: verify DTC readiness is explicitly handled or explicitly out of scope in this PR.
PLAN-1941 PR-4 detailed checklist 11: verify WorkContract readiness is explicitly handled or explicitly out of scope in this PR.
PLAN-1942 PR-4 detailed checklist 12: verify dry-run evidence is explicitly handled or explicitly out of scope in this PR.
PLAN-1943 PR-4 detailed checklist 13: verify eval evidence is explicitly handled or explicitly out of scope in this PR.
PLAN-1944 PR-4 detailed checklist 14: verify hook timeout is explicitly handled or explicitly out of scope in this PR.
PLAN-1945 PR-4 detailed checklist 15: verify hook exception is explicitly handled or explicitly out of scope in this PR.
PLAN-1946 PR-4 detailed checklist 16: verify hook stdout parsing is explicitly handled or explicitly out of scope in this PR.
PLAN-1947 PR-4 detailed checklist 17: verify append-only lineage is explicitly handled or explicitly out of scope in this PR.
PLAN-1948 PR-4 detailed checklist 18: verify release self-check is explicitly handled or explicitly out of scope in this PR.
PLAN-1949 PR-4 detailed checklist 19: verify documentation sync is explicitly handled or explicitly out of scope in this PR.
PLAN-1950 PR-4 detailed checklist 20: verify rollback safety is explicitly handled or explicitly out of scope in this PR.
PLAN-1951 PR-4 detailed checklist 21: verify non-programmer UX is explicitly handled or explicitly out of scope in this PR.
PLAN-1952 PR-4 detailed checklist 22: verify Korean user-facing card boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-1953 PR-4 detailed checklist 23: verify ContextEngineering DATA domain is explicitly handled or explicitly out of scope in this PR.
PLAN-1954 PR-4 detailed checklist 24: verify ContextEngineering LOGIC domain is explicitly handled or explicitly out of scope in this PR.
PLAN-1955 PR-4 detailed checklist 25: verify ContextEngineering ACTION domain is explicitly handled or explicitly out of scope in this PR.
PLAN-1956 PR-4 detailed checklist 26: verify ContextEngineering TECHNOLOGY domain is explicitly handled or explicitly out of scope in this PR.
PLAN-1957 PR-4 detailed checklist 27: verify ContextEngineering GOVERNANCE domain is explicitly handled or explicitly out of scope in this PR.
PLAN-1958 PR-4 detailed checklist 28: verify Ontology ObjectType refs is explicitly handled or explicitly out of scope in this PR.
PLAN-1959 PR-4 detailed checklist 29: verify Ontology LinkType refs is explicitly handled or explicitly out of scope in this PR.
PLAN-1960 PR-4 detailed checklist 30: verify Ontology ActionType refs is explicitly handled or explicitly out of scope in this PR.
PLAN-1961 PR-4 detailed checklist 31: verify Ontology Function refs is explicitly handled or explicitly out of scope in this PR.
PLAN-1962 PR-4 detailed checklist 32: verify ApplicationState projection is explicitly handled or explicitly out of scope in this PR.
PLAN-1963 PR-4 detailed checklist 33: verify RetrievalContext projection is explicitly handled or explicitly out of scope in this PR.
PLAN-1964 PR-4 detailed checklist 34: verify runtime gap disclosure is explicitly handled or explicitly out of scope in this PR.
PLAN-1965 PR-4 detailed checklist 35: verify Codex-only install boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-1966 PR-4 detailed checklist 36: verify Claude unsupported boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-1967 PR-4 detailed checklist 37: verify Gemini unsupported boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-1968 PR-4 detailed checklist 38: verify root marketplace boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-1969 PR-4 detailed checklist 39: verify runtime cache boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-1970 PR-4 detailed checklist 40: verify generated-file boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-1971 PR-4 acceptance 01: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1972 PR-4 acceptance 02: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1973 PR-4 acceptance 03: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1974 PR-4 acceptance 04: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1975 PR-4 acceptance 05: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1976 PR-4 acceptance 06: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1977 PR-4 acceptance 07: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1978 PR-4 acceptance 08: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1979 PR-4 acceptance 09: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1980 PR-4 acceptance 10: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1981 PR-4 acceptance 11: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1982 PR-4 acceptance 12: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1983 PR-4 acceptance 13: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1984 PR-4 acceptance 14: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1985 PR-4 acceptance 15: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1986 PR-4 acceptance 16: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1987 PR-4 acceptance 17: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1988 PR-4 acceptance 18: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1989 PR-4 acceptance 19: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1990 PR-4 acceptance 20: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-1991 PR-4 review note 01: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-1992 PR-4 review note 02: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-1993 PR-4 review note 03: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-1994 PR-4 review note 04: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-1995 PR-4 review note 05: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-1996 PR-4 review note 06: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-1997 PR-4 review note 07: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-1998 PR-4 review note 08: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-1999 PR-4 review note 09: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-2000 PR-4 review note 10: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
### PR-5 - Runtime Evidence And Parity Linter

PLAN-2001 PR-5 objective: Remove unsupported Claude and Gemini defaults and require evidence-backed runtime support claims.
PLAN-2002 PR-5 priority: ordered after previous PR dependencies.
PLAN-2003 PR-5 write scope: plugins/palantir-mini/core/contracts/workflow-family-enforcement.ts, plugins/palantir-mini/contracts/runtime-evidence/codex.json, plugins/palantir-mini/scripts/verify-runtime-parity-claims.ts, plugins/palantir-mini/tests/runtime-boundary/runtime-parity-claims.test.ts, plugins/palantir-mini/tests/core/workflow-family-enforcement-contract.test.ts.
PLAN-2004 PR-5 forbidden scope: runtime cache paths under ~/.codex/plugins/cache, generated files, unrelated root overlays, and inactive Claude or Gemini package surfaces.
PLAN-2005 PR-5 source authority: plugins/palantir-mini is the only semantic source root.
PLAN-2006 PR-5 branch rule: make a normal commit and never push directly to main.
PLAN-2007 PR-5 dependency rule: do not widen scope beyond listed files unless a failing test proves the listed scope is insufficient.
PLAN-2008 PR-5 concurrency rule: do not revert or reformat unrelated changes from other workers.
PLAN-2009 PR-5 implementation step 01: read listed source files and tests.
PLAN-2010 PR-5 implementation step 02: write failing tests first.
PLAN-2011 PR-5 implementation step 03: implement smallest safe change.
PLAN-2012 PR-5 implementation step 04: add versioned schemas.
PLAN-2013 PR-5 implementation step 05: add stable reason codes.
PLAN-2014 PR-5 implementation step 06: wire self-check after tests.
PLAN-2015 PR-5 implementation step 07: update docs after machine contract.
PLAN-2016 PR-5 implementation step 08: run targeted tests.
PLAN-2017 PR-5 implementation step 09: run diff hygiene.
PLAN-2018 PR-5 implementation step 10: write PR body with Why, Scope, Why Separate, Verification, Recovery, and Excluded Scope.
PLAN-2019 PR-5 file task: inspect or edit plugins/palantir-mini/core/contracts/workflow-family-enforcement.ts only as required by the objective.
PLAN-2020 PR-5 file task: inspect or edit plugins/palantir-mini/contracts/runtime-evidence/codex.json only as required by the objective.
PLAN-2021 PR-5 file task: inspect or edit plugins/palantir-mini/scripts/verify-runtime-parity-claims.ts only as required by the objective.
PLAN-2022 PR-5 file task: inspect or edit plugins/palantir-mini/tests/runtime-boundary/runtime-parity-claims.test.ts only as required by the objective.
PLAN-2023 PR-5 file task: inspect or edit plugins/palantir-mini/tests/core/workflow-family-enforcement-contract.test.ts only as required by the objective.
PLAN-2024 PR-5 verification command: bun test tests/runtime-boundary/runtime-parity-claims.test.ts.
PLAN-2025 PR-5 verification command: bun test tests/core/workflow-family-enforcement-contract.test.ts.
PLAN-2026 PR-5 verification command: bun run scripts/verify-runtime-parity-claims.ts.
PLAN-2027 PR-5 verification command: git diff --check.
PLAN-2028 PR-5 detailed checklist 01: verify source authority is explicitly handled or explicitly out of scope in this PR.
PLAN-2029 PR-5 detailed checklist 02: verify schema versioning is explicitly handled or explicitly out of scope in this PR.
PLAN-2030 PR-5 detailed checklist 03: verify reason codes is explicitly handled or explicitly out of scope in this PR.
PLAN-2031 PR-5 detailed checklist 04: verify input validation is explicitly handled or explicitly out of scope in this PR.
PLAN-2032 PR-5 detailed checklist 05: verify output validation is explicitly handled or explicitly out of scope in this PR.
PLAN-2033 PR-5 detailed checklist 06: verify gate mode resolution is explicitly handled or explicitly out of scope in this PR.
PLAN-2034 PR-5 detailed checklist 07: verify runtime projection is explicitly handled or explicitly out of scope in this PR.
PLAN-2035 PR-5 detailed checklist 08: verify semantic consistency is explicitly handled or explicitly out of scope in this PR.
PLAN-2036 PR-5 detailed checklist 09: verify SIC readiness is explicitly handled or explicitly out of scope in this PR.
PLAN-2037 PR-5 detailed checklist 10: verify DTC readiness is explicitly handled or explicitly out of scope in this PR.
PLAN-2038 PR-5 detailed checklist 11: verify WorkContract readiness is explicitly handled or explicitly out of scope in this PR.
PLAN-2039 PR-5 detailed checklist 12: verify dry-run evidence is explicitly handled or explicitly out of scope in this PR.
PLAN-2040 PR-5 detailed checklist 13: verify eval evidence is explicitly handled or explicitly out of scope in this PR.
PLAN-2041 PR-5 detailed checklist 14: verify hook timeout is explicitly handled or explicitly out of scope in this PR.
PLAN-2042 PR-5 detailed checklist 15: verify hook exception is explicitly handled or explicitly out of scope in this PR.
PLAN-2043 PR-5 detailed checklist 16: verify hook stdout parsing is explicitly handled or explicitly out of scope in this PR.
PLAN-2044 PR-5 detailed checklist 17: verify append-only lineage is explicitly handled or explicitly out of scope in this PR.
PLAN-2045 PR-5 detailed checklist 18: verify release self-check is explicitly handled or explicitly out of scope in this PR.
PLAN-2046 PR-5 detailed checklist 19: verify documentation sync is explicitly handled or explicitly out of scope in this PR.
PLAN-2047 PR-5 detailed checklist 20: verify rollback safety is explicitly handled or explicitly out of scope in this PR.
PLAN-2048 PR-5 detailed checklist 21: verify non-programmer UX is explicitly handled or explicitly out of scope in this PR.
PLAN-2049 PR-5 detailed checklist 22: verify Korean user-facing card boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-2050 PR-5 detailed checklist 23: verify ContextEngineering DATA domain is explicitly handled or explicitly out of scope in this PR.
PLAN-2051 PR-5 detailed checklist 24: verify ContextEngineering LOGIC domain is explicitly handled or explicitly out of scope in this PR.
PLAN-2052 PR-5 detailed checklist 25: verify ContextEngineering ACTION domain is explicitly handled or explicitly out of scope in this PR.
PLAN-2053 PR-5 detailed checklist 26: verify ContextEngineering TECHNOLOGY domain is explicitly handled or explicitly out of scope in this PR.
PLAN-2054 PR-5 detailed checklist 27: verify ContextEngineering GOVERNANCE domain is explicitly handled or explicitly out of scope in this PR.
PLAN-2055 PR-5 detailed checklist 28: verify Ontology ObjectType refs is explicitly handled or explicitly out of scope in this PR.
PLAN-2056 PR-5 detailed checklist 29: verify Ontology LinkType refs is explicitly handled or explicitly out of scope in this PR.
PLAN-2057 PR-5 detailed checklist 30: verify Ontology ActionType refs is explicitly handled or explicitly out of scope in this PR.
PLAN-2058 PR-5 detailed checklist 31: verify Ontology Function refs is explicitly handled or explicitly out of scope in this PR.
PLAN-2059 PR-5 detailed checklist 32: verify ApplicationState projection is explicitly handled or explicitly out of scope in this PR.
PLAN-2060 PR-5 detailed checklist 33: verify RetrievalContext projection is explicitly handled or explicitly out of scope in this PR.
PLAN-2061 PR-5 detailed checklist 34: verify runtime gap disclosure is explicitly handled or explicitly out of scope in this PR.
PLAN-2062 PR-5 detailed checklist 35: verify Codex-only install boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-2063 PR-5 detailed checklist 36: verify Claude unsupported boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-2064 PR-5 detailed checklist 37: verify Gemini unsupported boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-2065 PR-5 detailed checklist 38: verify root marketplace boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-2066 PR-5 detailed checklist 39: verify runtime cache boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-2067 PR-5 detailed checklist 40: verify generated-file boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-2068 PR-5 acceptance 01: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2069 PR-5 acceptance 02: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2070 PR-5 acceptance 03: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2071 PR-5 acceptance 04: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2072 PR-5 acceptance 05: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2073 PR-5 acceptance 06: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2074 PR-5 acceptance 07: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2075 PR-5 acceptance 08: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2076 PR-5 acceptance 09: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2077 PR-5 acceptance 10: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2078 PR-5 acceptance 11: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2079 PR-5 acceptance 12: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2080 PR-5 acceptance 13: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2081 PR-5 acceptance 14: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2082 PR-5 acceptance 15: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2083 PR-5 acceptance 16: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2084 PR-5 acceptance 17: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2085 PR-5 acceptance 18: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2086 PR-5 acceptance 19: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2087 PR-5 acceptance 20: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2088 PR-5 review note 01: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-2089 PR-5 review note 02: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-2090 PR-5 review note 03: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-2091 PR-5 review note 04: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-2092 PR-5 review note 05: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-2093 PR-5 review note 06: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-2094 PR-5 review note 07: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-2095 PR-5 review note 08: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-2096 PR-5 review note 09: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-2097 PR-5 review note 10: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
### PR-6 - Workflow Family Enforcement Release Gate

PLAN-2098 PR-6 objective: Promote workflow family enforcement into release-blocking self-check with evidence, replay, determinism, and blocking-gate requirements.
PLAN-2099 PR-6 priority: ordered after previous PR dependencies.
PLAN-2100 PR-6 write scope: plugins/palantir-mini/lib/release/workflow-family-release-gate.ts, plugins/palantir-mini/tests/core/workflow-family-release-gate.test.ts, plugins/palantir-mini/bridge/handlers/pm-plugin-self-check.ts, plugins/palantir-mini/core/contracts/workflow-family-enforcement.ts.
PLAN-2101 PR-6 forbidden scope: runtime cache paths under ~/.codex/plugins/cache, generated files, unrelated root overlays, and inactive Claude or Gemini package surfaces.
PLAN-2102 PR-6 source authority: plugins/palantir-mini is the only semantic source root.
PLAN-2103 PR-6 branch rule: make a normal commit and never push directly to main.
PLAN-2104 PR-6 dependency rule: do not widen scope beyond listed files unless a failing test proves the listed scope is insufficient.
PLAN-2105 PR-6 concurrency rule: do not revert or reformat unrelated changes from other workers.
PLAN-2106 PR-6 implementation step 01: read listed source files and tests.
PLAN-2107 PR-6 implementation step 02: write failing tests first.
PLAN-2108 PR-6 implementation step 03: implement smallest safe change.
PLAN-2109 PR-6 implementation step 04: add versioned schemas.
PLAN-2110 PR-6 implementation step 05: add stable reason codes.
PLAN-2111 PR-6 implementation step 06: wire self-check after tests.
PLAN-2112 PR-6 implementation step 07: update docs after machine contract.
PLAN-2113 PR-6 implementation step 08: run targeted tests.
PLAN-2114 PR-6 implementation step 09: run diff hygiene.
PLAN-2115 PR-6 implementation step 10: write PR body with Why, Scope, Why Separate, Verification, Recovery, and Excluded Scope.
PLAN-2116 PR-6 file task: inspect or edit plugins/palantir-mini/lib/release/workflow-family-release-gate.ts only as required by the objective.
PLAN-2117 PR-6 file task: inspect or edit plugins/palantir-mini/tests/core/workflow-family-release-gate.test.ts only as required by the objective.
PLAN-2118 PR-6 file task: inspect or edit plugins/palantir-mini/bridge/handlers/pm-plugin-self-check.ts only as required by the objective.
PLAN-2119 PR-6 file task: inspect or edit plugins/palantir-mini/core/contracts/workflow-family-enforcement.ts only as required by the objective.
PLAN-2120 PR-6 verification command: bun test tests/core/workflow-family-release-gate.test.ts.
PLAN-2121 PR-6 verification command: bun test tests/bridge/handlers/pm-plugin-self-check.test.ts.
PLAN-2122 PR-6 verification command: git diff --check.
PLAN-2123 PR-6 detailed checklist 01: verify source authority is explicitly handled or explicitly out of scope in this PR.
PLAN-2124 PR-6 detailed checklist 02: verify schema versioning is explicitly handled or explicitly out of scope in this PR.
PLAN-2125 PR-6 detailed checklist 03: verify reason codes is explicitly handled or explicitly out of scope in this PR.
PLAN-2126 PR-6 detailed checklist 04: verify input validation is explicitly handled or explicitly out of scope in this PR.
PLAN-2127 PR-6 detailed checklist 05: verify output validation is explicitly handled or explicitly out of scope in this PR.
PLAN-2128 PR-6 detailed checklist 06: verify gate mode resolution is explicitly handled or explicitly out of scope in this PR.
PLAN-2129 PR-6 detailed checklist 07: verify runtime projection is explicitly handled or explicitly out of scope in this PR.
PLAN-2130 PR-6 detailed checklist 08: verify semantic consistency is explicitly handled or explicitly out of scope in this PR.
PLAN-2131 PR-6 detailed checklist 09: verify SIC readiness is explicitly handled or explicitly out of scope in this PR.
PLAN-2132 PR-6 detailed checklist 10: verify DTC readiness is explicitly handled or explicitly out of scope in this PR.
PLAN-2133 PR-6 detailed checklist 11: verify WorkContract readiness is explicitly handled or explicitly out of scope in this PR.
PLAN-2134 PR-6 detailed checklist 12: verify dry-run evidence is explicitly handled or explicitly out of scope in this PR.
PLAN-2135 PR-6 detailed checklist 13: verify eval evidence is explicitly handled or explicitly out of scope in this PR.
PLAN-2136 PR-6 detailed checklist 14: verify hook timeout is explicitly handled or explicitly out of scope in this PR.
PLAN-2137 PR-6 detailed checklist 15: verify hook exception is explicitly handled or explicitly out of scope in this PR.
PLAN-2138 PR-6 detailed checklist 16: verify hook stdout parsing is explicitly handled or explicitly out of scope in this PR.
PLAN-2139 PR-6 detailed checklist 17: verify append-only lineage is explicitly handled or explicitly out of scope in this PR.
PLAN-2140 PR-6 detailed checklist 18: verify release self-check is explicitly handled or explicitly out of scope in this PR.
PLAN-2141 PR-6 detailed checklist 19: verify documentation sync is explicitly handled or explicitly out of scope in this PR.
PLAN-2142 PR-6 detailed checklist 20: verify rollback safety is explicitly handled or explicitly out of scope in this PR.
PLAN-2143 PR-6 detailed checklist 21: verify non-programmer UX is explicitly handled or explicitly out of scope in this PR.
PLAN-2144 PR-6 detailed checklist 22: verify Korean user-facing card boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-2145 PR-6 detailed checklist 23: verify ContextEngineering DATA domain is explicitly handled or explicitly out of scope in this PR.
PLAN-2146 PR-6 detailed checklist 24: verify ContextEngineering LOGIC domain is explicitly handled or explicitly out of scope in this PR.
PLAN-2147 PR-6 detailed checklist 25: verify ContextEngineering ACTION domain is explicitly handled or explicitly out of scope in this PR.
PLAN-2148 PR-6 detailed checklist 26: verify ContextEngineering TECHNOLOGY domain is explicitly handled or explicitly out of scope in this PR.
PLAN-2149 PR-6 detailed checklist 27: verify ContextEngineering GOVERNANCE domain is explicitly handled or explicitly out of scope in this PR.
PLAN-2150 PR-6 detailed checklist 28: verify Ontology ObjectType refs is explicitly handled or explicitly out of scope in this PR.
PLAN-2151 PR-6 detailed checklist 29: verify Ontology LinkType refs is explicitly handled or explicitly out of scope in this PR.
PLAN-2152 PR-6 detailed checklist 30: verify Ontology ActionType refs is explicitly handled or explicitly out of scope in this PR.
PLAN-2153 PR-6 detailed checklist 31: verify Ontology Function refs is explicitly handled or explicitly out of scope in this PR.
PLAN-2154 PR-6 detailed checklist 32: verify ApplicationState projection is explicitly handled or explicitly out of scope in this PR.
PLAN-2155 PR-6 detailed checklist 33: verify RetrievalContext projection is explicitly handled or explicitly out of scope in this PR.
PLAN-2156 PR-6 detailed checklist 34: verify runtime gap disclosure is explicitly handled or explicitly out of scope in this PR.
PLAN-2157 PR-6 detailed checklist 35: verify Codex-only install boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-2158 PR-6 detailed checklist 36: verify Claude unsupported boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-2159 PR-6 detailed checklist 37: verify Gemini unsupported boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-2160 PR-6 detailed checklist 38: verify root marketplace boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-2161 PR-6 detailed checklist 39: verify runtime cache boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-2162 PR-6 detailed checklist 40: verify generated-file boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-2163 PR-6 acceptance 01: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2164 PR-6 acceptance 02: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2165 PR-6 acceptance 03: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2166 PR-6 acceptance 04: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2167 PR-6 acceptance 05: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2168 PR-6 acceptance 06: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2169 PR-6 acceptance 07: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2170 PR-6 acceptance 08: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2171 PR-6 acceptance 09: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2172 PR-6 acceptance 10: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2173 PR-6 acceptance 11: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2174 PR-6 acceptance 12: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2175 PR-6 acceptance 13: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2176 PR-6 acceptance 14: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2177 PR-6 acceptance 15: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2178 PR-6 acceptance 16: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2179 PR-6 acceptance 17: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2180 PR-6 acceptance 18: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2181 PR-6 acceptance 19: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2182 PR-6 acceptance 20: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2183 PR-6 review note 01: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-2184 PR-6 review note 02: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-2185 PR-6 review note 03: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-2186 PR-6 review note 04: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-2187 PR-6 review note 05: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-2188 PR-6 review note 06: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-2189 PR-6 review note 07: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-2190 PR-6 review note 08: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-2191 PR-6 review note 09: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-2192 PR-6 review note 10: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
### PR-7 - Semantic Consistency Promotion Gate

PLAN-2193 PR-7 objective: Make deterministic resolver output mandatory before ontology-affecting SIC and DTC promotion.
PLAN-2194 PR-7 priority: ordered after previous PR dependencies.
PLAN-2195 PR-7 write scope: plugins/palantir-mini/bridge/handlers/pm-semantic-consistency-gate.ts, plugins/palantir-mini/lib/semantic-consistency/promotion-gate.ts, plugins/palantir-mini/tests/lib/semantic-consistency/promotion-gate.test.ts, plugins/palantir-mini/tests/evals/semantic-consistency-regression.test.ts, plugins/palantir-mini/lib/lead-intent/contracts.ts, plugins/palantir-mini/bridge/handlers/pm-semantic-intent-gate.ts.
PLAN-2196 PR-7 forbidden scope: runtime cache paths under ~/.codex/plugins/cache, generated files, unrelated root overlays, and inactive Claude or Gemini package surfaces.
PLAN-2197 PR-7 source authority: plugins/palantir-mini is the only semantic source root.
PLAN-2198 PR-7 branch rule: make a normal commit and never push directly to main.
PLAN-2199 PR-7 dependency rule: do not widen scope beyond listed files unless a failing test proves the listed scope is insufficient.
PLAN-2200 PR-7 concurrency rule: do not revert or reformat unrelated changes from other workers.
PLAN-2201 PR-7 implementation step 01: read listed source files and tests.
PLAN-2202 PR-7 implementation step 02: write failing tests first.
PLAN-2203 PR-7 implementation step 03: implement smallest safe change.
PLAN-2204 PR-7 implementation step 04: add versioned schemas.
PLAN-2205 PR-7 implementation step 05: add stable reason codes.
PLAN-2206 PR-7 implementation step 06: wire self-check after tests.
PLAN-2207 PR-7 implementation step 07: update docs after machine contract.
PLAN-2208 PR-7 implementation step 08: run targeted tests.
PLAN-2209 PR-7 implementation step 09: run diff hygiene.
PLAN-2210 PR-7 implementation step 10: write PR body with Why, Scope, Why Separate, Verification, Recovery, and Excluded Scope.
PLAN-2211 PR-7 file task: inspect or edit plugins/palantir-mini/bridge/handlers/pm-semantic-consistency-gate.ts only as required by the objective.
PLAN-2212 PR-7 file task: inspect or edit plugins/palantir-mini/lib/semantic-consistency/promotion-gate.ts only as required by the objective.
PLAN-2213 PR-7 file task: inspect or edit plugins/palantir-mini/tests/lib/semantic-consistency/promotion-gate.test.ts only as required by the objective.
PLAN-2214 PR-7 file task: inspect or edit plugins/palantir-mini/tests/evals/semantic-consistency-regression.test.ts only as required by the objective.
PLAN-2215 PR-7 file task: inspect or edit plugins/palantir-mini/lib/lead-intent/contracts.ts only as required by the objective.
PLAN-2216 PR-7 file task: inspect or edit plugins/palantir-mini/bridge/handlers/pm-semantic-intent-gate.ts only as required by the objective.
PLAN-2217 PR-7 verification command: bun test tests/lib/semantic-consistency/promotion-gate.test.ts.
PLAN-2218 PR-7 verification command: bun test tests/evals/semantic-consistency-regression.test.ts.
PLAN-2219 PR-7 verification command: bun test tests/bridge/handlers/pm-semantic-intent-gate.test.ts.
PLAN-2220 PR-7 verification command: git diff --check.
PLAN-2221 PR-7 detailed checklist 01: verify source authority is explicitly handled or explicitly out of scope in this PR.
PLAN-2222 PR-7 detailed checklist 02: verify schema versioning is explicitly handled or explicitly out of scope in this PR.
PLAN-2223 PR-7 detailed checklist 03: verify reason codes is explicitly handled or explicitly out of scope in this PR.
PLAN-2224 PR-7 detailed checklist 04: verify input validation is explicitly handled or explicitly out of scope in this PR.
PLAN-2225 PR-7 detailed checklist 05: verify output validation is explicitly handled or explicitly out of scope in this PR.
PLAN-2226 PR-7 detailed checklist 06: verify gate mode resolution is explicitly handled or explicitly out of scope in this PR.
PLAN-2227 PR-7 detailed checklist 07: verify runtime projection is explicitly handled or explicitly out of scope in this PR.
PLAN-2228 PR-7 detailed checklist 08: verify semantic consistency is explicitly handled or explicitly out of scope in this PR.
PLAN-2229 PR-7 detailed checklist 09: verify SIC readiness is explicitly handled or explicitly out of scope in this PR.
PLAN-2230 PR-7 detailed checklist 10: verify DTC readiness is explicitly handled or explicitly out of scope in this PR.
PLAN-2231 PR-7 detailed checklist 11: verify WorkContract readiness is explicitly handled or explicitly out of scope in this PR.
PLAN-2232 PR-7 detailed checklist 12: verify dry-run evidence is explicitly handled or explicitly out of scope in this PR.
PLAN-2233 PR-7 detailed checklist 13: verify eval evidence is explicitly handled or explicitly out of scope in this PR.
PLAN-2234 PR-7 detailed checklist 14: verify hook timeout is explicitly handled or explicitly out of scope in this PR.
PLAN-2235 PR-7 detailed checklist 15: verify hook exception is explicitly handled or explicitly out of scope in this PR.
PLAN-2236 PR-7 detailed checklist 16: verify hook stdout parsing is explicitly handled or explicitly out of scope in this PR.
PLAN-2237 PR-7 detailed checklist 17: verify append-only lineage is explicitly handled or explicitly out of scope in this PR.
PLAN-2238 PR-7 detailed checklist 18: verify release self-check is explicitly handled or explicitly out of scope in this PR.
PLAN-2239 PR-7 detailed checklist 19: verify documentation sync is explicitly handled or explicitly out of scope in this PR.
PLAN-2240 PR-7 detailed checklist 20: verify rollback safety is explicitly handled or explicitly out of scope in this PR.
PLAN-2241 PR-7 detailed checklist 21: verify non-programmer UX is explicitly handled or explicitly out of scope in this PR.
PLAN-2242 PR-7 detailed checklist 22: verify Korean user-facing card boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-2243 PR-7 detailed checklist 23: verify ContextEngineering DATA domain is explicitly handled or explicitly out of scope in this PR.
PLAN-2244 PR-7 detailed checklist 24: verify ContextEngineering LOGIC domain is explicitly handled or explicitly out of scope in this PR.
PLAN-2245 PR-7 detailed checklist 25: verify ContextEngineering ACTION domain is explicitly handled or explicitly out of scope in this PR.
PLAN-2246 PR-7 detailed checklist 26: verify ContextEngineering TECHNOLOGY domain is explicitly handled or explicitly out of scope in this PR.
PLAN-2247 PR-7 detailed checklist 27: verify ContextEngineering GOVERNANCE domain is explicitly handled or explicitly out of scope in this PR.
PLAN-2248 PR-7 detailed checklist 28: verify Ontology ObjectType refs is explicitly handled or explicitly out of scope in this PR.
PLAN-2249 PR-7 detailed checklist 29: verify Ontology LinkType refs is explicitly handled or explicitly out of scope in this PR.
PLAN-2250 PR-7 detailed checklist 30: verify Ontology ActionType refs is explicitly handled or explicitly out of scope in this PR.
PLAN-2251 PR-7 detailed checklist 31: verify Ontology Function refs is explicitly handled or explicitly out of scope in this PR.
PLAN-2252 PR-7 detailed checklist 32: verify ApplicationState projection is explicitly handled or explicitly out of scope in this PR.
PLAN-2253 PR-7 detailed checklist 33: verify RetrievalContext projection is explicitly handled or explicitly out of scope in this PR.
PLAN-2254 PR-7 detailed checklist 34: verify runtime gap disclosure is explicitly handled or explicitly out of scope in this PR.
PLAN-2255 PR-7 detailed checklist 35: verify Codex-only install boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-2256 PR-7 detailed checklist 36: verify Claude unsupported boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-2257 PR-7 detailed checklist 37: verify Gemini unsupported boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-2258 PR-7 detailed checklist 38: verify root marketplace boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-2259 PR-7 detailed checklist 39: verify runtime cache boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-2260 PR-7 detailed checklist 40: verify generated-file boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-2261 PR-7 acceptance 01: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2262 PR-7 acceptance 02: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2263 PR-7 acceptance 03: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2264 PR-7 acceptance 04: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2265 PR-7 acceptance 05: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2266 PR-7 acceptance 06: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2267 PR-7 acceptance 07: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2268 PR-7 acceptance 08: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2269 PR-7 acceptance 09: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2270 PR-7 acceptance 10: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2271 PR-7 acceptance 11: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2272 PR-7 acceptance 12: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2273 PR-7 acceptance 13: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2274 PR-7 acceptance 14: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2275 PR-7 acceptance 15: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2276 PR-7 acceptance 16: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2277 PR-7 acceptance 17: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2278 PR-7 acceptance 18: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2279 PR-7 acceptance 19: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2280 PR-7 acceptance 20: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2281 PR-7 review note 01: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-2282 PR-7 review note 02: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-2283 PR-7 review note 03: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-2284 PR-7 review note 04: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-2285 PR-7 review note 05: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-2286 PR-7 review note 06: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-2287 PR-7 review note 07: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-2288 PR-7 review note 08: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-2289 PR-7 review note 09: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-2290 PR-7 review note 10: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
### PR-8 - SemanticConversationState As Only LLM-Facing State

PLAN-2291 PR-8 objective: Enforce SemanticConversationState projection as the only LLM-facing control state and prohibit LLM-written readiness or approval fields.
PLAN-2292 PR-8 priority: ordered after previous PR dependencies.
PLAN-2293 PR-8 write scope: plugins/palantir-mini/lib/chatbot-studio/semantic-conversation-state.ts, plugins/palantir-mini/schemas/semantic-conversation-state.schema.json, plugins/palantir-mini/docs/PALANTIR_MINI_USER_REQUIREMENT_PROMPT_TEMPLATE.md, plugins/palantir-mini/tests/lib/chatbot-studio/semantic-conversation-state.test.ts, plugins/palantir-mini/lib/chatbot-studio/application-state.ts, plugins/palantir-mini/lib/chatbot-studio/retrieval-context.ts.
PLAN-2294 PR-8 forbidden scope: runtime cache paths under ~/.codex/plugins/cache, generated files, unrelated root overlays, and inactive Claude or Gemini package surfaces.
PLAN-2295 PR-8 source authority: plugins/palantir-mini is the only semantic source root.
PLAN-2296 PR-8 branch rule: make a normal commit and never push directly to main.
PLAN-2297 PR-8 dependency rule: do not widen scope beyond listed files unless a failing test proves the listed scope is insufficient.
PLAN-2298 PR-8 concurrency rule: do not revert or reformat unrelated changes from other workers.
PLAN-2299 PR-8 implementation step 01: read listed source files and tests.
PLAN-2300 PR-8 implementation step 02: write failing tests first.
PLAN-2301 PR-8 implementation step 03: implement smallest safe change.
PLAN-2302 PR-8 implementation step 04: add versioned schemas.
PLAN-2303 PR-8 implementation step 05: add stable reason codes.
PLAN-2304 PR-8 implementation step 06: wire self-check after tests.
PLAN-2305 PR-8 implementation step 07: update docs after machine contract.
PLAN-2306 PR-8 implementation step 08: run targeted tests.
PLAN-2307 PR-8 implementation step 09: run diff hygiene.
PLAN-2308 PR-8 implementation step 10: write PR body with Why, Scope, Why Separate, Verification, Recovery, and Excluded Scope.
PLAN-2309 PR-8 file task: inspect or edit plugins/palantir-mini/lib/chatbot-studio/semantic-conversation-state.ts only as required by the objective.
PLAN-2310 PR-8 file task: inspect or edit plugins/palantir-mini/schemas/semantic-conversation-state.schema.json only as required by the objective.
PLAN-2311 PR-8 file task: inspect or edit plugins/palantir-mini/docs/PALANTIR_MINI_USER_REQUIREMENT_PROMPT_TEMPLATE.md only as required by the objective.
PLAN-2312 PR-8 file task: inspect or edit plugins/palantir-mini/tests/lib/chatbot-studio/semantic-conversation-state.test.ts only as required by the objective.
PLAN-2313 PR-8 file task: inspect or edit plugins/palantir-mini/lib/chatbot-studio/application-state.ts only as required by the objective.
PLAN-2314 PR-8 file task: inspect or edit plugins/palantir-mini/lib/chatbot-studio/retrieval-context.ts only as required by the objective.
PLAN-2315 PR-8 verification command: bun test tests/lib/chatbot-studio/semantic-conversation-state.test.ts.
PLAN-2316 PR-8 verification command: bun test tests/bridge/handlers/pm-semantic-intent-gate.test.ts.
PLAN-2317 PR-8 verification command: git diff --check.
PLAN-2318 PR-8 detailed checklist 01: verify source authority is explicitly handled or explicitly out of scope in this PR.
PLAN-2319 PR-8 detailed checklist 02: verify schema versioning is explicitly handled or explicitly out of scope in this PR.
PLAN-2320 PR-8 detailed checklist 03: verify reason codes is explicitly handled or explicitly out of scope in this PR.
PLAN-2321 PR-8 detailed checklist 04: verify input validation is explicitly handled or explicitly out of scope in this PR.
PLAN-2322 PR-8 detailed checklist 05: verify output validation is explicitly handled or explicitly out of scope in this PR.
PLAN-2323 PR-8 detailed checklist 06: verify gate mode resolution is explicitly handled or explicitly out of scope in this PR.
PLAN-2324 PR-8 detailed checklist 07: verify runtime projection is explicitly handled or explicitly out of scope in this PR.
PLAN-2325 PR-8 detailed checklist 08: verify semantic consistency is explicitly handled or explicitly out of scope in this PR.
PLAN-2326 PR-8 detailed checklist 09: verify SIC readiness is explicitly handled or explicitly out of scope in this PR.
PLAN-2327 PR-8 detailed checklist 10: verify DTC readiness is explicitly handled or explicitly out of scope in this PR.
PLAN-2328 PR-8 detailed checklist 11: verify WorkContract readiness is explicitly handled or explicitly out of scope in this PR.
PLAN-2329 PR-8 detailed checklist 12: verify dry-run evidence is explicitly handled or explicitly out of scope in this PR.
PLAN-2330 PR-8 detailed checklist 13: verify eval evidence is explicitly handled or explicitly out of scope in this PR.
PLAN-2331 PR-8 detailed checklist 14: verify hook timeout is explicitly handled or explicitly out of scope in this PR.
PLAN-2332 PR-8 detailed checklist 15: verify hook exception is explicitly handled or explicitly out of scope in this PR.
PLAN-2333 PR-8 detailed checklist 16: verify hook stdout parsing is explicitly handled or explicitly out of scope in this PR.
PLAN-2334 PR-8 detailed checklist 17: verify append-only lineage is explicitly handled or explicitly out of scope in this PR.
PLAN-2335 PR-8 detailed checklist 18: verify release self-check is explicitly handled or explicitly out of scope in this PR.
PLAN-2336 PR-8 detailed checklist 19: verify documentation sync is explicitly handled or explicitly out of scope in this PR.
PLAN-2337 PR-8 detailed checklist 20: verify rollback safety is explicitly handled or explicitly out of scope in this PR.
PLAN-2338 PR-8 detailed checklist 21: verify non-programmer UX is explicitly handled or explicitly out of scope in this PR.
PLAN-2339 PR-8 detailed checklist 22: verify Korean user-facing card boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-2340 PR-8 detailed checklist 23: verify ContextEngineering DATA domain is explicitly handled or explicitly out of scope in this PR.
PLAN-2341 PR-8 detailed checklist 24: verify ContextEngineering LOGIC domain is explicitly handled or explicitly out of scope in this PR.
PLAN-2342 PR-8 detailed checklist 25: verify ContextEngineering ACTION domain is explicitly handled or explicitly out of scope in this PR.
PLAN-2343 PR-8 detailed checklist 26: verify ContextEngineering TECHNOLOGY domain is explicitly handled or explicitly out of scope in this PR.
PLAN-2344 PR-8 detailed checklist 27: verify ContextEngineering GOVERNANCE domain is explicitly handled or explicitly out of scope in this PR.
PLAN-2345 PR-8 detailed checklist 28: verify Ontology ObjectType refs is explicitly handled or explicitly out of scope in this PR.
PLAN-2346 PR-8 detailed checklist 29: verify Ontology LinkType refs is explicitly handled or explicitly out of scope in this PR.
PLAN-2347 PR-8 detailed checklist 30: verify Ontology ActionType refs is explicitly handled or explicitly out of scope in this PR.
PLAN-2348 PR-8 detailed checklist 31: verify Ontology Function refs is explicitly handled or explicitly out of scope in this PR.
PLAN-2349 PR-8 detailed checklist 32: verify ApplicationState projection is explicitly handled or explicitly out of scope in this PR.
PLAN-2350 PR-8 detailed checklist 33: verify RetrievalContext projection is explicitly handled or explicitly out of scope in this PR.
PLAN-2351 PR-8 detailed checklist 34: verify runtime gap disclosure is explicitly handled or explicitly out of scope in this PR.
PLAN-2352 PR-8 detailed checklist 35: verify Codex-only install boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-2353 PR-8 detailed checklist 36: verify Claude unsupported boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-2354 PR-8 detailed checklist 37: verify Gemini unsupported boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-2355 PR-8 detailed checklist 38: verify root marketplace boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-2356 PR-8 detailed checklist 39: verify runtime cache boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-2357 PR-8 detailed checklist 40: verify generated-file boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-2358 PR-8 acceptance 01: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2359 PR-8 acceptance 02: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2360 PR-8 acceptance 03: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2361 PR-8 acceptance 04: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2362 PR-8 acceptance 05: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2363 PR-8 acceptance 06: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2364 PR-8 acceptance 07: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2365 PR-8 acceptance 08: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2366 PR-8 acceptance 09: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2367 PR-8 acceptance 10: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2368 PR-8 acceptance 11: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2369 PR-8 acceptance 12: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2370 PR-8 acceptance 13: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2371 PR-8 acceptance 14: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2372 PR-8 acceptance 15: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2373 PR-8 acceptance 16: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2374 PR-8 acceptance 17: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2375 PR-8 acceptance 18: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2376 PR-8 acceptance 19: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2377 PR-8 acceptance 20: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2378 PR-8 review note 01: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-2379 PR-8 review note 02: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-2380 PR-8 review note 03: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-2381 PR-8 review note 04: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-2382 PR-8 review note 05: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-2383 PR-8 review note 06: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-2384 PR-8 review note 07: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-2385 PR-8 review note 08: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-2386 PR-8 review note 09: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-2387 PR-8 review note 10: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
### PR-9 - Root Semantic Fork Detector And Marketplace Integrity CI

PLAN-2388 PR-9 objective: Keep the repository root as marketplace-only and fail CI on semantic forks outside plugin source authority.
PLAN-2389 PR-9 priority: ordered after previous PR dependencies.
PLAN-2390 PR-9 write scope: ci/verify-marketplace-integrity.ts, plugins/palantir-mini/scripts/verify-no-semantic-root-fork.ts, .github/workflows/palantir-mini-integrity.yml, plugins/palantir-mini/tests/integrity/no-semantic-root-fork.test.ts.
PLAN-2391 PR-9 forbidden scope: runtime cache paths under ~/.codex/plugins/cache, generated files, unrelated root overlays, and inactive Claude or Gemini package surfaces.
PLAN-2392 PR-9 source authority: plugins/palantir-mini is the only semantic source root.
PLAN-2393 PR-9 branch rule: make a normal commit and never push directly to main.
PLAN-2394 PR-9 dependency rule: do not widen scope beyond listed files unless a failing test proves the listed scope is insufficient.
PLAN-2395 PR-9 concurrency rule: do not revert or reformat unrelated changes from other workers.
PLAN-2396 PR-9 implementation step 01: read listed source files and tests.
PLAN-2397 PR-9 implementation step 02: write failing tests first.
PLAN-2398 PR-9 implementation step 03: implement smallest safe change.
PLAN-2399 PR-9 implementation step 04: add versioned schemas.
PLAN-2400 PR-9 implementation step 05: add stable reason codes.
PLAN-2401 PR-9 implementation step 06: wire self-check after tests.
PLAN-2402 PR-9 implementation step 07: update docs after machine contract.
PLAN-2403 PR-9 implementation step 08: run targeted tests.
PLAN-2404 PR-9 implementation step 09: run diff hygiene.
PLAN-2405 PR-9 implementation step 10: write PR body with Why, Scope, Why Separate, Verification, Recovery, and Excluded Scope.
PLAN-2406 PR-9 file task: inspect or edit ci/verify-marketplace-integrity.ts only as required by the objective.
PLAN-2407 PR-9 file task: inspect or edit plugins/palantir-mini/scripts/verify-no-semantic-root-fork.ts only as required by the objective.
PLAN-2408 PR-9 file task: inspect or edit .github/workflows/palantir-mini-integrity.yml only as required by the objective.
PLAN-2409 PR-9 file task: inspect or edit plugins/palantir-mini/tests/integrity/no-semantic-root-fork.test.ts only as required by the objective.
PLAN-2410 PR-9 verification command: bun test tests/integrity/no-semantic-root-fork.test.ts.
PLAN-2411 PR-9 verification command: bun run scripts/verify-no-semantic-root-fork.ts.
PLAN-2412 PR-9 verification command: bun run ci/verify-marketplace-integrity.ts.
PLAN-2413 PR-9 verification command: git diff --check.
PLAN-2414 PR-9 detailed checklist 01: verify source authority is explicitly handled or explicitly out of scope in this PR.
PLAN-2415 PR-9 detailed checklist 02: verify schema versioning is explicitly handled or explicitly out of scope in this PR.
PLAN-2416 PR-9 detailed checklist 03: verify reason codes is explicitly handled or explicitly out of scope in this PR.
PLAN-2417 PR-9 detailed checklist 04: verify input validation is explicitly handled or explicitly out of scope in this PR.
PLAN-2418 PR-9 detailed checklist 05: verify output validation is explicitly handled or explicitly out of scope in this PR.
PLAN-2419 PR-9 detailed checklist 06: verify gate mode resolution is explicitly handled or explicitly out of scope in this PR.
PLAN-2420 PR-9 detailed checklist 07: verify runtime projection is explicitly handled or explicitly out of scope in this PR.
PLAN-2421 PR-9 detailed checklist 08: verify semantic consistency is explicitly handled or explicitly out of scope in this PR.
PLAN-2422 PR-9 detailed checklist 09: verify SIC readiness is explicitly handled or explicitly out of scope in this PR.
PLAN-2423 PR-9 detailed checklist 10: verify DTC readiness is explicitly handled or explicitly out of scope in this PR.
PLAN-2424 PR-9 detailed checklist 11: verify WorkContract readiness is explicitly handled or explicitly out of scope in this PR.
PLAN-2425 PR-9 detailed checklist 12: verify dry-run evidence is explicitly handled or explicitly out of scope in this PR.
PLAN-2426 PR-9 detailed checklist 13: verify eval evidence is explicitly handled or explicitly out of scope in this PR.
PLAN-2427 PR-9 detailed checklist 14: verify hook timeout is explicitly handled or explicitly out of scope in this PR.
PLAN-2428 PR-9 detailed checklist 15: verify hook exception is explicitly handled or explicitly out of scope in this PR.
PLAN-2429 PR-9 detailed checklist 16: verify hook stdout parsing is explicitly handled or explicitly out of scope in this PR.
PLAN-2430 PR-9 detailed checklist 17: verify append-only lineage is explicitly handled or explicitly out of scope in this PR.
PLAN-2431 PR-9 detailed checklist 18: verify release self-check is explicitly handled or explicitly out of scope in this PR.
PLAN-2432 PR-9 detailed checklist 19: verify documentation sync is explicitly handled or explicitly out of scope in this PR.
PLAN-2433 PR-9 detailed checklist 20: verify rollback safety is explicitly handled or explicitly out of scope in this PR.
PLAN-2434 PR-9 detailed checklist 21: verify non-programmer UX is explicitly handled or explicitly out of scope in this PR.
PLAN-2435 PR-9 detailed checklist 22: verify Korean user-facing card boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-2436 PR-9 detailed checklist 23: verify ContextEngineering DATA domain is explicitly handled or explicitly out of scope in this PR.
PLAN-2437 PR-9 detailed checklist 24: verify ContextEngineering LOGIC domain is explicitly handled or explicitly out of scope in this PR.
PLAN-2438 PR-9 detailed checklist 25: verify ContextEngineering ACTION domain is explicitly handled or explicitly out of scope in this PR.
PLAN-2439 PR-9 detailed checklist 26: verify ContextEngineering TECHNOLOGY domain is explicitly handled or explicitly out of scope in this PR.
PLAN-2440 PR-9 detailed checklist 27: verify ContextEngineering GOVERNANCE domain is explicitly handled or explicitly out of scope in this PR.
PLAN-2441 PR-9 detailed checklist 28: verify Ontology ObjectType refs is explicitly handled or explicitly out of scope in this PR.
PLAN-2442 PR-9 detailed checklist 29: verify Ontology LinkType refs is explicitly handled or explicitly out of scope in this PR.
PLAN-2443 PR-9 detailed checklist 30: verify Ontology ActionType refs is explicitly handled or explicitly out of scope in this PR.
PLAN-2444 PR-9 detailed checklist 31: verify Ontology Function refs is explicitly handled or explicitly out of scope in this PR.
PLAN-2445 PR-9 detailed checklist 32: verify ApplicationState projection is explicitly handled or explicitly out of scope in this PR.
PLAN-2446 PR-9 detailed checklist 33: verify RetrievalContext projection is explicitly handled or explicitly out of scope in this PR.
PLAN-2447 PR-9 detailed checklist 34: verify runtime gap disclosure is explicitly handled or explicitly out of scope in this PR.
PLAN-2448 PR-9 detailed checklist 35: verify Codex-only install boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-2449 PR-9 detailed checklist 36: verify Claude unsupported boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-2450 PR-9 detailed checklist 37: verify Gemini unsupported boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-2451 PR-9 detailed checklist 38: verify root marketplace boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-2452 PR-9 detailed checklist 39: verify runtime cache boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-2453 PR-9 detailed checklist 40: verify generated-file boundary is explicitly handled or explicitly out of scope in this PR.
PLAN-2454 PR-9 acceptance 01: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2455 PR-9 acceptance 02: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2456 PR-9 acceptance 03: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2457 PR-9 acceptance 04: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2458 PR-9 acceptance 05: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2459 PR-9 acceptance 06: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2460 PR-9 acceptance 07: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2461 PR-9 acceptance 08: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2462 PR-9 acceptance 09: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2463 PR-9 acceptance 10: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2464 PR-9 acceptance 11: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2465 PR-9 acceptance 12: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2466 PR-9 acceptance 13: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2467 PR-9 acceptance 14: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2468 PR-9 acceptance 15: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2469 PR-9 acceptance 16: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2470 PR-9 acceptance 17: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2471 PR-9 acceptance 18: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2472 PR-9 acceptance 19: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2473 PR-9 acceptance 20: protected mutation remains impossible unless the relevant deterministic evidence is complete.
PLAN-2474 PR-9 review note 01: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-2475 PR-9 review note 02: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-2476 PR-9 review note 03: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-2477 PR-9 review note 04: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-2478 PR-9 review note 05: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-2479 PR-9 review note 06: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-2480 PR-9 review note 07: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-2481 PR-9 review note 08: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-2482 PR-9 review note 09: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
PLAN-2483 PR-9 review note 10: reviewer must verify the PR did not turn explanation, advisory output, or runtime metadata into authorization.
## Shared Schemas And Enum Contracts

PLAN-2484 Schema contract: GovernanceDecisionV2.
PLAN-2485 Required fields: schemaVersion, decisionId, decision, severity, mutationAuthorized, authority, reasonCodes, allowedNextActions, evidenceRefs, llmMayExplain, llmMayRetryWithDraft.
PLAN-2486 GovernanceDecisionV2 rule: fields MUST be machine-readable and deterministic where they affect gates.
PLAN-2487 GovernanceDecisionV2 rule: free-text fields MAY explain but MUST NOT authorize protected mutation.
PLAN-2488 GovernanceDecisionV2 rule: enum values MUST be stable and tests MUST cover unknown or invalid values.
PLAN-2489 GovernanceDecisionV2 rule: schema validation errors MUST deny protected mutation when the schema is required for that mutation class.
PLAN-2490 GovernanceDecisionV2 rule: schema files MUST live under plugins/palantir-mini/schemas or plugins/palantir-mini/contracts as appropriate.
PLAN-2491 GovernanceDecisionV2 rule: schema ownership MUST NOT be copied into runtime cache or root marketplace semantic files.
PLAN-2492 Schema contract: PreMutationGovernanceInputV2.
PLAN-2493 Required fields: runtime, sessionId, promptId, promptHash, toolName, mutationClass, workflowFamily, changedFiles, SIC ref, DTC ref, WorkContract ref, semanticConsistency ref, runtimeProjection ref, dryRun ref, eval refs, hook refs, projectGatePolicy ref.
PLAN-2494 PreMutationGovernanceInputV2 rule: fields MUST be machine-readable and deterministic where they affect gates.
PLAN-2495 PreMutationGovernanceInputV2 rule: free-text fields MAY explain but MUST NOT authorize protected mutation.
PLAN-2496 PreMutationGovernanceInputV2 rule: enum values MUST be stable and tests MUST cover unknown or invalid values.
PLAN-2497 PreMutationGovernanceInputV2 rule: schema validation errors MUST deny protected mutation when the schema is required for that mutation class.
PLAN-2498 PreMutationGovernanceInputV2 rule: schema files MUST live under plugins/palantir-mini/schemas or plugins/palantir-mini/contracts as appropriate.
PLAN-2499 PreMutationGovernanceInputV2 rule: schema ownership MUST NOT be copied into runtime cache or root marketplace semantic files.
PLAN-2500 Schema contract: ProjectGatePolicyV1.
PLAN-2501 Required fields: minimumGateMode per mutation class, forbidEnvDowngrade, forbidMutationBypass, emergency bypass constraints.
PLAN-2502 ProjectGatePolicyV1 rule: fields MUST be machine-readable and deterministic where they affect gates.
PLAN-2503 ProjectGatePolicyV1 rule: free-text fields MAY explain but MUST NOT authorize protected mutation.
PLAN-2504 ProjectGatePolicyV1 rule: enum values MUST be stable and tests MUST cover unknown or invalid values.
PLAN-2505 ProjectGatePolicyV1 rule: schema validation errors MUST deny protected mutation when the schema is required for that mutation class.
PLAN-2506 ProjectGatePolicyV1 rule: schema files MUST live under plugins/palantir-mini/schemas or plugins/palantir-mini/contracts as appropriate.
PLAN-2507 ProjectGatePolicyV1 rule: schema ownership MUST NOT be copied into runtime cache or root marketplace semantic files.
PLAN-2508 Schema contract: LayerBoundaryV1.
PLAN-2509 Required fields: sourceAuthority, llmProvider layer, runtimeAdapter layer, pluginSource layer, projectState layer, runtimeCache layer, root marketplace role.
PLAN-2510 LayerBoundaryV1 rule: fields MUST be machine-readable and deterministic where they affect gates.
PLAN-2511 LayerBoundaryV1 rule: free-text fields MAY explain but MUST NOT authorize protected mutation.
PLAN-2512 LayerBoundaryV1 rule: enum values MUST be stable and tests MUST cover unknown or invalid values.
PLAN-2513 LayerBoundaryV1 rule: schema validation errors MUST deny protected mutation when the schema is required for that mutation class.
PLAN-2514 LayerBoundaryV1 rule: schema files MUST live under plugins/palantir-mini/schemas or plugins/palantir-mini/contracts as appropriate.
PLAN-2515 LayerBoundaryV1 rule: schema ownership MUST NOT be copied into runtime cache or root marketplace semantic files.
PLAN-2516 Schema contract: HookContractV1.
PLAN-2517 Required fields: hookId, event, phaseId, determinism, inputSchemaRef, outputSchemaRef, timeoutMs, onError, denyReasonCode, requiredForMutationClasses, sideEffects.
PLAN-2518 HookContractV1 rule: fields MUST be machine-readable and deterministic where they affect gates.
PLAN-2519 HookContractV1 rule: free-text fields MAY explain but MUST NOT authorize protected mutation.
PLAN-2520 HookContractV1 rule: enum values MUST be stable and tests MUST cover unknown or invalid values.
PLAN-2521 HookContractV1 rule: schema validation errors MUST deny protected mutation when the schema is required for that mutation class.
PLAN-2522 HookContractV1 rule: schema files MUST live under plugins/palantir-mini/schemas or plugins/palantir-mini/contracts as appropriate.
PLAN-2523 HookContractV1 rule: schema ownership MUST NOT be copied into runtime cache or root marketplace semantic files.
PLAN-2524 Schema contract: RuntimeEvidenceV1.
PLAN-2525 Required fields: runtime, supportKind, evidenceRefs, smokeCommandRefs, unsupportedReason, nativeGapNotes.
PLAN-2526 RuntimeEvidenceV1 rule: fields MUST be machine-readable and deterministic where they affect gates.
PLAN-2527 RuntimeEvidenceV1 rule: free-text fields MAY explain but MUST NOT authorize protected mutation.
PLAN-2528 RuntimeEvidenceV1 rule: enum values MUST be stable and tests MUST cover unknown or invalid values.
PLAN-2529 RuntimeEvidenceV1 rule: schema validation errors MUST deny protected mutation when the schema is required for that mutation class.
PLAN-2530 RuntimeEvidenceV1 rule: schema files MUST live under plugins/palantir-mini/schemas or plugins/palantir-mini/contracts as appropriate.
PLAN-2531 RuntimeEvidenceV1 rule: schema ownership MUST NOT be copied into runtime cache or root marketplace semantic files.
PLAN-2532 Schema contract: SemanticPromotionDecisionV1.
PLAN-2533 Required fields: resolverRunRef, deterministic, llmPromotionUsed, conflictRefs, promotionReady, denialReasonCodes, canonicalTermRefs.
PLAN-2534 SemanticPromotionDecisionV1 rule: fields MUST be machine-readable and deterministic where they affect gates.
PLAN-2535 SemanticPromotionDecisionV1 rule: free-text fields MAY explain but MUST NOT authorize protected mutation.
PLAN-2536 SemanticPromotionDecisionV1 rule: enum values MUST be stable and tests MUST cover unknown or invalid values.
PLAN-2537 SemanticPromotionDecisionV1 rule: schema validation errors MUST deny protected mutation when the schema is required for that mutation class.
PLAN-2538 SemanticPromotionDecisionV1 rule: schema files MUST live under plugins/palantir-mini/schemas or plugins/palantir-mini/contracts as appropriate.
PLAN-2539 SemanticPromotionDecisionV1 rule: schema ownership MUST NOT be copied into runtime cache or root marketplace semantic files.
PLAN-2540 Schema contract: SemanticConversationStateV1.
PLAN-2541 Required fields: userFacing, ontologyFacing, skillFacing, capabilityFacing, semanticConsistencyFacing, contractFacing, projectFacing, impactFacing, validationFacing, lifecycle.
PLAN-2542 SemanticConversationStateV1 rule: fields MUST be machine-readable and deterministic where they affect gates.
PLAN-2543 SemanticConversationStateV1 rule: free-text fields MAY explain but MUST NOT authorize protected mutation.
PLAN-2544 SemanticConversationStateV1 rule: enum values MUST be stable and tests MUST cover unknown or invalid values.
PLAN-2545 SemanticConversationStateV1 rule: schema validation errors MUST deny protected mutation when the schema is required for that mutation class.
PLAN-2546 SemanticConversationStateV1 rule: schema files MUST live under plugins/palantir-mini/schemas or plugins/palantir-mini/contracts as appropriate.
PLAN-2547 SemanticConversationStateV1 rule: schema ownership MUST NOT be copied into runtime cache or root marketplace semantic files.
PLAN-2548 Schema contract: ContextEngineeringReviewDomainsV1.
PLAN-2549 Required fields: DATA, LOGIC, ACTION, TECHNOLOGY, GOVERNANCE as review and evidence domains.
PLAN-2550 ContextEngineeringReviewDomainsV1 rule: fields MUST be machine-readable and deterministic where they affect gates.
PLAN-2551 ContextEngineeringReviewDomainsV1 rule: free-text fields MAY explain but MUST NOT authorize protected mutation.
PLAN-2552 ContextEngineeringReviewDomainsV1 rule: enum values MUST be stable and tests MUST cover unknown or invalid values.
PLAN-2553 ContextEngineeringReviewDomainsV1 rule: schema validation errors MUST deny protected mutation when the schema is required for that mutation class.
PLAN-2554 ContextEngineeringReviewDomainsV1 rule: schema files MUST live under plugins/palantir-mini/schemas or plugins/palantir-mini/contracts as appropriate.
PLAN-2555 ContextEngineeringReviewDomainsV1 rule: schema ownership MUST NOT be copied into runtime cache or root marketplace semantic files.
PLAN-2556 Schema contract: OntologyPrimitiveKindsV1.
PLAN-2557 Required fields: ObjectType, LinkType, ActionType, Function, Property, ApplicationState, RetrievalContext, Unknown as typed semantic primitives or projections.
PLAN-2558 OntologyPrimitiveKindsV1 rule: fields MUST be machine-readable and deterministic where they affect gates.
PLAN-2559 OntologyPrimitiveKindsV1 rule: free-text fields MAY explain but MUST NOT authorize protected mutation.
PLAN-2560 OntologyPrimitiveKindsV1 rule: enum values MUST be stable and tests MUST cover unknown or invalid values.
PLAN-2561 OntologyPrimitiveKindsV1 rule: schema validation errors MUST deny protected mutation when the schema is required for that mutation class.
PLAN-2562 OntologyPrimitiveKindsV1 rule: schema files MUST live under plugins/palantir-mini/schemas or plugins/palantir-mini/contracts as appropriate.
PLAN-2563 OntologyPrimitiveKindsV1 rule: schema ownership MUST NOT be copied into runtime cache or root marketplace semantic files.
## Mutation Class Policy Matrix

PLAN-2564 Mutation class: read-only.
PLAN-2565 read-only minimum gate mode: advisory minimum allowed.
PLAN-2566 read-only SIC rule: SIC optional.
PLAN-2567 read-only DTC rule: DTC optional.
PLAN-2568 read-only authorization rule: mutationAuthorized false.
PLAN-2569 read-only operational note: No commit or external command.
PLAN-2570 read-only env rule: environment variables MAY strengthen but MUST NOT weaken this minimum.
PLAN-2571 read-only bypass rule: bypass cannot create authorization unless project policy permits an evidence-backed emergency path.
PLAN-2572 read-only reason-code rule: denial MUST include at least one stable reason code when required evidence is missing.
PLAN-2573 read-only recovery rule: denial SHOULD include allowedNextActions that help the user complete missing evidence.
PLAN-2574 Mutation class: proposal-only.
PLAN-2575 proposal-only minimum gate mode: advisory minimum allowed.
PLAN-2576 proposal-only SIC rule: SIC optional or draft.
PLAN-2577 proposal-only DTC rule: DTC optional or draft.
PLAN-2578 proposal-only authorization rule: mutationAuthorized false.
PLAN-2579 proposal-only operational note: LLM may draft and explain only.
PLAN-2580 proposal-only env rule: environment variables MAY strengthen but MUST NOT weaken this minimum.
PLAN-2581 proposal-only bypass rule: bypass cannot create authorization unless project policy permits an evidence-backed emergency path.
PLAN-2582 proposal-only reason-code rule: denial MUST include at least one stable reason code when required evidence is missing.
PLAN-2583 proposal-only recovery rule: denial SHOULD include allowedNextActions that help the user complete missing evidence.
PLAN-2584 Mutation class: state-update.
PLAN-2585 state-update minimum gate mode: scoped-blocking minimum.
PLAN-2586 state-update SIC rule: SIC required when user meaning changes.
PLAN-2587 state-update DTC rule: DTC required when project state changes.
PLAN-2588 state-update authorization rule: mutationAuthorized depends on gate.
PLAN-2589 state-update operational note: Append-only state updates must be audited.
PLAN-2590 state-update env rule: environment variables MAY strengthen but MUST NOT weaken this minimum.
PLAN-2591 state-update bypass rule: bypass cannot create authorization unless project policy permits an evidence-backed emergency path.
PLAN-2592 state-update reason-code rule: denial MUST include at least one stable reason code when required evidence is missing.
PLAN-2593 state-update recovery rule: denial SHOULD include allowedNextActions that help the user complete missing evidence.
PLAN-2594 Mutation class: ontology-write.
PLAN-2595 ontology-write minimum gate mode: blocking minimum.
PLAN-2596 ontology-write SIC rule: SIC required.
PLAN-2597 ontology-write DTC rule: DTC required.
PLAN-2598 ontology-write authorization rule: mutationAuthorized true only after gate allow.
PLAN-2599 ontology-write operational note: Typed ontology refs and dry-run evidence required.
PLAN-2600 ontology-write env rule: environment variables MAY strengthen but MUST NOT weaken this minimum.
PLAN-2601 ontology-write bypass rule: bypass cannot create authorization unless project policy permits an evidence-backed emergency path.
PLAN-2602 ontology-write reason-code rule: denial MUST include at least one stable reason code when required evidence is missing.
PLAN-2603 ontology-write recovery rule: denial SHOULD include allowedNextActions that help the user complete missing evidence.
PLAN-2604 Mutation class: external-command.
PLAN-2605 external-command minimum gate mode: blocking minimum.
PLAN-2606 external-command SIC rule: SIC required when semantic.
PLAN-2607 external-command DTC rule: DTC required when mutating.
PLAN-2608 external-command authorization rule: mutationAuthorized true only after gate allow.
PLAN-2609 external-command operational note: Sandbox and command evidence required.
PLAN-2610 external-command env rule: environment variables MAY strengthen but MUST NOT weaken this minimum.
PLAN-2611 external-command bypass rule: bypass cannot create authorization unless project policy permits an evidence-backed emergency path.
PLAN-2612 external-command reason-code rule: denial MUST include at least one stable reason code when required evidence is missing.
PLAN-2613 external-command recovery rule: denial SHOULD include allowedNextActions that help the user complete missing evidence.
PLAN-2614 Mutation class: commit.
PLAN-2615 commit minimum gate mode: blocking minimum.
PLAN-2616 commit SIC rule: SIC required for semantic changes.
PLAN-2617 commit DTC rule: DTC required for protected changes.
PLAN-2618 commit authorization rule: mutationAuthorized true only after gate allow.
PLAN-2619 commit operational note: Dry-run and WorkContract required.
PLAN-2620 commit env rule: environment variables MAY strengthen but MUST NOT weaken this minimum.
PLAN-2621 commit bypass rule: bypass cannot create authorization unless project policy permits an evidence-backed emergency path.
PLAN-2622 commit reason-code rule: denial MUST include at least one stable reason code when required evidence is missing.
PLAN-2623 commit recovery rule: denial SHOULD include allowedNextActions that help the user complete missing evidence.
PLAN-2624 Mutation class: pr.
PLAN-2625 pr minimum gate mode: blocking minimum.
PLAN-2626 pr SIC rule: SIC required for semantic changes.
PLAN-2627 pr DTC rule: DTC required for protected changes.
PLAN-2628 pr authorization rule: mutationAuthorized true only after gate allow.
PLAN-2629 pr operational note: Review evidence required.
PLAN-2630 pr env rule: environment variables MAY strengthen but MUST NOT weaken this minimum.
PLAN-2631 pr bypass rule: bypass cannot create authorization unless project policy permits an evidence-backed emergency path.
PLAN-2632 pr reason-code rule: denial MUST include at least one stable reason code when required evidence is missing.
PLAN-2633 pr recovery rule: denial SHOULD include allowedNextActions that help the user complete missing evidence.
PLAN-2634 Mutation class: release.
PLAN-2635 release minimum gate mode: blocking minimum.
PLAN-2636 release SIC rule: SIC required for semantic changes.
PLAN-2637 release DTC rule: DTC required for protected changes.
PLAN-2638 release authorization rule: mutationAuthorized true only after gate allow.
PLAN-2639 release operational note: Eval, replay, self-check, and release gates required.
PLAN-2640 release env rule: environment variables MAY strengthen but MUST NOT weaken this minimum.
PLAN-2641 release bypass rule: bypass cannot create authorization unless project policy permits an evidence-backed emergency path.
PLAN-2642 release reason-code rule: denial MUST include at least one stable reason code when required evidence is missing.
PLAN-2643 release recovery rule: denial SHOULD include allowedNextActions that help the user complete missing evidence.
PLAN-2644 Mutation class: plugin-source-change.
PLAN-2645 plugin-source-change minimum gate mode: blocking minimum.
PLAN-2646 plugin-source-change SIC rule: SIC required.
PLAN-2647 plugin-source-change DTC rule: DTC required.
PLAN-2648 plugin-source-change authorization rule: mutationAuthorized true only after gate allow.
PLAN-2649 plugin-source-change operational note: Layer boundary and self-check required.
PLAN-2650 plugin-source-change env rule: environment variables MAY strengthen but MUST NOT weaken this minimum.
PLAN-2651 plugin-source-change bypass rule: bypass cannot create authorization unless project policy permits an evidence-backed emergency path.
PLAN-2652 plugin-source-change reason-code rule: denial MUST include at least one stable reason code when required evidence is missing.
PLAN-2653 plugin-source-change recovery rule: denial SHOULD include allowedNextActions that help the user complete missing evidence.
PLAN-2654 Mutation class: runtime-adapter-change.
PLAN-2655 runtime-adapter-change minimum gate mode: blocking minimum.
PLAN-2656 runtime-adapter-change SIC rule: SIC required.
PLAN-2657 runtime-adapter-change DTC rule: DTC required.
PLAN-2658 runtime-adapter-change authorization rule: mutationAuthorized true only after gate allow.
PLAN-2659 runtime-adapter-change operational note: Runtime evidence and parity linter required.
PLAN-2660 runtime-adapter-change env rule: environment variables MAY strengthen but MUST NOT weaken this minimum.
PLAN-2661 runtime-adapter-change bypass rule: bypass cannot create authorization unless project policy permits an evidence-backed emergency path.
PLAN-2662 runtime-adapter-change reason-code rule: denial MUST include at least one stable reason code when required evidence is missing.
PLAN-2663 runtime-adapter-change recovery rule: denial SHOULD include allowedNextActions that help the user complete missing evidence.
## ContextEngineering And Ontology Separation Workflow

PLAN-2664 Workflow stage: UserPromptSubmit capture.
PLAN-2665 UserPromptSubmit capture DATA handling: DATA is reviewed as a context and evidence domain, not as ObjectType authority.
PLAN-2666 UserPromptSubmit capture LOGIC handling: LOGIC is reviewed as rules, functions, algorithms, and reasoning evidence, not as Function authority by name alone.
PLAN-2667 UserPromptSubmit capture ACTION handling: ACTION is reviewed as operational behavior and write-path risk, not as ActionType authority by name alone.
PLAN-2668 UserPromptSubmit capture TECHNOLOGY handling: TECHNOLOGY is reviewed as runtime, adapter, package, hook, MCP, and deployment evidence, not as ontology primitive coverage.
PLAN-2669 UserPromptSubmit capture GOVERNANCE handling: GOVERNANCE is reviewed as approval, security, eval, audit, and release evidence, not as mutation permission by itself.
PLAN-2670 UserPromptSubmit capture ObjectType handling: ObjectType refs must be explicit typed ontology refs when objects or nouns are affected.
PLAN-2671 UserPromptSubmit capture LinkType handling: LinkType refs must be explicit typed ontology refs when relationships are affected.
PLAN-2672 UserPromptSubmit capture ActionType handling: ActionType refs must be explicit typed ontology refs when ontology verbs or write actions are affected.
PLAN-2673 UserPromptSubmit capture Function handling: Function refs must be explicit typed ontology or platform refs when logic surfaces are affected.
PLAN-2674 UserPromptSubmit capture LLM rule: LLM may summarize this stage but cannot promote readiness booleans for this stage.
PLAN-2675 UserPromptSubmit capture gate rule: plugin code must decide whether this stage is complete for protected mutation.
PLAN-2676 UserPromptSubmit capture evidence rule: completion must store structured refs, not only prose.
PLAN-2677 Workflow stage: Prompt envelope normalization.
PLAN-2678 Prompt envelope normalization DATA handling: DATA is reviewed as a context and evidence domain, not as ObjectType authority.
PLAN-2679 Prompt envelope normalization LOGIC handling: LOGIC is reviewed as rules, functions, algorithms, and reasoning evidence, not as Function authority by name alone.
PLAN-2680 Prompt envelope normalization ACTION handling: ACTION is reviewed as operational behavior and write-path risk, not as ActionType authority by name alone.
PLAN-2681 Prompt envelope normalization TECHNOLOGY handling: TECHNOLOGY is reviewed as runtime, adapter, package, hook, MCP, and deployment evidence, not as ontology primitive coverage.
PLAN-2682 Prompt envelope normalization GOVERNANCE handling: GOVERNANCE is reviewed as approval, security, eval, audit, and release evidence, not as mutation permission by itself.
PLAN-2683 Prompt envelope normalization ObjectType handling: ObjectType refs must be explicit typed ontology refs when objects or nouns are affected.
PLAN-2684 Prompt envelope normalization LinkType handling: LinkType refs must be explicit typed ontology refs when relationships are affected.
PLAN-2685 Prompt envelope normalization ActionType handling: ActionType refs must be explicit typed ontology refs when ontology verbs or write actions are affected.
PLAN-2686 Prompt envelope normalization Function handling: Function refs must be explicit typed ontology or platform refs when logic surfaces are affected.
PLAN-2687 Prompt envelope normalization LLM rule: LLM may summarize this stage but cannot promote readiness booleans for this stage.
PLAN-2688 Prompt envelope normalization gate rule: plugin code must decide whether this stage is complete for protected mutation.
PLAN-2689 Prompt envelope normalization evidence rule: completion must store structured refs, not only prose.
PLAN-2690 Workflow stage: SemanticConversationState initialization.
PLAN-2691 SemanticConversationState initialization DATA handling: DATA is reviewed as a context and evidence domain, not as ObjectType authority.
PLAN-2692 SemanticConversationState initialization LOGIC handling: LOGIC is reviewed as rules, functions, algorithms, and reasoning evidence, not as Function authority by name alone.
PLAN-2693 SemanticConversationState initialization ACTION handling: ACTION is reviewed as operational behavior and write-path risk, not as ActionType authority by name alone.
PLAN-2694 SemanticConversationState initialization TECHNOLOGY handling: TECHNOLOGY is reviewed as runtime, adapter, package, hook, MCP, and deployment evidence, not as ontology primitive coverage.
PLAN-2695 SemanticConversationState initialization GOVERNANCE handling: GOVERNANCE is reviewed as approval, security, eval, audit, and release evidence, not as mutation permission by itself.
PLAN-2696 SemanticConversationState initialization ObjectType handling: ObjectType refs must be explicit typed ontology refs when objects or nouns are affected.
PLAN-2697 SemanticConversationState initialization LinkType handling: LinkType refs must be explicit typed ontology refs when relationships are affected.
PLAN-2698 SemanticConversationState initialization ActionType handling: ActionType refs must be explicit typed ontology refs when ontology verbs or write actions are affected.
PLAN-2699 SemanticConversationState initialization Function handling: Function refs must be explicit typed ontology or platform refs when logic surfaces are affected.
PLAN-2700 SemanticConversationState initialization LLM rule: LLM may summarize this stage but cannot promote readiness booleans for this stage.
PLAN-2701 SemanticConversationState initialization gate rule: plugin code must decide whether this stage is complete for protected mutation.
PLAN-2702 SemanticConversationState initialization evidence rule: completion must store structured refs, not only prose.
PLAN-2703 Workflow stage: FDE meaning discovery.
PLAN-2704 FDE meaning discovery DATA handling: DATA is reviewed as a context and evidence domain, not as ObjectType authority.
PLAN-2705 FDE meaning discovery LOGIC handling: LOGIC is reviewed as rules, functions, algorithms, and reasoning evidence, not as Function authority by name alone.
PLAN-2706 FDE meaning discovery ACTION handling: ACTION is reviewed as operational behavior and write-path risk, not as ActionType authority by name alone.
PLAN-2707 FDE meaning discovery TECHNOLOGY handling: TECHNOLOGY is reviewed as runtime, adapter, package, hook, MCP, and deployment evidence, not as ontology primitive coverage.
PLAN-2708 FDE meaning discovery GOVERNANCE handling: GOVERNANCE is reviewed as approval, security, eval, audit, and release evidence, not as mutation permission by itself.
PLAN-2709 FDE meaning discovery ObjectType handling: ObjectType refs must be explicit typed ontology refs when objects or nouns are affected.
PLAN-2710 FDE meaning discovery LinkType handling: LinkType refs must be explicit typed ontology refs when relationships are affected.
PLAN-2711 FDE meaning discovery ActionType handling: ActionType refs must be explicit typed ontology refs when ontology verbs or write actions are affected.
PLAN-2712 FDE meaning discovery Function handling: Function refs must be explicit typed ontology or platform refs when logic surfaces are affected.
PLAN-2713 FDE meaning discovery LLM rule: LLM may summarize this stage but cannot promote readiness booleans for this stage.
PLAN-2714 FDE meaning discovery gate rule: plugin code must decide whether this stage is complete for protected mutation.
PLAN-2715 FDE meaning discovery evidence rule: completion must store structured refs, not only prose.
PLAN-2716 Workflow stage: Semantic consistency resolver.
PLAN-2717 Semantic consistency resolver DATA handling: DATA is reviewed as a context and evidence domain, not as ObjectType authority.
PLAN-2718 Semantic consistency resolver LOGIC handling: LOGIC is reviewed as rules, functions, algorithms, and reasoning evidence, not as Function authority by name alone.
PLAN-2719 Semantic consistency resolver ACTION handling: ACTION is reviewed as operational behavior and write-path risk, not as ActionType authority by name alone.
PLAN-2720 Semantic consistency resolver TECHNOLOGY handling: TECHNOLOGY is reviewed as runtime, adapter, package, hook, MCP, and deployment evidence, not as ontology primitive coverage.
PLAN-2721 Semantic consistency resolver GOVERNANCE handling: GOVERNANCE is reviewed as approval, security, eval, audit, and release evidence, not as mutation permission by itself.
PLAN-2722 Semantic consistency resolver ObjectType handling: ObjectType refs must be explicit typed ontology refs when objects or nouns are affected.
PLAN-2723 Semantic consistency resolver LinkType handling: LinkType refs must be explicit typed ontology refs when relationships are affected.
PLAN-2724 Semantic consistency resolver ActionType handling: ActionType refs must be explicit typed ontology refs when ontology verbs or write actions are affected.
PLAN-2725 Semantic consistency resolver Function handling: Function refs must be explicit typed ontology or platform refs when logic surfaces are affected.
PLAN-2726 Semantic consistency resolver LLM rule: LLM may summarize this stage but cannot promote readiness booleans for this stage.
PLAN-2727 Semantic consistency resolver gate rule: plugin code must decide whether this stage is complete for protected mutation.
PLAN-2728 Semantic consistency resolver evidence rule: completion must store structured refs, not only prose.
PLAN-2729 Workflow stage: SIC draft.
PLAN-2730 SIC draft DATA handling: DATA is reviewed as a context and evidence domain, not as ObjectType authority.
PLAN-2731 SIC draft LOGIC handling: LOGIC is reviewed as rules, functions, algorithms, and reasoning evidence, not as Function authority by name alone.
PLAN-2732 SIC draft ACTION handling: ACTION is reviewed as operational behavior and write-path risk, not as ActionType authority by name alone.
PLAN-2733 SIC draft TECHNOLOGY handling: TECHNOLOGY is reviewed as runtime, adapter, package, hook, MCP, and deployment evidence, not as ontology primitive coverage.
PLAN-2734 SIC draft GOVERNANCE handling: GOVERNANCE is reviewed as approval, security, eval, audit, and release evidence, not as mutation permission by itself.
PLAN-2735 SIC draft ObjectType handling: ObjectType refs must be explicit typed ontology refs when objects or nouns are affected.
PLAN-2736 SIC draft LinkType handling: LinkType refs must be explicit typed ontology refs when relationships are affected.
PLAN-2737 SIC draft ActionType handling: ActionType refs must be explicit typed ontology refs when ontology verbs or write actions are affected.
PLAN-2738 SIC draft Function handling: Function refs must be explicit typed ontology or platform refs when logic surfaces are affected.
PLAN-2739 SIC draft LLM rule: LLM may summarize this stage but cannot promote readiness booleans for this stage.
PLAN-2740 SIC draft gate rule: plugin code must decide whether this stage is complete for protected mutation.
PLAN-2741 SIC draft evidence rule: completion must store structured refs, not only prose.
PLAN-2742 Workflow stage: SIC approval.
PLAN-2743 SIC approval DATA handling: DATA is reviewed as a context and evidence domain, not as ObjectType authority.
PLAN-2744 SIC approval LOGIC handling: LOGIC is reviewed as rules, functions, algorithms, and reasoning evidence, not as Function authority by name alone.
PLAN-2745 SIC approval ACTION handling: ACTION is reviewed as operational behavior and write-path risk, not as ActionType authority by name alone.
PLAN-2746 SIC approval TECHNOLOGY handling: TECHNOLOGY is reviewed as runtime, adapter, package, hook, MCP, and deployment evidence, not as ontology primitive coverage.
PLAN-2747 SIC approval GOVERNANCE handling: GOVERNANCE is reviewed as approval, security, eval, audit, and release evidence, not as mutation permission by itself.
PLAN-2748 SIC approval ObjectType handling: ObjectType refs must be explicit typed ontology refs when objects or nouns are affected.
PLAN-2749 SIC approval LinkType handling: LinkType refs must be explicit typed ontology refs when relationships are affected.
PLAN-2750 SIC approval ActionType handling: ActionType refs must be explicit typed ontology refs when ontology verbs or write actions are affected.
PLAN-2751 SIC approval Function handling: Function refs must be explicit typed ontology or platform refs when logic surfaces are affected.
PLAN-2752 SIC approval LLM rule: LLM may summarize this stage but cannot promote readiness booleans for this stage.
PLAN-2753 SIC approval gate rule: plugin code must decide whether this stage is complete for protected mutation.
PLAN-2754 SIC approval evidence rule: completion must store structured refs, not only prose.
PLAN-2755 Workflow stage: DTC draft.
PLAN-2756 DTC draft DATA handling: DATA is reviewed as a context and evidence domain, not as ObjectType authority.
PLAN-2757 DTC draft LOGIC handling: LOGIC is reviewed as rules, functions, algorithms, and reasoning evidence, not as Function authority by name alone.
PLAN-2758 DTC draft ACTION handling: ACTION is reviewed as operational behavior and write-path risk, not as ActionType authority by name alone.
PLAN-2759 DTC draft TECHNOLOGY handling: TECHNOLOGY is reviewed as runtime, adapter, package, hook, MCP, and deployment evidence, not as ontology primitive coverage.
PLAN-2760 DTC draft GOVERNANCE handling: GOVERNANCE is reviewed as approval, security, eval, audit, and release evidence, not as mutation permission by itself.
PLAN-2761 DTC draft ObjectType handling: ObjectType refs must be explicit typed ontology refs when objects or nouns are affected.
PLAN-2762 DTC draft LinkType handling: LinkType refs must be explicit typed ontology refs when relationships are affected.
PLAN-2763 DTC draft ActionType handling: ActionType refs must be explicit typed ontology refs when ontology verbs or write actions are affected.
PLAN-2764 DTC draft Function handling: Function refs must be explicit typed ontology or platform refs when logic surfaces are affected.
PLAN-2765 DTC draft LLM rule: LLM may summarize this stage but cannot promote readiness booleans for this stage.
PLAN-2766 DTC draft gate rule: plugin code must decide whether this stage is complete for protected mutation.
PLAN-2767 DTC draft evidence rule: completion must store structured refs, not only prose.
PLAN-2768 Workflow stage: ContextEngineering review-domain closure.
PLAN-2769 ContextEngineering review-domain closure DATA handling: DATA is reviewed as a context and evidence domain, not as ObjectType authority.
PLAN-2770 ContextEngineering review-domain closure LOGIC handling: LOGIC is reviewed as rules, functions, algorithms, and reasoning evidence, not as Function authority by name alone.
PLAN-2771 ContextEngineering review-domain closure ACTION handling: ACTION is reviewed as operational behavior and write-path risk, not as ActionType authority by name alone.
PLAN-2772 ContextEngineering review-domain closure TECHNOLOGY handling: TECHNOLOGY is reviewed as runtime, adapter, package, hook, MCP, and deployment evidence, not as ontology primitive coverage.
PLAN-2773 ContextEngineering review-domain closure GOVERNANCE handling: GOVERNANCE is reviewed as approval, security, eval, audit, and release evidence, not as mutation permission by itself.
PLAN-2774 ContextEngineering review-domain closure ObjectType handling: ObjectType refs must be explicit typed ontology refs when objects or nouns are affected.
PLAN-2775 ContextEngineering review-domain closure LinkType handling: LinkType refs must be explicit typed ontology refs when relationships are affected.
PLAN-2776 ContextEngineering review-domain closure ActionType handling: ActionType refs must be explicit typed ontology refs when ontology verbs or write actions are affected.
PLAN-2777 ContextEngineering review-domain closure Function handling: Function refs must be explicit typed ontology or platform refs when logic surfaces are affected.
PLAN-2778 ContextEngineering review-domain closure LLM rule: LLM may summarize this stage but cannot promote readiness booleans for this stage.
PLAN-2779 ContextEngineering review-domain closure gate rule: plugin code must decide whether this stage is complete for protected mutation.
PLAN-2780 ContextEngineering review-domain closure evidence rule: completion must store structured refs, not only prose.
PLAN-2781 Workflow stage: Ontology primitive typed-ref validation.
PLAN-2782 Ontology primitive typed-ref validation DATA handling: DATA is reviewed as a context and evidence domain, not as ObjectType authority.
PLAN-2783 Ontology primitive typed-ref validation LOGIC handling: LOGIC is reviewed as rules, functions, algorithms, and reasoning evidence, not as Function authority by name alone.
PLAN-2784 Ontology primitive typed-ref validation ACTION handling: ACTION is reviewed as operational behavior and write-path risk, not as ActionType authority by name alone.
PLAN-2785 Ontology primitive typed-ref validation TECHNOLOGY handling: TECHNOLOGY is reviewed as runtime, adapter, package, hook, MCP, and deployment evidence, not as ontology primitive coverage.
PLAN-2786 Ontology primitive typed-ref validation GOVERNANCE handling: GOVERNANCE is reviewed as approval, security, eval, audit, and release evidence, not as mutation permission by itself.
PLAN-2787 Ontology primitive typed-ref validation ObjectType handling: ObjectType refs must be explicit typed ontology refs when objects or nouns are affected.
PLAN-2788 Ontology primitive typed-ref validation LinkType handling: LinkType refs must be explicit typed ontology refs when relationships are affected.
PLAN-2789 Ontology primitive typed-ref validation ActionType handling: ActionType refs must be explicit typed ontology refs when ontology verbs or write actions are affected.
PLAN-2790 Ontology primitive typed-ref validation Function handling: Function refs must be explicit typed ontology or platform refs when logic surfaces are affected.
PLAN-2791 Ontology primitive typed-ref validation LLM rule: LLM may summarize this stage but cannot promote readiness booleans for this stage.
PLAN-2792 Ontology primitive typed-ref validation gate rule: plugin code must decide whether this stage is complete for protected mutation.
PLAN-2793 Ontology primitive typed-ref validation evidence rule: completion must store structured refs, not only prose.
PLAN-2794 Workflow stage: DTC approval.
PLAN-2795 DTC approval DATA handling: DATA is reviewed as a context and evidence domain, not as ObjectType authority.
PLAN-2796 DTC approval LOGIC handling: LOGIC is reviewed as rules, functions, algorithms, and reasoning evidence, not as Function authority by name alone.
PLAN-2797 DTC approval ACTION handling: ACTION is reviewed as operational behavior and write-path risk, not as ActionType authority by name alone.
PLAN-2798 DTC approval TECHNOLOGY handling: TECHNOLOGY is reviewed as runtime, adapter, package, hook, MCP, and deployment evidence, not as ontology primitive coverage.
PLAN-2799 DTC approval GOVERNANCE handling: GOVERNANCE is reviewed as approval, security, eval, audit, and release evidence, not as mutation permission by itself.
PLAN-2800 DTC approval ObjectType handling: ObjectType refs must be explicit typed ontology refs when objects or nouns are affected.
PLAN-2801 DTC approval LinkType handling: LinkType refs must be explicit typed ontology refs when relationships are affected.
PLAN-2802 DTC approval ActionType handling: ActionType refs must be explicit typed ontology refs when ontology verbs or write actions are affected.
PLAN-2803 DTC approval Function handling: Function refs must be explicit typed ontology or platform refs when logic surfaces are affected.
PLAN-2804 DTC approval LLM rule: LLM may summarize this stage but cannot promote readiness booleans for this stage.
PLAN-2805 DTC approval gate rule: plugin code must decide whether this stage is complete for protected mutation.
PLAN-2806 DTC approval evidence rule: completion must store structured refs, not only prose.
PLAN-2807 Workflow stage: WorkContract binding.
PLAN-2808 WorkContract binding DATA handling: DATA is reviewed as a context and evidence domain, not as ObjectType authority.
PLAN-2809 WorkContract binding LOGIC handling: LOGIC is reviewed as rules, functions, algorithms, and reasoning evidence, not as Function authority by name alone.
PLAN-2810 WorkContract binding ACTION handling: ACTION is reviewed as operational behavior and write-path risk, not as ActionType authority by name alone.
PLAN-2811 WorkContract binding TECHNOLOGY handling: TECHNOLOGY is reviewed as runtime, adapter, package, hook, MCP, and deployment evidence, not as ontology primitive coverage.
PLAN-2812 WorkContract binding GOVERNANCE handling: GOVERNANCE is reviewed as approval, security, eval, audit, and release evidence, not as mutation permission by itself.
PLAN-2813 WorkContract binding ObjectType handling: ObjectType refs must be explicit typed ontology refs when objects or nouns are affected.
PLAN-2814 WorkContract binding LinkType handling: LinkType refs must be explicit typed ontology refs when relationships are affected.
PLAN-2815 WorkContract binding ActionType handling: ActionType refs must be explicit typed ontology refs when ontology verbs or write actions are affected.
PLAN-2816 WorkContract binding Function handling: Function refs must be explicit typed ontology or platform refs when logic surfaces are affected.
PLAN-2817 WorkContract binding LLM rule: LLM may summarize this stage but cannot promote readiness booleans for this stage.
PLAN-2818 WorkContract binding gate rule: plugin code must decide whether this stage is complete for protected mutation.
PLAN-2819 WorkContract binding evidence rule: completion must store structured refs, not only prose.
PLAN-2820 Workflow stage: Router binding.
PLAN-2821 Router binding DATA handling: DATA is reviewed as a context and evidence domain, not as ObjectType authority.
PLAN-2822 Router binding LOGIC handling: LOGIC is reviewed as rules, functions, algorithms, and reasoning evidence, not as Function authority by name alone.
PLAN-2823 Router binding ACTION handling: ACTION is reviewed as operational behavior and write-path risk, not as ActionType authority by name alone.
PLAN-2824 Router binding TECHNOLOGY handling: TECHNOLOGY is reviewed as runtime, adapter, package, hook, MCP, and deployment evidence, not as ontology primitive coverage.
PLAN-2825 Router binding GOVERNANCE handling: GOVERNANCE is reviewed as approval, security, eval, audit, and release evidence, not as mutation permission by itself.
PLAN-2826 Router binding ObjectType handling: ObjectType refs must be explicit typed ontology refs when objects or nouns are affected.
PLAN-2827 Router binding LinkType handling: LinkType refs must be explicit typed ontology refs when relationships are affected.
PLAN-2828 Router binding ActionType handling: ActionType refs must be explicit typed ontology refs when ontology verbs or write actions are affected.
PLAN-2829 Router binding Function handling: Function refs must be explicit typed ontology or platform refs when logic surfaces are affected.
PLAN-2830 Router binding LLM rule: LLM may summarize this stage but cannot promote readiness booleans for this stage.
PLAN-2831 Router binding gate rule: plugin code must decide whether this stage is complete for protected mutation.
PLAN-2832 Router binding evidence rule: completion must store structured refs, not only prose.
PLAN-2833 Workflow stage: Pre-mutation governance.
PLAN-2834 Pre-mutation governance DATA handling: DATA is reviewed as a context and evidence domain, not as ObjectType authority.
PLAN-2835 Pre-mutation governance LOGIC handling: LOGIC is reviewed as rules, functions, algorithms, and reasoning evidence, not as Function authority by name alone.
PLAN-2836 Pre-mutation governance ACTION handling: ACTION is reviewed as operational behavior and write-path risk, not as ActionType authority by name alone.
PLAN-2837 Pre-mutation governance TECHNOLOGY handling: TECHNOLOGY is reviewed as runtime, adapter, package, hook, MCP, and deployment evidence, not as ontology primitive coverage.
PLAN-2838 Pre-mutation governance GOVERNANCE handling: GOVERNANCE is reviewed as approval, security, eval, audit, and release evidence, not as mutation permission by itself.
PLAN-2839 Pre-mutation governance ObjectType handling: ObjectType refs must be explicit typed ontology refs when objects or nouns are affected.
PLAN-2840 Pre-mutation governance LinkType handling: LinkType refs must be explicit typed ontology refs when relationships are affected.
PLAN-2841 Pre-mutation governance ActionType handling: ActionType refs must be explicit typed ontology refs when ontology verbs or write actions are affected.
PLAN-2842 Pre-mutation governance Function handling: Function refs must be explicit typed ontology or platform refs when logic surfaces are affected.
PLAN-2843 Pre-mutation governance LLM rule: LLM may summarize this stage but cannot promote readiness booleans for this stage.
PLAN-2844 Pre-mutation governance gate rule: plugin code must decide whether this stage is complete for protected mutation.
PLAN-2845 Pre-mutation governance evidence rule: completion must store structured refs, not only prose.
PLAN-2846 Workflow stage: compute_edits_dry_run.
PLAN-2847 compute_edits_dry_run DATA handling: DATA is reviewed as a context and evidence domain, not as ObjectType authority.
PLAN-2848 compute_edits_dry_run LOGIC handling: LOGIC is reviewed as rules, functions, algorithms, and reasoning evidence, not as Function authority by name alone.
PLAN-2849 compute_edits_dry_run ACTION handling: ACTION is reviewed as operational behavior and write-path risk, not as ActionType authority by name alone.
PLAN-2850 compute_edits_dry_run TECHNOLOGY handling: TECHNOLOGY is reviewed as runtime, adapter, package, hook, MCP, and deployment evidence, not as ontology primitive coverage.
PLAN-2851 compute_edits_dry_run GOVERNANCE handling: GOVERNANCE is reviewed as approval, security, eval, audit, and release evidence, not as mutation permission by itself.
PLAN-2852 compute_edits_dry_run ObjectType handling: ObjectType refs must be explicit typed ontology refs when objects or nouns are affected.
PLAN-2853 compute_edits_dry_run LinkType handling: LinkType refs must be explicit typed ontology refs when relationships are affected.
PLAN-2854 compute_edits_dry_run ActionType handling: ActionType refs must be explicit typed ontology refs when ontology verbs or write actions are affected.
PLAN-2855 compute_edits_dry_run Function handling: Function refs must be explicit typed ontology or platform refs when logic surfaces are affected.
PLAN-2856 compute_edits_dry_run LLM rule: LLM may summarize this stage but cannot promote readiness booleans for this stage.
PLAN-2857 compute_edits_dry_run gate rule: plugin code must decide whether this stage is complete for protected mutation.
PLAN-2858 compute_edits_dry_run evidence rule: completion must store structured refs, not only prose.
PLAN-2859 Workflow stage: Eval and replay.
PLAN-2860 Eval and replay DATA handling: DATA is reviewed as a context and evidence domain, not as ObjectType authority.
PLAN-2861 Eval and replay LOGIC handling: LOGIC is reviewed as rules, functions, algorithms, and reasoning evidence, not as Function authority by name alone.
PLAN-2862 Eval and replay ACTION handling: ACTION is reviewed as operational behavior and write-path risk, not as ActionType authority by name alone.
PLAN-2863 Eval and replay TECHNOLOGY handling: TECHNOLOGY is reviewed as runtime, adapter, package, hook, MCP, and deployment evidence, not as ontology primitive coverage.
PLAN-2864 Eval and replay GOVERNANCE handling: GOVERNANCE is reviewed as approval, security, eval, audit, and release evidence, not as mutation permission by itself.
PLAN-2865 Eval and replay ObjectType handling: ObjectType refs must be explicit typed ontology refs when objects or nouns are affected.
PLAN-2866 Eval and replay LinkType handling: LinkType refs must be explicit typed ontology refs when relationships are affected.
PLAN-2867 Eval and replay ActionType handling: ActionType refs must be explicit typed ontology refs when ontology verbs or write actions are affected.
PLAN-2868 Eval and replay Function handling: Function refs must be explicit typed ontology or platform refs when logic surfaces are affected.
PLAN-2869 Eval and replay LLM rule: LLM may summarize this stage but cannot promote readiness booleans for this stage.
PLAN-2870 Eval and replay gate rule: plugin code must decide whether this stage is complete for protected mutation.
PLAN-2871 Eval and replay evidence rule: completion must store structured refs, not only prose.
PLAN-2872 Workflow stage: commit_edits or release.
PLAN-2873 commit_edits or release DATA handling: DATA is reviewed as a context and evidence domain, not as ObjectType authority.
PLAN-2874 commit_edits or release LOGIC handling: LOGIC is reviewed as rules, functions, algorithms, and reasoning evidence, not as Function authority by name alone.
PLAN-2875 commit_edits or release ACTION handling: ACTION is reviewed as operational behavior and write-path risk, not as ActionType authority by name alone.
PLAN-2876 commit_edits or release TECHNOLOGY handling: TECHNOLOGY is reviewed as runtime, adapter, package, hook, MCP, and deployment evidence, not as ontology primitive coverage.
PLAN-2877 commit_edits or release GOVERNANCE handling: GOVERNANCE is reviewed as approval, security, eval, audit, and release evidence, not as mutation permission by itself.
PLAN-2878 commit_edits or release ObjectType handling: ObjectType refs must be explicit typed ontology refs when objects or nouns are affected.
PLAN-2879 commit_edits or release LinkType handling: LinkType refs must be explicit typed ontology refs when relationships are affected.
PLAN-2880 commit_edits or release ActionType handling: ActionType refs must be explicit typed ontology refs when ontology verbs or write actions are affected.
PLAN-2881 commit_edits or release Function handling: Function refs must be explicit typed ontology or platform refs when logic surfaces are affected.
PLAN-2882 commit_edits or release LLM rule: LLM may summarize this stage but cannot promote readiness booleans for this stage.
PLAN-2883 commit_edits or release gate rule: plugin code must decide whether this stage is complete for protected mutation.
PLAN-2884 commit_edits or release evidence rule: completion must store structured refs, not only prose.
PLAN-2885 Workflow stage: Append-only lineage.
PLAN-2886 Append-only lineage DATA handling: DATA is reviewed as a context and evidence domain, not as ObjectType authority.
PLAN-2887 Append-only lineage LOGIC handling: LOGIC is reviewed as rules, functions, algorithms, and reasoning evidence, not as Function authority by name alone.
PLAN-2888 Append-only lineage ACTION handling: ACTION is reviewed as operational behavior and write-path risk, not as ActionType authority by name alone.
PLAN-2889 Append-only lineage TECHNOLOGY handling: TECHNOLOGY is reviewed as runtime, adapter, package, hook, MCP, and deployment evidence, not as ontology primitive coverage.
PLAN-2890 Append-only lineage GOVERNANCE handling: GOVERNANCE is reviewed as approval, security, eval, audit, and release evidence, not as mutation permission by itself.
PLAN-2891 Append-only lineage ObjectType handling: ObjectType refs must be explicit typed ontology refs when objects or nouns are affected.
PLAN-2892 Append-only lineage LinkType handling: LinkType refs must be explicit typed ontology refs when relationships are affected.
PLAN-2893 Append-only lineage ActionType handling: ActionType refs must be explicit typed ontology refs when ontology verbs or write actions are affected.
PLAN-2894 Append-only lineage Function handling: Function refs must be explicit typed ontology or platform refs when logic surfaces are affected.
PLAN-2895 Append-only lineage LLM rule: LLM may summarize this stage but cannot promote readiness booleans for this stage.
PLAN-2896 Append-only lineage gate rule: plugin code must decide whether this stage is complete for protected mutation.
PLAN-2897 Append-only lineage evidence rule: completion must store structured refs, not only prose.
## Test And Verification Matrix

PLAN-2898 Test area: invalid stdin denial.
PLAN-2899 invalid stdin denial negative fixture: include the smallest fixture that reproduces the unsafe or invalid state.
PLAN-2900 invalid stdin denial positive fixture: include a complete evidence fixture when the flow should pass.
PLAN-2901 invalid stdin denial expected output: stable enum reason codes and deterministic ordering.
PLAN-2902 invalid stdin denial command target: use the narrowest Bun test file that covers the changed code.
PLAN-2903 invalid stdin denial release impact: include in self-check if future drift can silently reintroduce the defect.
PLAN-2904 Test area: unhandled exception denial.
PLAN-2905 unhandled exception denial negative fixture: include the smallest fixture that reproduces the unsafe or invalid state.
PLAN-2906 unhandled exception denial positive fixture: include a complete evidence fixture when the flow should pass.
PLAN-2907 unhandled exception denial expected output: stable enum reason codes and deterministic ordering.
PLAN-2908 unhandled exception denial command target: use the narrowest Bun test file that covers the changed code.
PLAN-2909 unhandled exception denial release impact: include in self-check if future drift can silently reintroduce the defect.
PLAN-2910 Test area: timeout denial.
PLAN-2911 timeout denial negative fixture: include the smallest fixture that reproduces the unsafe or invalid state.
PLAN-2912 timeout denial positive fixture: include a complete evidence fixture when the flow should pass.
PLAN-2913 timeout denial expected output: stable enum reason codes and deterministic ordering.
PLAN-2914 timeout denial command target: use the narrowest Bun test file that covers the changed code.
PLAN-2915 timeout denial release impact: include in self-check if future drift can silently reintroduce the defect.
PLAN-2916 Test area: bypass denial.
PLAN-2917 bypass denial negative fixture: include the smallest fixture that reproduces the unsafe or invalid state.
PLAN-2918 bypass denial positive fixture: include a complete evidence fixture when the flow should pass.
PLAN-2919 bypass denial expected output: stable enum reason codes and deterministic ordering.
PLAN-2920 bypass denial command target: use the narrowest Bun test file that covers the changed code.
PLAN-2921 bypass denial release impact: include in self-check if future drift can silently reintroduce the defect.
PLAN-2922 Test area: env strengthening only.
PLAN-2923 env strengthening only negative fixture: include the smallest fixture that reproduces the unsafe or invalid state.
PLAN-2924 env strengthening only positive fixture: include a complete evidence fixture when the flow should pass.
PLAN-2925 env strengthening only expected output: stable enum reason codes and deterministic ordering.
PLAN-2926 env strengthening only command target: use the narrowest Bun test file that covers the changed code.
PLAN-2927 env strengthening only release impact: include in self-check if future drift can silently reintroduce the defect.
PLAN-2928 Test area: project policy minimum.
PLAN-2929 project policy minimum negative fixture: include the smallest fixture that reproduces the unsafe or invalid state.
PLAN-2930 project policy minimum positive fixture: include a complete evidence fixture when the flow should pass.
PLAN-2931 project policy minimum expected output: stable enum reason codes and deterministic ordering.
PLAN-2932 project policy minimum command target: use the narrowest Bun test file that covers the changed code.
PLAN-2933 project policy minimum release impact: include in self-check if future drift can silently reintroduce the defect.
PLAN-2934 Test area: governance input schema.
PLAN-2935 governance input schema negative fixture: include the smallest fixture that reproduces the unsafe or invalid state.
PLAN-2936 governance input schema positive fixture: include a complete evidence fixture when the flow should pass.
PLAN-2937 governance input schema expected output: stable enum reason codes and deterministic ordering.
PLAN-2938 governance input schema command target: use the narrowest Bun test file that covers the changed code.
PLAN-2939 governance input schema release impact: include in self-check if future drift can silently reintroduce the defect.
PLAN-2940 Test area: governance output schema.
PLAN-2941 governance output schema negative fixture: include the smallest fixture that reproduces the unsafe or invalid state.
PLAN-2942 governance output schema positive fixture: include a complete evidence fixture when the flow should pass.
PLAN-2943 governance output schema expected output: stable enum reason codes and deterministic ordering.
PLAN-2944 governance output schema command target: use the narrowest Bun test file that covers the changed code.
PLAN-2945 governance output schema release impact: include in self-check if future drift can silently reintroduce the defect.
PLAN-2946 Test area: missing SIC denial.
PLAN-2947 missing SIC denial negative fixture: include the smallest fixture that reproduces the unsafe or invalid state.
PLAN-2948 missing SIC denial positive fixture: include a complete evidence fixture when the flow should pass.
PLAN-2949 missing SIC denial expected output: stable enum reason codes and deterministic ordering.
PLAN-2950 missing SIC denial command target: use the narrowest Bun test file that covers the changed code.
PLAN-2951 missing SIC denial release impact: include in self-check if future drift can silently reintroduce the defect.
PLAN-2952 Test area: missing DTC denial.
PLAN-2953 missing DTC denial negative fixture: include the smallest fixture that reproduces the unsafe or invalid state.
PLAN-2954 missing DTC denial positive fixture: include a complete evidence fixture when the flow should pass.
PLAN-2955 missing DTC denial expected output: stable enum reason codes and deterministic ordering.
PLAN-2956 missing DTC denial command target: use the narrowest Bun test file that covers the changed code.
PLAN-2957 missing DTC denial release impact: include in self-check if future drift can silently reintroduce the defect.
PLAN-2958 Test area: prompt hash mismatch denial.
PLAN-2959 prompt hash mismatch denial negative fixture: include the smallest fixture that reproduces the unsafe or invalid state.
PLAN-2960 prompt hash mismatch denial positive fixture: include a complete evidence fixture when the flow should pass.
PLAN-2961 prompt hash mismatch denial expected output: stable enum reason codes and deterministic ordering.
PLAN-2962 prompt hash mismatch denial command target: use the narrowest Bun test file that covers the changed code.
PLAN-2963 prompt hash mismatch denial release impact: include in self-check if future drift can silently reintroduce the defect.
PLAN-2964 Test area: missing WorkContract denial.
PLAN-2965 missing WorkContract denial negative fixture: include the smallest fixture that reproduces the unsafe or invalid state.
PLAN-2966 missing WorkContract denial positive fixture: include a complete evidence fixture when the flow should pass.
PLAN-2967 missing WorkContract denial expected output: stable enum reason codes and deterministic ordering.
PLAN-2968 missing WorkContract denial command target: use the narrowest Bun test file that covers the changed code.
PLAN-2969 missing WorkContract denial release impact: include in self-check if future drift can silently reintroduce the defect.
PLAN-2970 Test area: missing dry-run denial.
PLAN-2971 missing dry-run denial negative fixture: include the smallest fixture that reproduces the unsafe or invalid state.
PLAN-2972 missing dry-run denial positive fixture: include a complete evidence fixture when the flow should pass.
PLAN-2973 missing dry-run denial expected output: stable enum reason codes and deterministic ordering.
PLAN-2974 missing dry-run denial command target: use the narrowest Bun test file that covers the changed code.
PLAN-2975 missing dry-run denial release impact: include in self-check if future drift can silently reintroduce the defect.
PLAN-2976 Test area: missing eval denial.
PLAN-2977 missing eval denial negative fixture: include the smallest fixture that reproduces the unsafe or invalid state.
PLAN-2978 missing eval denial positive fixture: include a complete evidence fixture when the flow should pass.
PLAN-2979 missing eval denial expected output: stable enum reason codes and deterministic ordering.
PLAN-2980 missing eval denial command target: use the narrowest Bun test file that covers the changed code.
PLAN-2981 missing eval denial release impact: include in self-check if future drift can silently reintroduce the defect.
PLAN-2982 Test area: non-enforced workflow denial.
PLAN-2983 non-enforced workflow denial negative fixture: include the smallest fixture that reproduces the unsafe or invalid state.
PLAN-2984 non-enforced workflow denial positive fixture: include a complete evidence fixture when the flow should pass.
PLAN-2985 non-enforced workflow denial expected output: stable enum reason codes and deterministic ordering.
PLAN-2986 non-enforced workflow denial command target: use the narrowest Bun test file that covers the changed code.
PLAN-2987 non-enforced workflow denial release impact: include in self-check if future drift can silently reintroduce the defect.
PLAN-2988 Test area: unsupported runtime denial.
PLAN-2989 unsupported runtime denial negative fixture: include the smallest fixture that reproduces the unsafe or invalid state.
PLAN-2990 unsupported runtime denial positive fixture: include a complete evidence fixture when the flow should pass.
PLAN-2991 unsupported runtime denial expected output: stable enum reason codes and deterministic ordering.
PLAN-2992 unsupported runtime denial command target: use the narrowest Bun test file that covers the changed code.
PLAN-2993 unsupported runtime denial release impact: include in self-check if future drift can silently reintroduce the defect.
PLAN-2994 Test area: runtime evidence success.
PLAN-2995 runtime evidence success negative fixture: include the smallest fixture that reproduces the unsafe or invalid state.
PLAN-2996 runtime evidence success positive fixture: include a complete evidence fixture when the flow should pass.
PLAN-2997 runtime evidence success expected output: stable enum reason codes and deterministic ordering.
PLAN-2998 runtime evidence success command target: use the narrowest Bun test file that covers the changed code.
PLAN-2999 runtime evidence success release impact: include in self-check if future drift can silently reintroduce the defect.
PLAN-3000 Test area: hook contract missing input schema failure.
PLAN-3001 hook contract missing input schema failure negative fixture: include the smallest fixture that reproduces the unsafe or invalid state.
PLAN-3002 hook contract missing input schema failure positive fixture: include a complete evidence fixture when the flow should pass.
PLAN-3003 hook contract missing input schema failure expected output: stable enum reason codes and deterministic ordering.
PLAN-3004 hook contract missing input schema failure command target: use the narrowest Bun test file that covers the changed code.
PLAN-3005 hook contract missing input schema failure release impact: include in self-check if future drift can silently reintroduce the defect.
PLAN-3006 Test area: hook contract missing output schema failure.
PLAN-3007 hook contract missing output schema failure negative fixture: include the smallest fixture that reproduces the unsafe or invalid state.
PLAN-3008 hook contract missing output schema failure positive fixture: include a complete evidence fixture when the flow should pass.
PLAN-3009 hook contract missing output schema failure expected output: stable enum reason codes and deterministic ordering.
PLAN-3010 hook contract missing output schema failure command target: use the narrowest Bun test file that covers the changed code.
PLAN-3011 hook contract missing output schema failure release impact: include in self-check if future drift can silently reintroduce the defect.
PLAN-3012 Test area: hook async mutation-required failure.
PLAN-3013 hook async mutation-required failure negative fixture: include the smallest fixture that reproduces the unsafe or invalid state.
PLAN-3014 hook async mutation-required failure positive fixture: include a complete evidence fixture when the flow should pass.
PLAN-3015 hook async mutation-required failure expected output: stable enum reason codes and deterministic ordering.
PLAN-3016 hook async mutation-required failure command target: use the narrowest Bun test file that covers the changed code.
PLAN-3017 hook async mutation-required failure release impact: include in self-check if future drift can silently reintroduce the defect.
PLAN-3018 Test area: hook output mismatch denial.
PLAN-3019 hook output mismatch denial negative fixture: include the smallest fixture that reproduces the unsafe or invalid state.
PLAN-3020 hook output mismatch denial positive fixture: include a complete evidence fixture when the flow should pass.
PLAN-3021 hook output mismatch denial expected output: stable enum reason codes and deterministic ordering.
PLAN-3022 hook output mismatch denial command target: use the narrowest Bun test file that covers the changed code.
PLAN-3023 hook output mismatch denial release impact: include in self-check if future drift can silently reintroduce the defect.
PLAN-3024 Test area: root semantic fork failure.
PLAN-3025 root semantic fork failure negative fixture: include the smallest fixture that reproduces the unsafe or invalid state.
PLAN-3026 root semantic fork failure positive fixture: include a complete evidence fixture when the flow should pass.
PLAN-3027 root semantic fork failure expected output: stable enum reason codes and deterministic ordering.
PLAN-3028 root semantic fork failure command target: use the narrowest Bun test file that covers the changed code.
PLAN-3029 root semantic fork failure release impact: include in self-check if future drift can silently reintroduce the defect.
PLAN-3030 Test area: runtime cache semantic fork failure.
PLAN-3031 runtime cache semantic fork failure negative fixture: include the smallest fixture that reproduces the unsafe or invalid state.
PLAN-3032 runtime cache semantic fork failure positive fixture: include a complete evidence fixture when the flow should pass.
PLAN-3033 runtime cache semantic fork failure expected output: stable enum reason codes and deterministic ordering.
PLAN-3034 runtime cache semantic fork failure command target: use the narrowest Bun test file that covers the changed code.
PLAN-3035 runtime cache semantic fork failure release impact: include in self-check if future drift can silently reintroduce the defect.
PLAN-3036 Test area: docs authority mismatch failure.
PLAN-3037 docs authority mismatch failure negative fixture: include the smallest fixture that reproduces the unsafe or invalid state.
PLAN-3038 docs authority mismatch failure positive fixture: include a complete evidence fixture when the flow should pass.
PLAN-3039 docs authority mismatch failure expected output: stable enum reason codes and deterministic ordering.
PLAN-3040 docs authority mismatch failure command target: use the narrowest Bun test file that covers the changed code.
PLAN-3041 docs authority mismatch failure release impact: include in self-check if future drift can silently reintroduce the defect.
PLAN-3042 Test area: resolver repeatability success.
PLAN-3043 resolver repeatability success negative fixture: include the smallest fixture that reproduces the unsafe or invalid state.
PLAN-3044 resolver repeatability success positive fixture: include a complete evidence fixture when the flow should pass.
PLAN-3045 resolver repeatability success expected output: stable enum reason codes and deterministic ordering.
PLAN-3046 resolver repeatability success command target: use the narrowest Bun test file that covers the changed code.
PLAN-3047 resolver repeatability success release impact: include in self-check if future drift can silently reintroduce the defect.
PLAN-3048 Test area: ambiguous conflict denial.
PLAN-3049 ambiguous conflict denial negative fixture: include the smallest fixture that reproduces the unsafe or invalid state.
PLAN-3050 ambiguous conflict denial positive fixture: include a complete evidence fixture when the flow should pass.
PLAN-3051 ambiguous conflict denial expected output: stable enum reason codes and deterministic ordering.
PLAN-3052 ambiguous conflict denial command target: use the narrowest Bun test file that covers the changed code.
PLAN-3053 ambiguous conflict denial release impact: include in self-check if future drift can silently reintroduce the defect.
PLAN-3054 Test area: new candidate without approval denial.
PLAN-3055 new candidate without approval denial negative fixture: include the smallest fixture that reproduces the unsafe or invalid state.
PLAN-3056 new candidate without approval denial positive fixture: include a complete evidence fixture when the flow should pass.
PLAN-3057 new candidate without approval denial expected output: stable enum reason codes and deterministic ordering.
PLAN-3058 new candidate without approval denial command target: use the narrowest Bun test file that covers the changed code.
PLAN-3059 new candidate without approval denial release impact: include in self-check if future drift can silently reintroduce the defect.
PLAN-3060 Test area: rejected mapping denial.
PLAN-3061 rejected mapping denial negative fixture: include the smallest fixture that reproduces the unsafe or invalid state.
PLAN-3062 rejected mapping denial positive fixture: include a complete evidence fixture when the flow should pass.
PLAN-3063 rejected mapping denial expected output: stable enum reason codes and deterministic ordering.
PLAN-3064 rejected mapping denial command target: use the narrowest Bun test file that covers the changed code.
PLAN-3065 rejected mapping denial release impact: include in self-check if future drift can silently reintroduce the defect.
PLAN-3066 Test area: llmPromotionUsed denial.
PLAN-3067 llmPromotionUsed denial negative fixture: include the smallest fixture that reproduces the unsafe or invalid state.
PLAN-3068 llmPromotionUsed denial positive fixture: include a complete evidence fixture when the flow should pass.
PLAN-3069 llmPromotionUsed denial expected output: stable enum reason codes and deterministic ordering.
PLAN-3070 llmPromotionUsed denial command target: use the narrowest Bun test file that covers the changed code.
PLAN-3071 llmPromotionUsed denial release impact: include in self-check if future drift can silently reintroduce the defect.
PLAN-3072 Test area: SemanticConversationState schema success.
PLAN-3073 SemanticConversationState schema success negative fixture: include the smallest fixture that reproduces the unsafe or invalid state.
PLAN-3074 SemanticConversationState schema success positive fixture: include a complete evidence fixture when the flow should pass.
PLAN-3075 SemanticConversationState schema success expected output: stable enum reason codes and deterministic ordering.
PLAN-3076 SemanticConversationState schema success command target: use the narrowest Bun test file that covers the changed code.
PLAN-3077 SemanticConversationState schema success release impact: include in self-check if future drift can silently reintroduce the defect.
PLAN-3078 Test area: LLM readiness write denial.
PLAN-3079 LLM readiness write denial negative fixture: include the smallest fixture that reproduces the unsafe or invalid state.
PLAN-3080 LLM readiness write denial positive fixture: include a complete evidence fixture when the flow should pass.
PLAN-3081 LLM readiness write denial expected output: stable enum reason codes and deterministic ordering.
PLAN-3082 LLM readiness write denial command target: use the narrowest Bun test file that covers the changed code.
PLAN-3083 LLM readiness write denial release impact: include in self-check if future drift can silently reintroduce the defect.
PLAN-3084 Test area: non-programmer ko default success.
PLAN-3085 non-programmer ko default success negative fixture: include the smallest fixture that reproduces the unsafe or invalid state.
PLAN-3086 non-programmer ko default success positive fixture: include a complete evidence fixture when the flow should pass.
PLAN-3087 non-programmer ko default success expected output: stable enum reason codes and deterministic ordering.
PLAN-3088 non-programmer ko default success command target: use the narrowest Bun test file that covers the changed code.
PLAN-3089 non-programmer ko default success release impact: include in self-check if future drift can silently reintroduce the defect.
PLAN-3090 Test area: DTC ready false mutation denial.
PLAN-3091 DTC ready false mutation denial negative fixture: include the smallest fixture that reproduces the unsafe or invalid state.
PLAN-3092 DTC ready false mutation denial positive fixture: include a complete evidence fixture when the flow should pass.
PLAN-3093 DTC ready false mutation denial expected output: stable enum reason codes and deterministic ordering.
PLAN-3094 DTC ready false mutation denial command target: use the narrowest Bun test file that covers the changed code.
PLAN-3095 DTC ready false mutation denial release impact: include in self-check if future drift can silently reintroduce the defect.
PLAN-3096 Test area: promotionReady false DTC denial.
PLAN-3097 promotionReady false DTC denial negative fixture: include the smallest fixture that reproduces the unsafe or invalid state.
PLAN-3098 promotionReady false DTC denial positive fixture: include a complete evidence fixture when the flow should pass.
PLAN-3099 promotionReady false DTC denial expected output: stable enum reason codes and deterministic ordering.
PLAN-3100 promotionReady false DTC denial command target: use the narrowest Bun test file that covers the changed code.
PLAN-3101 promotionReady false DTC denial release impact: include in self-check if future drift can silently reintroduce the defect.
PLAN-3102 Test area: workflow family mutation gate failure.
PLAN-3103 workflow family mutation gate failure negative fixture: include the smallest fixture that reproduces the unsafe or invalid state.
PLAN-3104 workflow family mutation gate failure positive fixture: include a complete evidence fixture when the flow should pass.
PLAN-3105 workflow family mutation gate failure expected output: stable enum reason codes and deterministic ordering.
PLAN-3106 workflow family mutation gate failure command target: use the narrowest Bun test file that covers the changed code.
PLAN-3107 workflow family mutation gate failure release impact: include in self-check if future drift can silently reintroduce the defect.
PLAN-3108 Test area: workflow family replay evidence failure.
PLAN-3109 workflow family replay evidence failure negative fixture: include the smallest fixture that reproduces the unsafe or invalid state.
PLAN-3110 workflow family replay evidence failure positive fixture: include a complete evidence fixture when the flow should pass.
PLAN-3111 workflow family replay evidence failure expected output: stable enum reason codes and deterministic ordering.
PLAN-3112 workflow family replay evidence failure command target: use the narrowest Bun test file that covers the changed code.
PLAN-3113 workflow family replay evidence failure release impact: include in self-check if future drift can silently reintroduce the defect.
PLAN-3114 Test area: self-check aggregation failure.
PLAN-3115 self-check aggregation failure negative fixture: include the smallest fixture that reproduces the unsafe or invalid state.
PLAN-3116 self-check aggregation failure positive fixture: include a complete evidence fixture when the flow should pass.
PLAN-3117 self-check aggregation failure expected output: stable enum reason codes and deterministic ordering.
PLAN-3118 self-check aggregation failure command target: use the narrowest Bun test file that covers the changed code.
PLAN-3119 self-check aggregation failure release impact: include in self-check if future drift can silently reintroduce the defect.
PLAN-3120 Test area: self-check success with complete evidence.
PLAN-3121 self-check success with complete evidence negative fixture: include the smallest fixture that reproduces the unsafe or invalid state.
PLAN-3122 self-check success with complete evidence positive fixture: include a complete evidence fixture when the flow should pass.
PLAN-3123 self-check success with complete evidence expected output: stable enum reason codes and deterministic ordering.
PLAN-3124 self-check success with complete evidence command target: use the narrowest Bun test file that covers the changed code.
PLAN-3125 self-check success with complete evidence release impact: include in self-check if future drift can silently reintroduce the defect.
PLAN-3126 Test area: Codex-only boundary success.
PLAN-3127 Codex-only boundary success negative fixture: include the smallest fixture that reproduces the unsafe or invalid state.
PLAN-3128 Codex-only boundary success positive fixture: include a complete evidence fixture when the flow should pass.
PLAN-3129 Codex-only boundary success expected output: stable enum reason codes and deterministic ordering.
PLAN-3130 Codex-only boundary success command target: use the narrowest Bun test file that covers the changed code.
PLAN-3131 Codex-only boundary success release impact: include in self-check if future drift can silently reintroduce the defect.
PLAN-3132 Test area: Claude unsupported claim failure.
PLAN-3133 Claude unsupported claim failure negative fixture: include the smallest fixture that reproduces the unsafe or invalid state.
PLAN-3134 Claude unsupported claim failure positive fixture: include a complete evidence fixture when the flow should pass.
PLAN-3135 Claude unsupported claim failure expected output: stable enum reason codes and deterministic ordering.
PLAN-3136 Claude unsupported claim failure command target: use the narrowest Bun test file that covers the changed code.
PLAN-3137 Claude unsupported claim failure release impact: include in self-check if future drift can silently reintroduce the defect.
PLAN-3138 Test area: Gemini auto-add failure.
PLAN-3139 Gemini auto-add failure negative fixture: include the smallest fixture that reproduces the unsafe or invalid state.
PLAN-3140 Gemini auto-add failure positive fixture: include a complete evidence fixture when the flow should pass.
PLAN-3141 Gemini auto-add failure expected output: stable enum reason codes and deterministic ordering.
PLAN-3142 Gemini auto-add failure command target: use the narrowest Bun test file that covers the changed code.
PLAN-3143 Gemini auto-add failure release impact: include in self-check if future drift can silently reintroduce the defect.
## Release Integration Plan

PLAN-3144 Release integration step 001: pre-implementation MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3145 Release integration step 002: pre-implementation MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3146 Release integration step 003: pre-implementation MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3147 Release integration step 004: pre-implementation MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3148 Release integration step 005: pre-implementation MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3149 Release integration step 006: pre-implementation MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3150 Release integration step 007: pre-implementation MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3151 Release integration step 008: pre-implementation MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3152 Release integration step 009: pre-implementation MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3153 Release integration step 010: pre-implementation MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3154 Release integration step 011: pre-implementation MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3155 Release integration step 012: pre-implementation MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3156 Release integration step 013: pre-implementation MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3157 Release integration step 014: pre-implementation MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3158 Release integration step 015: pre-implementation MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3159 Release integration step 016: pre-implementation MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3160 Release integration step 017: pre-implementation MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3161 Release integration step 018: pre-implementation MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3162 Release integration step 019: pre-implementation MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3163 Release integration step 020: pre-implementation MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3164 Release integration step 021: pre-implementation MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3165 Release integration step 022: pre-implementation MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3166 Release integration step 023: pre-implementation MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3167 Release integration step 024: pre-implementation MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3168 Release integration step 025: pre-implementation MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3169 Release integration step 026: pre-implementation MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3170 Release integration step 027: pre-implementation MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3171 Release integration step 028: pre-implementation MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3172 Release integration step 029: pre-implementation MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3173 Release integration step 030: pre-implementation MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3174 Release integration step 031: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3175 Release integration step 032: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3176 Release integration step 033: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3177 Release integration step 034: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3178 Release integration step 035: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3179 Release integration step 036: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3180 Release integration step 037: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3181 Release integration step 038: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3182 Release integration step 039: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3183 Release integration step 040: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3184 Release integration step 041: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3185 Release integration step 042: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3186 Release integration step 043: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3187 Release integration step 044: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3188 Release integration step 045: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3189 Release integration step 046: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3190 Release integration step 047: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3191 Release integration step 048: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3192 Release integration step 049: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3193 Release integration step 050: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3194 Release integration step 051: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3195 Release integration step 052: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3196 Release integration step 053: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3197 Release integration step 054: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3198 Release integration step 055: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3199 Release integration step 056: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3200 Release integration step 057: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3201 Release integration step 058: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3202 Release integration step 059: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3203 Release integration step 060: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3204 Release integration step 061: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3205 Release integration step 062: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3206 Release integration step 063: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3207 Release integration step 064: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3208 Release integration step 065: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3209 Release integration step 066: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3210 Release integration step 067: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3211 Release integration step 068: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3212 Release integration step 069: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3213 Release integration step 070: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3214 Release integration step 071: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3215 Release integration step 072: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3216 Release integration step 073: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3217 Release integration step 074: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3218 Release integration step 075: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3219 Release integration step 076: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3220 Release integration step 077: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3221 Release integration step 078: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3222 Release integration step 079: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3223 Release integration step 080: per-PR verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3224 Release integration step 081: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3225 Release integration step 082: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3226 Release integration step 083: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3227 Release integration step 084: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3228 Release integration step 085: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3229 Release integration step 086: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3230 Release integration step 087: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3231 Release integration step 088: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3232 Release integration step 089: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3233 Release integration step 090: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3234 Release integration step 091: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3235 Release integration step 092: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3236 Release integration step 093: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3237 Release integration step 094: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3238 Release integration step 095: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3239 Release integration step 096: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3240 Release integration step 097: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3241 Release integration step 098: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3242 Release integration step 099: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3243 Release integration step 100: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3244 Release integration step 101: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3245 Release integration step 102: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3246 Release integration step 103: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3247 Release integration step 104: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3248 Release integration step 105: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3249 Release integration step 106: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3250 Release integration step 107: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3251 Release integration step 108: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3252 Release integration step 109: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3253 Release integration step 110: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3254 Release integration step 111: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3255 Release integration step 112: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3256 Release integration step 113: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3257 Release integration step 114: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3258 Release integration step 115: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3259 Release integration step 116: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3260 Release integration step 117: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3261 Release integration step 118: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3262 Release integration step 119: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3263 Release integration step 120: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3264 Release integration step 121: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3265 Release integration step 122: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3266 Release integration step 123: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3267 Release integration step 124: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3268 Release integration step 125: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3269 Release integration step 126: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3270 Release integration step 127: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3271 Release integration step 128: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3272 Release integration step 129: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3273 Release integration step 130: release self-check integration MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3274 Release integration step 131: runtime verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3275 Release integration step 132: runtime verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3276 Release integration step 133: runtime verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3277 Release integration step 134: runtime verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3278 Release integration step 135: runtime verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3279 Release integration step 136: runtime verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3280 Release integration step 137: runtime verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3281 Release integration step 138: runtime verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3282 Release integration step 139: runtime verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3283 Release integration step 140: runtime verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3284 Release integration step 141: runtime verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3285 Release integration step 142: runtime verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3286 Release integration step 143: runtime verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3287 Release integration step 144: runtime verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3288 Release integration step 145: runtime verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3289 Release integration step 146: runtime verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3290 Release integration step 147: runtime verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3291 Release integration step 148: runtime verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3292 Release integration step 149: runtime verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3293 Release integration step 150: runtime verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3294 Release integration step 151: runtime verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3295 Release integration step 152: runtime verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3296 Release integration step 153: runtime verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3297 Release integration step 154: runtime verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3298 Release integration step 155: runtime verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3299 Release integration step 156: runtime verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3300 Release integration step 157: runtime verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3301 Release integration step 158: runtime verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3302 Release integration step 159: runtime verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3303 Release integration step 160: runtime verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3304 Release integration step 161: runtime verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3305 Release integration step 162: runtime verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3306 Release integration step 163: runtime verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3307 Release integration step 164: runtime verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3308 Release integration step 165: runtime verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3309 Release integration step 166: runtime verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3310 Release integration step 167: runtime verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3311 Release integration step 168: runtime verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3312 Release integration step 169: runtime verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3313 Release integration step 170: runtime verification MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3314 Release integration step 171: post-release monitoring MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3315 Release integration step 172: post-release monitoring MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3316 Release integration step 173: post-release monitoring MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3317 Release integration step 174: post-release monitoring MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3318 Release integration step 175: post-release monitoring MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3319 Release integration step 176: post-release monitoring MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3320 Release integration step 177: post-release monitoring MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3321 Release integration step 178: post-release monitoring MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3322 Release integration step 179: post-release monitoring MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3323 Release integration step 180: post-release monitoring MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3324 Release integration step 181: post-release monitoring MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3325 Release integration step 182: post-release monitoring MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3326 Release integration step 183: post-release monitoring MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3327 Release integration step 184: post-release monitoring MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3328 Release integration step 185: post-release monitoring MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3329 Release integration step 186: post-release monitoring MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3330 Release integration step 187: post-release monitoring MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3331 Release integration step 188: post-release monitoring MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3332 Release integration step 189: post-release monitoring MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3333 Release integration step 190: post-release monitoring MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3334 Release integration step 191: post-release monitoring MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3335 Release integration step 192: post-release monitoring MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3336 Release integration step 193: post-release monitoring MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3337 Release integration step 194: post-release monitoring MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3338 Release integration step 195: post-release monitoring MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3339 Release integration step 196: post-release monitoring MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3340 Release integration step 197: post-release monitoring MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3341 Release integration step 198: post-release monitoring MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3342 Release integration step 199: post-release monitoring MUST preserve deterministic gate evidence and must not use LLM prose as authority.
PLAN-3343 Release integration step 200: post-release monitoring MUST preserve deterministic gate evidence and must not use LLM prose as authority.
## Implementation Review Checklist

PLAN-3344 Review checklist pass 01: Does every protected mutation path deny on missing SIC.
PLAN-3345 Review checklist pass 01: Does every ontology-write path deny on missing DTC.
PLAN-3346 Review checklist pass 01: Does every commit or release path deny on missing WorkContract.
PLAN-3347 Review checklist pass 01: Does every release path deny on missing eval evidence.
PLAN-3348 Review checklist pass 01: Does every runtime parity claim have evidence refs.
PLAN-3349 Review checklist pass 01: Does every unsupported runtime remain unsupported or schema-only.
PLAN-3350 Review checklist pass 01: Does every mutation-required hook have input schema.
PLAN-3351 Review checklist pass 01: Does every mutation-required hook have output schema.
PLAN-3352 Review checklist pass 01: Does every mutation-required hook have onError deny.
PLAN-3353 Review checklist pass 01: Does every mutation-required hook have timeout.
PLAN-3354 Review checklist pass 01: Does every mutation-required hook forbid async true.
PLAN-3355 Review checklist pass 01: Does adapter deny schema mismatch.
PLAN-3356 Review checklist pass 01: Does invalid hook stdin deny for mutation.
PLAN-3357 Review checklist pass 01: Does unhandled hook error deny for mutation.
PLAN-3358 Review checklist pass 01: Does timeout deny for mutation.
PLAN-3359 Review checklist pass 01: Does env off fail to weaken protected gates.
PLAN-3360 Review checklist pass 01: Does env advisory fail to weaken protected gates.
PLAN-3361 Review checklist pass 01: Does bypass fail to authorize ontology-write.
PLAN-3362 Review checklist pass 01: Does bypass fail to authorize release.
PLAN-3363 Review checklist pass 01: Does semantic ambiguous conflict deny promotion.
PLAN-3364 Review checklist pass 01: Does semantic new candidate without approval deny promotion.
PLAN-3365 Review checklist pass 01: Does rejected mapping deny promotion.
PLAN-3366 Review checklist pass 01: Does llmPromotionUsed true deny promotion.
PLAN-3367 Review checklist pass 01: Does resolver repeatability remain byte-identical.
PLAN-3368 Review checklist pass 01: Does SemanticConversationState hide authority fields from LLM writes.
PLAN-3369 Review checklist pass 01: Does user approval card remain distinct from mutation authorization.
PLAN-3370 Review checklist pass 01: Does DATA remain distinct from ObjectType.
PLAN-3371 Review checklist pass 01: Does LOGIC remain distinct from Function.
PLAN-3372 Review checklist pass 01: Does ACTION remain distinct from ActionType.
PLAN-3373 Review checklist pass 01: Does TECHNOLOGY remain distinct from runtime parity.
PLAN-3374 Review checklist pass 01: Does GOVERNANCE remain distinct from permission.
PLAN-3375 Review checklist pass 01: Does root remain marketplace only.
PLAN-3376 Review checklist pass 01: Does plugin source remain semantic authority.
PLAN-3377 Review checklist pass 01: Does runtime cache remain consumer only.
PLAN-3378 Review checklist pass 01: Does self-check include all new verifiers.
PLAN-3379 Review checklist pass 01: Does PR body include Recovery.
PLAN-3380 Review checklist pass 01: Does PR body include Excluded Scope.
PLAN-3381 Review checklist pass 01: Does diff avoid generated file edits.
PLAN-3382 Review checklist pass 01: Does diff avoid unrelated formatting.
PLAN-3383 Review checklist pass 01: Does final verification include git diff --check.
PLAN-3384 Review checklist pass 02: Does every protected mutation path deny on missing SIC.
PLAN-3385 Review checklist pass 02: Does every ontology-write path deny on missing DTC.
PLAN-3386 Review checklist pass 02: Does every commit or release path deny on missing WorkContract.
PLAN-3387 Review checklist pass 02: Does every release path deny on missing eval evidence.
PLAN-3388 Review checklist pass 02: Does every runtime parity claim have evidence refs.
PLAN-3389 Review checklist pass 02: Does every unsupported runtime remain unsupported or schema-only.
PLAN-3390 Review checklist pass 02: Does every mutation-required hook have input schema.
PLAN-3391 Review checklist pass 02: Does every mutation-required hook have output schema.
PLAN-3392 Review checklist pass 02: Does every mutation-required hook have onError deny.
PLAN-3393 Review checklist pass 02: Does every mutation-required hook have timeout.
PLAN-3394 Review checklist pass 02: Does every mutation-required hook forbid async true.
PLAN-3395 Review checklist pass 02: Does adapter deny schema mismatch.
PLAN-3396 Review checklist pass 02: Does invalid hook stdin deny for mutation.
PLAN-3397 Review checklist pass 02: Does unhandled hook error deny for mutation.
PLAN-3398 Review checklist pass 02: Does timeout deny for mutation.
PLAN-3399 Review checklist pass 02: Does env off fail to weaken protected gates.
PLAN-3400 Review checklist pass 02: Does env advisory fail to weaken protected gates.
PLAN-3401 Review checklist pass 02: Does bypass fail to authorize ontology-write.
PLAN-3402 Review checklist pass 02: Does bypass fail to authorize release.
PLAN-3403 Review checklist pass 02: Does semantic ambiguous conflict deny promotion.
PLAN-3404 Review checklist pass 02: Does semantic new candidate without approval deny promotion.
PLAN-3405 Review checklist pass 02: Does rejected mapping deny promotion.
PLAN-3406 Review checklist pass 02: Does llmPromotionUsed true deny promotion.
PLAN-3407 Review checklist pass 02: Does resolver repeatability remain byte-identical.
PLAN-3408 Review checklist pass 02: Does SemanticConversationState hide authority fields from LLM writes.
PLAN-3409 Review checklist pass 02: Does user approval card remain distinct from mutation authorization.
PLAN-3410 Review checklist pass 02: Does DATA remain distinct from ObjectType.
PLAN-3411 Review checklist pass 02: Does LOGIC remain distinct from Function.
PLAN-3412 Review checklist pass 02: Does ACTION remain distinct from ActionType.
PLAN-3413 Review checklist pass 02: Does TECHNOLOGY remain distinct from runtime parity.
PLAN-3414 Review checklist pass 02: Does GOVERNANCE remain distinct from permission.
PLAN-3415 Review checklist pass 02: Does root remain marketplace only.
PLAN-3416 Review checklist pass 02: Does plugin source remain semantic authority.
PLAN-3417 Review checklist pass 02: Does runtime cache remain consumer only.
PLAN-3418 Review checklist pass 02: Does self-check include all new verifiers.
PLAN-3419 Review checklist pass 02: Does PR body include Recovery.
PLAN-3420 Review checklist pass 02: Does PR body include Excluded Scope.
PLAN-3421 Review checklist pass 02: Does diff avoid generated file edits.
PLAN-3422 Review checklist pass 02: Does diff avoid unrelated formatting.
PLAN-3423 Review checklist pass 02: Does final verification include git diff --check.
PLAN-3424 Review checklist pass 03: Does every protected mutation path deny on missing SIC.
PLAN-3425 Review checklist pass 03: Does every ontology-write path deny on missing DTC.
PLAN-3426 Review checklist pass 03: Does every commit or release path deny on missing WorkContract.
PLAN-3427 Review checklist pass 03: Does every release path deny on missing eval evidence.
PLAN-3428 Review checklist pass 03: Does every runtime parity claim have evidence refs.
PLAN-3429 Review checklist pass 03: Does every unsupported runtime remain unsupported or schema-only.
PLAN-3430 Review checklist pass 03: Does every mutation-required hook have input schema.
PLAN-3431 Review checklist pass 03: Does every mutation-required hook have output schema.
PLAN-3432 Review checklist pass 03: Does every mutation-required hook have onError deny.
PLAN-3433 Review checklist pass 03: Does every mutation-required hook have timeout.
PLAN-3434 Review checklist pass 03: Does every mutation-required hook forbid async true.
PLAN-3435 Review checklist pass 03: Does adapter deny schema mismatch.
PLAN-3436 Review checklist pass 03: Does invalid hook stdin deny for mutation.
PLAN-3437 Review checklist pass 03: Does unhandled hook error deny for mutation.
PLAN-3438 Review checklist pass 03: Does timeout deny for mutation.
PLAN-3439 Review checklist pass 03: Does env off fail to weaken protected gates.
PLAN-3440 Review checklist pass 03: Does env advisory fail to weaken protected gates.
PLAN-3441 Review checklist pass 03: Does bypass fail to authorize ontology-write.
PLAN-3442 Review checklist pass 03: Does bypass fail to authorize release.
PLAN-3443 Review checklist pass 03: Does semantic ambiguous conflict deny promotion.
PLAN-3444 Review checklist pass 03: Does semantic new candidate without approval deny promotion.
PLAN-3445 Review checklist pass 03: Does rejected mapping deny promotion.
PLAN-3446 Review checklist pass 03: Does llmPromotionUsed true deny promotion.
PLAN-3447 Review checklist pass 03: Does resolver repeatability remain byte-identical.
PLAN-3448 Review checklist pass 03: Does SemanticConversationState hide authority fields from LLM writes.
PLAN-3449 Review checklist pass 03: Does user approval card remain distinct from mutation authorization.
PLAN-3450 Review checklist pass 03: Does DATA remain distinct from ObjectType.
PLAN-3451 Review checklist pass 03: Does LOGIC remain distinct from Function.
PLAN-3452 Review checklist pass 03: Does ACTION remain distinct from ActionType.
PLAN-3453 Review checklist pass 03: Does TECHNOLOGY remain distinct from runtime parity.
PLAN-3454 Review checklist pass 03: Does GOVERNANCE remain distinct from permission.
PLAN-3455 Review checklist pass 03: Does root remain marketplace only.
PLAN-3456 Review checklist pass 03: Does plugin source remain semantic authority.
PLAN-3457 Review checklist pass 03: Does runtime cache remain consumer only.
PLAN-3458 Review checklist pass 03: Does self-check include all new verifiers.
PLAN-3459 Review checklist pass 03: Does PR body include Recovery.
PLAN-3460 Review checklist pass 03: Does PR body include Excluded Scope.
PLAN-3461 Review checklist pass 03: Does diff avoid generated file edits.
PLAN-3462 Review checklist pass 03: Does diff avoid unrelated formatting.
PLAN-3463 Review checklist pass 03: Does final verification include git diff --check.
PLAN-3464 Review checklist pass 04: Does every protected mutation path deny on missing SIC.
PLAN-3465 Review checklist pass 04: Does every ontology-write path deny on missing DTC.
PLAN-3466 Review checklist pass 04: Does every commit or release path deny on missing WorkContract.
PLAN-3467 Review checklist pass 04: Does every release path deny on missing eval evidence.
PLAN-3468 Review checklist pass 04: Does every runtime parity claim have evidence refs.
PLAN-3469 Review checklist pass 04: Does every unsupported runtime remain unsupported or schema-only.
PLAN-3470 Review checklist pass 04: Does every mutation-required hook have input schema.
PLAN-3471 Review checklist pass 04: Does every mutation-required hook have output schema.
PLAN-3472 Review checklist pass 04: Does every mutation-required hook have onError deny.
PLAN-3473 Review checklist pass 04: Does every mutation-required hook have timeout.
PLAN-3474 Review checklist pass 04: Does every mutation-required hook forbid async true.
PLAN-3475 Review checklist pass 04: Does adapter deny schema mismatch.
PLAN-3476 Review checklist pass 04: Does invalid hook stdin deny for mutation.
PLAN-3477 Review checklist pass 04: Does unhandled hook error deny for mutation.
PLAN-3478 Review checklist pass 04: Does timeout deny for mutation.
PLAN-3479 Review checklist pass 04: Does env off fail to weaken protected gates.
PLAN-3480 Review checklist pass 04: Does env advisory fail to weaken protected gates.
PLAN-3481 Review checklist pass 04: Does bypass fail to authorize ontology-write.
PLAN-3482 Review checklist pass 04: Does bypass fail to authorize release.
PLAN-3483 Review checklist pass 04: Does semantic ambiguous conflict deny promotion.
PLAN-3484 Review checklist pass 04: Does semantic new candidate without approval deny promotion.
PLAN-3485 Review checklist pass 04: Does rejected mapping deny promotion.
PLAN-3486 Review checklist pass 04: Does llmPromotionUsed true deny promotion.
PLAN-3487 Review checklist pass 04: Does resolver repeatability remain byte-identical.
PLAN-3488 Review checklist pass 04: Does SemanticConversationState hide authority fields from LLM writes.
PLAN-3489 Review checklist pass 04: Does user approval card remain distinct from mutation authorization.
PLAN-3490 Review checklist pass 04: Does DATA remain distinct from ObjectType.
PLAN-3491 Review checklist pass 04: Does LOGIC remain distinct from Function.
PLAN-3492 Review checklist pass 04: Does ACTION remain distinct from ActionType.
PLAN-3493 Review checklist pass 04: Does TECHNOLOGY remain distinct from runtime parity.
PLAN-3494 Review checklist pass 04: Does GOVERNANCE remain distinct from permission.
PLAN-3495 Review checklist pass 04: Does root remain marketplace only.
PLAN-3496 Review checklist pass 04: Does plugin source remain semantic authority.
PLAN-3497 Review checklist pass 04: Does runtime cache remain consumer only.
PLAN-3498 Review checklist pass 04: Does self-check include all new verifiers.
PLAN-3499 Review checklist pass 04: Does PR body include Recovery.
PLAN-3500 Review checklist pass 04: Does PR body include Excluded Scope.
PLAN-3501 Review checklist pass 04: Does diff avoid generated file edits.
PLAN-3502 Review checklist pass 04: Does diff avoid unrelated formatting.
PLAN-3503 Review checklist pass 04: Does final verification include git diff --check.
PLAN-3504 Review checklist pass 05: Does every protected mutation path deny on missing SIC.
PLAN-3505 Review checklist pass 05: Does every ontology-write path deny on missing DTC.
PLAN-3506 Review checklist pass 05: Does every commit or release path deny on missing WorkContract.
PLAN-3507 Review checklist pass 05: Does every release path deny on missing eval evidence.
PLAN-3508 Review checklist pass 05: Does every runtime parity claim have evidence refs.
PLAN-3509 Review checklist pass 05: Does every unsupported runtime remain unsupported or schema-only.
PLAN-3510 Review checklist pass 05: Does every mutation-required hook have input schema.
PLAN-3511 Review checklist pass 05: Does every mutation-required hook have output schema.
PLAN-3512 Review checklist pass 05: Does every mutation-required hook have onError deny.
PLAN-3513 Review checklist pass 05: Does every mutation-required hook have timeout.
PLAN-3514 Review checklist pass 05: Does every mutation-required hook forbid async true.
PLAN-3515 Review checklist pass 05: Does adapter deny schema mismatch.
PLAN-3516 Review checklist pass 05: Does invalid hook stdin deny for mutation.
PLAN-3517 Review checklist pass 05: Does unhandled hook error deny for mutation.
PLAN-3518 Review checklist pass 05: Does timeout deny for mutation.
PLAN-3519 Review checklist pass 05: Does env off fail to weaken protected gates.
PLAN-3520 Review checklist pass 05: Does env advisory fail to weaken protected gates.
PLAN-3521 Review checklist pass 05: Does bypass fail to authorize ontology-write.
PLAN-3522 Review checklist pass 05: Does bypass fail to authorize release.
PLAN-3523 Review checklist pass 05: Does semantic ambiguous conflict deny promotion.
PLAN-3524 Review checklist pass 05: Does semantic new candidate without approval deny promotion.
PLAN-3525 Review checklist pass 05: Does rejected mapping deny promotion.
PLAN-3526 Review checklist pass 05: Does llmPromotionUsed true deny promotion.
PLAN-3527 Review checklist pass 05: Does resolver repeatability remain byte-identical.
PLAN-3528 Review checklist pass 05: Does SemanticConversationState hide authority fields from LLM writes.
PLAN-3529 Review checklist pass 05: Does user approval card remain distinct from mutation authorization.
PLAN-3530 Review checklist pass 05: Does DATA remain distinct from ObjectType.
PLAN-3531 Review checklist pass 05: Does LOGIC remain distinct from Function.
PLAN-3532 Review checklist pass 05: Does ACTION remain distinct from ActionType.
PLAN-3533 Review checklist pass 05: Does TECHNOLOGY remain distinct from runtime parity.
PLAN-3534 Review checklist pass 05: Does GOVERNANCE remain distinct from permission.
PLAN-3535 Review checklist pass 05: Does root remain marketplace only.
PLAN-3536 Review checklist pass 05: Does plugin source remain semantic authority.
PLAN-3537 Review checklist pass 05: Does runtime cache remain consumer only.
PLAN-3538 Review checklist pass 05: Does self-check include all new verifiers.
PLAN-3539 Review checklist pass 05: Does PR body include Recovery.
PLAN-3540 Review checklist pass 05: Does PR body include Excluded Scope.
PLAN-3541 Review checklist pass 05: Does diff avoid generated file edits.
PLAN-3542 Review checklist pass 05: Does diff avoid unrelated formatting.
PLAN-3543 Review checklist pass 05: Does final verification include git diff --check.
PLAN-3544 Review checklist pass 06: Does every protected mutation path deny on missing SIC.
PLAN-3545 Review checklist pass 06: Does every ontology-write path deny on missing DTC.
PLAN-3546 Review checklist pass 06: Does every commit or release path deny on missing WorkContract.
PLAN-3547 Review checklist pass 06: Does every release path deny on missing eval evidence.
PLAN-3548 Review checklist pass 06: Does every runtime parity claim have evidence refs.
PLAN-3549 Review checklist pass 06: Does every unsupported runtime remain unsupported or schema-only.
PLAN-3550 Review checklist pass 06: Does every mutation-required hook have input schema.
PLAN-3551 Review checklist pass 06: Does every mutation-required hook have output schema.
PLAN-3552 Review checklist pass 06: Does every mutation-required hook have onError deny.
PLAN-3553 Review checklist pass 06: Does every mutation-required hook have timeout.
PLAN-3554 Review checklist pass 06: Does every mutation-required hook forbid async true.
PLAN-3555 Review checklist pass 06: Does adapter deny schema mismatch.
PLAN-3556 Review checklist pass 06: Does invalid hook stdin deny for mutation.
PLAN-3557 Review checklist pass 06: Does unhandled hook error deny for mutation.
PLAN-3558 Review checklist pass 06: Does timeout deny for mutation.
PLAN-3559 Review checklist pass 06: Does env off fail to weaken protected gates.
PLAN-3560 Review checklist pass 06: Does env advisory fail to weaken protected gates.
PLAN-3561 Review checklist pass 06: Does bypass fail to authorize ontology-write.
PLAN-3562 Review checklist pass 06: Does bypass fail to authorize release.
PLAN-3563 Review checklist pass 06: Does semantic ambiguous conflict deny promotion.
PLAN-3564 Review checklist pass 06: Does semantic new candidate without approval deny promotion.
PLAN-3565 Review checklist pass 06: Does rejected mapping deny promotion.
PLAN-3566 Review checklist pass 06: Does llmPromotionUsed true deny promotion.
PLAN-3567 Review checklist pass 06: Does resolver repeatability remain byte-identical.
PLAN-3568 Review checklist pass 06: Does SemanticConversationState hide authority fields from LLM writes.
PLAN-3569 Review checklist pass 06: Does user approval card remain distinct from mutation authorization.
PLAN-3570 Review checklist pass 06: Does DATA remain distinct from ObjectType.
PLAN-3571 Review checklist pass 06: Does LOGIC remain distinct from Function.
PLAN-3572 Review checklist pass 06: Does ACTION remain distinct from ActionType.
PLAN-3573 Review checklist pass 06: Does TECHNOLOGY remain distinct from runtime parity.
PLAN-3574 Review checklist pass 06: Does GOVERNANCE remain distinct from permission.
PLAN-3575 Review checklist pass 06: Does root remain marketplace only.
PLAN-3576 Review checklist pass 06: Does plugin source remain semantic authority.
PLAN-3577 Review checklist pass 06: Does runtime cache remain consumer only.
PLAN-3578 Review checklist pass 06: Does self-check include all new verifiers.
PLAN-3579 Review checklist pass 06: Does PR body include Recovery.
PLAN-3580 Review checklist pass 06: Does PR body include Excluded Scope.
PLAN-3581 Review checklist pass 06: Does diff avoid generated file edits.
PLAN-3582 Review checklist pass 06: Does diff avoid unrelated formatting.
PLAN-3583 Review checklist pass 06: Does final verification include git diff --check.
PLAN-3584 Review checklist pass 07: Does every protected mutation path deny on missing SIC.
PLAN-3585 Review checklist pass 07: Does every ontology-write path deny on missing DTC.
PLAN-3586 Review checklist pass 07: Does every commit or release path deny on missing WorkContract.
PLAN-3587 Review checklist pass 07: Does every release path deny on missing eval evidence.
PLAN-3588 Review checklist pass 07: Does every runtime parity claim have evidence refs.
PLAN-3589 Review checklist pass 07: Does every unsupported runtime remain unsupported or schema-only.
PLAN-3590 Review checklist pass 07: Does every mutation-required hook have input schema.
PLAN-3591 Review checklist pass 07: Does every mutation-required hook have output schema.
PLAN-3592 Review checklist pass 07: Does every mutation-required hook have onError deny.
PLAN-3593 Review checklist pass 07: Does every mutation-required hook have timeout.
PLAN-3594 Review checklist pass 07: Does every mutation-required hook forbid async true.
PLAN-3595 Review checklist pass 07: Does adapter deny schema mismatch.
PLAN-3596 Review checklist pass 07: Does invalid hook stdin deny for mutation.
PLAN-3597 Review checklist pass 07: Does unhandled hook error deny for mutation.
PLAN-3598 Review checklist pass 07: Does timeout deny for mutation.
PLAN-3599 Review checklist pass 07: Does env off fail to weaken protected gates.
PLAN-3600 Review checklist pass 07: Does env advisory fail to weaken protected gates.
PLAN-3601 Review checklist pass 07: Does bypass fail to authorize ontology-write.
PLAN-3602 Review checklist pass 07: Does bypass fail to authorize release.
PLAN-3603 Review checklist pass 07: Does semantic ambiguous conflict deny promotion.
PLAN-3604 Review checklist pass 07: Does semantic new candidate without approval deny promotion.
PLAN-3605 Review checklist pass 07: Does rejected mapping deny promotion.
PLAN-3606 Review checklist pass 07: Does llmPromotionUsed true deny promotion.
PLAN-3607 Review checklist pass 07: Does resolver repeatability remain byte-identical.
PLAN-3608 Review checklist pass 07: Does SemanticConversationState hide authority fields from LLM writes.
PLAN-3609 Review checklist pass 07: Does user approval card remain distinct from mutation authorization.
PLAN-3610 Review checklist pass 07: Does DATA remain distinct from ObjectType.
PLAN-3611 Review checklist pass 07: Does LOGIC remain distinct from Function.
PLAN-3612 Review checklist pass 07: Does ACTION remain distinct from ActionType.
PLAN-3613 Review checklist pass 07: Does TECHNOLOGY remain distinct from runtime parity.
PLAN-3614 Review checklist pass 07: Does GOVERNANCE remain distinct from permission.
PLAN-3615 Review checklist pass 07: Does root remain marketplace only.
PLAN-3616 Review checklist pass 07: Does plugin source remain semantic authority.
PLAN-3617 Review checklist pass 07: Does runtime cache remain consumer only.
PLAN-3618 Review checklist pass 07: Does self-check include all new verifiers.
PLAN-3619 Review checklist pass 07: Does PR body include Recovery.
PLAN-3620 Review checklist pass 07: Does PR body include Excluded Scope.
PLAN-3621 Review checklist pass 07: Does diff avoid generated file edits.
PLAN-3622 Review checklist pass 07: Does diff avoid unrelated formatting.
PLAN-3623 Review checklist pass 07: Does final verification include git diff --check.
PLAN-3624 Review checklist pass 08: Does every protected mutation path deny on missing SIC.
PLAN-3625 Review checklist pass 08: Does every ontology-write path deny on missing DTC.
PLAN-3626 Review checklist pass 08: Does every commit or release path deny on missing WorkContract.
PLAN-3627 Review checklist pass 08: Does every release path deny on missing eval evidence.
PLAN-3628 Review checklist pass 08: Does every runtime parity claim have evidence refs.
PLAN-3629 Review checklist pass 08: Does every unsupported runtime remain unsupported or schema-only.
PLAN-3630 Review checklist pass 08: Does every mutation-required hook have input schema.
PLAN-3631 Review checklist pass 08: Does every mutation-required hook have output schema.
PLAN-3632 Review checklist pass 08: Does every mutation-required hook have onError deny.
PLAN-3633 Review checklist pass 08: Does every mutation-required hook have timeout.
PLAN-3634 Review checklist pass 08: Does every mutation-required hook forbid async true.
PLAN-3635 Review checklist pass 08: Does adapter deny schema mismatch.
PLAN-3636 Review checklist pass 08: Does invalid hook stdin deny for mutation.
PLAN-3637 Review checklist pass 08: Does unhandled hook error deny for mutation.
PLAN-3638 Review checklist pass 08: Does timeout deny for mutation.
PLAN-3639 Review checklist pass 08: Does env off fail to weaken protected gates.
PLAN-3640 Review checklist pass 08: Does env advisory fail to weaken protected gates.
PLAN-3641 Review checklist pass 08: Does bypass fail to authorize ontology-write.
PLAN-3642 Review checklist pass 08: Does bypass fail to authorize release.
PLAN-3643 Review checklist pass 08: Does semantic ambiguous conflict deny promotion.
PLAN-3644 Review checklist pass 08: Does semantic new candidate without approval deny promotion.
PLAN-3645 Review checklist pass 08: Does rejected mapping deny promotion.
PLAN-3646 Review checklist pass 08: Does llmPromotionUsed true deny promotion.
PLAN-3647 Review checklist pass 08: Does resolver repeatability remain byte-identical.
PLAN-3648 Review checklist pass 08: Does SemanticConversationState hide authority fields from LLM writes.
PLAN-3649 Review checklist pass 08: Does user approval card remain distinct from mutation authorization.
PLAN-3650 Review checklist pass 08: Does DATA remain distinct from ObjectType.
PLAN-3651 Review checklist pass 08: Does LOGIC remain distinct from Function.
PLAN-3652 Review checklist pass 08: Does ACTION remain distinct from ActionType.
PLAN-3653 Review checklist pass 08: Does TECHNOLOGY remain distinct from runtime parity.
PLAN-3654 Review checklist pass 08: Does GOVERNANCE remain distinct from permission.
PLAN-3655 Review checklist pass 08: Does root remain marketplace only.
PLAN-3656 Review checklist pass 08: Does plugin source remain semantic authority.
PLAN-3657 Review checklist pass 08: Does runtime cache remain consumer only.
PLAN-3658 Review checklist pass 08: Does self-check include all new verifiers.
PLAN-3659 Review checklist pass 08: Does PR body include Recovery.
PLAN-3660 Review checklist pass 08: Does PR body include Excluded Scope.
PLAN-3661 Review checklist pass 08: Does diff avoid generated file edits.
PLAN-3662 Review checklist pass 08: Does diff avoid unrelated formatting.
PLAN-3663 Review checklist pass 08: Does final verification include git diff --check.
PLAN-3664 Review checklist pass 09: Does every protected mutation path deny on missing SIC.
PLAN-3665 Review checklist pass 09: Does every ontology-write path deny on missing DTC.
PLAN-3666 Review checklist pass 09: Does every commit or release path deny on missing WorkContract.
PLAN-3667 Review checklist pass 09: Does every release path deny on missing eval evidence.
PLAN-3668 Review checklist pass 09: Does every runtime parity claim have evidence refs.
PLAN-3669 Review checklist pass 09: Does every unsupported runtime remain unsupported or schema-only.
PLAN-3670 Review checklist pass 09: Does every mutation-required hook have input schema.
PLAN-3671 Review checklist pass 09: Does every mutation-required hook have output schema.
PLAN-3672 Review checklist pass 09: Does every mutation-required hook have onError deny.
PLAN-3673 Review checklist pass 09: Does every mutation-required hook have timeout.
PLAN-3674 Review checklist pass 09: Does every mutation-required hook forbid async true.
PLAN-3675 Review checklist pass 09: Does adapter deny schema mismatch.
PLAN-3676 Review checklist pass 09: Does invalid hook stdin deny for mutation.
PLAN-3677 Review checklist pass 09: Does unhandled hook error deny for mutation.
PLAN-3678 Review checklist pass 09: Does timeout deny for mutation.
PLAN-3679 Review checklist pass 09: Does env off fail to weaken protected gates.
PLAN-3680 Review checklist pass 09: Does env advisory fail to weaken protected gates.
PLAN-3681 Review checklist pass 09: Does bypass fail to authorize ontology-write.
PLAN-3682 Review checklist pass 09: Does bypass fail to authorize release.
PLAN-3683 Review checklist pass 09: Does semantic ambiguous conflict deny promotion.
PLAN-3684 Review checklist pass 09: Does semantic new candidate without approval deny promotion.
PLAN-3685 Review checklist pass 09: Does rejected mapping deny promotion.
PLAN-3686 Review checklist pass 09: Does llmPromotionUsed true deny promotion.
PLAN-3687 Review checklist pass 09: Does resolver repeatability remain byte-identical.
PLAN-3688 Review checklist pass 09: Does SemanticConversationState hide authority fields from LLM writes.
PLAN-3689 Review checklist pass 09: Does user approval card remain distinct from mutation authorization.
PLAN-3690 Review checklist pass 09: Does DATA remain distinct from ObjectType.
PLAN-3691 Review checklist pass 09: Does LOGIC remain distinct from Function.
PLAN-3692 Review checklist pass 09: Does ACTION remain distinct from ActionType.
PLAN-3693 Review checklist pass 09: Does TECHNOLOGY remain distinct from runtime parity.
PLAN-3694 Review checklist pass 09: Does GOVERNANCE remain distinct from permission.
PLAN-3695 Review checklist pass 09: Does root remain marketplace only.
PLAN-3696 Review checklist pass 09: Does plugin source remain semantic authority.
PLAN-3697 Review checklist pass 09: Does runtime cache remain consumer only.
PLAN-3698 Review checklist pass 09: Does self-check include all new verifiers.
PLAN-3699 Review checklist pass 09: Does PR body include Recovery.
PLAN-3700 Review checklist pass 09: Does PR body include Excluded Scope.
PLAN-3701 Review checklist pass 09: Does diff avoid generated file edits.
PLAN-3702 Review checklist pass 09: Does diff avoid unrelated formatting.
PLAN-3703 Review checklist pass 09: Does final verification include git diff --check.
PLAN-3704 Review checklist pass 10: Does every protected mutation path deny on missing SIC.
PLAN-3705 Review checklist pass 10: Does every ontology-write path deny on missing DTC.
PLAN-3706 Review checklist pass 10: Does every commit or release path deny on missing WorkContract.
PLAN-3707 Review checklist pass 10: Does every release path deny on missing eval evidence.
PLAN-3708 Review checklist pass 10: Does every runtime parity claim have evidence refs.
PLAN-3709 Review checklist pass 10: Does every unsupported runtime remain unsupported or schema-only.
PLAN-3710 Review checklist pass 10: Does every mutation-required hook have input schema.
PLAN-3711 Review checklist pass 10: Does every mutation-required hook have output schema.
PLAN-3712 Review checklist pass 10: Does every mutation-required hook have onError deny.
PLAN-3713 Review checklist pass 10: Does every mutation-required hook have timeout.
PLAN-3714 Review checklist pass 10: Does every mutation-required hook forbid async true.
PLAN-3715 Review checklist pass 10: Does adapter deny schema mismatch.
PLAN-3716 Review checklist pass 10: Does invalid hook stdin deny for mutation.
PLAN-3717 Review checklist pass 10: Does unhandled hook error deny for mutation.
PLAN-3718 Review checklist pass 10: Does timeout deny for mutation.
PLAN-3719 Review checklist pass 10: Does env off fail to weaken protected gates.
PLAN-3720 Review checklist pass 10: Does env advisory fail to weaken protected gates.
PLAN-3721 Review checklist pass 10: Does bypass fail to authorize ontology-write.
PLAN-3722 Review checklist pass 10: Does bypass fail to authorize release.
PLAN-3723 Review checklist pass 10: Does semantic ambiguous conflict deny promotion.
PLAN-3724 Review checklist pass 10: Does semantic new candidate without approval deny promotion.
PLAN-3725 Review checklist pass 10: Does rejected mapping deny promotion.
PLAN-3726 Review checklist pass 10: Does llmPromotionUsed true deny promotion.
PLAN-3727 Review checklist pass 10: Does resolver repeatability remain byte-identical.
PLAN-3728 Review checklist pass 10: Does SemanticConversationState hide authority fields from LLM writes.
PLAN-3729 Review checklist pass 10: Does user approval card remain distinct from mutation authorization.
PLAN-3730 Review checklist pass 10: Does DATA remain distinct from ObjectType.
PLAN-3731 Review checklist pass 10: Does LOGIC remain distinct from Function.
PLAN-3732 Review checklist pass 10: Does ACTION remain distinct from ActionType.
PLAN-3733 Review checklist pass 10: Does TECHNOLOGY remain distinct from runtime parity.
PLAN-3734 Review checklist pass 10: Does GOVERNANCE remain distinct from permission.
PLAN-3735 Review checklist pass 10: Does root remain marketplace only.
PLAN-3736 Review checklist pass 10: Does plugin source remain semantic authority.
PLAN-3737 Review checklist pass 10: Does runtime cache remain consumer only.
PLAN-3738 Review checklist pass 10: Does self-check include all new verifiers.
PLAN-3739 Review checklist pass 10: Does PR body include Recovery.
PLAN-3740 Review checklist pass 10: Does PR body include Excluded Scope.
PLAN-3741 Review checklist pass 10: Does diff avoid generated file edits.
PLAN-3742 Review checklist pass 10: Does diff avoid unrelated formatting.
PLAN-3743 Review checklist pass 10: Does final verification include git diff --check.
PLAN-3744 Review checklist pass 11: Does every protected mutation path deny on missing SIC.
PLAN-3745 Review checklist pass 11: Does every ontology-write path deny on missing DTC.
PLAN-3746 Review checklist pass 11: Does every commit or release path deny on missing WorkContract.
PLAN-3747 Review checklist pass 11: Does every release path deny on missing eval evidence.
PLAN-3748 Review checklist pass 11: Does every runtime parity claim have evidence refs.
PLAN-3749 Review checklist pass 11: Does every unsupported runtime remain unsupported or schema-only.
PLAN-3750 Review checklist pass 11: Does every mutation-required hook have input schema.
PLAN-3751 Review checklist pass 11: Does every mutation-required hook have output schema.
PLAN-3752 Review checklist pass 11: Does every mutation-required hook have onError deny.
PLAN-3753 Review checklist pass 11: Does every mutation-required hook have timeout.
PLAN-3754 Review checklist pass 11: Does every mutation-required hook forbid async true.
PLAN-3755 Review checklist pass 11: Does adapter deny schema mismatch.
PLAN-3756 Review checklist pass 11: Does invalid hook stdin deny for mutation.
PLAN-3757 Review checklist pass 11: Does unhandled hook error deny for mutation.
PLAN-3758 Review checklist pass 11: Does timeout deny for mutation.
PLAN-3759 Review checklist pass 11: Does env off fail to weaken protected gates.
PLAN-3760 Review checklist pass 11: Does env advisory fail to weaken protected gates.
PLAN-3761 Review checklist pass 11: Does bypass fail to authorize ontology-write.
PLAN-3762 Review checklist pass 11: Does bypass fail to authorize release.
PLAN-3763 Review checklist pass 11: Does semantic ambiguous conflict deny promotion.
PLAN-3764 Review checklist pass 11: Does semantic new candidate without approval deny promotion.
PLAN-3765 Review checklist pass 11: Does rejected mapping deny promotion.
PLAN-3766 Review checklist pass 11: Does llmPromotionUsed true deny promotion.
PLAN-3767 Review checklist pass 11: Does resolver repeatability remain byte-identical.
PLAN-3768 Review checklist pass 11: Does SemanticConversationState hide authority fields from LLM writes.
PLAN-3769 Review checklist pass 11: Does user approval card remain distinct from mutation authorization.
PLAN-3770 Review checklist pass 11: Does DATA remain distinct from ObjectType.
PLAN-3771 Review checklist pass 11: Does LOGIC remain distinct from Function.
PLAN-3772 Review checklist pass 11: Does ACTION remain distinct from ActionType.
PLAN-3773 Review checklist pass 11: Does TECHNOLOGY remain distinct from runtime parity.
PLAN-3774 Review checklist pass 11: Does GOVERNANCE remain distinct from permission.
PLAN-3775 Review checklist pass 11: Does root remain marketplace only.
PLAN-3776 Review checklist pass 11: Does plugin source remain semantic authority.
PLAN-3777 Review checklist pass 11: Does runtime cache remain consumer only.
PLAN-3778 Review checklist pass 11: Does self-check include all new verifiers.
PLAN-3779 Review checklist pass 11: Does PR body include Recovery.
PLAN-3780 Review checklist pass 11: Does PR body include Excluded Scope.
PLAN-3781 Review checklist pass 11: Does diff avoid generated file edits.
PLAN-3782 Review checklist pass 11: Does diff avoid unrelated formatting.
PLAN-3783 Review checklist pass 11: Does final verification include git diff --check.
PLAN-3784 Review checklist pass 12: Does every protected mutation path deny on missing SIC.
PLAN-3785 Review checklist pass 12: Does every ontology-write path deny on missing DTC.
PLAN-3786 Review checklist pass 12: Does every commit or release path deny on missing WorkContract.
PLAN-3787 Review checklist pass 12: Does every release path deny on missing eval evidence.
PLAN-3788 Review checklist pass 12: Does every runtime parity claim have evidence refs.
PLAN-3789 Review checklist pass 12: Does every unsupported runtime remain unsupported or schema-only.
PLAN-3790 Review checklist pass 12: Does every mutation-required hook have input schema.
PLAN-3791 Review checklist pass 12: Does every mutation-required hook have output schema.
PLAN-3792 Review checklist pass 12: Does every mutation-required hook have onError deny.
PLAN-3793 Review checklist pass 12: Does every mutation-required hook have timeout.
PLAN-3794 Review checklist pass 12: Does every mutation-required hook forbid async true.
PLAN-3795 Review checklist pass 12: Does adapter deny schema mismatch.
PLAN-3796 Review checklist pass 12: Does invalid hook stdin deny for mutation.
PLAN-3797 Review checklist pass 12: Does unhandled hook error deny for mutation.
PLAN-3798 Review checklist pass 12: Does timeout deny for mutation.
PLAN-3799 Review checklist pass 12: Does env off fail to weaken protected gates.
PLAN-3800 Review checklist pass 12: Does env advisory fail to weaken protected gates.
PLAN-3801 Review checklist pass 12: Does bypass fail to authorize ontology-write.
PLAN-3802 Review checklist pass 12: Does bypass fail to authorize release.
PLAN-3803 Review checklist pass 12: Does semantic ambiguous conflict deny promotion.
PLAN-3804 Review checklist pass 12: Does semantic new candidate without approval deny promotion.
PLAN-3805 Review checklist pass 12: Does rejected mapping deny promotion.
PLAN-3806 Review checklist pass 12: Does llmPromotionUsed true deny promotion.
PLAN-3807 Review checklist pass 12: Does resolver repeatability remain byte-identical.
PLAN-3808 Review checklist pass 12: Does SemanticConversationState hide authority fields from LLM writes.
PLAN-3809 Review checklist pass 12: Does user approval card remain distinct from mutation authorization.
PLAN-3810 Review checklist pass 12: Does DATA remain distinct from ObjectType.
PLAN-3811 Review checklist pass 12: Does LOGIC remain distinct from Function.
PLAN-3812 Review checklist pass 12: Does ACTION remain distinct from ActionType.
PLAN-3813 Review checklist pass 12: Does TECHNOLOGY remain distinct from runtime parity.
PLAN-3814 Review checklist pass 12: Does GOVERNANCE remain distinct from permission.
PLAN-3815 Review checklist pass 12: Does root remain marketplace only.
PLAN-3816 Review checklist pass 12: Does plugin source remain semantic authority.
PLAN-3817 Review checklist pass 12: Does runtime cache remain consumer only.
PLAN-3818 Review checklist pass 12: Does self-check include all new verifiers.
PLAN-3819 Review checklist pass 12: Does PR body include Recovery.
PLAN-3820 Review checklist pass 12: Does PR body include Excluded Scope.
PLAN-3821 Review checklist pass 12: Does diff avoid generated file edits.
PLAN-3822 Review checklist pass 12: Does diff avoid unrelated formatting.
PLAN-3823 Review checklist pass 12: Does final verification include git diff --check.
PLAN-3824 Review checklist pass 13: Does every protected mutation path deny on missing SIC.
PLAN-3825 Review checklist pass 13: Does every ontology-write path deny on missing DTC.
PLAN-3826 Review checklist pass 13: Does every commit or release path deny on missing WorkContract.
PLAN-3827 Review checklist pass 13: Does every release path deny on missing eval evidence.
PLAN-3828 Review checklist pass 13: Does every runtime parity claim have evidence refs.
PLAN-3829 Review checklist pass 13: Does every unsupported runtime remain unsupported or schema-only.
PLAN-3830 Review checklist pass 13: Does every mutation-required hook have input schema.
PLAN-3831 Review checklist pass 13: Does every mutation-required hook have output schema.
PLAN-3832 Review checklist pass 13: Does every mutation-required hook have onError deny.
PLAN-3833 Review checklist pass 13: Does every mutation-required hook have timeout.
PLAN-3834 Review checklist pass 13: Does every mutation-required hook forbid async true.
PLAN-3835 Review checklist pass 13: Does adapter deny schema mismatch.
PLAN-3836 Review checklist pass 13: Does invalid hook stdin deny for mutation.
PLAN-3837 Review checklist pass 13: Does unhandled hook error deny for mutation.
PLAN-3838 Review checklist pass 13: Does timeout deny for mutation.
PLAN-3839 Review checklist pass 13: Does env off fail to weaken protected gates.
PLAN-3840 Review checklist pass 13: Does env advisory fail to weaken protected gates.
PLAN-3841 Review checklist pass 13: Does bypass fail to authorize ontology-write.
PLAN-3842 Review checklist pass 13: Does bypass fail to authorize release.
PLAN-3843 Review checklist pass 13: Does semantic ambiguous conflict deny promotion.
PLAN-3844 Review checklist pass 13: Does semantic new candidate without approval deny promotion.
PLAN-3845 Review checklist pass 13: Does rejected mapping deny promotion.
PLAN-3846 Review checklist pass 13: Does llmPromotionUsed true deny promotion.
PLAN-3847 Review checklist pass 13: Does resolver repeatability remain byte-identical.
PLAN-3848 Review checklist pass 13: Does SemanticConversationState hide authority fields from LLM writes.
PLAN-3849 Review checklist pass 13: Does user approval card remain distinct from mutation authorization.
PLAN-3850 Review checklist pass 13: Does DATA remain distinct from ObjectType.
PLAN-3851 Review checklist pass 13: Does LOGIC remain distinct from Function.
PLAN-3852 Review checklist pass 13: Does ACTION remain distinct from ActionType.
PLAN-3853 Review checklist pass 13: Does TECHNOLOGY remain distinct from runtime parity.
PLAN-3854 Review checklist pass 13: Does GOVERNANCE remain distinct from permission.
PLAN-3855 Review checklist pass 13: Does root remain marketplace only.
PLAN-3856 Review checklist pass 13: Does plugin source remain semantic authority.
PLAN-3857 Review checklist pass 13: Does runtime cache remain consumer only.
PLAN-3858 Review checklist pass 13: Does self-check include all new verifiers.
PLAN-3859 Review checklist pass 13: Does PR body include Recovery.
PLAN-3860 Review checklist pass 13: Does PR body include Excluded Scope.
PLAN-3861 Review checklist pass 13: Does diff avoid generated file edits.
PLAN-3862 Review checklist pass 13: Does diff avoid unrelated formatting.
PLAN-3863 Review checklist pass 13: Does final verification include git diff --check.
PLAN-3864 Review checklist pass 14: Does every protected mutation path deny on missing SIC.
PLAN-3865 Review checklist pass 14: Does every ontology-write path deny on missing DTC.
PLAN-3866 Review checklist pass 14: Does every commit or release path deny on missing WorkContract.
PLAN-3867 Review checklist pass 14: Does every release path deny on missing eval evidence.
PLAN-3868 Review checklist pass 14: Does every runtime parity claim have evidence refs.
PLAN-3869 Review checklist pass 14: Does every unsupported runtime remain unsupported or schema-only.
PLAN-3870 Review checklist pass 14: Does every mutation-required hook have input schema.
PLAN-3871 Review checklist pass 14: Does every mutation-required hook have output schema.
PLAN-3872 Review checklist pass 14: Does every mutation-required hook have onError deny.
PLAN-3873 Review checklist pass 14: Does every mutation-required hook have timeout.
PLAN-3874 Review checklist pass 14: Does every mutation-required hook forbid async true.
PLAN-3875 Review checklist pass 14: Does adapter deny schema mismatch.
PLAN-3876 Review checklist pass 14: Does invalid hook stdin deny for mutation.
PLAN-3877 Review checklist pass 14: Does unhandled hook error deny for mutation.
PLAN-3878 Review checklist pass 14: Does timeout deny for mutation.
PLAN-3879 Review checklist pass 14: Does env off fail to weaken protected gates.
PLAN-3880 Review checklist pass 14: Does env advisory fail to weaken protected gates.
PLAN-3881 Review checklist pass 14: Does bypass fail to authorize ontology-write.
PLAN-3882 Review checklist pass 14: Does bypass fail to authorize release.
PLAN-3883 Review checklist pass 14: Does semantic ambiguous conflict deny promotion.
PLAN-3884 Review checklist pass 14: Does semantic new candidate without approval deny promotion.
PLAN-3885 Review checklist pass 14: Does rejected mapping deny promotion.
PLAN-3886 Review checklist pass 14: Does llmPromotionUsed true deny promotion.
PLAN-3887 Review checklist pass 14: Does resolver repeatability remain byte-identical.
PLAN-3888 Review checklist pass 14: Does SemanticConversationState hide authority fields from LLM writes.
PLAN-3889 Review checklist pass 14: Does user approval card remain distinct from mutation authorization.
PLAN-3890 Review checklist pass 14: Does DATA remain distinct from ObjectType.
PLAN-3891 Review checklist pass 14: Does LOGIC remain distinct from Function.
PLAN-3892 Review checklist pass 14: Does ACTION remain distinct from ActionType.
PLAN-3893 Review checklist pass 14: Does TECHNOLOGY remain distinct from runtime parity.
PLAN-3894 Review checklist pass 14: Does GOVERNANCE remain distinct from permission.
PLAN-3895 Review checklist pass 14: Does root remain marketplace only.
PLAN-3896 Review checklist pass 14: Does plugin source remain semantic authority.
PLAN-3897 Review checklist pass 14: Does runtime cache remain consumer only.
PLAN-3898 Review checklist pass 14: Does self-check include all new verifiers.
PLAN-3899 Review checklist pass 14: Does PR body include Recovery.
PLAN-3900 Review checklist pass 14: Does PR body include Excluded Scope.
PLAN-3901 Review checklist pass 14: Does diff avoid generated file edits.
PLAN-3902 Review checklist pass 14: Does diff avoid unrelated formatting.
PLAN-3903 Review checklist pass 14: Does final verification include git diff --check.
PLAN-3904 Review checklist pass 15: Does every protected mutation path deny on missing SIC.
PLAN-3905 Review checklist pass 15: Does every ontology-write path deny on missing DTC.
PLAN-3906 Review checklist pass 15: Does every commit or release path deny on missing WorkContract.
PLAN-3907 Review checklist pass 15: Does every release path deny on missing eval evidence.
PLAN-3908 Review checklist pass 15: Does every runtime parity claim have evidence refs.
PLAN-3909 Review checklist pass 15: Does every unsupported runtime remain unsupported or schema-only.
PLAN-3910 Review checklist pass 15: Does every mutation-required hook have input schema.
PLAN-3911 Review checklist pass 15: Does every mutation-required hook have output schema.
PLAN-3912 Review checklist pass 15: Does every mutation-required hook have onError deny.
PLAN-3913 Review checklist pass 15: Does every mutation-required hook have timeout.
PLAN-3914 Review checklist pass 15: Does every mutation-required hook forbid async true.
PLAN-3915 Review checklist pass 15: Does adapter deny schema mismatch.
PLAN-3916 Review checklist pass 15: Does invalid hook stdin deny for mutation.
PLAN-3917 Review checklist pass 15: Does unhandled hook error deny for mutation.
PLAN-3918 Review checklist pass 15: Does timeout deny for mutation.
PLAN-3919 Review checklist pass 15: Does env off fail to weaken protected gates.
PLAN-3920 Review checklist pass 15: Does env advisory fail to weaken protected gates.
PLAN-3921 Review checklist pass 15: Does bypass fail to authorize ontology-write.
PLAN-3922 Review checklist pass 15: Does bypass fail to authorize release.
PLAN-3923 Review checklist pass 15: Does semantic ambiguous conflict deny promotion.
PLAN-3924 Review checklist pass 15: Does semantic new candidate without approval deny promotion.
PLAN-3925 Review checklist pass 15: Does rejected mapping deny promotion.
PLAN-3926 Review checklist pass 15: Does llmPromotionUsed true deny promotion.
PLAN-3927 Review checklist pass 15: Does resolver repeatability remain byte-identical.
PLAN-3928 Review checklist pass 15: Does SemanticConversationState hide authority fields from LLM writes.
PLAN-3929 Review checklist pass 15: Does user approval card remain distinct from mutation authorization.
PLAN-3930 Review checklist pass 15: Does DATA remain distinct from ObjectType.
PLAN-3931 Review checklist pass 15: Does LOGIC remain distinct from Function.
PLAN-3932 Review checklist pass 15: Does ACTION remain distinct from ActionType.
PLAN-3933 Review checklist pass 15: Does TECHNOLOGY remain distinct from runtime parity.
PLAN-3934 Review checklist pass 15: Does GOVERNANCE remain distinct from permission.
PLAN-3935 Review checklist pass 15: Does root remain marketplace only.
PLAN-3936 Review checklist pass 15: Does plugin source remain semantic authority.
PLAN-3937 Review checklist pass 15: Does runtime cache remain consumer only.
PLAN-3938 Review checklist pass 15: Does self-check include all new verifiers.
PLAN-3939 Review checklist pass 15: Does PR body include Recovery.
PLAN-3940 Review checklist pass 15: Does PR body include Excluded Scope.
PLAN-3941 Review checklist pass 15: Does diff avoid generated file edits.
PLAN-3942 Review checklist pass 15: Does diff avoid unrelated formatting.
PLAN-3943 Review checklist pass 15: Does final verification include git diff --check.
PLAN-3944 Review checklist pass 16: Does every protected mutation path deny on missing SIC.
PLAN-3945 Review checklist pass 16: Does every ontology-write path deny on missing DTC.
PLAN-3946 Review checklist pass 16: Does every commit or release path deny on missing WorkContract.
PLAN-3947 Review checklist pass 16: Does every release path deny on missing eval evidence.
PLAN-3948 Review checklist pass 16: Does every runtime parity claim have evidence refs.
PLAN-3949 Review checklist pass 16: Does every unsupported runtime remain unsupported or schema-only.
PLAN-3950 Review checklist pass 16: Does every mutation-required hook have input schema.
PLAN-3951 Review checklist pass 16: Does every mutation-required hook have output schema.
PLAN-3952 Review checklist pass 16: Does every mutation-required hook have onError deny.
PLAN-3953 Review checklist pass 16: Does every mutation-required hook have timeout.
PLAN-3954 Review checklist pass 16: Does every mutation-required hook forbid async true.
PLAN-3955 Review checklist pass 16: Does adapter deny schema mismatch.
PLAN-3956 Review checklist pass 16: Does invalid hook stdin deny for mutation.
PLAN-3957 Review checklist pass 16: Does unhandled hook error deny for mutation.
PLAN-3958 Review checklist pass 16: Does timeout deny for mutation.
PLAN-3959 Review checklist pass 16: Does env off fail to weaken protected gates.
PLAN-3960 Review checklist pass 16: Does env advisory fail to weaken protected gates.
PLAN-3961 Review checklist pass 16: Does bypass fail to authorize ontology-write.
PLAN-3962 Review checklist pass 16: Does bypass fail to authorize release.
PLAN-3963 Review checklist pass 16: Does semantic ambiguous conflict deny promotion.
PLAN-3964 Review checklist pass 16: Does semantic new candidate without approval deny promotion.
PLAN-3965 Review checklist pass 16: Does rejected mapping deny promotion.
PLAN-3966 Review checklist pass 16: Does llmPromotionUsed true deny promotion.
PLAN-3967 Review checklist pass 16: Does resolver repeatability remain byte-identical.
PLAN-3968 Review checklist pass 16: Does SemanticConversationState hide authority fields from LLM writes.
PLAN-3969 Review checklist pass 16: Does user approval card remain distinct from mutation authorization.
PLAN-3970 Review checklist pass 16: Does DATA remain distinct from ObjectType.
PLAN-3971 Review checklist pass 16: Does LOGIC remain distinct from Function.
PLAN-3972 Review checklist pass 16: Does ACTION remain distinct from ActionType.
PLAN-3973 Review checklist pass 16: Does TECHNOLOGY remain distinct from runtime parity.
PLAN-3974 Review checklist pass 16: Does GOVERNANCE remain distinct from permission.
PLAN-3975 Review checklist pass 16: Does root remain marketplace only.
PLAN-3976 Review checklist pass 16: Does plugin source remain semantic authority.
PLAN-3977 Review checklist pass 16: Does runtime cache remain consumer only.
PLAN-3978 Review checklist pass 16: Does self-check include all new verifiers.
PLAN-3979 Review checklist pass 16: Does PR body include Recovery.
PLAN-3980 Review checklist pass 16: Does PR body include Excluded Scope.
PLAN-3981 Review checklist pass 16: Does diff avoid generated file edits.
PLAN-3982 Review checklist pass 16: Does diff avoid unrelated formatting.
PLAN-3983 Review checklist pass 16: Does final verification include git diff --check.
PLAN-3984 Review checklist pass 17: Does every protected mutation path deny on missing SIC.
PLAN-3985 Review checklist pass 17: Does every ontology-write path deny on missing DTC.
PLAN-3986 Review checklist pass 17: Does every commit or release path deny on missing WorkContract.
PLAN-3987 Review checklist pass 17: Does every release path deny on missing eval evidence.
PLAN-3988 Review checklist pass 17: Does every runtime parity claim have evidence refs.
PLAN-3989 Review checklist pass 17: Does every unsupported runtime remain unsupported or schema-only.
PLAN-3990 Review checklist pass 17: Does every mutation-required hook have input schema.
PLAN-3991 Review checklist pass 17: Does every mutation-required hook have output schema.
PLAN-3992 Review checklist pass 17: Does every mutation-required hook have onError deny.
PLAN-3993 Review checklist pass 17: Does every mutation-required hook have timeout.
PLAN-3994 Review checklist pass 17: Does every mutation-required hook forbid async true.
PLAN-3995 Review checklist pass 17: Does adapter deny schema mismatch.
PLAN-3996 Review checklist pass 17: Does invalid hook stdin deny for mutation.
PLAN-3997 Review checklist pass 17: Does unhandled hook error deny for mutation.
PLAN-3998 Review checklist pass 17: Does timeout deny for mutation.
PLAN-3999 Review checklist pass 17: Does env off fail to weaken protected gates.
PLAN-4000 Review checklist pass 17: Does env advisory fail to weaken protected gates.
PLAN-4001 Review checklist pass 17: Does bypass fail to authorize ontology-write.
PLAN-4002 Review checklist pass 17: Does bypass fail to authorize release.
PLAN-4003 Review checklist pass 17: Does semantic ambiguous conflict deny promotion.
PLAN-4004 Review checklist pass 17: Does semantic new candidate without approval deny promotion.
PLAN-4005 Review checklist pass 17: Does rejected mapping deny promotion.
PLAN-4006 Review checklist pass 17: Does llmPromotionUsed true deny promotion.
PLAN-4007 Review checklist pass 17: Does resolver repeatability remain byte-identical.
PLAN-4008 Review checklist pass 17: Does SemanticConversationState hide authority fields from LLM writes.
PLAN-4009 Review checklist pass 17: Does user approval card remain distinct from mutation authorization.
PLAN-4010 Review checklist pass 17: Does DATA remain distinct from ObjectType.
PLAN-4011 Review checklist pass 17: Does LOGIC remain distinct from Function.
PLAN-4012 Review checklist pass 17: Does ACTION remain distinct from ActionType.
PLAN-4013 Review checklist pass 17: Does TECHNOLOGY remain distinct from runtime parity.
PLAN-4014 Review checklist pass 17: Does GOVERNANCE remain distinct from permission.
PLAN-4015 Review checklist pass 17: Does root remain marketplace only.
PLAN-4016 Review checklist pass 17: Does plugin source remain semantic authority.
PLAN-4017 Review checklist pass 17: Does runtime cache remain consumer only.
PLAN-4018 Review checklist pass 17: Does self-check include all new verifiers.
PLAN-4019 Review checklist pass 17: Does PR body include Recovery.
PLAN-4020 Review checklist pass 17: Does PR body include Excluded Scope.
PLAN-4021 Review checklist pass 17: Does diff avoid generated file edits.
PLAN-4022 Review checklist pass 17: Does diff avoid unrelated formatting.
PLAN-4023 Review checklist pass 17: Does final verification include git diff --check.
PLAN-4024 Review checklist pass 18: Does every protected mutation path deny on missing SIC.
PLAN-4025 Review checklist pass 18: Does every ontology-write path deny on missing DTC.
PLAN-4026 Review checklist pass 18: Does every commit or release path deny on missing WorkContract.
PLAN-4027 Review checklist pass 18: Does every release path deny on missing eval evidence.
PLAN-4028 Review checklist pass 18: Does every runtime parity claim have evidence refs.
PLAN-4029 Review checklist pass 18: Does every unsupported runtime remain unsupported or schema-only.
PLAN-4030 Review checklist pass 18: Does every mutation-required hook have input schema.
PLAN-4031 Review checklist pass 18: Does every mutation-required hook have output schema.
PLAN-4032 Review checklist pass 18: Does every mutation-required hook have onError deny.
PLAN-4033 Review checklist pass 18: Does every mutation-required hook have timeout.
PLAN-4034 Review checklist pass 18: Does every mutation-required hook forbid async true.
PLAN-4035 Review checklist pass 18: Does adapter deny schema mismatch.
PLAN-4036 Review checklist pass 18: Does invalid hook stdin deny for mutation.
PLAN-4037 Review checklist pass 18: Does unhandled hook error deny for mutation.
PLAN-4038 Review checklist pass 18: Does timeout deny for mutation.
PLAN-4039 Review checklist pass 18: Does env off fail to weaken protected gates.
PLAN-4040 Review checklist pass 18: Does env advisory fail to weaken protected gates.
PLAN-4041 Review checklist pass 18: Does bypass fail to authorize ontology-write.
PLAN-4042 Review checklist pass 18: Does bypass fail to authorize release.
PLAN-4043 Review checklist pass 18: Does semantic ambiguous conflict deny promotion.
PLAN-4044 Review checklist pass 18: Does semantic new candidate without approval deny promotion.
PLAN-4045 Review checklist pass 18: Does rejected mapping deny promotion.
PLAN-4046 Review checklist pass 18: Does llmPromotionUsed true deny promotion.
PLAN-4047 Review checklist pass 18: Does resolver repeatability remain byte-identical.
PLAN-4048 Review checklist pass 18: Does SemanticConversationState hide authority fields from LLM writes.
PLAN-4049 Review checklist pass 18: Does user approval card remain distinct from mutation authorization.
PLAN-4050 Review checklist pass 18: Does DATA remain distinct from ObjectType.
PLAN-4051 Review checklist pass 18: Does LOGIC remain distinct from Function.
PLAN-4052 Review checklist pass 18: Does ACTION remain distinct from ActionType.
PLAN-4053 Review checklist pass 18: Does TECHNOLOGY remain distinct from runtime parity.
PLAN-4054 Review checklist pass 18: Does GOVERNANCE remain distinct from permission.
PLAN-4055 Review checklist pass 18: Does root remain marketplace only.
PLAN-4056 Review checklist pass 18: Does plugin source remain semantic authority.
PLAN-4057 Review checklist pass 18: Does runtime cache remain consumer only.
PLAN-4058 Review checklist pass 18: Does self-check include all new verifiers.
PLAN-4059 Review checklist pass 18: Does PR body include Recovery.
PLAN-4060 Review checklist pass 18: Does PR body include Excluded Scope.
PLAN-4061 Review checklist pass 18: Does diff avoid generated file edits.
PLAN-4062 Review checklist pass 18: Does diff avoid unrelated formatting.
PLAN-4063 Review checklist pass 18: Does final verification include git diff --check.
PLAN-4064 Review checklist pass 19: Does every protected mutation path deny on missing SIC.
PLAN-4065 Review checklist pass 19: Does every ontology-write path deny on missing DTC.
PLAN-4066 Review checklist pass 19: Does every commit or release path deny on missing WorkContract.
PLAN-4067 Review checklist pass 19: Does every release path deny on missing eval evidence.
PLAN-4068 Review checklist pass 19: Does every runtime parity claim have evidence refs.
PLAN-4069 Review checklist pass 19: Does every unsupported runtime remain unsupported or schema-only.
PLAN-4070 Review checklist pass 19: Does every mutation-required hook have input schema.
PLAN-4071 Review checklist pass 19: Does every mutation-required hook have output schema.
PLAN-4072 Review checklist pass 19: Does every mutation-required hook have onError deny.
PLAN-4073 Review checklist pass 19: Does every mutation-required hook have timeout.
PLAN-4074 Review checklist pass 19: Does every mutation-required hook forbid async true.
PLAN-4075 Review checklist pass 19: Does adapter deny schema mismatch.
PLAN-4076 Review checklist pass 19: Does invalid hook stdin deny for mutation.
PLAN-4077 Review checklist pass 19: Does unhandled hook error deny for mutation.
PLAN-4078 Review checklist pass 19: Does timeout deny for mutation.
PLAN-4079 Review checklist pass 19: Does env off fail to weaken protected gates.
PLAN-4080 Review checklist pass 19: Does env advisory fail to weaken protected gates.
PLAN-4081 Review checklist pass 19: Does bypass fail to authorize ontology-write.
PLAN-4082 Review checklist pass 19: Does bypass fail to authorize release.
PLAN-4083 Review checklist pass 19: Does semantic ambiguous conflict deny promotion.
PLAN-4084 Review checklist pass 19: Does semantic new candidate without approval deny promotion.
PLAN-4085 Review checklist pass 19: Does rejected mapping deny promotion.
PLAN-4086 Review checklist pass 19: Does llmPromotionUsed true deny promotion.
PLAN-4087 Review checklist pass 19: Does resolver repeatability remain byte-identical.
PLAN-4088 Review checklist pass 19: Does SemanticConversationState hide authority fields from LLM writes.
PLAN-4089 Review checklist pass 19: Does user approval card remain distinct from mutation authorization.
PLAN-4090 Review checklist pass 19: Does DATA remain distinct from ObjectType.
PLAN-4091 Review checklist pass 19: Does LOGIC remain distinct from Function.
PLAN-4092 Review checklist pass 19: Does ACTION remain distinct from ActionType.
PLAN-4093 Review checklist pass 19: Does TECHNOLOGY remain distinct from runtime parity.
PLAN-4094 Review checklist pass 19: Does GOVERNANCE remain distinct from permission.
PLAN-4095 Review checklist pass 19: Does root remain marketplace only.
PLAN-4096 Review checklist pass 19: Does plugin source remain semantic authority.
PLAN-4097 Review checklist pass 19: Does runtime cache remain consumer only.
PLAN-4098 Review checklist pass 19: Does self-check include all new verifiers.
PLAN-4099 Review checklist pass 19: Does PR body include Recovery.
PLAN-4100 Review checklist pass 19: Does PR body include Excluded Scope.
PLAN-4101 Review checklist pass 19: Does diff avoid generated file edits.
PLAN-4102 Review checklist pass 19: Does diff avoid unrelated formatting.
PLAN-4103 Review checklist pass 19: Does final verification include git diff --check.
PLAN-4104 Review checklist pass 20: Does every protected mutation path deny on missing SIC.
PLAN-4105 Review checklist pass 20: Does every ontology-write path deny on missing DTC.
PLAN-4106 Review checklist pass 20: Does every commit or release path deny on missing WorkContract.
PLAN-4107 Review checklist pass 20: Does every release path deny on missing eval evidence.
PLAN-4108 Review checklist pass 20: Does every runtime parity claim have evidence refs.
PLAN-4109 Review checklist pass 20: Does every unsupported runtime remain unsupported or schema-only.
PLAN-4110 Review checklist pass 20: Does every mutation-required hook have input schema.
PLAN-4111 Review checklist pass 20: Does every mutation-required hook have output schema.
PLAN-4112 Review checklist pass 20: Does every mutation-required hook have onError deny.
PLAN-4113 Review checklist pass 20: Does every mutation-required hook have timeout.
PLAN-4114 Review checklist pass 20: Does every mutation-required hook forbid async true.
PLAN-4115 Review checklist pass 20: Does adapter deny schema mismatch.
PLAN-4116 Review checklist pass 20: Does invalid hook stdin deny for mutation.
PLAN-4117 Review checklist pass 20: Does unhandled hook error deny for mutation.
PLAN-4118 Review checklist pass 20: Does timeout deny for mutation.
PLAN-4119 Review checklist pass 20: Does env off fail to weaken protected gates.
PLAN-4120 Review checklist pass 20: Does env advisory fail to weaken protected gates.
PLAN-4121 Review checklist pass 20: Does bypass fail to authorize ontology-write.
PLAN-4122 Review checklist pass 20: Does bypass fail to authorize release.
PLAN-4123 Review checklist pass 20: Does semantic ambiguous conflict deny promotion.
PLAN-4124 Review checklist pass 20: Does semantic new candidate without approval deny promotion.
PLAN-4125 Review checklist pass 20: Does rejected mapping deny promotion.
PLAN-4126 Review checklist pass 20: Does llmPromotionUsed true deny promotion.
PLAN-4127 Review checklist pass 20: Does resolver repeatability remain byte-identical.
PLAN-4128 Review checklist pass 20: Does SemanticConversationState hide authority fields from LLM writes.
PLAN-4129 Review checklist pass 20: Does user approval card remain distinct from mutation authorization.
PLAN-4130 Review checklist pass 20: Does DATA remain distinct from ObjectType.
PLAN-4131 Review checklist pass 20: Does LOGIC remain distinct from Function.
PLAN-4132 Review checklist pass 20: Does ACTION remain distinct from ActionType.
PLAN-4133 Review checklist pass 20: Does TECHNOLOGY remain distinct from runtime parity.
PLAN-4134 Review checklist pass 20: Does GOVERNANCE remain distinct from permission.
PLAN-4135 Review checklist pass 20: Does root remain marketplace only.
PLAN-4136 Review checklist pass 20: Does plugin source remain semantic authority.
PLAN-4137 Review checklist pass 20: Does runtime cache remain consumer only.
PLAN-4138 Review checklist pass 20: Does self-check include all new verifiers.
PLAN-4139 Review checklist pass 20: Does PR body include Recovery.
PLAN-4140 Review checklist pass 20: Does PR body include Excluded Scope.
PLAN-4141 Review checklist pass 20: Does diff avoid generated file edits.
PLAN-4142 Review checklist pass 20: Does diff avoid unrelated formatting.
PLAN-4143 Review checklist pass 20: Does final verification include git diff --check.
PLAN-4144 Review checklist pass 21: Does every protected mutation path deny on missing SIC.
PLAN-4145 Review checklist pass 21: Does every ontology-write path deny on missing DTC.
PLAN-4146 Review checklist pass 21: Does every commit or release path deny on missing WorkContract.
PLAN-4147 Review checklist pass 21: Does every release path deny on missing eval evidence.
PLAN-4148 Review checklist pass 21: Does every runtime parity claim have evidence refs.
PLAN-4149 Review checklist pass 21: Does every unsupported runtime remain unsupported or schema-only.
PLAN-4150 Review checklist pass 21: Does every mutation-required hook have input schema.
PLAN-4151 Review checklist pass 21: Does every mutation-required hook have output schema.
PLAN-4152 Review checklist pass 21: Does every mutation-required hook have onError deny.
PLAN-4153 Review checklist pass 21: Does every mutation-required hook have timeout.
PLAN-4154 Review checklist pass 21: Does every mutation-required hook forbid async true.
PLAN-4155 Review checklist pass 21: Does adapter deny schema mismatch.
PLAN-4156 Review checklist pass 21: Does invalid hook stdin deny for mutation.
PLAN-4157 Review checklist pass 21: Does unhandled hook error deny for mutation.
PLAN-4158 Review checklist pass 21: Does timeout deny for mutation.
PLAN-4159 Review checklist pass 21: Does env off fail to weaken protected gates.
PLAN-4160 Review checklist pass 21: Does env advisory fail to weaken protected gates.
PLAN-4161 Review checklist pass 21: Does bypass fail to authorize ontology-write.
PLAN-4162 Review checklist pass 21: Does bypass fail to authorize release.
PLAN-4163 Review checklist pass 21: Does semantic ambiguous conflict deny promotion.
PLAN-4164 Review checklist pass 21: Does semantic new candidate without approval deny promotion.
PLAN-4165 Review checklist pass 21: Does rejected mapping deny promotion.
PLAN-4166 Review checklist pass 21: Does llmPromotionUsed true deny promotion.
PLAN-4167 Review checklist pass 21: Does resolver repeatability remain byte-identical.
PLAN-4168 Review checklist pass 21: Does SemanticConversationState hide authority fields from LLM writes.
PLAN-4169 Review checklist pass 21: Does user approval card remain distinct from mutation authorization.
PLAN-4170 Review checklist pass 21: Does DATA remain distinct from ObjectType.
PLAN-4171 Review checklist pass 21: Does LOGIC remain distinct from Function.
PLAN-4172 Review checklist pass 21: Does ACTION remain distinct from ActionType.
PLAN-4173 Review checklist pass 21: Does TECHNOLOGY remain distinct from runtime parity.
PLAN-4174 Review checklist pass 21: Does GOVERNANCE remain distinct from permission.
PLAN-4175 Review checklist pass 21: Does root remain marketplace only.
PLAN-4176 Review checklist pass 21: Does plugin source remain semantic authority.
PLAN-4177 Review checklist pass 21: Does runtime cache remain consumer only.
PLAN-4178 Review checklist pass 21: Does self-check include all new verifiers.
PLAN-4179 Review checklist pass 21: Does PR body include Recovery.
PLAN-4180 Review checklist pass 21: Does PR body include Excluded Scope.
PLAN-4181 Review checklist pass 21: Does diff avoid generated file edits.
PLAN-4182 Review checklist pass 21: Does diff avoid unrelated formatting.
PLAN-4183 Review checklist pass 21: Does final verification include git diff --check.
PLAN-4184 Review checklist pass 22: Does every protected mutation path deny on missing SIC.
PLAN-4185 Review checklist pass 22: Does every ontology-write path deny on missing DTC.
PLAN-4186 Review checklist pass 22: Does every commit or release path deny on missing WorkContract.
PLAN-4187 Review checklist pass 22: Does every release path deny on missing eval evidence.
PLAN-4188 Review checklist pass 22: Does every runtime parity claim have evidence refs.
PLAN-4189 Review checklist pass 22: Does every unsupported runtime remain unsupported or schema-only.
PLAN-4190 Review checklist pass 22: Does every mutation-required hook have input schema.
PLAN-4191 Review checklist pass 22: Does every mutation-required hook have output schema.
PLAN-4192 Review checklist pass 22: Does every mutation-required hook have onError deny.
PLAN-4193 Review checklist pass 22: Does every mutation-required hook have timeout.
PLAN-4194 Review checklist pass 22: Does every mutation-required hook forbid async true.
PLAN-4195 Review checklist pass 22: Does adapter deny schema mismatch.
PLAN-4196 Review checklist pass 22: Does invalid hook stdin deny for mutation.
PLAN-4197 Review checklist pass 22: Does unhandled hook error deny for mutation.
PLAN-4198 Review checklist pass 22: Does timeout deny for mutation.
PLAN-4199 Review checklist pass 22: Does env off fail to weaken protected gates.
PLAN-4200 Review checklist pass 22: Does env advisory fail to weaken protected gates.
PLAN-4201 Review checklist pass 22: Does bypass fail to authorize ontology-write.
PLAN-4202 Review checklist pass 22: Does bypass fail to authorize release.
PLAN-4203 Review checklist pass 22: Does semantic ambiguous conflict deny promotion.
PLAN-4204 Review checklist pass 22: Does semantic new candidate without approval deny promotion.
PLAN-4205 Review checklist pass 22: Does rejected mapping deny promotion.
PLAN-4206 Review checklist pass 22: Does llmPromotionUsed true deny promotion.
PLAN-4207 Review checklist pass 22: Does resolver repeatability remain byte-identical.
PLAN-4208 Review checklist pass 22: Does SemanticConversationState hide authority fields from LLM writes.
PLAN-4209 Review checklist pass 22: Does user approval card remain distinct from mutation authorization.
PLAN-4210 Review checklist pass 22: Does DATA remain distinct from ObjectType.
PLAN-4211 Review checklist pass 22: Does LOGIC remain distinct from Function.
PLAN-4212 Review checklist pass 22: Does ACTION remain distinct from ActionType.
PLAN-4213 Review checklist pass 22: Does TECHNOLOGY remain distinct from runtime parity.
PLAN-4214 Review checklist pass 22: Does GOVERNANCE remain distinct from permission.
PLAN-4215 Review checklist pass 22: Does root remain marketplace only.
PLAN-4216 Review checklist pass 22: Does plugin source remain semantic authority.
PLAN-4217 Review checklist pass 22: Does runtime cache remain consumer only.
PLAN-4218 Review checklist pass 22: Does self-check include all new verifiers.
PLAN-4219 Review checklist pass 22: Does PR body include Recovery.
PLAN-4220 Review checklist pass 22: Does PR body include Excluded Scope.
PLAN-4221 Review checklist pass 22: Does diff avoid generated file edits.
PLAN-4222 Review checklist pass 22: Does diff avoid unrelated formatting.
PLAN-4223 Review checklist pass 22: Does final verification include git diff --check.
PLAN-4224 Review checklist pass 23: Does every protected mutation path deny on missing SIC.
PLAN-4225 Review checklist pass 23: Does every ontology-write path deny on missing DTC.
PLAN-4226 Review checklist pass 23: Does every commit or release path deny on missing WorkContract.
PLAN-4227 Review checklist pass 23: Does every release path deny on missing eval evidence.
PLAN-4228 Review checklist pass 23: Does every runtime parity claim have evidence refs.
PLAN-4229 Review checklist pass 23: Does every unsupported runtime remain unsupported or schema-only.
PLAN-4230 Review checklist pass 23: Does every mutation-required hook have input schema.
PLAN-4231 Review checklist pass 23: Does every mutation-required hook have output schema.
PLAN-4232 Review checklist pass 23: Does every mutation-required hook have onError deny.
PLAN-4233 Review checklist pass 23: Does every mutation-required hook have timeout.
PLAN-4234 Review checklist pass 23: Does every mutation-required hook forbid async true.
PLAN-4235 Review checklist pass 23: Does adapter deny schema mismatch.
PLAN-4236 Review checklist pass 23: Does invalid hook stdin deny for mutation.
PLAN-4237 Review checklist pass 23: Does unhandled hook error deny for mutation.
PLAN-4238 Review checklist pass 23: Does timeout deny for mutation.
PLAN-4239 Review checklist pass 23: Does env off fail to weaken protected gates.
PLAN-4240 Review checklist pass 23: Does env advisory fail to weaken protected gates.
PLAN-4241 Review checklist pass 23: Does bypass fail to authorize ontology-write.
PLAN-4242 Review checklist pass 23: Does bypass fail to authorize release.
PLAN-4243 Review checklist pass 23: Does semantic ambiguous conflict deny promotion.
PLAN-4244 Review checklist pass 23: Does semantic new candidate without approval deny promotion.
PLAN-4245 Review checklist pass 23: Does rejected mapping deny promotion.
PLAN-4246 Review checklist pass 23: Does llmPromotionUsed true deny promotion.
PLAN-4247 Review checklist pass 23: Does resolver repeatability remain byte-identical.
PLAN-4248 Review checklist pass 23: Does SemanticConversationState hide authority fields from LLM writes.
PLAN-4249 Review checklist pass 23: Does user approval card remain distinct from mutation authorization.
PLAN-4250 Review checklist pass 23: Does DATA remain distinct from ObjectType.
PLAN-4251 Review checklist pass 23: Does LOGIC remain distinct from Function.
PLAN-4252 Review checklist pass 23: Does ACTION remain distinct from ActionType.
PLAN-4253 Review checklist pass 23: Does TECHNOLOGY remain distinct from runtime parity.
PLAN-4254 Review checklist pass 23: Does GOVERNANCE remain distinct from permission.
PLAN-4255 Review checklist pass 23: Does root remain marketplace only.
PLAN-4256 Review checklist pass 23: Does plugin source remain semantic authority.
PLAN-4257 Review checklist pass 23: Does runtime cache remain consumer only.
PLAN-4258 Review checklist pass 23: Does self-check include all new verifiers.
PLAN-4259 Review checklist pass 23: Does PR body include Recovery.
PLAN-4260 Review checklist pass 23: Does PR body include Excluded Scope.
PLAN-4261 Review checklist pass 23: Does diff avoid generated file edits.
PLAN-4262 Review checklist pass 23: Does diff avoid unrelated formatting.
PLAN-4263 Review checklist pass 23: Does final verification include git diff --check.
PLAN-4264 Review checklist pass 24: Does every protected mutation path deny on missing SIC.
PLAN-4265 Review checklist pass 24: Does every ontology-write path deny on missing DTC.
PLAN-4266 Review checklist pass 24: Does every commit or release path deny on missing WorkContract.
PLAN-4267 Review checklist pass 24: Does every release path deny on missing eval evidence.
PLAN-4268 Review checklist pass 24: Does every runtime parity claim have evidence refs.
PLAN-4269 Review checklist pass 24: Does every unsupported runtime remain unsupported or schema-only.
PLAN-4270 Review checklist pass 24: Does every mutation-required hook have input schema.
PLAN-4271 Review checklist pass 24: Does every mutation-required hook have output schema.
PLAN-4272 Review checklist pass 24: Does every mutation-required hook have onError deny.
PLAN-4273 Review checklist pass 24: Does every mutation-required hook have timeout.
PLAN-4274 Review checklist pass 24: Does every mutation-required hook forbid async true.
PLAN-4275 Review checklist pass 24: Does adapter deny schema mismatch.
PLAN-4276 Review checklist pass 24: Does invalid hook stdin deny for mutation.
PLAN-4277 Review checklist pass 24: Does unhandled hook error deny for mutation.
PLAN-4278 Review checklist pass 24: Does timeout deny for mutation.
PLAN-4279 Review checklist pass 24: Does env off fail to weaken protected gates.
PLAN-4280 Review checklist pass 24: Does env advisory fail to weaken protected gates.
PLAN-4281 Review checklist pass 24: Does bypass fail to authorize ontology-write.
PLAN-4282 Review checklist pass 24: Does bypass fail to authorize release.
PLAN-4283 Review checklist pass 24: Does semantic ambiguous conflict deny promotion.
PLAN-4284 Review checklist pass 24: Does semantic new candidate without approval deny promotion.
PLAN-4285 Review checklist pass 24: Does rejected mapping deny promotion.
PLAN-4286 Review checklist pass 24: Does llmPromotionUsed true deny promotion.
PLAN-4287 Review checklist pass 24: Does resolver repeatability remain byte-identical.
PLAN-4288 Review checklist pass 24: Does SemanticConversationState hide authority fields from LLM writes.
PLAN-4289 Review checklist pass 24: Does user approval card remain distinct from mutation authorization.
PLAN-4290 Review checklist pass 24: Does DATA remain distinct from ObjectType.
PLAN-4291 Review checklist pass 24: Does LOGIC remain distinct from Function.
PLAN-4292 Review checklist pass 24: Does ACTION remain distinct from ActionType.
PLAN-4293 Review checklist pass 24: Does TECHNOLOGY remain distinct from runtime parity.
PLAN-4294 Review checklist pass 24: Does GOVERNANCE remain distinct from permission.
PLAN-4295 Review checklist pass 24: Does root remain marketplace only.
PLAN-4296 Review checklist pass 24: Does plugin source remain semantic authority.
PLAN-4297 Review checklist pass 24: Does runtime cache remain consumer only.
PLAN-4298 Review checklist pass 24: Does self-check include all new verifiers.
PLAN-4299 Review checklist pass 24: Does PR body include Recovery.
PLAN-4300 Review checklist pass 24: Does PR body include Excluded Scope.
PLAN-4301 Review checklist pass 24: Does diff avoid generated file edits.
PLAN-4302 Review checklist pass 24: Does diff avoid unrelated formatting.
PLAN-4303 Review checklist pass 24: Does final verification include git diff --check.
## Non-Goals

PLAN-4304 Non-goal: Do not implement full Claude packaging in this sequence.
PLAN-4305 Non-goal enforcement: reviewer MUST ask for removal if implementation introduces this behavior.
PLAN-4306 Non-goal: Do not implement full Gemini packaging in this sequence.
PLAN-4307 Non-goal enforcement: reviewer MUST ask for removal if implementation introduces this behavior.
PLAN-4308 Non-goal: Do not treat Codex runtime metadata as semantic authority.
PLAN-4309 Non-goal enforcement: reviewer MUST ask for removal if implementation introduces this behavior.
PLAN-4310 Non-goal: Do not migrate source authority into runtime cache.
PLAN-4311 Non-goal enforcement: reviewer MUST ask for removal if implementation introduces this behavior.
PLAN-4312 Non-goal: Do not add root-level workflow family definitions.
PLAN-4313 Non-goal enforcement: reviewer MUST ask for removal if implementation introduces this behavior.
PLAN-4314 Non-goal: Do not edit generated files directly.
PLAN-4315 Non-goal enforcement: reviewer MUST ask for removal if implementation introduces this behavior.
PLAN-4316 Non-goal: Do not make LLM prompts longer as a substitute for deterministic gates.
PLAN-4317 Non-goal enforcement: reviewer MUST ask for removal if implementation introduces this behavior.
PLAN-4318 Non-goal: Do not make UX approval cards authorize mutation.
PLAN-4319 Non-goal enforcement: reviewer MUST ask for removal if implementation introduces this behavior.
PLAN-4320 Non-goal: Do not make eval success alone authorize mutation.
PLAN-4321 Non-goal enforcement: reviewer MUST ask for removal if implementation introduces this behavior.
PLAN-4322 Non-goal: Do not make docs alone authorize release.
PLAN-4323 Non-goal enforcement: reviewer MUST ask for removal if implementation introduces this behavior.
PLAN-4324 Non-goal: Do not add new bypass env vars.
PLAN-4325 Non-goal enforcement: reviewer MUST ask for removal if implementation introduces this behavior.
PLAN-4326 Non-goal: Do not weaken project policy for local convenience.
PLAN-4327 Non-goal enforcement: reviewer MUST ask for removal if implementation introduces this behavior.
PLAN-4328 Non-goal: Do not conflate AIP ContextEngineering domains with Ontology primitive kinds.
PLAN-4329 Non-goal enforcement: reviewer MUST ask for removal if implementation introduces this behavior.
PLAN-4330 Non-goal: Do not hide runtime gaps behind parity language.
PLAN-4331 Non-goal enforcement: reviewer MUST ask for removal if implementation introduces this behavior.
PLAN-4332 Non-goal: Do not make broad refactors inside critical hotfix PRs.
PLAN-4333 Non-goal enforcement: reviewer MUST ask for removal if implementation introduces this behavior.
PLAN-4334 Non-goal: Do not use palantir-mini plugin workflows to author implementation plans about palantir-mini itself.
PLAN-4335 Non-goal enforcement: reviewer MUST ask for removal if implementation introduces this behavior.
## Final Acceptance Gates For The Whole Program

PLAN-4336 Final program acceptance 01: commit-edits-governance unhandled error returns deny.
PLAN-4337 Final program acceptance 01 proof: include test, verifier output, or self-check finding evidence.
PLAN-4338 Final program acceptance 01 failure response: block release until corrected.
PLAN-4339 Final program acceptance 02: commit-edits-governance invalid stdin returns deny for protected mutation.
PLAN-4340 Final program acceptance 02 proof: include test, verifier output, or self-check finding evidence.
PLAN-4341 Final program acceptance 02 failure response: block release until corrected.
PLAN-4342 Final program acceptance 03: prompt-dtc-enforcement bypass cannot authorize protected mutation.
PLAN-4343 Final program acceptance 03 proof: include test, verifier output, or self-check finding evidence.
PLAN-4344 Final program acceptance 03 failure response: block release until corrected.
PLAN-4345 Final program acceptance 04: effective gate mode is max(project minimum, env requested strength).
PLAN-4346 Final program acceptance 04 proof: include test, verifier output, or self-check finding evidence.
PLAN-4347 Final program acceptance 04 failure response: block release until corrected.
PLAN-4348 Final program acceptance 05: pm_pre_mutation_governance exists as compute-only public surface.
PLAN-4349 Final program acceptance 05 proof: include test, verifier output, or self-check finding evidence.
PLAN-4350 Final program acceptance 05 failure response: block release until corrected.
PLAN-4351 Final program acceptance 06: GovernanceDecisionV2 is schema-validated.
PLAN-4352 Final program acceptance 06 proof: include test, verifier output, or self-check finding evidence.
PLAN-4353 Final program acceptance 06 failure response: block release until corrected.
PLAN-4354 Final program acceptance 07: LayerBoundaryV1 is schema-validated.
PLAN-4355 Final program acceptance 07 proof: include test, verifier output, or self-check finding evidence.
PLAN-4356 Final program acceptance 07 failure response: block release until corrected.
PLAN-4357 Final program acceptance 08: HookContractV1 is schema-validated.
PLAN-4358 Final program acceptance 08 proof: include test, verifier output, or self-check finding evidence.
PLAN-4359 Final program acceptance 08 failure response: block release until corrected.
PLAN-4360 Final program acceptance 09: RuntimeEvidenceV1 is schema-validated.
PLAN-4361 Final program acceptance 09 proof: include test, verifier output, or self-check finding evidence.
PLAN-4362 Final program acceptance 09 failure response: block release until corrected.
PLAN-4363 Final program acceptance 10: SemanticPromotionDecisionV1 is schema-validated.
PLAN-4364 Final program acceptance 10 proof: include test, verifier output, or self-check finding evidence.
PLAN-4365 Final program acceptance 10 failure response: block release until corrected.
PLAN-4366 Final program acceptance 11: SemanticConversationStateV1 is schema-validated.
PLAN-4367 Final program acceptance 11 proof: include test, verifier output, or self-check finding evidence.
PLAN-4368 Final program acceptance 11 failure response: block release until corrected.
PLAN-4369 Final program acceptance 12: WorkflowFamily release gate is part of release self-check.
PLAN-4370 Final program acceptance 12 proof: include test, verifier output, or self-check finding evidence.
PLAN-4371 Final program acceptance 12 failure response: block release until corrected.
PLAN-4372 Final program acceptance 13: Runtime parity linter rejects unsupported Claude and Gemini parity claims.
PLAN-4373 Final program acceptance 13 proof: include test, verifier output, or self-check finding evidence.
PLAN-4374 Final program acceptance 13 failure response: block release until corrected.
PLAN-4375 Final program acceptance 14: Semantic promotion gate rejects conflicts and LLM promotions.
PLAN-4376 Final program acceptance 14 proof: include test, verifier output, or self-check finding evidence.
PLAN-4377 Final program acceptance 14 failure response: block release until corrected.
PLAN-4378 Final program acceptance 15: SemanticConversationState is the only LLM-facing control state.
PLAN-4379 Final program acceptance 15 proof: include test, verifier output, or self-check finding evidence.
PLAN-4380 Final program acceptance 15 failure response: block release until corrected.
PLAN-4381 Final program acceptance 16: Root semantic fork detector rejects root policy forks.
PLAN-4382 Final program acceptance 16 proof: include test, verifier output, or self-check finding evidence.
PLAN-4383 Final program acceptance 16 failure response: block release until corrected.
PLAN-4384 Final program acceptance 17: Runtime cache semantic fork detector rejects cache policy forks.
PLAN-4385 Final program acceptance 17 proof: include test, verifier output, or self-check finding evidence.
PLAN-4386 Final program acceptance 17 failure response: block release until corrected.
PLAN-4387 Final program acceptance 18: Self-check release mode aggregates all new verifiers.
PLAN-4388 Final program acceptance 18 proof: include test, verifier output, or self-check finding evidence.
PLAN-4389 Final program acceptance 18 failure response: block release until corrected.
PLAN-4390 Final program acceptance 19: Official Palantir terminology mapping is documented without claiming product parity.
PLAN-4391 Final program acceptance 19 proof: include test, verifier output, or self-check finding evidence.
PLAN-4392 Final program acceptance 19 failure response: block release until corrected.
PLAN-4393 Final program acceptance 20: User prompt to FDE to SIC to DTC workflow cannot conflate DATA with ObjectType or ACTION with ActionType.
PLAN-4394 Final program acceptance 20 proof: include test, verifier output, or self-check finding evidence.
PLAN-4395 Final program acceptance 20 failure response: block release until corrected.
## Recommended Next Session Prompt

PLAN-4396 Use the following prompt only after this implementation plan is reviewed and after the local PreTool plugin-opt-out hotfix is present.
PLAN-4397 Prompt line 01: cd /home/palantirkc/palantir-mini-marketplace/plugins/palantir-mini.
PLAN-4398 Prompt line 02: Do not use palantir-mini plugin tools, palantir-mini MCP handlers, palantir-mini skills, pm_semantic_intent_gate, pm_intent_router, pm_plugin_self_check, pre_edit_impact, impact_query, get_ontology, or palantir-mini response-template enforcement while executing this plan unless the user explicitly opts back in.
PLAN-4399 Prompt line 03: Use ordinary Codex filesystem, shell, git, code review, and Bun tests only.
PLAN-4400 Prompt line 04: Do not edit runtime caches under ~/.codex/plugins/cache, generated files, plan-only docs, .palantir-mini/session artifacts, unrelated overlays, or inactive Claude/Gemini package surfaces.
PLAN-4401 Prompt line 05: Verify hooks/pre-edit-impact-mcp-first.ts already skips MCP-first blocking when the current PromptEnvelope has palantirMiniPluginOptOut.explicit=true; if absent, implement only that local PreTool hotfix first.
PLAN-4402 Prompt line 06: Start PR-0 only: fail-closed mutation hook hotfix for invalid stdin, unhandled exception, timeout, nonzero hook failure, bypass attempts, and scoped plugin opt-out PreTool behavior.
PLAN-4403 Prompt line 07: Read hooks/commit-edits-governance.ts, hooks/prompt-dtc-enforcement-gate.ts, hooks/pre-edit-impact-mcp-first.ts, tests/hooks/commit-edits-governance.test.ts, tests/hooks/prompt-dtc-enforcement-gate.test.ts, tests/hooks/prompt-dtc-enforcement-gate-dtc-turn.test.ts, tests/hooks/pre-edit-impact-mcp-first.blocking.test.ts, and tests/lib/codex/codex-hook-adapter.test.ts.
PLAN-4404 Prompt line 08: Implement the smallest source change; do not add schemas, public MCP handlers, release self-check wiring, or broad docs in PR-0.
PLAN-4405 Prompt line 09: Run bun test tests/hooks/commit-edits-governance.test.ts; bun test tests/hooks/prompt-dtc-enforcement-gate.test.ts; bun test tests/hooks/prompt-dtc-enforcement-gate-dtc-turn.test.ts; bun test tests/hooks/pre-edit-impact-mcp-first.blocking.test.ts; bun test tests/lib/codex/codex-hook-adapter.test.ts; git diff --check.
PLAN-4406 Prompt line 10: Stop after PR-0 verification and PR body preparation; do not start PR-1 in the same risky slice unless explicitly asked.
## Appendix A - Stable Reason Codes

PLAN-4407 Reason code: INVALID_HOOK_STDIN.
PLAN-4408 INVALID_HOOK_STDIN severity: blocking when attached to protected mutation or release checks.
PLAN-4409 INVALID_HOOK_STDIN message rule: human-readable text may explain this reason but must not replace this enum.
PLAN-4410 INVALID_HOOK_STDIN remediation rule: allowedNextActions should identify the next safe workflow step when available.
PLAN-4411 Reason code: HOOK_UNHANDLED_ERROR.
PLAN-4412 HOOK_UNHANDLED_ERROR severity: blocking when attached to protected mutation or release checks.
PLAN-4413 HOOK_UNHANDLED_ERROR message rule: human-readable text may explain this reason but must not replace this enum.
PLAN-4414 HOOK_UNHANDLED_ERROR remediation rule: allowedNextActions should identify the next safe workflow step when available.
PLAN-4415 Reason code: HOOK_TIMEOUT.
PLAN-4416 HOOK_TIMEOUT severity: blocking when attached to protected mutation or release checks.
PLAN-4417 HOOK_TIMEOUT message rule: human-readable text may explain this reason but must not replace this enum.
PLAN-4418 HOOK_TIMEOUT remediation rule: allowedNextActions should identify the next safe workflow step when available.
PLAN-4419 Reason code: HOOK_OUTPUT_SCHEMA_INVALID.
PLAN-4420 HOOK_OUTPUT_SCHEMA_INVALID severity: blocking when attached to protected mutation or release checks.
PLAN-4421 HOOK_OUTPUT_SCHEMA_INVALID message rule: human-readable text may explain this reason but must not replace this enum.
PLAN-4422 HOOK_OUTPUT_SCHEMA_INVALID remediation rule: allowedNextActions should identify the next safe workflow step when available.
PLAN-4423 Reason code: HOOK_REQUIRED_CONTRACT_MISSING.
PLAN-4424 HOOK_REQUIRED_CONTRACT_MISSING severity: blocking when attached to protected mutation or release checks.
PLAN-4425 HOOK_REQUIRED_CONTRACT_MISSING message rule: human-readable text may explain this reason but must not replace this enum.
PLAN-4426 HOOK_REQUIRED_CONTRACT_MISSING remediation rule: allowedNextActions should identify the next safe workflow step when available.
PLAN-4427 Reason code: ENV_DOWNGRADE_FORBIDDEN.
PLAN-4428 ENV_DOWNGRADE_FORBIDDEN severity: blocking when attached to protected mutation or release checks.
PLAN-4429 ENV_DOWNGRADE_FORBIDDEN message rule: human-readable text may explain this reason but must not replace this enum.
PLAN-4430 ENV_DOWNGRADE_FORBIDDEN remediation rule: allowedNextActions should identify the next safe workflow step when available.
PLAN-4431 Reason code: BYPASS_FORBIDDEN.
PLAN-4432 BYPASS_FORBIDDEN severity: blocking when attached to protected mutation or release checks.
PLAN-4433 BYPASS_FORBIDDEN message rule: human-readable text may explain this reason but must not replace this enum.
PLAN-4434 BYPASS_FORBIDDEN remediation rule: allowedNextActions should identify the next safe workflow step when available.
PLAN-4435 Reason code: SIC_REQUIRED.
PLAN-4436 SIC_REQUIRED severity: blocking when attached to protected mutation or release checks.
PLAN-4437 SIC_REQUIRED message rule: human-readable text may explain this reason but must not replace this enum.
PLAN-4438 SIC_REQUIRED remediation rule: allowedNextActions should identify the next safe workflow step when available.
PLAN-4439 Reason code: DTC_REQUIRED.
PLAN-4440 DTC_REQUIRED severity: blocking when attached to protected mutation or release checks.
PLAN-4441 DTC_REQUIRED message rule: human-readable text may explain this reason but must not replace this enum.
PLAN-4442 DTC_REQUIRED remediation rule: allowedNextActions should identify the next safe workflow step when available.
PLAN-4443 Reason code: WORK_CONTRACT_REQUIRED.
PLAN-4444 WORK_CONTRACT_REQUIRED severity: blocking when attached to protected mutation or release checks.
PLAN-4445 WORK_CONTRACT_REQUIRED message rule: human-readable text may explain this reason but must not replace this enum.
PLAN-4446 WORK_CONTRACT_REQUIRED remediation rule: allowedNextActions should identify the next safe workflow step when available.
PLAN-4447 Reason code: PROMPT_HASH_CONTINUITY_FAILED.
PLAN-4448 PROMPT_HASH_CONTINUITY_FAILED severity: blocking when attached to protected mutation or release checks.
PLAN-4449 PROMPT_HASH_CONTINUITY_FAILED message rule: human-readable text may explain this reason but must not replace this enum.
PLAN-4450 PROMPT_HASH_CONTINUITY_FAILED remediation rule: allowedNextActions should identify the next safe workflow step when available.
PLAN-4451 Reason code: DRY_RUN_EVIDENCE_REQUIRED.
PLAN-4452 DRY_RUN_EVIDENCE_REQUIRED severity: blocking when attached to protected mutation or release checks.
PLAN-4453 DRY_RUN_EVIDENCE_REQUIRED message rule: human-readable text may explain this reason but must not replace this enum.
PLAN-4454 DRY_RUN_EVIDENCE_REQUIRED remediation rule: allowedNextActions should identify the next safe workflow step when available.
PLAN-4455 Reason code: EVAL_EVIDENCE_REQUIRED.
PLAN-4456 EVAL_EVIDENCE_REQUIRED severity: blocking when attached to protected mutation or release checks.
PLAN-4457 EVAL_EVIDENCE_REQUIRED message rule: human-readable text may explain this reason but must not replace this enum.
PLAN-4458 EVAL_EVIDENCE_REQUIRED remediation rule: allowedNextActions should identify the next safe workflow step when available.
PLAN-4459 Reason code: WORKFLOW_DETERMINISM_NOT_ENFORCED.
PLAN-4460 WORKFLOW_DETERMINISM_NOT_ENFORCED severity: blocking when attached to protected mutation or release checks.
PLAN-4461 WORKFLOW_DETERMINISM_NOT_ENFORCED message rule: human-readable text may explain this reason but must not replace this enum.
PLAN-4462 WORKFLOW_DETERMINISM_NOT_ENFORCED remediation rule: allowedNextActions should identify the next safe workflow step when available.
PLAN-4463 Reason code: RUNTIME_EVIDENCE_REQUIRED.
PLAN-4464 RUNTIME_EVIDENCE_REQUIRED severity: blocking when attached to protected mutation or release checks.
PLAN-4465 RUNTIME_EVIDENCE_REQUIRED message rule: human-readable text may explain this reason but must not replace this enum.
PLAN-4466 RUNTIME_EVIDENCE_REQUIRED remediation rule: allowedNextActions should identify the next safe workflow step when available.
PLAN-4467 Reason code: UNSUPPORTED_RUNTIME_PARITY_CLAIM.
PLAN-4468 UNSUPPORTED_RUNTIME_PARITY_CLAIM severity: blocking when attached to protected mutation or release checks.
PLAN-4469 UNSUPPORTED_RUNTIME_PARITY_CLAIM message rule: human-readable text may explain this reason but must not replace this enum.
PLAN-4470 UNSUPPORTED_RUNTIME_PARITY_CLAIM remediation rule: allowedNextActions should identify the next safe workflow step when available.
PLAN-4471 Reason code: SEMANTIC_CONFLICT_UNRESOLVED.
PLAN-4472 SEMANTIC_CONFLICT_UNRESOLVED severity: blocking when attached to protected mutation or release checks.
PLAN-4473 SEMANTIC_CONFLICT_UNRESOLVED message rule: human-readable text may explain this reason but must not replace this enum.
PLAN-4474 SEMANTIC_CONFLICT_UNRESOLVED remediation rule: allowedNextActions should identify the next safe workflow step when available.
PLAN-4475 Reason code: SEMANTIC_NEW_CANDIDATE_UNAPPROVED.
PLAN-4476 SEMANTIC_NEW_CANDIDATE_UNAPPROVED severity: blocking when attached to protected mutation or release checks.
PLAN-4477 SEMANTIC_NEW_CANDIDATE_UNAPPROVED message rule: human-readable text may explain this reason but must not replace this enum.
PLAN-4478 SEMANTIC_NEW_CANDIDATE_UNAPPROVED remediation rule: allowedNextActions should identify the next safe workflow step when available.
PLAN-4479 Reason code: SEMANTIC_MAPPING_REJECTED.
PLAN-4480 SEMANTIC_MAPPING_REJECTED severity: blocking when attached to protected mutation or release checks.
PLAN-4481 SEMANTIC_MAPPING_REJECTED message rule: human-readable text may explain this reason but must not replace this enum.
PLAN-4482 SEMANTIC_MAPPING_REJECTED remediation rule: allowedNextActions should identify the next safe workflow step when available.
PLAN-4483 Reason code: SEMANTIC_LLM_PROMOTION_FORBIDDEN.
PLAN-4484 SEMANTIC_LLM_PROMOTION_FORBIDDEN severity: blocking when attached to protected mutation or release checks.
PLAN-4485 SEMANTIC_LLM_PROMOTION_FORBIDDEN message rule: human-readable text may explain this reason but must not replace this enum.
PLAN-4486 SEMANTIC_LLM_PROMOTION_FORBIDDEN remediation rule: allowedNextActions should identify the next safe workflow step when available.
PLAN-4487 Reason code: SEMANTIC_RESOLVER_NOT_DETERMINISTIC.
PLAN-4488 SEMANTIC_RESOLVER_NOT_DETERMINISTIC severity: blocking when attached to protected mutation or release checks.
PLAN-4489 SEMANTIC_RESOLVER_NOT_DETERMINISTIC message rule: human-readable text may explain this reason but must not replace this enum.
PLAN-4490 SEMANTIC_RESOLVER_NOT_DETERMINISTIC remediation rule: allowedNextActions should identify the next safe workflow step when available.
PLAN-4491 Reason code: CONTEXT_DOMAIN_PRIMITIVE_CONFLATION.
PLAN-4492 CONTEXT_DOMAIN_PRIMITIVE_CONFLATION severity: blocking when attached to protected mutation or release checks.
PLAN-4493 CONTEXT_DOMAIN_PRIMITIVE_CONFLATION message rule: human-readable text may explain this reason but must not replace this enum.
PLAN-4494 CONTEXT_DOMAIN_PRIMITIVE_CONFLATION remediation rule: allowedNextActions should identify the next safe workflow step when available.
PLAN-4495 Reason code: ROOT_SEMANTIC_FORK_DETECTED.
PLAN-4496 ROOT_SEMANTIC_FORK_DETECTED severity: blocking when attached to protected mutation or release checks.
PLAN-4497 ROOT_SEMANTIC_FORK_DETECTED message rule: human-readable text may explain this reason but must not replace this enum.
PLAN-4498 ROOT_SEMANTIC_FORK_DETECTED remediation rule: allowedNextActions should identify the next safe workflow step when available.
PLAN-4499 Reason code: RUNTIME_CACHE_SEMANTIC_FORK_DETECTED.
PLAN-4500 RUNTIME_CACHE_SEMANTIC_FORK_DETECTED severity: blocking when attached to protected mutation or release checks.
PLAN-4501 RUNTIME_CACHE_SEMANTIC_FORK_DETECTED message rule: human-readable text may explain this reason but must not replace this enum.
PLAN-4502 RUNTIME_CACHE_SEMANTIC_FORK_DETECTED remediation rule: allowedNextActions should identify the next safe workflow step when available.
PLAN-4503 Reason code: REPLAY_EVIDENCE_REQUIRED.
PLAN-4504 REPLAY_EVIDENCE_REQUIRED severity: blocking when attached to protected mutation or release checks.
PLAN-4505 REPLAY_EVIDENCE_REQUIRED message rule: human-readable text may explain this reason but must not replace this enum.
PLAN-4506 REPLAY_EVIDENCE_REQUIRED remediation rule: allowedNextActions should identify the next safe workflow step when available.
PLAN-4507 Reason code: RELEASE_SELF_CHECK_FAILED.
PLAN-4508 RELEASE_SELF_CHECK_FAILED severity: blocking when attached to protected mutation or release checks.
PLAN-4509 RELEASE_SELF_CHECK_FAILED message rule: human-readable text may explain this reason but must not replace this enum.
PLAN-4510 RELEASE_SELF_CHECK_FAILED remediation rule: allowedNextActions should identify the next safe workflow step when available.
## Appendix B - File Ownership And Edit Boundaries

PLAN-4511 Boundary: Allowed semantic source.
PLAN-4512 Boundary path or pattern: plugins/palantir-mini/**.
PLAN-4513 Boundary rule: implementation MUST respect this path role throughout PR-0 through PR-9.
PLAN-4514 Boundary review: PR reviewer MUST reject changes that move semantic authority across this boundary.
PLAN-4515 Boundary: Allowed marketplace integrity.
PLAN-4516 Boundary path or pattern: README.md, ci/**, .github/workflows/** when calling plugin self-check only.
PLAN-4517 Boundary rule: implementation MUST respect this path role throughout PR-0 through PR-9.
PLAN-4518 Boundary review: PR reviewer MUST reject changes that move semantic authority across this boundary.
PLAN-4519 Boundary: Forbidden runtime cache authority.
PLAN-4520 Boundary path or pattern: ~/.codex/plugins/cache/**.
PLAN-4521 Boundary rule: implementation MUST respect this path role throughout PR-0 through PR-9.
PLAN-4522 Boundary review: PR reviewer MUST reject changes that move semantic authority across this boundary.
PLAN-4523 Boundary: Forbidden generated direct edits.
PLAN-4524 Boundary path or pattern: plugins/palantir-mini/src/generated/** and any generated descender listed by existing codegen rules.
PLAN-4525 Boundary rule: implementation MUST respect this path role throughout PR-0 through PR-9.
PLAN-4526 Boundary review: PR reviewer MUST reject changes that move semantic authority across this boundary.
PLAN-4527 Boundary: Forbidden inactive runtime package claims.
PLAN-4528 Boundary path or pattern: Claude and Gemini install/package surfaces without evidence-backed PR scope.
PLAN-4529 Boundary rule: implementation MUST respect this path role throughout PR-0 through PR-9.
PLAN-4530 Boundary review: PR reviewer MUST reject changes that move semantic authority across this boundary.
PLAN-4531 Boundary: Read-only evidence.
PLAN-4532 Boundary path or pattern: ~/.claude/research/** and official Palantir docs.
PLAN-4533 Boundary rule: implementation MUST respect this path role throughout PR-0 through PR-9.
PLAN-4534 Boundary review: PR reviewer MUST reject changes that move semantic authority across this boundary.
PLAN-4535 Boundary: Append-only state.
PLAN-4536 Boundary path or pattern: <project>/.palantir-mini/session/events.jsonl and related event streams.
PLAN-4537 Boundary rule: implementation MUST respect this path role throughout PR-0 through PR-9.
PLAN-4538 Boundary review: PR reviewer MUST reject changes that move semantic authority across this boundary.
## Appendix C - Completion Definition

PLAN-4539 The program is complete only when all PR acceptance gates are implemented and release self-check fails on every listed drift condition.
PLAN-4540 The program is not complete when only documents are updated.
PLAN-4541 The program is not complete when only TypeScript types are added without validators.
PLAN-4542 The program is not complete when validators exist but are not part of release self-check.
PLAN-4543 The program is not complete when tests pass only because bypass fixtures remain accepted for protected mutation.
PLAN-4544 The program is not complete when runtime parity claims remain evidence-free.
PLAN-4545 The program is not complete when SemanticConversationState exists but prompt templates can bypass it.
PLAN-4546 The program is not complete when resolver output is deterministic but not promotion-blocking.
PLAN-4547 The program is not complete when ContextEngineering domains and Ontology primitive kinds remain mixed in a single ambiguous enum.
PLAN-4548 The program is not complete when root marketplace files can duplicate semantic policy.
PLAN-4549 The program is complete when protected mutation cannot proceed without structured, schema-validated, deterministic plugin authorization.
PLAN-4550 The program is complete when LLMs can draft, summarize, ask, and explain but cannot approve, promote, authorize, or claim runtime parity.
PLAN-4551 The program is complete when non-programmer users receive clear Korean-facing cards while the plugin retains all machine authority.
PLAN-4552 The program is complete when Codex, Claude, Gemini, or any future runtime must consume the same plugin contracts rather than inventing semantic policy.
PLAN-4553 End of implementation plan.
