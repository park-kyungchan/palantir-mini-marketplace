---
sourceUrl: "https://www.palantir.com/docs/foundry/marketplace/browse-products/"
canonicalUrl: "https://palantir.com/docs/foundry/marketplace/browse-products/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "3dfc782c16201b09f5bf2e87ad29eec652534571f9644bbd65b839824ce407c1"
product: "foundry"
docsArea: "marketplace"
locale: "en"
upstreamTitle: "Documentation | Products > Browse products"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Browse products in Foundry Marketplace

Products are collections of Foundry resources that a product builder has made available to install.

## Store

In Marketplace, a store is a collection of products. Stores can also have featured products that are promoted by the product builders and store owners.

:::callout{theme="neutral"}
You may have access to one or more stores. Some stores, such as the **Foundry Store** are available to all customers, while others are specific to your enrollment. For example, a builder in your organization could create a store to house a collection of task management applications that are installed across a number of departments. This store will not be available to other customers. [Learn more about configuring access to remote stores](/docs/foundry/administration/configure-remote-marketplace-stores/).
:::

![product filters](/docs/resources/foundry/marketplace/product-storefront.png)

## Product details

After selecting a product from a store, you can view a variety of information about that product, including:

* [Versions](#versions)
* [Overview](#overview)
* [Changelogs](#changelogs)
* [Content](#content)
* [Inputs](#inputs)

![product page](/docs/resources/foundry/marketplace/product-page.png)

### Versions

If a product has multiple versions, you can choose which version to install with the version selector. In most cases, we recommend installing the latest version.

![version selector](/docs/resources/foundry/marketplace/versions.png)

#### Recalls

Product versions may be recalled by the product builder. If a product version has been recalled, you will see a red `Recalled` tag next to the version name.

![Product versions tagged with a "Recalled" tag.](/docs/resources/foundry/marketplace/recall-version-selector.png)

Automatic upgrades will not install recalled versions, and you will not be able to install a recalled version manually. If you have already installed a recalled version, you can continue to use it; however, we recommend updating to a non-recalled version as soon as possible.

### Overview

A product's overview includes any builder-provided product details, as well as a preview of required [inputs](#inputs) and [content](#content) that will be installed.

### Changelogs

A product's changelogs include any builder-provided context on differences between product versions.

![changelogs](/docs/resources/foundry/marketplace/changelogs.png)

### Content

A product's content is the Foundry resources that will be installed once required inputs have been mapped.

### Inputs

A product's inputs are dependencies that must be mapped in order to create a product's content. Not all products require inputs.

Once you have decided you want to install a product, you can [begin an installation](/docs/foundry/marketplace/install-product/).
