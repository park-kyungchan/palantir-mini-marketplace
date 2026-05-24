---
sourceUrl: "https://www.palantir.com/docs/foundry/notepad/marketplace-notepad/"
canonicalUrl: "https://palantir.com/docs/foundry/notepad/marketplace-notepad/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d1e5637b6adc37e9ba04716d01db6eb5f6fa9a31335c04afbe45c5b07cfef718"
product: "foundry"
docsArea: "notepad"
locale: "en"
upstreamTitle: "Documentation | Notepad > Add documents and templates to a Marketplace product"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Add documents and templates to a Marketplace product

Use [Foundry DevOps](/docs/foundry/devops/overview/) to include your Notepad documents and [Notepad templates](/docs/foundry/notepad/templates-overview/) in [Marketplace products](/docs/foundry/devops/core-concepts/#product) for other users to install and reuse. [Learn how to create your first product.](/docs/foundry/foundry-devops/create-products/)

## Supported features

Marketplace products currently support Notepad documents and templates with the following widget types:

* List
* Hyperlink
* Anchor link
* Resource link
* Table
* Image
* LaTeX
* User mention
* Current date
* Page break
* Quiver dashboard
* Value embed
* Conditional section
* Functions on objects
* Object card
* Object media preview
* Object property
* Row generator table
* Section generator

Support for additional Palantir-created default Notepad widgets is coming soon.

## Add Notepad documents and templates to products

To add a Notepad resource to a product, first [create a product](/docs/foundry/foundry-devops/create-products/), then [add outputs](/docs/foundry/foundry-devops/create-products/#add-outputs). Choose the **Add files** option to navigate to the Notepad document or template from within the [Compass](/docs/foundry/compass/overview/) filesystem and add it to your product.

When adding a Notepad template, you will be prompted to select a template version.

![select version](/docs/resources/foundry/notepad/marketplace-select-template-version.png)

## Add embedded resources to products

Your document or template must be packaged alongside any referenced Foundry resources, such as Quiver dashboards and functions. Widgets referencing the same resource must refer to the same version.
