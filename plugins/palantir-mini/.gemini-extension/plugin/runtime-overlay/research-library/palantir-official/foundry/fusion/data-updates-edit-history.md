---
sourceUrl: "https://www.palantir.com/docs/foundry/fusion/data-updates-edit-history/"
canonicalUrl: "https://palantir.com/docs/foundry/fusion/data-updates-edit-history/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "6937c913f5ea12177030b0c23754cb77135b19fadc92e8d0ad9b05717495fb67"
product: "foundry"
docsArea: "fusion"
locale: "en"
upstreamTitle: "Documentation | Sheets > Data updates and edit history"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Data updates and edit history

You can view the data sources used in a spreadsheet under the Sources pane in the top right.

![sources](/docs/resources/foundry/fusion/sources.png)

There are two ways to keep a spreadsheet up to date with dynamic data:

* **Auto-update:** When enabled, anytime a data source (i.e. a Foundry dataset used in a spreadsheet) is updated, cells that use data from that source will automatically be updated.
* **Manual:** If auto-update is not enabled, you will see a notification bar displayed on top of the spreadsheet whenever the data sources are updated, giving you the option to either update cells with fresh data or keep your spreadsheet as-is.

:::callout{theme="success" title="Tip"}
When you share the Fusion sheet with other users, make sure they also have read access to the datasets listed on the Sources pane. Users who lack access to referenced datasets will not be able to open the document.
:::

You can see a history of manually and automatically saved snapshots since a spreadsheet has been created in the history pane. Clicking on one of the snapshots will allow you to compare changes and restore if you’d like.

![history](/docs/resources/foundry/fusion/history.png)

:::callout{theme="success" title="Tip"}
Fusion will make backup snapshots of your spreadsheet periodically, but you can also manually make snapshots if you’d like.
:::
