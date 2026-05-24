---
source: https://www.palantir.com/docs/foundry/aip-evals/run-suite/
fetched: 2026-04-20
section: aip-stack
doc_title: Run an evaluation suite
---

Run an evaluation suite
========================

An evaluation suite can be run from different locations, including the AIP Logic Evals sidebar and the AIP Evals application. You can choose to run a full evaluation suite or only execute single test cases. The latter is useful for debugging and quick function iteration.

Full evaluation suite runs
---------------------------

In AIP Logic, navigate to the AIP Evals sidebar panel and select **Run evaluation suite**. If you have unsaved changes, **Save and run** will be displayed instead, ensuring that changes are saved before running an evaluation suite.

Alternatively, you can run an evaluation suite from the AIP Evals application. To open the application select **View** in the AIP Logic sidebar, or open the evaluation suite from the file system. In the Evals application you can run the evaluation suite by selecting **Run evaluation suite** in the upper-right corner.

Run configuration
-----------------

To access run configuration options, select the cog icon next to **Run evaluation suite**.

### Function to test

Evaluation suites can be run against functions authored in AIP Logic and functions authored in Code Repositories. Depending on this function source, you can target different versions of your function:

* **AIP Logic function:** Last saved (default) and published versions.
* **Non-AIP Logic function:** Published versions.

When your evaluation suite has multiple target functions configured, select **Test multiple functions** to switch to multi-target mode and select which targets to include in the run. Experiment configuration is not available in multi-target mode.

### Input mapping

Input mappings map values in evaluation suite columns to the inputs expected by the evaluated function. Suite column name and function input usually match, but this is not required.

### Execution mode

Two execution modes are available:

**User-scoped execution (default):**
* Suite executes with user permissions.
* Results visible only to the initiating user; deleted after 24 hours.
* Results not persisted in the results dataset.

**Project-scoped execution (Beta):**
* Suite executes with project-scope; all resources must be imported into the same project.
* Results visible to everyone with project access.
* Results persisted indefinitely.
* Results written to the results dataset if one is configured.

### Number of iterations

You can specify the number of times each test case should be run. Due to the non-deterministic nature of LLMs, running test cases at least three times is recommended for LLM-backed functions. Results are aggregated across iterations.

### Test parallelization

By default, ten test cases are executed in parallel. You can adjust this number to optimize performance or work around rate limits.

### Run metadata

In addition to automatically captured metadata (`used branch`, `version`, `model`), you can add custom key-value metadata pairs to differentiate runs in the evaluation suite run history.

View results
-------------

After a run completes, select the card in the **Most recent result** section to view the results. The results view shows:

* Aggregated metrics for the run
* Pass/fail status per metric per test case (based on configured objectives)
* Debug view accessible per test case (opens in new tab)
* Run comparison: select **Click to compare another run** to view two runs side-by-side with diff highlighting

Single test case execution
---------------------------

The AIP Evals sidebar in AIP Logic allows running single test cases via the play icon next to the test case name. This opens the debugger sidebar showing the execution of the Logic function and evaluators. The sidebar and results panel indicate pass/fail status per metric after execution.
