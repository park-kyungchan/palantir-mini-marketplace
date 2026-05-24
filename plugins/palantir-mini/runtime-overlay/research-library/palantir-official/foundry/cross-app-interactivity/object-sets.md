---
sourceUrl: "https://www.palantir.com/docs/foundry/cross-app-interactivity/object-sets/"
canonicalUrl: "https://palantir.com/docs/foundry/cross-app-interactivity/object-sets/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "df7103082b87728f125098f5a43d7a7db4b9f62d5b291f53d446d43b8faaa6f6"
product: "foundry"
docsArea: "cross-app-interactivity"
locale: "en"
upstreamTitle: "Documentation | Media types reference > Object sets"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Object sets

An object set represents an unordered collection of objects of a single media type. See [media types](/docs/foundry/cross-app-interactivity/drag-and-drop-overview/#media-types) and [Palantir media types](/docs/foundry/cross-app-interactivity/drag-and-drop-overview/#palantir-media-types) for more information.

## Foundry

These are media types primarily used for transporting data in Foundry and are backed by Foundry concepts.

### Foundry object set

**Media type:** `"application/x-vnd.palantir.rid.object-set.temporary-object-set"`

**Data shape:** `string[]`

This media type can be used for transporting Foundry object set RIDs on a DataTransfer. See [object sets](/docs/foundry/functions/api-object-sets/#api-object-sets) for more information.

Refer to the [drag and drop zone tutorial](/docs/foundry/cross-app-interactivity/tutorial/) for guidance on how to use this media type to implement drag and drop for your application.

#### Usage

This media type can be written to a DataTransfer as follows:

```typescript
const objectSetRids = ["ri.object-set.main.temporary-object-set.XXXXXXXX", "ri.object-set.main.temporary-object-set.YYYYYYYYY"]
event.dataTransfer.setData(
    "application/x-vnd.palantir.rid.object-set.temporary-object-set",
    JSON.stringify(objectSetRids)
);
```

#### Examples

If your Workshop section title is made draggable, it becomes a drag zone that adds the object set media type to the drag payload.

<img src="./media/drag.png" width=600 alt="Foundry Draggable Workshop Section Title">

This drag payload can then be dropped onto a Vertex graph.

<img src="./media/vertex-graph.png" width=600 alt="Foundry Vertex Graph">
