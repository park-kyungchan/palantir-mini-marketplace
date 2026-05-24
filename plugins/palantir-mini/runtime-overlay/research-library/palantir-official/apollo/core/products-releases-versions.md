---
sourceUrl: "https://www.palantir.com/docs/apollo/core/products-releases-versions/"
canonicalUrl: "https://palantir.com/docs/apollo/core/products-releases-versions/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "1ab118325a4c1a6f5f94736c6ea941116542d9d150372c09f2d0d19f7fd6a359"
product: "apollo"
docsArea: "core"
locale: "en"
upstreamTitle: "Documentation | Core concepts > Products, Releases, and Versions"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
![products overview](/docs/resources/apollo/core/header_products.png)

# Products, Releases, and versions

Products are the software components that are deployable in Apollo. The Product concept is designed to be flexible to encompass all of the individual services that are installed in Environments.

Each version of a Product is created as a Release in Apollo. Releases include the Product's code and the metadata that Apollo uses to manage that Product.

This page describes Products and Releases in detail and how they relate to other key concepts in Apollo.

## Maven coordinates

Apollo uses [Maven coordinates ↗](https://maven.apache.org/guides/mini/guide-naming-conventions.html) to identify Products and Releases. A Maven coordinate has three components:

* `group`: The group represents the organization that owns the Product. You should choose a group that represents your own organization. For example, `com.palantir` is a valid group. The group can be the same for multiple Products.
* `artifactId`: The artifact ID is the name of the Product. For example, `wordpress` and `apollo-demo-app` are both valid artifact IDs. This field must be unique per group, meaning that a group can only own one Product with a given artifact ID. We recommend that artifact IDs are generally unique in Apollo.
* `version`: This field represents the version of the Product that is running on your Entities. For example, `1.1.0` and `1.1.0-rc1` are both valid versions. Refer to the [Product Version Specification](/docs/apollo/apollo-product-specification/product-versions/) for more information on versions in Apollo.

Below are examples of valid Maven coordinates:

```yaml
com.palantir.apollo-developers:apollo-demo-app:1.0.0
com.helmcharts.bitnami.redis:redis:1.1.3-rc1
com.hashicorp:vault:15.8.6
```

## Products

Products are uniquely identified by a [Maven coordinate's](#maven-coordinates) `group:artifactId`, referred to as the ProductId in Apollo. For example, a Product called `new-product` could have the ProductId `com.palantir.example:new-product`.

Apollo supports Helm charts and Assets as [Product types](/docs/apollo/apollo-product-specification/product-types/).

Products can be sourced from an internal repository and published as part of a Continuous Integration (CI) pipeline or pulled directly from an open source artifact store. Every Product has an owning Team in Apollo, whose members are responsible for managing Product maintenance windows and the Product's promotion pipeline configuration.

Learn more about [managing Products.](/docs/apollo/managing-products/overview/)

## Product Releases

A Product Release is a versioned code artifact that is published to the Product catalog. Each Product Release is identified by a [Maven coordinate](#maven-coordinates), where each version represents a different Release of the Product. For example:

```yaml
com.palantir.apollo-developers:apollo-demo-app:1.0.0
com.palantir.apollo-developers:apollo-demo-app:1.1.0
com.palantir.apollo-developers:apollo-demo-app:1.2.0
```

Apollo displays all Releases that have been published with the same ProductId on the Product home page. Generally, a Team will be responsible for all Product Releases with a given ProductId.

You can view a Product and its associated Product Releases by selecting the Product name in the left menu panel and navigating to the **Releases** tab.

![A Product page that displays three Product Releases.](/docs/resources/apollo/core/product-release-page.png)

## Product catalog

The Product catalog is an inventory of all Products that have been published to an Apollo Hub. The catalog contains details for every Product Release, including existing dependencies, recall information, and the Release Channels to which it belongs.

Explore the Product catalog by selecting **Products** in the left menu panel. You can filter the list of Products to view Products without a contact team, Palantir Products, and Products linked to a specific contact team.

![The Product catalog and the menu to filter Products by contact team.](/docs/resources/apollo/core/product-catalog.png)

## Versions

Apollo functionality is only available if a version is orderable. For example, an Entity's reported version must be orderable so that Apollo can identify newer versions to which the Entity can be upgraded.

Apollo supports version numbers in the following formats:

| Version Type | Orderable | Example | Regex |
| ------------ | --------- | ------- | ----- |
| Release | yes | 1.0.0 | `^[0-9]+\.[0-9]+\.[0-9]+$` |
| Release Snapshot | yes | 1.0.0-1-gaaaaaaa | `^[0-9]+\.[0-9]+\.[0-9]+-[0-9]+-g[a-f0-9]+$`|
| Release Candidate (rc) | yes | 1.0.0-rc1 | `^[0-9]+\.[0-9]+\.[0-9]+-rc[0-9]+$` |
| Release Candidate (rc) Snapshot | yes | 1.0.0-rc1-1-gaaaaaaa | `^[0-9]+\.[0-9]+\.[0-9]+-rc[0-9]+-[0-9]+-g[a-f0-9]+$` |

Specifics of how versions are ordered are defined in the [Apollo Product Spec - Product Version Specification](/docs/apollo/apollo-product-specification/product-versions/). The example below illustrates how versions of different types interact with each other.

```
1.0.0-rc1 < 1.0.0-rc2 < 1.0.0-rc2-4-gaaaaaaa < 1.0.0-rc2-5-gccccccc < 1.0.0 < 1.0.1 < 1.1.0 < 2.0.0 < 2.0.0-3-gbbbbbb < 2.0.0-4-gaaaaaa < 2.1.0-rc1
```
