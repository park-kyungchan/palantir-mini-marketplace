---
sourceUrl: "https://www.palantir.com/docs/foundry/aip-observability/performance-monitoring-and-optimization/"
canonicalUrl: "https://palantir.com/docs/foundry/aip-observability/performance-monitoring-and-optimization/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "c4477af06e379219a1df4da98357d84645247114bc815d393381692a0a4d6032"
product: "foundry"
docsArea: "aip-observability"
locale: "en"
upstreamTitle: "Documentation | AIP observability > Performance monitoring and optimization"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Performance monitoring and optimization

AIP observability provides comprehensive tools to monitor, analyze, and optimize the performance of your workflows and AIP applications. By leveraging trace data, execution metrics, and detailed logs, you can identify bottlenecks, optimize resource usage, and ensure your applications run efficiently at scale.

## Why performance monitoring matters

Performance monitoring is crucial for:

* **User experience:** Slow workflows can frustrate users and reduce adoption.
* **Cost efficiency:** Optimized workflows use fewer resources and reduce compute costs.
* **Reliability:** Identifying performance issues early prevents outages and failures.
* **Scalability:** Understanding performance characteristics can help you plan for growth.

## Identifying performance issues

You can use the trace view to identify slow operations.

* **Long-running spans:** Look for operations that take significantly longer than others.
* **Sequential bottlenecks:** Identify operations that could potentially run in parallel.
* **Repeated operations:** Find redundant calls that could be optimized.
* **Model latency:** Monitor LLM response times and consider using different models for time-sensitive operations.

In the screenshot below, you can see an example of AIP observability helping identify unbatched model calls that could be optimized.

![Example Workflow Lineage trace view with redundant model calls](/docs/resources/foundry/aip-observability/workflow-lineage-performance-monitory-models.png)

## Optimization strategies

* **Parallel execution:** When possible, design workflows to execute independent operations concurrently.
* **Model selection:** Balance performance and quality by choosing appropriate models for each task.
* **Batch operations:** Group similar operations to reduce overhead.
* **Error handling:** Add proper error handling to prevent cascading failures.
