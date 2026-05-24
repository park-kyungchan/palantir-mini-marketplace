---
sourceUrl: "https://www.palantir.com/docs/foundry/custom-widgets/open-url-in-workshop/"
canonicalUrl: "https://palantir.com/docs/foundry/custom-widgets/open-url-in-workshop/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "7eb11e1c0cb68816e0089d8af40270254bf1af939337de053bb5b4bf40d19c66"
product: "foundry"
docsArea: "custom-widgets"
locale: "en"
upstreamTitle: "Documentation | Custom widgets > Open a URL in Workshop"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Open a URL in Workshop

To open a URL from a custom widget in Workshop, emit an [event](/docs/foundry/custom-widgets/parameters-and-events/) and configure it in Workshop to trigger an `Open URL` Workshop event as a side effect.

This can be a simple static string URL, or a string variable URL that may be bound to a [parameter](/docs/foundry/custom-widgets/parameters-and-events/) and updated in the same custom widget event.

:::callout{theme="warning"}
Note that an asynchronous variable may not update before the `Open URL` event is run. For example, a direct update of a string variable URL as part of the custom widget event is synchronous, but a downstream variable transform to build the string variable URL would be asynchronous.
:::

!["Open URL" Workshop event configuration.](/docs/resources/foundry/custom-widgets/workshop-open-url-event.png)

When opening external URLs, this may trigger a warning dialog.

![External link dialog in Workshop.](/docs/resources/foundry/custom-widgets/workshop-open-external-link-dialog.png)
