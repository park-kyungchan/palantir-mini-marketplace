---
sourceUrl: "https://www.palantir.com/docs/foundry/data-lineage/stale-datasets/"
canonicalUrl: "https://palantir.com/docs/foundry/data-lineage/stale-datasets/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "b86e573a3114b3467bb3d6e504a68b5fd111d836b3b1280c4c9c19cc93dae4d2"
product: "foundry"
docsArea: "data-lineage"
locale: "en"
upstreamTitle: "Documentation | Understand and manage datasets > Understand out-of-date datasets"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Understand out-of-date datasets

There are a few reasons why your dataset may not be up to date. Common scenarios to explore are:

* Is my dataset build failing?
* Is there an upstream dataset that hasn't built and isn't up to date?
* Have we received up-to-date data from the source?

You can easily answer these questions by using Data Lineage.

* First, verify the status of each of the resources in your pipeline by opening up the dataset of interest in Data Lineage and right-clicking on the node.

![Expand selected node](/docs/resources/foundry/data-lineage/expand-node-data-lineage.png)

* Then, select **Expand node**. You can see all of the ancestor nodes for that dataset by clicking the double left arrow above **Expand parents**.

![Expand parents after expanding node](/docs/resources/foundry/data-lineage/parent-node.png)

* Next, select the **Build status** option in the **Node color options** dropdown in the top right of Data Lineage to see the build status of every resource in your pipeline. This view of your pipeline will make it much easier to diagnose stale datasets.

![Choose build status node color](/docs/resources/foundry/data-lineage/node-color-build-status.png)
