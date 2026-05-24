---
sourceUrl: "https://www.palantir.com/docs/foundry/vertex/read-only-mode/"
canonicalUrl: "https://palantir.com/docs/foundry/vertex/read-only-mode/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "e47b62e8075b2fe4be2c61396062fc4f6bf2d5958c26389a1e1cc397dd786859"
product: "foundry"
docsArea: "vertex"
locale: "en"
upstreamTitle: "Documentation | Graphs > Read-only mode"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Read-only mode

In certain situations, Vertex graphs can be opened in read-only mode.
In read-only mode, the following restrictions are applied:

* New objects cannot be added to the graph (including via Search Around).
* Graph nodes cannot be re-arranged (whether by drag-and-drop or other methods).
* The toolbar at the top of the page is hidden.

## When are Vertex graphs opened in read-only mode?

Below is a non-exhaustive list of the situations where a graph is opened in read-only mode.

* When a graph is embedded in Workshop and the read-only mode setting is explicitly enabled in the [widget configuration](/docs/foundry/vertex/embed-graph-workshop/#configure-the-widget).
* When a graph is opened in [Carbon](/docs/foundry/carbon/overview/).
* When a graph is embedded in [Notepad](/docs/foundry/notepad/widgets-vertex-graph/).
