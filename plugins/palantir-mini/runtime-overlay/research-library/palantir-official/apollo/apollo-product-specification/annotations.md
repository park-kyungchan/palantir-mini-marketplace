---
sourceUrl: "https://www.palantir.com/docs/apollo/apollo-product-specification/annotations/"
canonicalUrl: "https://palantir.com/docs/apollo/apollo-product-specification/annotations/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "2e34551c5a830fb4befcc9a4cd56f765497bceb53388bad2972d8ffd2e8427af"
product: "apollo"
docsArea: "apollo-product-specification"
locale: "en"
upstreamTitle: "Documentation | Apollo Product Specification > Annotations"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Labels and annotations

This page describes the custom Kubernetes Labels & Annotations that Apollo adds to Products when running them in a Spoke Environment.

## Label specification

### apollo.palantir.com/status.liveness\_and\_readiness

For a service to have its [liveness and readiness](/docs/apollo/core/liveness-and-readiness/) reported to the Apollo Platform, the label `apollo.palantir.com/status.liveness_and_readiness` must be on the Pod spec template for the service. The label is automatically added to any Entity deployed using the provided Apollo Agent.

**Example:**

```yaml
apollo.palantir.com/status.liveness_and_readiness: ""
```

## Annotation specification

### apollo.palantir.com/metadata.environment.id

**Value:** The value of the annotation is the Apollo Environment ID the Entity belongs to. The Apollo Environment ID annotation is automatically added when deploying Entities using the provided Apollo Agent.

**Example:**

```yaml
apollo.palantir.com/metadata.environment.id: example-apollo-environment-id
```

### apollo.palantir.com/metadata.entity.id

**Value:** The value of the annotation is the ID of the Apollo Entity the K8s Object is related to. The Apollo Entity
format is `aeid:<apollo-environment-id>:<entity-type>:<entity-name>`. Apollo Entity IDs must be less than 255 characters. The Apollo Entity ID annotation is automatically added when deploying Entities using the provided Apollo Agent.

**Example:**

```yaml
apollo.palantir.com/metadata.entity.id: "aeid:example-apollo-environment-id:helm-chart:prometheus-helm"
```

### apollo.palantir.com/metadata.product.name

**Value:** The value of the annotation is the product name of the Apollo Entity the K8s Object is related to. The product name is automatically added when deploying Entities using the provided Apollo Agent.

**Example:**

```yaml
apollo.palantir.com/metadata.product.name: prometheus
```

### apollo.palantir.com/metadata.product.group

**Value:** The value of the annotation is the product group of the Apollo Entity the K8s Object is related to. The product group is automatically added when deploying Entities using the provided Apollo Agent.

**Example:**

```yaml
apollo.palantir.com/metadata.product.group: com.palantir
```

### apollo.palantir.com/metadata.product.version

**Value:** The value of the annotation is the product version of the Apollo Entity the K8s Object is related to. The product version is automatically added when deploying Entities using the provided Apollo Agent.

**Example:**

```yaml
apollo.palantir.com/metadata.product.version: 2.0.0
```
