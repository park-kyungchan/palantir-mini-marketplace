---
sourceUrl: "https://www.palantir.com/docs/foundry/building-pipelines/unstructured-overview/"
canonicalUrl: "https://palantir.com/docs/foundry/building-pipelines/unstructured-overview/"
sourceLastmod: "2026-05-12T17:06:26.148Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "e1f9c3a5135c918dc6e0144c2c9c3b3f5e63d35201bc08e495728c1cb0640ecd"
product: "foundry"
docsArea: "building-pipelines"
locale: "en"
upstreamTitle: "Documentation | Pipelines on unstructured data > Overview"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Pipelines on unstructured data

As discussed in the overview for [datasets](/docs/foundry/data-integration/datasets/), unstructured data in Foundry is stored as a collection of files in a dataset just like tabular data.

These are some features that work identically between pipelines on structured and unstructured data:

* Pipelines can be made incremental to optimize compute performance.
* You can write unit tests against your pipelines.
* Computing output datasets is done using [builds](/docs/foundry/data-integration/builds/) and [schedules](/docs/foundry/building-pipelines/scheduling-overview/).
* Foundry's [pipeline security](/docs/foundry/building-pipelines/security-overview/) features enable robust, end-to-end security guarantees.

Some differences from pipelines on tabular data include:

* Most guidance and example code in documentation focuses on processing dataframes, which are not the input types used for unstructured data.
* You must use the lower-level file system APIs to read and write files in unstructured datasets.
* Because unstructured datasets have no schema, some features focused on validating rows and columns of tabular datasets are unavailable.
* It is possible to use Spark to process unstructured files in parallel, but the APIs are lower-level and more complex than for dataframe processing.

To get started with pipelines on unstructured data, refer to the relevant parts of documentation for Python and Java transforms:

* [Python transforms: Read and write unstructured files](/docs/foundry/transforms-python/unstructured-files/)
* [Java transforms: Read and write unstructured files](/docs/foundry/transforms-java/unstructured-files/)

Once unstructured data has been cleaned and normalized, you can use [Code Workbook](/docs/foundry/code-workbook/overview/) to analyze unstructured datasets and train machine learning models in Python and R. [Learn more about unstructured data access in Code Workbook](/docs/foundry/code-workbook/transforms-unstructured/).
