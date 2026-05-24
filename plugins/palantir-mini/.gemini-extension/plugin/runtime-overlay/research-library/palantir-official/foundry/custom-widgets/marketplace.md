---
sourceUrl: "https://www.palantir.com/docs/foundry/custom-widgets/marketplace/"
canonicalUrl: "https://palantir.com/docs/foundry/custom-widgets/marketplace/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d02de09b00367db6f4cebf168e38390f386416e1dbd33e6cb308d9d8779bfd19"
product: "foundry"
docsArea: "custom-widgets"
locale: "en"
upstreamTitle: "Documentation | Custom widgets > Add widget set to a Marketplace product"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Add widget set to a Marketplace product

Use [Foundry DevOps](/docs/foundry/devops/overview/) to include your widget set in [Marketplace products](/docs/foundry/devops/core-concepts/#product) for other users to install and reuse. [Learn how to create your first product.](/docs/foundry/foundry-devops/create-products/)

## Supported features

All Custom Widgets features are supported by Marketplace products with the exception of:

* Modifying installed source code in a Foundry code repository to develop and publish new versions. Source code in installed Foundry code repositories is available for debugging purposes only and not compatible for development.
* Automatically enabling Ontology APIs during installation.
* Ontology resources with different API names. All ontology resources must use the same API names as the source, either by installing without prefixes, or by mapping inputs to existing ontology resources.
* Using versioned functions with the Ontology SDK. Only the latest version of a function is supported.

## Adding Custom Widgets widget sets to products

To add a Custom Widgets widget set to a product, first [create a product](/docs/foundry/foundry-devops/create-products/), then [add outputs](/docs/foundry/foundry-devops/create-products/#add-outputs). Choose the **Add files** option to navigate to the widget set from within the [Compass](/docs/foundry/compass/overview/) filesystem and add it to your product.

Alternatively, if you have a [Workshop application](/docs/foundry/workshop/overview/) that embeds a widget set, you can add the Workshop module to the product and the widget set will be included automatically.

A minimum version of [`@osdk/widget.vite-plugin` ↗](https://www.npmjs.com/package/@osdk/widget.vite-plugin) of `3.1.0` is required. If a previously published widget set version uses an older version of the vite plugin, first update the vite plugin version in the source code project, then republish a new widget set version before including in DevOps.

## Manually enable Ontology APIs after installation

Widget sets using Ontology SDK (OSDK) require a one-time manual configuration after installation to enable Ontology APIs. This configuration persists across product upgrades. For detailed instructions, see [Use Ontology SDK (OSDK) in a widget set](/docs/foundry/custom-widgets/use-osdk/).
