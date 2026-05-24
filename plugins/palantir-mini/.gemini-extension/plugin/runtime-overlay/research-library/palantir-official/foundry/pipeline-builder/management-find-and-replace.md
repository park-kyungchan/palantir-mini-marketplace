---
sourceUrl: "https://www.palantir.com/docs/foundry/pipeline-builder/management-find-and-replace/"
canonicalUrl: "https://palantir.com/docs/foundry/pipeline-builder/management-find-and-replace/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "641cdf631e07b517f0c7487ff3e468d29d7440ea2ff921c4fffcc799390053e6"
product: "foundry"
docsArea: "pipeline-builder"
locale: "en"
upstreamTitle: "Documentation | Pipeline management > Find and replace"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Find and replace in Pipeline Builder

Pipeline Builder provides several search-related features to help with managing and debugging your pipelines. You can access these features via the **Search pipeline** panel (magnifying glass icon on the right side of the interface).

![Screenshot of the Search pipeline option.](/docs/resources/foundry/pipeline-builder/search-search-pipeline.png)

The search panel allows you to search your pipelines along several parameters, such as:

* Names of nodes
* Description/text board
* Column referenced
* Parameter referenced
* Transform names
* Constants used
* RIDs
* Column outputs and schemas
* Transform IDs

![Screenshot of the Search pipeline settings dropdown.](/docs/resources/foundry/pipeline-builder/search-search-options.png)

To narrow down your search, you can unselect any of the options above.

## Replace columns

Pipeline Builder's **Replace columns** feature allows you to replace one instance or bulk replace all instances of a column name with another.

Without the ability to bulk replace column names, if you change a column input name, you would need to go into your pipeline and manually change each original column name to the new column name.

To access the **Replace columns** menu, open the dropdown to the right of the search input area.

![Screenshot of the Replace columns option.](/docs/resources/foundry/pipeline-builder/search-replace-col-selection.png)

Enter the replacement string in the lower text box. In the area below the replacement string, you will see a preview of all the instances in your pipeline where the original string will be replaced with the replacement string.

![Screenshot of the find and replace example.](/docs/resources/foundry/pipeline-builder/search-all-results.png)

You can choose to replace all instances of the original string by selecting **Replace all**. You can also replace strings individually by hovering over the specific row and selecting **Replace**. If you want to replace all strings *except* for a selection of rows, you can select the **x** next the instances you want to exclude from the **Replace all** operation.

![Screenshot of the replace and replace all buttons.](/docs/resources/foundry/pipeline-builder/search-replace.png)
