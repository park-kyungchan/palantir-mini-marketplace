---
sourceUrl: "https://www.palantir.com/docs/foundry/workshop/widgets-exploration-filter-pills/"
canonicalUrl: "https://palantir.com/docs/foundry/workshop/widgets-exploration-filter-pills/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "50940bbd775d4fba8f29507f05ee22a5de4205724ae319c4616584ce0408a105"
product: "foundry"
docsArea: "workshop"
locale: "en"
upstreamTitle: "Documentation | Filtering widgets > Exploration Filter Pills"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Exploration Filter Pills

Use the **Exploration Filter Pills** widget to visualize and apply filters to an object set.

![Exploration Filter Pills widget example](/docs/resources/foundry/workshop/widgets-exploration-filter-pills.png)

## Configuration options

* **Mode**
  * **Read only:** Display a non-editable view of any filters applied to a specified object set containing a single object type.
  * **Remove only:** Display an editable view of any filters applied to a specified object set containing a single object type, allowing users to remove any applied filters. An object set filter variable containing the applied filters may optionally be specified as output.
  * **Update existing filters only:** Display an editable view of any filters applied to a specified object set containing a single object type, allowing users to remove or edit any applied filters. An object set filter variable containing the applied filters may optionally be specified as output.
  * **Add, update, remove:** Display an editable view of any filters applied to a specified object set containing a single object type, allowing users to remove or edit any applied filters as well as add new property filters to be applied on the object set. An object set filter variable containing the applied filters may optionally be specified as output.
    * **Prevent users from changing operators (or, and):** Toggle to enable/disable users from changing operator values used between applied filters.
* **Display object type pill:** Toggle to enable/disable a pill describing the object type of the current object set.
