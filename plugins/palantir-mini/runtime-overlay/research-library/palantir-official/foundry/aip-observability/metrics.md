---
sourceUrl: "https://www.palantir.com/docs/foundry/aip-observability/metrics/"
canonicalUrl: "https://palantir.com/docs/foundry/aip-observability/metrics/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "2579c249c8a04b4c9c6c44f926d8d546a9f5a4094d2ef7a5831afd8bf24ba81c"
product: "foundry"
docsArea: "aip-observability"
locale: "en"
upstreamTitle: "Documentation | AIP observability > Metrics"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Metrics

Foundry provides near real-time metrics for functions, actions, and AIP Logic resources. You can access these metrics through [Ontology Manager](/docs/foundry/ontology-manager/overview/) or in [Workflow Lineage](/docs/foundry/workflow-lineage/overview/) by selecting the resource node for a given execution. These metrics give you visibility into the health and performance of your Ontology and AIP workflows over the last 30 days.

## Available metrics

The following metrics are available for each resource type:

* **Success/failure metrics:** Monitor the current status of your executions with success and failure counts. This enables rapid identification of issues and supports proactive troubleshooting.

![Example of execution metrics for an AIP Logic resource in Workflow Lineage.](/docs/resources/foundry/aip-observability/logic-metric-in-wfl-executions.png)

* **P95 duration metric:** Track the 95th percentile (P95) execution duration. This metric highlights the upper range of execution times, helping you detect performance bottlenecks and optimize workflows.

![Example of P95 duration metric for an AIP Logic resource in Workflow Lineage.](/docs/resources/foundry/aip-observability/logic-metric-in-wfl-p95.png)

All metrics are updated in near real-time using the latest data from the Foundry Telemetry Service (FTS).

## Resource-specific metrics

Each resource type has its own metrics page with details on available failure categories and how to access metrics:

* [Function metrics](/docs/foundry/functions/function-metrics/)
* [Action metrics](/docs/foundry/action-types/action-metrics/)
* [AIP Logic metrics](/docs/foundry/logic/logic-metrics/)

## Permissions

To view metrics, you must be a `viewer` on the resource. For more details, see the [log permissions](/docs/foundry/aip-observability/log-permissioning/) page.

## Related resources

* **[Execution history](/docs/foundry/aip-observability/run-history/):** View a complete history of executions over the past seven days.
* **[Function monitoring](/docs/foundry/functions/monitoring/):** Set up alerts for function performance and failure rates.
* **[Action monitoring](/docs/foundry/action-types/monitoring/):** Configure monitoring rules for action performance and reliability.
