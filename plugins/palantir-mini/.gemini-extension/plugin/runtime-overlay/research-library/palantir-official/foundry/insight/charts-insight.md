---
sourceUrl: "https://www.palantir.com/docs/foundry/insight/charts-insight/"
canonicalUrl: "https://palantir.com/docs/foundry/insight/charts-insight/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "36e2f384e0bfd8c5728319af2088c507af5b4ec0ad73cc9ac2dfe57734974d75"
product: "foundry"
docsArea: "insight"
locale: "en"
upstreamTitle: "Documentation | Explore results > Charts"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Charts

The **Charts** tab in your Insight workbook provides an out-of-the-box visualization for each property in the analysis path. Eight properties are shown by default and can be modified using the **Edit property card layout** panel found by selecting the gear icon in the top right corner.

![The Charts tab displays visualizations for each property in the analysis path.](/docs/resources/foundry/insight/add-chart-to-insight.png)

Charts provide a quick visual summary of all properties in the analysis path. When combined with saved layouts, the charts section can be configured as a shareable dashboard view. Charts can also be used to filter data; selecting a chart provides the option to apply it as a filter. Chart cards can be repositioned within the layout, and charts will resize responsively based on browser or screen size.

## Manage charts

Charts are uniform in size by default but can be extended to double their width or height. Charts can also be reordered by dragging them to the preferred position.

![Charts can be moved and resized within the Insight layout.](/docs/resources/foundry/insight/resize-charts.png)

## Types of charts

The chart type available depends on the property type:

* **String:** Histogram and single stat of count
* **Numeric:** Distribution and single stat with aggregation options
* **Timestamp/date:** Distribution
* **Geographic properties:** Not supported in charts. View geographic properties in the [**Map** tab](/docs/foundry/insight/map-insight/).
* **Struct/array of structs:** Not supported in charts
* **Media reference:** Not supported in charts. View media references in the [**Table** tab](/docs/foundry/insight/table-insight/).
