---
sourceUrl: "https://www.palantir.com/docs/foundry/notepad/widgets-vertex-graph/"
canonicalUrl: "https://palantir.com/docs/foundry/notepad/widgets-vertex-graph/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "ebebe279ec805c12233ec7912e779d3757697845b3e0f19ecf5300fbbd5e0a22"
product: "foundry"
docsArea: "notepad"
locale: "en"
upstreamTitle: "Documentation | Widgets > Vertex graph"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Vertex graph

Embed [Vertex](/docs/foundry/vertex/overview/) graphs into Notepad documents using the **Vertex Graph** widget. You can add a graph widget by selecting **+ Add Widget** or typing `/` in a paragraph field. This will open a search dialog where you can find resources and add them to your document.

Below is an example of an embedded Vertex graph.

![A vertex graph embedded in a Notepad document.](/docs/resources/foundry/notepad/notepad_widgets_vertex_graph.png)

The widget is **read-only**, meaning users cannot modify its contents. However, it supports interactive features to explore the embedded graph.

* **Information controls (top-left)**
  * **Selection panel:** Show details about the selected objects.
  * **Info panel:** Shows a summary of the layers present in the graph.
* **Navigation controls (bottom-left)**
  * **Export as PNG:** Download the embedded graph as a PNG image directly from Notepad.
  * **Open in Vertex:** Launch the graph directly in the Vertex application.
  * **Zoom to fit:** Adjust the view to fit the entire graph within the widget.
  * **Zoom in/zoom out:** Adjust the magnification of the graph view.
* **Panning**
  * Users can pan across the graph by clicking and dragging within the widget.

Note: Pan, zoom, and selection states are not preserved when exporting the Notepad as a PDF.

## Widget properties

* **Vertex graph:** Select a Vertex graph to embed in the Notepad document.
