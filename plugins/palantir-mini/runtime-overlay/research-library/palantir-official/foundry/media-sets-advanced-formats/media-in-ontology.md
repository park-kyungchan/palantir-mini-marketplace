---
sourceUrl: "https://www.palantir.com/docs/foundry/media-sets-advanced-formats/media-in-ontology/"
canonicalUrl: "https://palantir.com/docs/foundry/media-sets-advanced-formats/media-in-ontology/"
sourceLastmod: "2026-05-12T17:06:26.152Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "282e7aa4d299063f3810a0342a55dee23ba5886dc14e3cb7e7deb000a2c0ecc5"
product: "foundry"
docsArea: "media-sets-advanced-formats"
locale: "en"
upstreamTitle: "Documentation | Media sets (unstructured data) > Using media in the Ontology"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Using media in the Ontology

## Ontologize media using media references

Use [media reference object properties](/docs/foundry/object-link-types/base-types/#media-references) to efficiently display your media in applications that build on the ontology. Optimizations include faster and interactive previews in Workshop or Object Explorer, as well as tiling for geospatial imagery in Map.

## Custom logic using media reference properties

Use objects with media reference object properties in [functions on objects](/docs/foundry/functions/media/).

You can read the raw media item directly. Additionally, you can perform common type-specific operations on the media item, such as:

* OCR on documents
* text extraction from documents
* audio transcription
* read media item metadata

## Leveraging media with OSDK

If you are building applications with Foundry as the backend, you can leverage the [media capabilities in OSDK](/docs/foundry/media-sets-advanced-formats/use-media-in-osdk/).

## Considerations for use

* Media files uploaded in action forms are only uploaded to the backing media set upon successful form submission, to ensure that canceled or failed submissions do not result in orphaned media files in media sets.
* Media reference lists are not supported as a property type on an object.
* Multiple media sets backing a media reference property in the **Capabilities** tab of an object type are strongly discouraged. Media uploads in actions are not fully supported in this case.
