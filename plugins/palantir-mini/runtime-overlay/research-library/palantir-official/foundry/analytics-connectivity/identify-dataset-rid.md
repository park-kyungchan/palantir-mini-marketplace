---
sourceUrl: "https://www.palantir.com/docs/foundry/analytics-connectivity/identify-dataset-rid/"
canonicalUrl: "https://palantir.com/docs/foundry/analytics-connectivity/identify-dataset-rid/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "80d0dc6d9ad9a6ec0bd75daeb7b8356572197c7b3285dbd36a143a19507762e1"
product: "foundry"
docsArea: "analytics-connectivity"
locale: "en"
upstreamTitle: "Documentation | Guides > Identify a dataset's RID or filepath"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Identify a dataset's RID or filepath

In order to work with Foundry data inside third-party BI tools, you'll need to specify the dataset you wish to work with. Some third-party tools offer graphical interfaces for exploring and selecting datasets. Others will require you to directly input information about the dataset you wish to work with.

Foundry provides two options for specifying your dataset details:

* "RID", which is the dataset identifier
* "Location", which specifies the filepath location of the dataset

You can locate these values in Foundry by navigating to your dataset's "About" page, clicking on "see more", and copying either the "RID" value or the "Location" from the left sidebar.

<img alt="Dataset RID and location in sidebar" src="./media/location-rid.png" width="800">
