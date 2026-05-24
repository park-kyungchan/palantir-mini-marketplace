---
sourceUrl: "https://www.palantir.com/docs/foundry/resource-management/analysis/"
canonicalUrl: "https://palantir.com/docs/foundry/resource-management/analysis/"
sourceLastmod: "2026-05-12T17:06:26.158Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "2ab51a47a82ab694a3d824f01a2932b6d4869216d4b80818f9dd3d43c8e219bf"
product: "foundry"
docsArea: "resource-management"
locale: "en"
upstreamTitle: "Documentation | Resource Management > Analysis"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Analysis

Analyze usage, cost, and billing with the Analysis tab.

![Analysis tab of Resource Management application.](/docs/resources/foundry/resource-management/analysis.png)

The **Analysis** tab in Resource Management gives users the opportunity to explore their usage data in more depth. Here, users can explore their usage by [usage accounts](/docs/foundry/resource-management/ecosystem/), [Project labels](/docs/foundry/resource-management/ecosystem/), [Projects](/docs/foundry/getting-started/projects-and-resources/), [Ontologies](/docs/foundry/ontologies/ontologies-overview/), sources, and more. Usage can be grouped together and explored in aggregate.

* **Date range:** The date range scopes the data displayed in the analysis to the specified date period. All dates and times are in UTC.
* **Bucket period:** How data is bucketed for display in the usage chart.
  * Only complete buckets will be returned. Therefore, weekly or monthly bucket periods should only be used with aligned date ranges to ensure that the total usage values are correct.
  * Data loading will be slower for daily bucket periods than for weekly or monthly bucket periods.
* **Source:** Specifying a source scopes the data displayed in the analysis to the specified source type. For example, if a user would like to see only usage coming from streaming, they could select [Streaming](/docs/foundry/data-integration/streaming-guide/).
* **Filtering:** Specifying a usage account, project label, Project, or Ontology scopes the data displayed in the analysis to that area of the data hierarchy.
* **Group by:** Specifying a grouping allows users to group the data presented in the analysis by the selected criteria.

All of these selection mechanisms work in tandem to refine an analysis to a user's desired set of data.
