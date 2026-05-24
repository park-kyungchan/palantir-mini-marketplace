---
sourceUrl: "https://www.palantir.com/docs/apollo/apollo-product-specification/hidden_resources/"
canonicalUrl: "https://palantir.com/docs/apollo/apollo-product-specification/hidden_resources/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "bb46c90d13e6f831b83123a555870857aa4bbcb8e2e1aa43f8f33efc8de1221d"
product: "apollo"
docsArea: "apollo-product-specification"
locale: "en"
upstreamTitle: "Documentation | Apollo Product Specification > Compute Resources"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Resources \[Beta]

:::callout{theme="neutral"}
Resources are in a beta state and may not be available on your Apollo Hub. Contact your Palantir representative to learn more.
:::

This extension of the specification describes how a product declares the necessary compute resources and is modeled after the [Kubernetes container resource specification ↗](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/).
The following types of compute resources are supported:

* CPU
* Memory

## Declaring Compute Resource Requests and Limits

When defining an Apollo Product’s CPU and memory requirements, developers may include both the minimum resource quantities each service replica must have available to it (“requests”) and the maximum quantities of these resources that each replica should not exceed (“limits”).
Resource requests and limits are applied to each [replica](/docs/apollo/apollo-product-specification/hidden_replication/) of a service.
These requests and limits can be defined under a top-level `resources` field in an Apollo Product's `configuration.yml` file:

```yaml
# configuration.yml 
resources:
  requests:
    cpu: 0.5
    memory: 1Gi
  limits:
    cpu: 2
    memory: 4Gi
```

Supported memory units are:

* Ki (Kibibyte)
* K (Kilobyte)
* Mi (Mebibyte)
* M (Megabyte)
* Gi (Gibibyte)
* G (Gigabyte)
* T (Terabyte)

CPU values can be provided as unit-less floating point values indicating the number of CPU cores. For example, 0.5 CPU is interpreted as 50% usage of a single core.

## Default Values

Both `resources.requests` and `resources.limits` are optional fields, as are their subfields. Absent values are handled in the following way:

* If neither a CPU request nor CPU limit is specified, a default value of `0.25` is used.
* If neither a memory request nor memory limit is specified, a default value of `1G` is used.
* If only a limit is defined for a resource, then the request for that resource is set to the same value.
