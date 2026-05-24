---
sourceUrl: "https://www.palantir.com/docs/foundry/aip-observability/trace-view/"
canonicalUrl: "https://palantir.com/docs/foundry/aip-observability/trace-view/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "5ece84cd0c258d5f5ec4a6b9634d52526261933e4a534d22644d3938125fb0b9"
product: "foundry"
docsArea: "aip-observability"
locale: "en"
upstreamTitle: "Documentation | AIP observability > Tracing"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Trace views

The **Trace** view provides a visual timeline of your workflow execution, showing how different services interact and where time is spent. Specifically, a *distributed trace* is the timeline comprising all of the events between the generation of a request and the receipt of a response; these events can cross process, network and security boundaries. Distributed traces are key to understanding the path a request takes within your application.

## Permission required

To view traces and service logs, an administrator must enable [log access](/docs/foundry/aip-observability/log-permissioning/) for the relevant project. Users always have access to logs for their own executions from the past 24 hours.

## Key elements of the trace view

![Example Workflow Lineage with trace view](/docs/resources/foundry/aip-observability/workflow-lineage-trace-view.png)

* **Timeline visualization:** Horizontal bars show the duration of each operation.
* **Service hierarchy:** Nested spans show parent-child relationships between operations.
* **Resource types:** Coloring indicating whether each span was produced from a Function, Action, Automation, or LLM call.
* **Performance metrics:** Each span displays its execution time.

## Analyzing trace details

You can select any span to see the full **Trace Log Details** for that specific operation.

Trace details include:

* **Operation name:** The specific Function, Action, Language Model, Automation, or inner operation being executed.
* **Duration:** Execution time for the operation.
* **Input/output data:** For Function execution requests, you can view the parameters passed to and returned from the operation.
* **Model interactions:** For LLM calls, you can view the prompt, response, and token usage.
* **Error information:** Stack traces and error messages for failed operations.
* **Trace identifiers:** `foundryTraceId`, the Foundry-assigned identifier used to fetch telemetry, and `x-b3-traceid`, the standard distributed-tracing identifier included in the **tags** field on each service log entry (best-effort; may be absent on logs originating outside Foundry, such as applications built with the Ontology SDK).

![Example Workflow Lineage with trace log details](/docs/resources/foundry/aip-observability/workflow-lineage-trace-log-details.png)

## Related features

* [Execution history](/docs/foundry/aip-observability/run-history/): View all recent executions before diving into traces.
* [Service logs](/docs/foundry/aip-observability/service-logs-and-debugging/): Access detailed log messages for each span.
* [Performance monitoring](/docs/foundry/aip-observability/performance-monitoring-and-optimization/): Analyze trace data to identify optimization opportunities.
