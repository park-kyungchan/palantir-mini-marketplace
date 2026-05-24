---
sourceUrl: "https://www.palantir.com/docs/foundry/notepad/widgets-quiver-chart/"
canonicalUrl: "https://palantir.com/docs/foundry/notepad/widgets-quiver-chart/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "949187845b65f4f82eb9800df38b262ac247cd239e9c4799728ea1511f4ffd9f"
product: "foundry"
docsArea: "notepad"
locale: "en"
upstreamTitle: "Documentation | Widgets > Quiver chart"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Quiver chart

:::callout{theme="neutral"}
To templatize a Quiver chart in a [Notepad template](/docs/foundry/notepad/templates-overview/), first create a [Quiver dashboard](/docs/foundry/quiver/dashboards-create/). Then, you can use Notepad's [Quiver dashboard canvas widget](/docs/foundry/notepad/widgets-quiver-dashboard/) to embed a chart from it.
:::

You can integrate charts or tables from a Quiver analysis using the **Quiver chart** section. You can add Quiver charts either via the [insertion menu](/docs/foundry/notepad/embed-widgets/#from-a-document) or directly via the **Copy for Notepad** button available in Quiver.

The two options differ slightly:

* When embedded via **Copy for Notepad**, the chart and its filter state are captured. This means that all filters applied in the Quiver analysis are retained, and you won't be able to adjust the analysis and specific chart in the Widget properties configuration after adding to Notepad.

:::callout{theme="neutral"}
Note that when copy-pasting functions and other charts that are set to **auto-update** their version, the pasted chart will be pinned to the latest available version at the time of copying.
:::

* When embedded via the insertion menu, filter states are not captured. There is an option to adjust the Quiver analysis and the chart in the Widget properties configuration.

![notepad\_widgets\_quiver\_chart](/docs/resources/foundry/notepad/notepad_widgets_quiver_chart.png)

## Widget properties

* **Quiver analysis:** The selected analysis.
* **Object chart to render:** The chart in the selected analysis to render.
