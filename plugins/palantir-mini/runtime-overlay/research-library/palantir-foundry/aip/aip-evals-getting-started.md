---
source: https://www.palantir.com/docs/foundry/aip-evals/getting-started/
fetched: 2026-04-20
section: aip-stack
doc_title: Getting started with AIP Evals for Logic functions
---

Getting started with AIP Evals for Logic functions
====================================================

This guide walks through creating an evaluation suite for an AIP Logic function.

Create a suite from the Logic sidebar
--------------------------------------

1. Open your Logic function in the Logic editor.
2. In the sidebar, locate the **Evals** section.
3. Click **Create evaluation suite** to initialize a new suite linked to the current function.

Generate test cases automatically
-----------------------------------

AIP Evals includes a **Generate evals** button that uses an LLM to automatically generate test cases based on:

* The function's input/output schema
* The system prompt and any available context
* (Optionally) a description of what the function is intended to do

Generated test cases appear in a preview panel where you can review each case. Click **Add as test case** to include individual cases in your suite, or add all generated cases at once.

Add an Exact string match evaluator
-------------------------------------

For deterministic functions with predictable outputs:

1. In the suite configuration, click **Add evaluator**.
2. Select **Exact string match**.
3. Set pass criteria: the evaluator passes when the actual output exactly matches the expected output string.

Run the suite
-------------

Click **Run suite** to execute all test cases against the target function. Results are displayed showing pass/fail status per test case and per evaluator.

Next steps
----------

* Add additional evaluators (LLM-as-a-judge, Rubric grader) for non-deterministic outputs.
* Configure multiple target functions to compare prompt variations.
* Use the test case debugger to investigate failures.
* Explore Experiments for grid search across model/prompt combinations.
