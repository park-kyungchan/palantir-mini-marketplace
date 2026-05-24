---
sourceUrl: "https://www.palantir.com/docs/foundry/automate/marketplace-automate/"
canonicalUrl: "https://palantir.com/docs/foundry/automate/marketplace-automate/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "616329210a28d8bc0cc824a4b30de5ede81810bffd8f54873093251e888d027f"
product: "foundry"
docsArea: "automate"
locale: "en"
upstreamTitle: "Documentation | Automate > Add an automation to a Marketplace product"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Add automations to a Marketplace product

Use [Foundry DevOps](/docs/foundry/devops/overview/) to include your automations in [Marketplace products](/docs/foundry/devops/core-concepts/#product) for other users to install and reuse. [Learn how to create your first product.](/docs/foundry/foundry-devops/create-products/)

:::callout{theme="warning"}
The following Automation features are not supported by Marketplace products:

* Automations using [saved object sets](/docs/foundry/object-explorer/save-explorations/).
* Automations with recipients that are not groups.
:::

:::callout{theme="warning"}
Automations that use an [action](/docs/foundry/automate/effect-actions/) or [AIP Logic](/docs/foundry/automate/effect-logic/) effect cannot be installed in "production" mode as automations with these effects do not automatically upgrade.
:::

<!-- *[tracking this issue here](https://github.palantir.build/foundry/object-sentinel/issues/8658)* -->

## Add automations to products

To add an Automation to a product, first [create a product](/docs/foundry/foundry-devops/create-products/), then [add outputs](/docs/foundry/foundry-devops/create-products/#add-outputs). Choose the **Add files** option to navigate to the automation from within the [Compass](/docs/foundry/compass/overview/) filesystem and add it to your product.
