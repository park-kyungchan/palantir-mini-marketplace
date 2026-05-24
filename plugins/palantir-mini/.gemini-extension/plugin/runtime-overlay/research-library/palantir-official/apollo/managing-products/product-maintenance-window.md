---
sourceUrl: "https://www.palantir.com/docs/apollo/managing-products/product-maintenance-window/"
canonicalUrl: "https://palantir.com/docs/apollo/managing-products/product-maintenance-window/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "f54f33c7b18b3f3def7ae76c0f5841778f617331ed6bd0f412dc4ad8a0ab6888"
product: "apollo"
docsArea: "managing-products"
locale: "en"
upstreamTitle: "Documentation | Managing Products > Product maintenance windows"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Product maintenance windows

Product maintenance windows (MW) are scheduled recurring time ranges during which Apollo can perform maintenance actions such as making changes to Entities tracking the Product or promoting the Product's Releases between Release Channels.

Apollo will calculate a [resolved maintenance window](/docs/apollo/core/plans-and-constraints/#how-apollo-calculates-an-entitys-resolved-maintenance-window) for each Entity in an Environment based on the Entity's declared maintenance window and the Product's maintenance window.

## Defining Product maintenance windows

Navigate to the Product's **Upgrades** tab in the Product **Settings** page.
Use the **Product maintenance windows** section to define the date and time windows when it is acceptable to perform actions on an Entities tracking such as Product upgrades and configuration changes. Automated release promotion for Releases of the Product will only happen during the maintenance window. Manual promotion is unaffected by this [configuration](/docs/apollo/core/release-channels/#release-channel-promotion).

![Edit Product settings](/docs/resources/apollo/managing-products/edit-product-settings.png)
