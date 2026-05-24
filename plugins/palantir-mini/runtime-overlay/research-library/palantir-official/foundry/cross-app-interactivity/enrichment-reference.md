---
sourceUrl: "https://www.palantir.com/docs/foundry/cross-app-interactivity/enrichment-reference/"
canonicalUrl: "https://palantir.com/docs/foundry/cross-app-interactivity/enrichment-reference/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "b7913edc099c598773d9e09d5c5690bfe8c632ecbd09bd1425325519f1ef436f"
product: "foundry"
docsArea: "cross-app-interactivity"
locale: "en"
upstreamTitle: "Documentation | Drag and drop > Drag and drop between Foundry and Gotham"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Drag and drop between Foundry and Gotham

In certain cases, you may have both a Foundry and Gotham representation of the same real-world object, rendering these object representations *synonyms* of one another. *Synonyms* are different resources that accurately represent the same object in the real world. These synonyms can be mapped to each other with type mapping, establishing them as synonymous representations.

To increase compatibility between Foundry and Gotham you can identify existing synonyms by implementing *data enrichment*. Drag-and-drop data enrichment transforms workflows by discovering mapped synonymous representations across Foundry and Gotham, increasing interoperability between your application and the Palantir platform.

:::callout{theme="neutral"}
To access data enrichment, your enrollment must have both Gotham and Foundry, with type mapping enabled. If your application performs drag-and-drop operations with only Gotham or only Foundry, you do not need to implement data enrichment.
:::

![Drag and drop between Gotham and Foundry](/docs/resources/foundry/cross-app-interactivity/dnd-gotham-foundry.gif)

Before proceeding with the tutorial below, ensure that you have reviewed the [overview](/docs/foundry/cross-app-interactivity/drag-and-drop-overview/) and tutorial on [creating drag-and-drop integration points](/docs/foundry/cross-app-interactivity/tutorial/) for a basic understanding of drag-and-drop concepts and implementation.

## Increase cross-application interactivity with data enrichment

As a sample use case, let's say your application recognizes Gotham object IDs, and you would like to create a workflow for dragging Gotham object ID data from your application to a Foundry application. You might first try to write the Gotham object IDs to the DataTransfer using the `dragstart` handler below. Note the custom Palantir media type `application/x-vnd.palantir.rid.gotham.object`:

```typescript
function handleDragStart(event) {
    event.dataTransfer.setData(
        "application/x-vnd.palantir.rid.gotham.object",
        JSON.stringify(["ri.gotham.XXXXXXXX", "ri.gotham.YYYYYYYY"...])
    );
    event.dataTransfer.effectAllowed = "move";
}
```

You might notice that the Foundry drop zones do not "light up" when you try to drag this data on them, indicating that this is not a valid media type for those drop zones. Foundry drop zones will likely not accept this data because the DataTransfer contains a Gotham-specific media type. You can remedy this by implementing *data enrichment*, so that Foundry synonyms for Gotham objects are identified and added to the DataTransfer. This allows Foundry to accept your dropped data, since a synonymous representation with an accepted media type will now be included in the DataTransfer. Note that this only works if you have type mapping enabled on your enrollment and for the objects you plan to enrich. Refer to the [type mapping documentation](/docs/foundry/object-link-types/enable-gotham-integration/) to learn more.

## Context and guidelines

The following sections provide context on how various aspects of data enrichment work. This includes an overview of the service that makes data enrichment possible and when and where to implement enrichment.

### Where to add data enrichment

Data enrichment can be added to drag zones *or* drop zones. It is not necessary to add enrichment on both drag and drop zones in a drag-and-drop workflow. Identify the flow of data between applications to determine where data will be coming *from* and where it will be going *to*.

If your application contains drop zones that you want users to drag Gotham and Foundry data *to*, we recommend enriching data in the drop zone after the drag payload is dropped. This way, your application will not need to recognize both Gotham and Foundry concepts. Instead, your application can accept Gotham *or* Foundry media types and use synonymous data from data enrichment if the original drag payload was not of an accepted media type.

Alternatively, if you have drag zones in your application that you want users to be able to drag *to* both Foundry and Gotham drop zones, we recommend enriching your data before adding it to the DataTransfer. This way, your drag payload will be enriched with both Foundry and Gotham media types, allowing Foundry and Gotham drop zones to accept the drag payload.

### Requesting enriched data

When implementing data enrichment, you must make a request to Data Bank Service to obtain synonymous data. The Data Bank Service identifies and returns synonymous object identifiers across Foundry and Gotham, enabling cross-platform drag and drop.

:::callout{theme="neutral"}
Making requests to Data Bank Service incurs slight performance costs, since an additional call is required. We recommend being aware of how many enriched drag or drop zones are added to your application and the associated increase in performance costs. Contact your Palantir representative for more information on this service.
:::

If your workflow involves dragging and dropping data between Gotham and Foundry, follow the [enrichment tutorial](/docs/foundry/cross-app-interactivity/enrichment-tutorial/) to harness the power of Palantir media types.
