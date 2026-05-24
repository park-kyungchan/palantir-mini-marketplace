---
sourceUrl: "https://www.palantir.com/docs/foundry/contour/boards-verify-results/"
canonicalUrl: "https://palantir.com/docs/foundry/contour/boards-verify-results/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "994ca10b1a7af6107a9a3660056eb29ce84e181ce40498330338d3582155bb19"
product: "foundry"
docsArea: "contour"
locale: "en"
upstreamTitle: "Documentation | Boards > Verify results"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Verify results

In Contour, you can use various boards to check the dataset produced by your analysis. Some of the simplest ways to check results are:

* [Using the Table board](#using-the-table-board)
* [Using the Table panel](#using-the-table-panel)
* [Using the Histogram board](#using-the-histogram-board)

***

## Using the Table board

By inserting a **Table** board after an analysis, you can quickly check to see if any new columns are correct or if the logic of a previous board resulted in the intended outcome.

![check-with-table-board](/docs/resources/foundry/contour/boards-verify-table.gif)

***

## Using the Table panel

In addition to the path view, which lists the boards you’ve applied to your dataset, Contour also offers a **table panel**. Using the table panel enables you to see the underlying data in a table as you apply each board.

The table panel makes the table (not boards) the focus, so you can see how the data changes as you add each board. This can be especially helpful when writing [expressions](/docs/foundry/contour/expressions-overview/).

You can switch to the table panel by clicking **Show table** in the upper right. Click the button again or click **Hide table** to return to path view.

![table-view](/docs/resources/foundry/contour/boards-verify-table.png)

***

## Using the Histogram board

Inserting a **Histogram** board after an analysis provides a quick overview of the different data categories, which can be used for general assessment of the data or to check that the filtered categories are correct.

![check-with-histogram-board](/docs/resources/foundry/contour/boards-verify-histogram.gif)
