---
sourceUrl: "https://www.palantir.com/docs/foundry/transforms-r/overview/"
canonicalUrl: "https://palantir.com/docs/foundry/transforms-r/overview/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "e32c6147ad31273b24efa5b1055f6138f9173853aa930aa3af1093b06a6c7c60"
product: "foundry"
docsArea: "transforms-r"
locale: "en"
upstreamTitle: "Documentation | R > Overview"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# R transforms

With R transforms in Foundry, you can use the [Code Workspace RStudio® Workbench](/docs/foundry/code-workspaces/rstudio/) to write and publish data transformations in the R language and access R libraries.

R transforms use a different execution mode and provide different APIs compared to other transform languages supported in Foundry. Specifically, R transforms execute on a single node and do not leverage Spark for data reads and writes.

R transforms support reading and writing both structured (tabular) and unstructured datasets using the [Palantir R SDK ↗](https://github.com/palantir/palantir-r-sdk) and importing R libraries from CRAN, Posit™ Package Manager, and Bioconductor.

[Get started writing R transform in Foundry.](/docs/foundry/transforms-r/getting-started/)

***

*RStudio® is a trademark of Posit™.*

All third-party trademarks (including logos and icons) referenced remain the property of their respective owners. No affiliation or endorsement is implied.
