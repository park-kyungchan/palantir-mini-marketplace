---
sourceUrl: "https://www.palantir.com/docs/foundry/insight/map-insight/"
canonicalUrl: "https://palantir.com/docs/foundry/insight/map-insight/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "7c9d80d225becedbbf638a31e4586177d41c8fa58065bd7b5c954f3420fa4415"
product: "foundry"
docsArea: "insight"
locale: "en"
upstreamTitle: "Documentation | Explore results > Maps"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Map

If any object type property in your analysis is geographic, the **Map** tab will be available in your Insight workbook. The map is particularly useful for workflows where you want to filter objects visually, such as identifying airports within 500km of Berlin.

The map in Insight is an integration of the Foundry [Maps](/docs/foundry/map/overview/) application. You can navigate directly from your Insight map to the Maps application by selecting the map icon on the left. The map also retains access to a table view, and selecting any object opens the object view in the analysis panel.

## Filter with map

Use the drawing tools in the top left of the map to draw circles or polygons and apply them as filters. Applied filters are added to the analysis panel, which tracks all path modifications. Geographic properties can only be filtered from the map and cannot be filtered directly from the analysis panel or charts sections.

![A map with a radius filter drawn on it.](/docs/resources/foundry/insight/insight-map.png)
