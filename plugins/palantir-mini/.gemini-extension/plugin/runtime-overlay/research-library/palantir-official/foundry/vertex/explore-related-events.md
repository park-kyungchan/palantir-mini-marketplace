---
sourceUrl: "https://www.palantir.com/docs/foundry/vertex/explore-related-events/"
canonicalUrl: "https://palantir.com/docs/foundry/vertex/explore-related-events/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "313a633791050c11744266f695d8a4d747457753f284b2ec4f788c27976716fa"
product: "foundry"
docsArea: "vertex"
locale: "en"
upstreamTitle: "Documentation | Events and time series > Explore related events"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Explore related events

An **event** is defined and configured within the Ontology. All events must have a distinct start and end time and can be configured with specific thresholds to define the color shown for the event. [Read more about setting up and configuring events](/docs/foundry/vertex/configure-events/).

Once you create and configure your event objects, you can interact with them dynamically through your system graph.

### View events

Events linked to a selected object will show up in the selection panel and as badges on the object for the duration of the event.

![explore-events-1](/docs/resources/foundry/vertex/explore-events-1.jpg)

### Event badges

Event badges are configured within the layer styling options. Select the object type for which you want to show event badges, and choose the **linked events** option to add badges to nodes or edges on the graph.

![explore-events-2](/docs/resources/foundry/vertex/explore-events-2.jpg)

### Event objects

To see the full detail of the event, you can add the associated object to the graph. Right-click on the object to which the event is related, and select the **Search Around** option to find the event object (in this case, a Flight Delay event).

![explore-events-3](/docs/resources/foundry/vertex/explore-events-3.jpg)

Once added to the graph, you can select the event object to see the full details and properties in the selection panel.

![explore-events-4](/docs/resources/foundry/vertex/explore-events-4.jpg)

### Events in the series panel

Right-click on an object and select **Open linked events** to open and add the event to the series panel. From here, you can use the time selection to scrub through time and move through multiple events.

![explore-events-5](/docs/resources/foundry/vertex/explore-events-5.jpg)
