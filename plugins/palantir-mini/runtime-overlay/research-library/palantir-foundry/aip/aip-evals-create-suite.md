---
source: https://www.palantir.com/docs/foundry/aip-evals/create-suite/
fetched: 2026-04-20
section: aip-stack
doc_title: Create an evaluation suite
---

Create an evaluation suite
===========================

An evaluation suite contains test cases, target functions, and evaluation functions used to benchmark function performance.

Test cases
----------

Test cases define sets of inputs and expected outputs. There are two ways to add test cases:

### Manual test cases

Add test cases one at a time by providing:
* Input values for each function parameter
* Expected output value

### Object set test cases

Populate test cases from an object set, mapping object properties to function inputs and expected outputs. This enables large-scale evaluation using existing data.

Evaluators
----------

Evaluators measure how well actual outputs match expected outputs. AIP Evals provides built-in evaluators and access to additional evaluators via the Marketplace.

### Built-in evaluators

* **Exact string match:** Returns pass if the actual output exactly matches the expected output string.
* **Levenshtein distance:** Measures edit distance between actual and expected strings; configurable threshold for pass/fail.
* **LLM-as-a-judge:** Uses an LLM to compare actual output against expected output and return a pass/fail score with reasoning.

### Marketplace evaluators

Additional evaluators available via the Foundry Marketplace:

* **Rubric grader:** Evaluates output against a set of defined rubric criteria. Each criterion is scored independently by an LLM, and the overall score is an aggregate of criterion scores.
* **Contains key details:** Checks whether the output contains specific key details or facts. Useful for ensuring completeness of LLM responses.
* **ROUGE:** Computes ROUGE (Recall-Oriented Understudy for Gisting Evaluation) scores to measure overlap between actual and expected text. Commonly used for summarization tasks.

Pass criteria and objectives
-----------------------------

For each evaluator, you can configure:

* **Pass threshold:** The minimum score required to count as a pass.
* **Objectives:** Descriptive goals that guide LLM-based evaluators, providing context for what a good response looks like.

Target functions
----------------

A suite can be configured to test multiple target functions simultaneously, enabling side-by-side comparison of different function versions, prompt variants, or model selections.
