---
source: https://www.palantir.com/docs/foundry/aip-evals/experiments/
fetched: 2026-04-20
section: aip-stack
doc_title: Experiments
---

Experiments
===========

Experiments allow you to run grid search evaluations across combinations of models and prompts, enabling systematic comparison of how different configurations affect function performance.

Grid search
-----------

Define multiple values for one or more parameters and AIP Evals will run your test suite against every combination. For example, you can test:

* 3 model choices × 2 prompt variants = 6 runs executed automatically

This produces a comparison matrix showing which model/prompt combination performs best across your evaluators.

Parameterize Logic function inputs
-----------------------------------

For Logic functions, you can parameterize inputs directly within the experiment configuration. This allows you to vary prompt text, system instructions, or other string inputs as experimental axes without modifying the underlying function.

Group-by aggregate analysis
----------------------------

After an experiment completes, results can be grouped by:

* Model
* Prompt variant
* Any combination of experimental axes

Grouping shows aggregate pass rates per combination, helping identify which configuration best meets your evaluation criteria.

Test case debugger drawer
--------------------------

The test case debugger is accessible from the experiment results view as a drawer panel. Clicking a specific test case×run combination opens the debugger showing the full execution trace for that combination, allowing you to understand why a particular configuration passed or failed on a given input.
