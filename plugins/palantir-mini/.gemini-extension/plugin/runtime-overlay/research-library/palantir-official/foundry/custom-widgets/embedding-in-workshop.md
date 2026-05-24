---
sourceUrl: "https://www.palantir.com/docs/foundry/custom-widgets/embedding-in-workshop/"
canonicalUrl: "https://palantir.com/docs/foundry/custom-widgets/embedding-in-workshop/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "cc3d94a76d4f05d07437f50e52ec4ca6bcc5eb31376f2b704fd2cbb5edc9120a"
product: "foundry"
docsArea: "custom-widgets"
locale: "en"
upstreamTitle: "Documentation | Custom widgets > Embedding a widget in Workshop"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Embedding a widget in Workshop

To embed a widget in [Workshop](/docs/foundry/workshop/overview/), start by adding a **custom widget** component to your Workshop:

![Select custom widget renderer.](/docs/resources/foundry/custom-widgets/workshop-custom-widgets.png)

In the new **Widget setup** tab, find **Select** to select the widget set and version to use.

## Configure parameters and events

You can bind the **parameters** your widget uses to Workshop variables to allow passing data in and out of the Workshop state. For information on the different parameter types available, see [parameters and events](/docs/foundry/custom-widgets/parameters-and-events/).

You can use **events** to allow widgets to update the parameter values. You can also bind these events to [Workshop events](/docs/foundry/workshop/concepts-events/) such that when a widget fires an event, it will also trigger a Workshop event.

Widget parameters and events can be bound to Workshop variables and events in the **Widget setup** panel:

<img src="./media/workshop-parameters-and-events.png" alt="Events and parameters configuration." width=350 />

## Limitations

Custom widgets currently reload every time they are removed from the page and later displayed again. To prevent the widget from resetting in this case, consider storing custom widget data in Workshop variables that are passed to the widget.
