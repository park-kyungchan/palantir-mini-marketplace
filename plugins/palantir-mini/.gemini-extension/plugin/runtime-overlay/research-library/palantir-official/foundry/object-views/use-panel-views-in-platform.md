---
sourceUrl: "https://www.palantir.com/docs/foundry/object-views/use-panel-views-in-platform/"
canonicalUrl: "https://palantir.com/docs/foundry/object-views/use-panel-views-in-platform/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d1bb69fa97cceb94616215c9a39bfde2ed0997c9cb9516889e2da33f42c0ab61"
product: "foundry"
docsArea: "object-views"
locale: "en"
upstreamTitle: "Documentation | Panel Object Views > Use panel Object Views in the platform"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Use panel Object Views

Panel Object Views are embedded into applications across the Palantir platform to provide users with a consistent experience of object data across workflows. All object types have a [standard Object View](/docs/foundry/object-views/standard-object-views/) panel available by default, and you can build [configured panel Object Views](/docs/foundry/object-views/config-panel-views/) to display either an *object instance* or an *object set*.

## Panel Object Views in platform applications

Panel object views can appear across Palantir platform applications, such as [Vertex](/docs/foundry/vertex/overview/), [Map](/docs/foundry/map/overview/), and Gaia.

### Object instance panels

Object instance panels display a single instance of an object type and appear in an application's selection panel.

<img src="./media/panel-object-view-in-vertex.png" alt="Panel object view embedded in Vertex." width="300">
<img src="./media/panel-object-view-in-maps.png" alt="Panel object view embedded in Maps." width="300">
<img src="./media/panel-object-view-in-gaia.png" alt="Panel object view embedded in Gaia." width="300">

### Object set panels

Object set panels display an aggregated view of multiple instances of a single object type. They appear in applications when you select an object set comprised of several instances of the same object type.

<img src="./media/panel-object-set-view-in-gaia-maps-vertex.png" alt="Object set view panel embedded in Gaia, Maps, and Vertex." width="800">

## Panels in Workshop applications

Panels can be used in custom Workshop applications to provide a compact view of object data. To enable this, use Workshop's [Object View widget](/docs/foundry/workshop/widgets-object-view/), configured to show the panel form factor.

![Panel object view embedded in Workshop.](/docs/resources/foundry/object-views/panel-object-view-in-workshop.gif)
