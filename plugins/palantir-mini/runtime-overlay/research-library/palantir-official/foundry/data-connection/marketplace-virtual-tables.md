---
sourceUrl: "https://www.palantir.com/docs/foundry/data-connection/marketplace-virtual-tables/"
canonicalUrl: "https://palantir.com/docs/foundry/data-connection/marketplace-virtual-tables/"
sourceLastmod: "2026-05-12T17:06:26.147Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "60cc6f0c1694bd0556172f00d9f4e8935dd18c559ee78f0695b015389d96f257"
product: "foundry"
docsArea: "data-connection"
locale: "en"
upstreamTitle: "Documentation | Data Connection > Add virtual tables to a Marketplace product"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Add virtual tables to a Marketplace product

Use [Foundry DevOps](/docs/foundry/devops/overview/) to include your [virtual table](/docs/foundry/data-integration/virtual-tables/) in a [Marketplace product](/docs/foundry/devops/core-concepts/#product) for other users to install and reuse. [Learn how to create your first product.](/docs/foundry/foundry-devops/create-products/)

## Supported features

All virtual tables may be packaged and synced.

Currently, packaging an individual source is not supported, nor is packaging a source that has auto-registration of virtual tables enable.

Installers must ensure the destination source contains a table at the same location with the same schema as the original source to guarantee compatibility and functionality.

## Adding virtual tables to products

To add a virtual table to a product, first [create a product](/docs/foundry/foundry-devops/create-products/), then [add outputs](/docs/foundry/foundry-devops/create-products/#add-outputs). Choose the **Add files** option to navigate to the virtual table from within the [Compass](/docs/foundry/compass/overview/) filesystem and add it to your product.

You can then select which virtual tables you would like to include in your product.

![Selecting a virtual table for your product](/docs/resources/foundry/data-connection/marketplace-virtual-table-selection.png)
