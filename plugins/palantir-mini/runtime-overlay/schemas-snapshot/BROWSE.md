# In-plugin SSoT — BROWSE (query router)

palantir-mini's canonical, LLM-agnostic runtime SSoT (self-ontology of its harness control-surfaces). Resolve `#schemas/*` / `@palantirKC/claude-schemas` here. Full catalog: INDEX.md.

| Looking for… | Go to |
|---|---|
| semantic ontology nouns (object/link/property/interface/value types) | ontology/primitives/ + ontology/types/ |
| kinetic verbs (action-type, function, automation) | ontology/primitives/{action-type,function,automation-declaration}.ts + ontology/{action,functions}/ |
| understand/intent (SIC, DTC, prompt envelope, ontology-engineering-ref) | ontology/primitives/{semantic-intent-contract,digital-twin-change-contract,prompt-envelope,ontology-engineering-ref}.ts |
| harness control-surfaces (tool, mcp, agent, skill, hook, capability) | ontology/primitives/{tool,mcp-tool-declaration,agent-definition,skill,hook,capability-token}.ts |
| verify/eval (grader, rubric, eval, feedback-loop, simulation) | ontology/primitives/{grader,grading-rubric,aip-evaluation,feedback-loop,ontology-simulation}.ts |
| lineage/audit 5-dim (event, lineage, outcome, value-grade, propagation) | ontology/primitives/{event,lineage-refs,outcome-pairing,value-grade,propagation-audit}.ts + ontology/lineage/ |
| governance/policy (approval, security policy, managed-settings, branching) | ontology/primitives/{approval-ref,object-security-policy,managed-settings-fragment,global-branching-proposal}.ts + ontology/{policies,security}/ |
| codegen + ids (semantic-rid, codegen-header, generators) | ontology/primitives/{semantic-rid,codegen-header-contract}.ts + ontology/{codegen,generators}/ |
| research/memory (research-doc, memory-layer, learning, context-capsule) | ontology/primitives/{research-document,agentic-memory-layer,learning,context-capsule}.ts |

NOTE: legacy/old-identity primitives (harness-species-*, hands-manifest, claude-code-version, pedagogy/canvas/scene) are scheduled for removal in later harness-redesign waves alongside their importers.
