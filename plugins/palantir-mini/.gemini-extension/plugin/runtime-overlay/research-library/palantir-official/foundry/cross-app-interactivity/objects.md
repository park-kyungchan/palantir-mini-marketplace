---
sourceUrl: "https://www.palantir.com/docs/foundry/cross-app-interactivity/objects/"
canonicalUrl: "https://palantir.com/docs/foundry/cross-app-interactivity/objects/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d4b4ac75721b7bc6496536e4d6457210ec21321637b4a1b5fbb8ea92e2a9be30"
product: "foundry"
docsArea: "cross-app-interactivity"
locale: "en"
upstreamTitle: "Documentation | Media types reference > Objects"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Objects

Object media types describe the contract for attaching object metadata to a drag payload. The Palantir platform accepts these media types, so adding them to your drag payloads allows related drop zones to receive data containing this media type. Creating drop zones with these media types means you can drag payloads from related drag zones in the Palantir platform onto your drop zones. See [media types](/docs/foundry/cross-app-interactivity/drag-and-drop-overview/#media-types) and [Palantir media types](/docs/foundry/cross-app-interactivity/drag-and-drop-overview/#palantir-media-types) for more information.

## Foundry

These are media types primarily used for data in Foundry and are backed by Foundry concepts.

### Foundry object resource identifiers

**Media type:** `"application/x-vnd.palantir.rid.phonograph2-objects.object"`

**Data shape:** `string[]`

This media type can be used for transferring Foundry object resource identifiers (RIDs) on a DataTransfer.

Refer to the [drag and drop zone tutorial](/docs/foundry/cross-app-interactivity/tutorial/) for guidance on how to use this media type to implement drag and drop for your application. Refer to the [Ontology overview documentation](/docs/foundry/object-backend/overview/) for information on how you can use these IDs to get object data, and review the [object RID documentation](/docs/foundry/functions/object-identifiers/) for more information on Foundry object RIDs.

#### Usage

This media type can be written to a DataTransfer as follows:

```typescript
const foundryObjectRids = ["ri.phonograph2-objects.main.object.XXXXXXX", "ri.phonograph2-objects.main.object.YYYYYYY"]
event.dataTransfer.setData(
    "application/x-vnd.palantir.rid.phonograph2-objects.object",
    JSON.stringify(foundryObjectRids)
);
```

#### Examples

In an Object Explorer view, the object icon is a drag zone that adds the Foundry object RID media type to the drag payload.

<img src="./media/foundry-object-explorer.png" width=600 alt="Foundry Object Explorer">

This drag payload can then be dropped onto the Vertex graph.

<img src="./media/vertex-graph.png" width=600 alt="Foundry Vertex Graph">

## Gotham

These are media types primarily used in Gotham and are backed by Gotham concepts.

### Gotham object identifiers

**Media type:** `"application/x-vnd.palantir.rid.gotham.object"`

**Data shape:** `string[]`

This media type can be used for transporting Gotham object identifiers on a DataTransfer. Gotham identifiers, also known as GIDs, are used to identify data and other concepts in Gotham.

Review the [drag and drop tutorial](/docs/foundry/cross-app-interactivity/tutorial/) for guidance on how to use this media type to implement drag and drop for your application.

#### Usage

This media type can be written to a DataTransfer as follows:

```typescript
const gothamObjectIds = ["ri.gotham.XXXXXXXX", "ri.gotham.YYYYYYYYY"]
event.dataTransfer.setData(
    "application/x-vnd.palantir.rid.gotham.object",
    JSON.stringify(gothamObjectIds)
);
```

#### Examples

In the figure below, each of the cards is a Gotham object drag zone.

<img src="./media/browser-drag-zones.png" width=600 alt="Gotham Browser Drag Zones">

The following map drop zone accepts Gotham object drag payloads.

<img src="./media/gaia-map-drop-zone.png" width=600 alt="Gaia Map Drop Zone">
