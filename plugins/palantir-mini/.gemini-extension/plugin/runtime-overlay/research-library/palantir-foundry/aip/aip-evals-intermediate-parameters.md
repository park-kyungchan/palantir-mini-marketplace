---
source: https://www.palantir.com/docs/foundry/aip-evals/intermediate-parameters/
fetched: 2026-04-20
section: aip-stack
doc_title: Use intermediate parameters to evaluate block output
---

Use intermediate parameters to evaluate block output
=====================================================

LLM-backed functionality often includes multiple complex operations, and only evaluating the end result may be insufficient to determine prompt performance.

With AIP Logic and AIP Evals you can set up intermediate parameters for evaluation. Similar to final function outputs, intermediate outputs can be used for setting up automated evaluators, or to simply look at the results. Intermediate parameter output values will be included in the evaluation suite results dataset should one be set up.

Set up intermediate parameters
--------------------------------

To set up intermediate parameters for evaluation, follow these steps:

1. Select the flask icon on an AIP Logic block to expose the output as intermediate parameter.
2. Select the new intermediate parameter in the evaluator configuration panel to evaluate the output.

Once configured, running the evaluation suite will capture both the final output and any intermediate outputs for each test case, enabling more granular evaluation of multi-step Logic functions.
