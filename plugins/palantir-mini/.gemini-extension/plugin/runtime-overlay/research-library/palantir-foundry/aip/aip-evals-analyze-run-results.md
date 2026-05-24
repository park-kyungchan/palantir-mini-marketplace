---
source: https://www.palantir.com/docs/foundry/aip-evals/analyze-run-results/
fetched: 2026-04-20
section: aip-stack
doc_title: Analyze run results
---

Analyze run results
===================

After an evaluation suite run completes, you can analyze results to understand how your function is performing across test cases.

Debug view
----------

The debug view provides pass/fail status for each test case and evaluator combination. You can drill into individual test cases to see:

* The input passed to the target function
* The actual output produced by the function
* The expected output defined in the test case
* The evaluator score and reasoning

### Test case debugger

The test case debugger is available in AIP Evals, Logic, and Agent Studio. It shows a step-by-step breakdown of how the function processed a specific input, allowing you to trace execution and identify where outputs diverge from expectations.

For the Rubric grader evaluator, the Logic debugger displays the grading rationale — showing which rubric criteria were met, partially met, or failed — allowing you to understand the LLM's scoring reasoning.

Compare across target functions
---------------------------------

When a suite is configured with multiple target functions, results can be compared side by side. This enables you to:

* Evaluate different prompt versions against the same test cases
* Compare different LLM models on your specific use cases
* Identify which function version performs best on specific evaluator criteria

Results are displayed in aggregate (overall pass rate per function) and per-test-case (individual scores for each function×evaluator combination).

Analyze with AI FDE
-------------------

The **Analyze with AI FDE** button opens the AI FDE interface with the evaluation run results pre-loaded as context. AI FDE can then help you:

* Identify patterns in failing test cases
* Suggest prompt improvements
* Recommend test case additions for better coverage
* Diagnose why specific evaluators are failing
