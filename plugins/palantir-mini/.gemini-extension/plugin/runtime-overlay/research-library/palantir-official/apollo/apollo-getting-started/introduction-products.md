---
sourceUrl: "https://www.palantir.com/docs/apollo/apollo-getting-started/introduction-products/"
canonicalUrl: "https://palantir.com/docs/apollo/apollo-getting-started/introduction-products/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "412469b8cfd39cfb63e5b0a4b676fd58e1b8f60c3c8c7a7163edca59d33bb3f2"
product: "apollo"
docsArea: "apollo-getting-started"
locale: "en"
upstreamTitle: "Documentation | Getting started > Create a new Product and Product Release"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Create a new Product and Product Release

Now that you have connected your Kubernetes cluster(s) to Apollo, you can create a new Product in the Product catalog. When using Apollo as part of an enterprise DevSecOps pipeline, you can add an [Apollo CLI](/docs/apollo/apollo-cli/apollo-cli/) command as a stage in your repository’s [CI file](/docs/apollo/core/ci-publish-setup/#example-publish-step-for-an-existing-ci-pipeline).

## Create a new Product

In this task you will [add a new Product to your Hub's Product catalog](/docs/apollo/managing-products/create-a-new-product/). If you do not have your own Helm chart, you can use an open source Nginx Helm chart as directed in the instructions.

From the Product catalog, select **Create new product** from the **Actions** dropdown.

![The create new product button](/docs/resources/apollo/apollo-getting-started/create-new-product.png)

Walk through the instructions, providing the following values in the **Product ID** fields:

* **Group ID**:
  * If installing Nginx, use `com.intro.helmcharts.bitnami`
  * If using your own helm chart, use `com.intro.helmcharts`
* **Artifact ID**: Use your helm chart name or `nginx-${yourLastName}` if you don't have one, for example, `nginx-smith`

Select **Create a new Product** to continue.

Next, you will set permission roles for your Product. You should already be a member of a Team, search for the Team's name and assign it the `Product Release Creator` role.

Select **Set initial roles**.

## Create a new Product Release

In this task you will execute Apollo CLI `publish` commands locally to create a Release of the Product that you created in the previous step.

From the Product page for Nginx or your Helm chart, select **Create new release** from the **Actions** dropdown.

![The Create new release button.](/docs/resources/apollo/apollo-getting-started/create-new-release.png)

The Artifact ID and Group ID will be populated for you based on the Product. For the Helm chart version:

* If using your own Helm chart, use whatever Helm chart version you may have. If you have multiple releases, consider using an earlier release to facilitate some of the workflows below.
* For Nginx, use `13.1.5`.

Copy, paste, and run the generated command into your command line utility.

The Release is now available in the Apollo Product catalog.

![The product page shows all releases over time](/docs/resources/apollo/apollo-getting-started/intro_publish_1.png)

### Create Product Releases with additional details and constraints

In addition to the Product name and Release version, you may want to declare other values when creating your Product Release. For example, you can set Product dependencies for Apollo to evaluate when deciding whether to install a Release into an Environment. You can do this with the Apollo CLI by editing and creating a Product Release manifest. Though not a core workflow in the Apollo introduction guide, you can [experiment with the functionality](/docs/apollo/apollo-getting-started/introduction-manifest/) if desired.

**Next → [Install a Product in your Environment](/docs/apollo/apollo-getting-started/introduction-install/)**
