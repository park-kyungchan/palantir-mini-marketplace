---
sourceUrl: "https://www.palantir.com/docs/apollo/apollo-product-specification/manifest/"
canonicalUrl: "https://palantir.com/docs/apollo/apollo-product-specification/manifest/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "0a97efbb867f4a3bd6d65257b17fd1689b670bff56ed88922d80c977882a5830"
product: "apollo"
docsArea: "apollo-product-specification"
locale: "en"
upstreamTitle: "Documentation | Products and Packaging > The Product Manifest"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# The Product Release Manifest

Every Apollo Product Release **must** include a `manifest.yml` file.
This manifest includes immutable information about a Product, and **must** include the following top-level fields:

* `product-type`: the [Product's type](/docs/apollo/apollo-product-specification/product-types/).
* `product-group`: The Product's [maven coordinate ↗](https://maven.apache.org/pom.html#Maven_Coordinates)'s group ID.
* `product-name`: The Product's [maven coordinate ↗](https://maven.apache.org/pom.html#Maven_Coordinates)'s artifact ID.
* `product-version`: The Product's [maven coordinate ↗](https://maven.apache.org/pom.html#Maven_Coordinates)'s version.
  * The product version **must** conform to the Apollo [product version specification](/docs/apollo/apollo-product-specification/product-versions/).

## Example

```yaml
product-type: service.v1
product-group: com.palantir.apollo
product-name: apollo-catalog
product-version: 1.2.3
```

## Manifest Extensions

A Product Release manifest may also include *extensions* describing a Product's *immutable* characteristics.
The [Apollo Product Specification](/docs/apollo/apollo-product-specification/apollo-product-spec-definition/) documents the manifest extensions supported by the Apollo Platform.
