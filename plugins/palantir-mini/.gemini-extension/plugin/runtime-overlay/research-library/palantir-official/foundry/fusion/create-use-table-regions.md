---
sourceUrl: "https://www.palantir.com/docs/foundry/fusion/create-use-table-regions/"
canonicalUrl: "https://palantir.com/docs/foundry/fusion/create-use-table-regions/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "928c31e61e353d5748e89692f9181b997f13538cac49369ab702c39e2e2e3326"
product: "foundry"
docsArea: "fusion"
locale: "en"
upstreamTitle: "Documentation | Sheets > Create and use table regions"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Create and use table regions

You can create a table out of any region in the spreadsheet – table regions enforce a strictly tabular format to a region and allow you to assign column headers, refer to columns by column names (vs cell references), sort the rows by any column, etc.

![table](/docs/resources/foundry/fusion/table.png)

:::callout{theme="success" title="Tip"}
When a new row is appended to a table region, it’ll grow the region, pushing down any values underneath as necessary.
:::

:::callout{theme="warning" title="Warning"}
Sorting in Fusion works differently from other spreadsheet tools that you may have used. Rather than simply presenting a sorted view of the data, performing a sort in Fusion actually rearranges the rows in a sheet so that the cells are in a sorted order. This means that a sort in Fusion cannot be "turned off" to return to the original ordering; instead, you will need to undo the sort in order to see the original ordering again.
:::
