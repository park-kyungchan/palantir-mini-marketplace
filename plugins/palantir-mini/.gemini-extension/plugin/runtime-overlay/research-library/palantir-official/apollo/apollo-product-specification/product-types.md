---
sourceUrl: "https://www.palantir.com/docs/apollo/apollo-product-specification/product-types/"
canonicalUrl: "https://palantir.com/docs/apollo/apollo-product-specification/product-types/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "79c5344d293cea01d62194ea97bdc711ecf0f9f16970c2758d1eb98f58bff1f3"
product: "apollo"
docsArea: "apollo-product-specification"
locale: "en"
upstreamTitle: "Documentation | Products and Packaging > Product Types"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Product Types

Product types dictate how Apollo interprets a product's distribution and manages a product's deployment.
Apollo supports different features of deployment by product type.
Product types are declared in a Product's [Manifest](/docs/apollo/apollo-product-specification/manifest/).

## Supported Product Types

### Assets

Apollo interprets Products with the `asset.v1` product type as an arbitrary set of files.

### Helm Charts

Apollo interprets Products with the `helm.v1` product type as [Helm Chart ↗](https://helm.sh/) distributions.
