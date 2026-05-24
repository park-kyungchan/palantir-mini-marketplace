---
sourceUrl: "https://www.palantir.com/docs/foundry/analytics/datasets-object-sets/"
canonicalUrl: "https://palantir.com/docs/foundry/analytics/datasets-object-sets/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "afe945633b1a1d56f4c642dc05786dfda7763bf89a8480559557309ca2516239"
product: "foundry"
docsArea: "analytics"
locale: "en"
upstreamTitle: "Documentation | Analytical results > Datasets and Object Sets"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Datasets and object sets

## Datasets

In Contour and Code Workbook, users can choose to output datasets (tabular data) to capture analysis results. These datasets can be used in applications like Contour, Code Workbook, and Fusion, and can be shared with other users.

:::callout{theme="neutral" title="Which tool should I use to build pipelines?"}
Contour and Code Workbook are not optimized for creating production pipelines. If you are building or maintaining production pipelines, use the [Code Repositories](/docs/foundry/code-repositories/overview/) application, which includes version history, branching and pull requests, and other functionality essential for robust pipelines. More information can be found in [this comparison of Foundry’s tools for writing code-based transformations.](/docs/foundry/code-workbook/code-products-comparison/)
:::

### Contour

You can save the results of a Contour path by selecting **Save as dataset** at the bottom of the path. After naming the dataset and choosing its save location, the dataset will build with the results of the analysis. [Learn more about saving a dataset from Contour.](/docs/foundry/contour/datasets-save/)

![Screenshot of Contour save path as dataset](/docs/resources/foundry/analytics/datasets-contour-save.png)

### Code Workbook

You can choose to save the results of Code Workbook transformations as a dataset by selecting **Save as dataset**. By default, new transforms are not saved as datasets. [Learn more about saving a dataset from Code Workbook.](/docs/foundry/code-workbook/optional-data-persistence/)

![code workbook save dataset](/docs/resources/foundry/analytics/datasets-code-workbook-save.png)

### When are Code Repositories a better fit?

We recommend using the [Code Repositories](/docs/foundry/code-repositories/overview/) application to create robust production pipelines and support workflows that require an additional layer of governance and monitoring. With Code Repositories, data engineers can create efficient pipelines in bulk.

Example workflows that are a good fit for Code Repositories include:

* A daily pipeline at high data scale which requires incremental compute.
* A high-visibility pipeline with strict governance requiring the ability to revert to previous versions of historical code, or to gate code changes on successful unit tests.

Example workflows that are a good fit for saving a dataset in Contour or Code Workbook are:

* One-time capture of data that is then used in another analytical application.

While you can set build schedules on datasets created in Contour and Code Workbook, pipelining workflows generally belong in Code Repositories.

## Object sets

Object sets are lists of real-world entities that are saved for future reference and use across Foundry applications that support objects. Object sets are saved as resources for easy sharing with collaborators.

There are two types of object sets:

* **Static object sets:** Static object sets are saved as a list of primary keys, and will stay the same regardless of any changes to the input data.
* **Dynamic object sets:** Dynamic object sets are saved as a representation of the filters applied to create the object set. When new data matches the filters, the object set will be updated.

Object sets created in a Quiver analysis can be saved in Foundry. Once saved, such object sets can be imported in a new Quiver analysis or opened in another Foundry application, such as Object Explorer.

To export an object set, open the editor of the object set card by clicking the <img alt="Settings icon" src="./media/gear.png" width="30px"> icon in the upper-right corner of the card, and navigate to the Export tab.

![Animation of export of object sets to a resource](/docs/resources/foundry/analytics/object-sets-export-compass.gif)

To import an object set, use the **Import saved object reference** card.

<img alt="Import saved object set" src="./media/object-sets-import-quiver.png" width="250px">

Read more on [how to import and export object sets in Quiver](/docs/foundry/quiver/objects-overview/).

Object sets can also be saved, updated, and compared in Object Explorer. Read more on how to save object sets in [Object Explorer](/docs/foundry/object-explorer/overview/).
