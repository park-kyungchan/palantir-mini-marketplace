---
sourceUrl: "https://www.palantir.com/docs/foundry/vertex/configure-events/"
canonicalUrl: "https://palantir.com/docs/foundry/vertex/configure-events/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "db7a74b2f9e5509c2d1841410565cf0ced6bd3eddbb97afadfd623c0abdddbbf"
product: "foundry"
docsArea: "vertex"
locale: "en"
upstreamTitle: "Documentation | Events and time series > Configure events"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Configure events

## Event configuration

To use events in Vertex, create a time series event object type and add one additional Vertex type class to set the color and/or severity of the alert (this can be on any column, but typically the primary key):

* Orange: `kind`: `vertex`, `name`: `event_intent.warning`
* Red: `kind`: `vertex`, `name`: `event_intent.danger`
* Blue: `kind`: `vertex`, `name`: `event_intent.primary`
* Green: `kind`: `vertex`, `name`: `event_intent.success`

You can configure these type classes in the **Capabilities** tab for the event object in the Ontology Manager or directly in the type classes for the properties of the object.

![Capabilities tab](/docs/resources/foundry/vertex/optional_ontology_config-event.jpg)
