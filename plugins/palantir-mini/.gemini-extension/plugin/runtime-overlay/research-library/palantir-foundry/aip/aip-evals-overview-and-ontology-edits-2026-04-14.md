---
source-url: https://www.palantir.com/docs/foundry/aip-evals/overview/ + https://www.palantir.com/docs/foundry/aip-evals/ontology-edits/
source-author: "Palantir Technologies (official Foundry docs)"
source-published: 2026-04-14
fetched-at: 2026-05-06T12:40:00Z
license-note: "External source — read-only mirror for AI-agent research SSoT per ~/.claude/CLAUDE.md §Artifact Layer Policy. Original docs copyright Palantir Technologies. Do not redistribute outside ~/.claude/research/."
topic: "AIP Evals — testing environment for AIP Logic / Chatbot / code-authored functions; 19 built-in evaluators + Ontology edit simulation; integrated into AI FDE 2026-04-14"
---

# AIP Evals — Overview + Ontology Edits (combined mirror)

> Source 1: https://www.palantir.com/docs/foundry/aip-evals/overview/
> Source 2: https://www.palantir.com/docs/foundry/aip-evals/ontology-edits/
> Both fetched 2026-05-06 from official Palantir Foundry docs.
> AI FDE integration date: 2026-04-14 (announcement: "Evaluate and ship directly with AIP Evals in AI FDE").
> Cited by: rule 26 v1.0.0 §Axis B (Verifiable) anchor; rule 16 v4.0.0 §GradingRubric (the 6 rubricDomain enum values map onto AIP Evals concepts).

---

## Section A — AIP Evals Overview

AIP Evals is a testing environment to evaluate the performance of your AIP
Logic functions, AIP Chatbot functions, or code-authored functions. It is
specifically designed to help you deal with the non-deterministic nature of
LLMs. AIP Evals allows you to create test cases, define evaluation
functions to measure performance, and compare the results against previous
versions of your function. It enables you to build the necessary confidence
to put LLM-backed functions into production or make changes to an existing
implementation.

You can use AIP Evals to:

- Create test cases and define evaluation criteria.
- Debug, iterate, and improve functions and prompts.
- Compare the performance of different models on your functions.
- Examine variance across multiple runs.

AIP Evals is also available as an integrated tool within AI FDE, allowing
you to create and run evaluation suites through conversational commands.

### Core concepts

- **Evaluation suite:** The collection of test cases, target functions,
  and evaluation functions used to benchmark function performance.
- **Target function:** The function being evaluated. A suite can be
  configured to test multiple target functions simultaneously.
- **Evaluation function:** The method used when comparing or evaluating
  the actual output of a target function against the expected output.
- **Test cases:** Defined sets of inputs and expected outputs that are
  passed into evaluation functions during evaluation suite runs.
- **Metrics:** The results of evaluation functions. Metrics are produced
  per test case and can be compared in aggregate or individually between
  runs.

To get started, create an evaluation suite for logic functions, or create
an evaluation suite for general functions, and learn more about evaluation
run configurations.

### 19 built-in evaluators (per 2026-04-14 announcement)

The 2026-04-14 "Evaluate and ship directly with AIP Evals in AI FDE"
announcement enumerates **nineteen built-in evaluators** available within
the AI FDE / AIP Evals integration. Includes (per the announcement text):
exact match, regex, ranges, Levenshtein distance, keyword checker, and
LLM-as-a-judge, plus function-backed custom evaluators.

The full taxonomy of all 19 is not enumerated in the linked overview page;
it is reachable from `aip-evals-getting-started.md` and the evaluator-set
detail pages.

### Marketplace evaluators (mentioned, not GA in AI FDE as of 2026-04-14)

- Rubric Grader
- Contains Key Details
- ROUGE

The 2026-04-14 announcement notes these "are not yet supported in AI FDE"
along with object set-backed test cases, multi-target suites, and run
datasets.

---

## Section B — Evaluation functions and Ontology edits (Ontology edit simulation)

When an evaluation suite is run, the Logic function for each test case is
executed. For functions that involve Ontology edits (such as creating,
editing, or deleting objects), each test case is executed in an **Ontology
simulation**. This ensures that the actual Ontology remains unchanged during
testing and evaluation.

### Custom evaluation functions for Ontology edits

For AIP Logic functions that result in Ontology edits, users must configure
custom evaluation functions in TypeScript or use intermediate parameters.
Custom evaluation functions must return either Boolean or numeric types.
One evaluation function may also return multiple metrics by returning a
`struct` consisting of Boolean or numeric types.

When adding evaluation functions in the Evaluations application, you will
be prompted to either author a function in Code Repositories or select an
existing published function.

### Created objects

In the case of Ontology edits that involve creating objects, the created
object only exists in the simulated Ontology. As such, these created objects
cannot be configured as a test case parameter for passing in directly.
Instead, search for it using an identifiable property and check its
properties.

```typescript
@Function()
public async checkTicketWasCreated(
    expectedRequester: string,
    expectedDate: LocalDate,
    expectedClassification: string,
): Promise<boolean> {
    const matches = Objects.search().supportTicket()
        .filter(ticket => ticket.ticketRequester.exactMatch(expectedRequester))
        .filter(ticket => ticket.ticketCreationDate.exactMatch(expectedDate))
        .all();

    if (matches.length !== 1) {
        return false;
    }

    return matches[0].classification === expectedClassification;
}
```

### Edited objects

For object edit output types, the edited object already exists in the real
Ontology. In the simulated Ontology, you can pass it directly into the
function and check its properties:

```typescript
@Function()
public checkTicketClassification(
    ticket: SupportTicket,
    expectedClassification: string,
): boolean {
    return ticket.classification === expectedClassification;
}
```

### Deleted objects

In the case of Ontology edits that involve deleting objects, the object is
expected to be deleted in the simulated Ontology, so it cannot be passed
into the evaluation function. To verify that the object was actually
deleted, pass an identifiable property of the object and search for it to
ensure that there are no results.

```typescript
@Function()
public async checkTicketWasDeleted(ticketId: string): Promise<boolean> {
    const count = await Objects.search().supportTicket()
        .filter(ticket => ticket.ticketId.exactMatch(ticketId))
        .count();
    return count === 0;
}
```

---

## Local indexing notes

- **Cited by**:
  - `~/.claude/rules/26-valuable-data-standard.md` v1.0.0 §Axis B (Verifiable — outcome-paired, rubric-measurable, hypothesis-bearing).
  - `~/.claude/rules/16-3-agent-harness.md` v4.0.0 §GradingRubric — 6 rubricDomain enum values (`code | rule | model | human | hybrid | simulator`); the `simulator` domain (W4 v1.31.0+) maps directly onto AIP Evals' Ontology edit simulation.
  - `~/.claude/research/palantir-vision/aipcon-devcon/aip-evals.md` (interpretation layer).
- **Companion mirrors**:
  - `aip/blog-securing-agents-agentic-runtime-1-2026-01-22.md` — 4 memory categories (Axis E anchor).
  - `aip/ai-fde-overview-and-modes-skills-2026-03-12.md` — AI FDE host that integrates AIP Evals.
  - `palantir-vision/aipcon-devcon/blog-connecting-agents-2026-04-29.md` — BackPropagation circuit synthesis (Axis C anchor).
- **Pre-existing fetch overlap**: `aip/aip-evals-overview.md` and `aip/aip-evals-ontology-edits.md` (2026-04-20 batch) cover the same source URLs at an earlier fetch date. This file is the **2026-05-06 refresh** anchored to the AI-FDE-integration date (2026-04-14). Both pre-existing files remain untouched per artifact layer policy.
- **Refresh trigger**: refetch if (a) the 19-evaluator count changes, (b) Marketplace evaluators (Rubric Grader / Contains Key Details / ROUGE) reach AI FDE GA, or (c) Ontology edit simulation gains incremental commit semantics.
- **palantir-mini mapping**: AIP Evals' "evaluation function" (Boolean or numeric output) is structurally equivalent to palantir-mini's `GradingCriterion.validationExpression | scoringPrompt` (rule 16 v4.0.0 §GradingRubric). The OntologyEditSimulation pattern is the upstream template for `simulator` rubricDomain (schemas v1.31.0+, plugin v3.9.1 W4).
