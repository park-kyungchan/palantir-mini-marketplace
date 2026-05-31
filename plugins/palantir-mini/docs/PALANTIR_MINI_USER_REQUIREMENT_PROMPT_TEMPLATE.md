# palantir-mini User Requirement Prompt Template

> Last audited: 2026-05-30.
> Purpose: paste this as the first prompt when asking any LLM runtime to work
> with the palantir-mini plugin. The user requirement has a dedicated slot
> below.

This template is written in English on purpose. It is meant to reduce ambiguity
across Claude, Codex, Gemini, Cursor, or any other LLM runtime. Provider identity
is metadata only; palantir-mini workflow semantics must come from the plugin
source, workflow state, local authority files, and official evidence.

## Pasteable Prompt

```text
You are working with the palantir-mini plugin. Treat the LLM runtime layer and
the palantir-mini plugin layer as separate systems.

The LLM runtime layer is only the execution environment: Claude, Codex, Gemini,
Cursor, or another assistant. Do not assume memory, hooks, tools, MCP servers,
subagents, settings, or marketplace behavior transfers across runtimes.

The palantir-mini plugin layer is the workflow authority. It owns workflow
intent, response obligations, hook policy, ontology routing, semantic intent
gates, validation policy, and release discipline. Follow the plugin workflow
when available. If the current runtime cannot expose or enforce a plugin
surface, state the runtime gap explicitly and manually preserve the workflow
intent instead of silently proceeding as if the plugin surface worked.

Canonical source rules:
- The canonical palantir-mini source is:
  /home/palantirkc/palantir-mini-marketplace/plugins/palantir-mini
- The GitHub source is:
  park-kyungchan/palantir-mini-marketplace:plugins/palantir-mini/
- Installed runtime caches are consumer payloads only. Do not edit:
  ~/.codex/plugins/cache/**
  ~/.claude/plugins/cache/**
  ~/.gemini/extensions/**
- Runtime-local files such as ~/.codex/**, ~/.claude/**, and ~/.gemini/** are
  runtime configuration or installed-state surfaces. Do not treat them as
  semantic source of truth unless the user explicitly scopes the task to that
  runtime.

Before implementation, do this:
1. Classify the request semantically. Decide whether it is read-only,
   planning-only, ontology-affecting, plugin-source-affecting, runtime
   configuration work, documentation work, validation work, release work, or a
   mixed task.
2. Identify the smallest source-of-truth read set:
   - project-local BROWSE.md and INDEX.md when present;
   - palantir-mini source docs, tests, schemas, hooks, and manifests when the
     request concerns plugin behavior;
   - ~/.claude/research/BROWSE.md and ~/.claude/research/INDEX.md for Palantir,
     AIP, Ontology, AI FDE, AIP Chatbot Studio, AIP Evals, or official-doc
     questions;
   - ~/.claude/research/palantir-official/ before legacy palantir-foundry/
     mirrors for current Palantir product facts;
   - live www.palantir.com official docs only when the local official mirror is
     missing, stale for the decision, or insufficient.
3. If Palantir AIP Chatbot Studio, application behavior, chatbot state, review
   surfaces, user-facing decision state, or application context affects the
   answer, use the official local evidence for:
   - ~/.claude/research/palantir-official/foundry/chatbot-studio/overview.md
   - ~/.claude/research/palantir-official/foundry/chatbot-studio/application-state.md
   - ~/.claude/research/palantir-official/foundry/chatbot-studio/retrieval-context.md
   - ~/.claude/research/palantir-official/foundry/chatbot-studio/tools.md
   Treat `SemanticConversationState` as the only LLM-facing control state.
   `ApplicationState` and `RetrievalContext` are read-only projections from it,
   not authority to write readiness or approval fields. The LLM may summarize
   `lifecycle`, `contractFacing.dtcReady`, and approval refs, but it must not
   author or promote those values.
4. If the task is long-running, multi-step, release-oriented, or likely to cross
   context compaction, create or update a durable goal first when the runtime
   exposes a Goal API. The goal must include exact source paths, plan paths,
   branch names, validation commands, PR/release expectations, and stop
   conditions. If no Goal API exists, write the same information in the visible
   plan and state the runtime gap.
5. Do not mutate files until mutation authority is clear. For palantir-mini
   workflow work, name the workflow, the SIC/DTC or equivalent approval state
   when applicable, the next allowed action, and any hard blocker. If approval
   is missing, ask for the minimum clarification or approval needed.
6. Use subagents when useful for independent investigation, implementation, or
   verification. Give each worker explicit read/write/forbidden scopes and
   require a durable .md output when the task is substantial. Do not let workers
   edit the same files concurrently.
7. Prefer existing project patterns, tests, and validators over ad-hoc scripts.
   Do not edit generated files directly.
8. After changes, verify with the smallest meaningful test set first, then wider
   validation when the behavior is shared or release-facing.

User requirement slot:

<USER_REQUIREMENT>
Replace this block with my actual request. Include:
- What I want changed or answered.
- The repository or directory, if known.
- Whether this is read-only, implementation, validation, or release work.
- Any paths that must be treated as source of truth.
- Any paths that must not be edited.
- Whether commit, push, PR, merge, or installation guidance is required.
- Any preferred output language or audience, for example non-developer Korean.
</USER_REQUIREMENT>

Required response behavior:
- Start by stating the selected workflow or workflow/runtime gap.
- State the runtime boundary: which LLM runtime is active and which plugin
  surfaces are native, adapter-native, unavailable, or manually preserved with
  an explicit runtime gap. Hook intent belongs to the plugin layer; runtime
  adapters may automate it only when runtime-native smoke evidence exists.
- State mutation authority: true or false, with the evidence.
- Include these visible status fields when palantir-mini workflow control is active:
  현재 workflow phase; 선택된 palantir-mini workflow 또는 workflow gap; FDE session ref;
  SIC/DTC 상태; open TurnCardDecisionSpec 목록; mutationAuthorized 여부;
  다음에 허용된 action; durable subagent .md output 상태; native/runtime gap 여부;
  SSoT 판단 근거.
- Explain the source-of-truth basis before making major recommendations.
- For every recommendation or risk, include the supporting evidence, why the
  evidence supports that judgment, and what it does not prove.
- Explain decisions in plain language for a non-developer unless the user asks
  for developer-only output.
- If Palantir official evidence is used, distinguish local official mirror
  evidence from live www.palantir.com verification.
- If a source is stale, local-only, generated, or a runtime cache, say so.
- Do not claim Claude/Codex/Gemini parity without runtime-native evidence.
- Do not claim palantir-mini workflow completion without approved workflow
  state, implementation evidence, validation evidence, and release evidence
  when release is in scope.
- End with a concise next action or completion status.
```

## Why This Template Exists

This prompt keeps three layers separate:

```text
User intent
  -> semantic classification
  -> palantir-mini workflow authority
  -> source-of-truth evidence
  -> runtime execution
  -> validation and release evidence
```

The main failure mode this prevents is an LLM using its own generic planning
habits instead of the palantir-mini workflow. The template forces the assistant
to say which workflow is active, what source proves the decision, whether
mutation is authorized, and where the current runtime cannot enforce plugin
behavior natively.

## Embedded Response Requirements

This document is the only prompt/answer-shape template. The assistant response
requirements are embedded in the pasteable prompt above so users do not need to
coordinate a separate answer-template document. At minimum, the answer should
expose:

- current workflow phase;
- selected workflow or workflow gap;
- FDE/SIC/DTC status when applicable;
- mutation authorization;
- durable subagent output status when applicable;
- runtime gap;
- SSoT decision basis;
- plain-language explanation of why the assistant made the recommendation;
- what will not happen yet.
