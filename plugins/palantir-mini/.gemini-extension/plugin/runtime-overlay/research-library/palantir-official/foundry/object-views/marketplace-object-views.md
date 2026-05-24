---
sourceUrl: "https://www.palantir.com/docs/foundry/object-views/marketplace-object-views/"
canonicalUrl: "https://palantir.com/docs/foundry/object-views/marketplace-object-views/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "2238946cf9167db580bf69194b89b93112216aef7d35115d96e41be176e7e005"
product: "foundry"
docsArea: "object-views"
locale: "en"
upstreamTitle: "Documentation | Object Views > Add Object Views to a Marketplace product"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Add Object Views to a Marketplace product

Use [Foundry DevOps](/docs/foundry/devops/overview/) to include your Object Views in [Marketplace products](/docs/foundry/devops/core-concepts/#product) for other users to install and reuse. [Learn how to create your first product.](/docs/foundry/foundry-devops/create-products/)

## Supported features

Marketplace products only support [Object View tabs](/docs/foundry/object-views/config-tabs/) that use the [Workshop tab](/docs/foundry/object-views/config-object-views/) builder. The legacy Object View builder is not supported. If you would like to package an Object View tab that leverages the legacy builder, you should first rebuild the tab with the Workshop tab builder.

## Add Object Views to products

To add an Object View to a product, first [create a product](/docs/foundry/foundry-devops/create-products/). [Add outputs](/docs/foundry/foundry-devops/create-products/#add-outputs) and then select the **Add ontology entities** option.

Once you have selected an Object View, you can select which tabs you would like to include in your product.

![Add Object View tabs.](/docs/resources/foundry/object-views/marketplace-add-tabs.png)
