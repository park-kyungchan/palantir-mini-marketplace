---
sourceUrl: "https://www.palantir.com/docs/apollo/managing-products/create-a-new-product/"
canonicalUrl: "https://palantir.com/docs/apollo/managing-products/create-a-new-product/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "18034e195b533bbaf281a07fe00c359ebb2011cbe444698c6c676c2cf6a1aa79"
product: "apollo"
docsArea: "managing-products"
locale: "en"
upstreamTitle: "Documentation | Managing Products > Create a new Product"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Create a new Product

To create a Product for the first time, navigate to the [Product catalog](/docs/apollo/core/products-releases-versions/#product-catalog) and select **Create new product** from the **Actions** dropdown.

## Step 1: Choose the Product ID

You will be prompted to choose an immutable Product ID. The Artifact ID and Group ID combine to create a unique **Product ID** that Apollo uses to identify your Product. Learn more about [defining the Product ID in Apollo](/docs/apollo/core/products-releases-versions/#products).

![The "Create product" step, prompting for a Group ID and Artifact ID](/docs/resources/apollo/managing-products/create-product-step-1.png)

Select **Create a new product** to move to the next step.

## Step 2: Set roles

Next, you must assign some roles for your newly created Product. You must set initial permissions within five minutes of creating the Product. We recommend assigning the "Product administrator" role to a team that you are a member of so you can make further changes. Any global role assignments from the [**Permissions** tab](/docs/apollo/core/authorization/) will be inherited and appear in this step.

Enter a team name into the **Add more teams...** text box to select a team, then configure which roles they are granted using the dropdown.

![The "Set roles" step, showing assignment of the "Product release creator" role](/docs/resources/apollo/managing-products/create-product-step-2.png)

:::callout{theme="neutral"}
We recommend assigning the "Product release creator" role to a team containing the fewest possible users. This minimizes the number of users that can create Product Releases for your Product.
:::

Select **Set initial roles** to move to the next step.

## Step 3: Create a Product Release

Now that your Product exists and some initial roles have been assigned, you can start creating Releases. Only teams with the "Product release creator" or "Product administrator" role will have permission to create Product Releases.

!["Create product release" step](/docs/resources/apollo/managing-products/create-product-step-3.png)

Select **Create a product release** to create your new Product.

There are two ways to create Product Releases:

* [From a CI pipeline](/docs/apollo/core/ci-publish-setup/)
* [From your local machine](/docs/apollo/managing-products/publishing-helm-charts/)
