---
sourceUrl: "https://www.palantir.com/docs/apollo/managing-products/delete-product-and-product-release/"
canonicalUrl: "https://palantir.com/docs/apollo/managing-products/delete-product-and-product-release/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "51397171422bb599ba4232b3b63fc226cd92652ed8923fdd11329b12d3b01802"
product: "apollo"
docsArea: "managing-products"
locale: "en"
upstreamTitle: "Documentation | Managing Products > Deleting Products and Releases"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Deleting Products and Product Releases

This section will describe how to delete Products and Product Releases. You must be a [Product creator or Product Release creator](/docs/apollo/core/authorization/) to perform these operations.

:::callout{theme="warning"}
Deleting a Product or Product Release is permanent and cannot be undone. Make sure that you no longer need the Product or Product Release before deleting it. You should also ensure there are no Entities on the Product or Product Release that you want to delete.
:::

## Deleting Product Releases

Navigate to the Product Release page for the Product Release you want to delete. Select **Delete release** from the **Actions** dropdown menu.

<img alt="Entry point for Product Release deletion workflow." src="./media/delete-product-release-entry-point.png" width="300" />

Then complete the confirmation dialog and select **Delete permanently**.

<img alt="Confirmation dialog for Product Release deletion." src="./media/delete-product-release-dialog.png" width="600" />

The deletion progress will appear as a spinner on the dialog.

## Deleting Products

Navigate to the Product overview page of the Product you want to delete. Select **Delete product** from the **Actions** dropdown menu.

<img alt="Entry point for Product deletion workflow." src="./media/delete-product-entry-point.png" width="300" />

Then complete the confirmation dialog and select **Delete permanently**.

The deletion progress will now be displayed on the page.

:::callout{theme="danger"}
Do not navigate away from the Product deletion page. Deletion progress will be halted midway. What has been deleted so far will stay deleted.
:::

<img alt="Confirmation dialog for Product Release deletion." src="./media/delete-product-dialog.png" width="600" />

Apollo will automatically open a change request to delete the Product settings. A link to the change request will be displayed at the bottom of the panel.

<img alt="Product settings deletion change request button." src="./media/delete-product-change-request.png" width="600" />
