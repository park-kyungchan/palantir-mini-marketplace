---
sourceUrl: "https://www.palantir.com/docs/apollo/apollo-product-specification/hidden_replication/"
canonicalUrl: "https://palantir.com/docs/apollo/apollo-product-specification/hidden_replication/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "60d33c16e51275f06aeafa67c3b75a7e74507efea9ec606a167de5910fdc22da"
product: "apollo"
docsArea: "apollo-product-specification"
locale: "en"
upstreamTitle: "Documentation | Apollo Product Specification > Replication"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Replication \[Beta]

:::callout{theme="neutral"}
Replication is in a beta state and may not be available on your Apollo Hub. Contact your Palantir representative to learn more.
:::

This portion of the specification details how services can declare the number of replicas the infrastructure should create for the service.

## Default Product Configuration

Developers may declare the number of replicas for their service within a `configuration.yml`'s top-level `replication` field:

```yaml
replication:
  desired: 3
```

The `desired` field must be an integer value greater than 0.
Default product configurations should include replication configuration.
The default production configuration's `replication.desired` value may be overridden when configuring specific installations of a product as needed.
If replication is defined in neither product default configuration nor an installation's configuration overrides, a default value of `2` is used.
