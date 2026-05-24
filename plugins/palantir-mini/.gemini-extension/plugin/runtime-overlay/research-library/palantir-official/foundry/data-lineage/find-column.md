---
sourceUrl: "https://www.palantir.com/docs/foundry/data-lineage/find-column/"
canonicalUrl: "https://palantir.com/docs/foundry/data-lineage/find-column/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "4b1b91f225cb4317f5176a387327619161a12829fd6851735d287d2eb4fd6058"
product: "foundry"
docsArea: "data-lineage"
locale: "en"
upstreamTitle: "Documentation | Understand and manage datasets > Find datasets with a given column"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Find datasets with a given column

You can easily search for specific dataset columns within your Data Lineage graph:

* First, ensure you added all datasets of interest in your pipeline to your lineage graph.

* Next, select all datasets of interest by using **Drag select mode** in the Tools toggle in the upper left hand corner of the app. You can also hold down `Ctrl / Command` to select multiple nodes at once, or use `Ctrl / Command + A` to select all nodes. <br><br>
  ![Select datasets with Select mode](/docs/resources/foundry/data-lineage/select-mode.png) <br><br>

* Then, select **View histogram of selection properties** from the Data Lineage sidebar. <br><br>
  ![View histogram of selection properties](/docs/resources/foundry/data-lineage/view-histogram.png) <br><br>

* Under the **Frequent Columns** section, you can see the most frequent columns by name in your selection.

* Click one of the columns to highlight the datasets in your selection that contain this column. <br><br>
  ![View frequent columns in histogram](/docs/resources/foundry/data-lineage/column-search-dataset.png) <br><br>
