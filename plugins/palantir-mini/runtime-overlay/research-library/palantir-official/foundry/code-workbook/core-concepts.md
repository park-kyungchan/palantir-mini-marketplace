---
sourceUrl: "https://www.palantir.com/docs/foundry/code-workbook/core-concepts/"
canonicalUrl: "https://palantir.com/docs/foundry/code-workbook/core-concepts/"
sourceLastmod: "2026-05-12T17:06:26.156Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "6de4ab84e6f33662237207932b983d836f5efa28e68c90fbf09ecc47120bdccb"
product: "foundry"
docsArea: "code-workbook"
locale: "en"
upstreamTitle: "Documentation | Code Workbook [Legacy] > Core concepts"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Core concepts

## Workbooks

The main resource you interact with in Code Workbook is a **Workbook**. Workbooks are used to import datasets from Foundry and transform these input datasets for purposes such as:

* Cleaning and joining raw data imported from some external source to produce curated datasets for other users.
* Analyzing processed datasources to derive useful insights.
* Training and applying models to do predictive analysis.
* Creating parameterized visualizations to display in a report.

[Learn more about workbooks.](/docs/foundry/code-workbook/workbooks-overview/)

## Transforms

**Transforms** are pieces of logic that take one or more inputs and return a single output. Inputs and outputs can be Foundry datasets or models.

[Learn more about transforms.](/docs/foundry/code-workbook/transforms-overview/)

## Templates

Code **templates** enable users with a range of technical experience to collaborate by abstracting code away behind a simple form-based interface. Values selected by users are substituted into a code template, which can then be run like any other transform in the Workbook.

[Learn more about templates.](/docs/foundry/code-workbook/templates-overview/)

## Environment

Each Code Workbook is associated with an **environment**. An environment includes a set of Conda packages and Spark settings installed on the Spark module backing computation in the Workbook.

[Learn more about environments.](/docs/foundry/code-workbook/environment-overview/)

## Branching

**Branching** in Code Workbook provides a version control experience tailored to data transformation, enabling teams to operate on logic and data simultaneously in a Workbook.

[Learn more about branching.](/docs/foundry/code-workbook/branching-overview/)
