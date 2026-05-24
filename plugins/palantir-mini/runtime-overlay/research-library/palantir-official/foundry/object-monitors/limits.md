---
sourceUrl: "https://www.palantir.com/docs/foundry/object-monitors/limits/"
canonicalUrl: "https://palantir.com/docs/foundry/object-monitors/limits/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "f4666bf35d5f634ace050d042a30f350ff0428c008dd4df835b5fec5ca43cbee"
product: "foundry"
docsArea: "object-monitors"
locale: "en"
upstreamTitle: "Documentation | Object Monitors [Sunset] > Monitoring limits"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Limits

:::callout{theme="warning"}
Object Monitors are superseded by [Automate](/docs/foundry/automate/overview/). Automate is a fully backward-compatible product that offers a single entry point for all business automation in the platform.
:::

Object monitoring implements several limits to ensure good performance for execution and triggering effects. These limits and the expected behavior are listed in the table below.

### Scale limits

| Description                                    | Limit       | Behavior when limit is reached |
| ---------------------------------------------- | ----------- | ------------------------------ |
| Number of times a monitor may trigger per hour | 12          | Monitor will be auto-disabled  |
| Number of times a monitor may trigger per day  | 96          | Monitor will be auto-disabled  |
| Max size of input for object added/removed condition | 100K     | Error message when saving the monitor OR runtime error when evaluating the monitor if the input set grows beyond 100K objects |
| Max number of subscribers to a single monitor  | 30           | Error message when saving the monitor |
| Max size of object type for realtime execution | 10M    | Error message when saving the monitor OR runtime error when evaluating the monitor if the total objects in the object type grows beyond the limit |
