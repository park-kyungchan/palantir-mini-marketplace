---
sourceUrl: "https://www.palantir.com/docs/foundry/walkthroughs/walkthrough-metrics/"
canonicalUrl: "https://palantir.com/docs/foundry/walkthroughs/walkthrough-metrics/"
sourceLastmod: "2026-05-12T17:06:26.158Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "fd48224ddd056a12f85ce7ada9da6de4854130feeb80819751afa0406bdcdce5"
product: "foundry"
docsArea: "walkthroughs"
locale: "en"
upstreamTitle: "Documentation | Walkthroughs > Walkthrough metrics"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Walkthrough metrics

Metrics for a given walkthrough are available in a dedicated metrics tab. This tab is accessible only to the owners of the walkthrough resource.

Aggregated metrics related to the walkthrough are always available and will be displayed on this tab.

![Aggregated metrics](/docs/resources/foundry/walkthroughs/aggregated_metrics.png)

## Granular metrics

To view specific, granular metrics at the individual user level, choose to **Enable user metric collection** on the **Metrics** page. Granular metrics are particularly useful if the walkthrough is used for compliance purposes, such as requiring users to complete a walkthrough before accessing a module. Consult your company's privacy officer to determine applicable laws regarding data collection before enabling this feature to ensure compliance with [Data Protection and Governance](/docs/foundry/security/data-protection-and-governance/) standards.

Once enabled, you will be able to view and track the progress of individual users for a given walkthrough to ensure completion.

![Granular metrics](/docs/resources/foundry/walkthroughs/granular_metrics.png)

Users starting a walkthrough will see a confirmation dialog to acknowledge that their metrics will be visible to others.

![Confirmation dialog](/docs/resources/foundry/walkthroughs/metrics_confirmation.png)

You can customize the content of this confirmation dialog by configuring a [checkpoint](/docs/foundry/checkpoints/overview/) for the walkthrough.
