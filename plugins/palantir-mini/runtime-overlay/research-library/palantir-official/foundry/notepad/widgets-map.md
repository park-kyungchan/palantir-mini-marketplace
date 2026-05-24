---
sourceUrl: "https://www.palantir.com/docs/foundry/notepad/widgets-map/"
canonicalUrl: "https://palantir.com/docs/foundry/notepad/widgets-map/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "37a2028f7dde5524131ae0d7f6056ce2c149a2dac55321d3918c29d84f24dcb4"
product: "foundry"
docsArea: "notepad"
locale: "en"
upstreamTitle: "Documentation | Widgets > Map"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Map

Maps and map templates from the [Map application](/docs/foundry/map/overview/) can be embedded into Notepad using the **map** widget. Add a map widget by clicking **+ Add Widget** or typing `/` in a paragraph field to open up the widget insertion menu. This will open a search bar where you can find a specific object and select it to add.

Due to web browser resource constraints, there is a limit of 4 embedded map widgets per Notepad document.

![notepad\_widgets\_map](/docs/resources/foundry/notepad/notepad_widgets_map.png)

## Widget properties

* **Map:** Select a map or map template to be embedded in the Notepad document.

* **Map template parameters:** (Optional) May be defined when embedding a map template.
  * If embedding a map template in a simple Notepad document, the map template's parameters may be set to static values to generate the map view.
  * If embedding a map template in a Notepad template, define the Notepad template's inputs and use them as input parameters for the embedded map template. The template input values will be passed to the embedded map template to override the map template’s input parameters.

![notepad\_widgets\_map\_template](/docs/resources/foundry/notepad/notepad_widgets_map_template.png)
