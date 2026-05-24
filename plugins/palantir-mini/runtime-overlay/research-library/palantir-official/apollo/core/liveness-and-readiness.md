---
sourceUrl: "https://www.palantir.com/docs/apollo/core/liveness-and-readiness/"
canonicalUrl: "https://palantir.com/docs/apollo/core/liveness-and-readiness/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "f202d128b68e381ac482dc065739dcadbe4170002fad5e28370b5c8aef77fe68"
product: "apollo"
docsArea: "core"
locale: "en"
upstreamTitle: "Documentation | Core concepts > Liveness and Readiness"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Liveness and Readiness

Apollo automatically collects liveness and readiness from managed Environments using Kubernetes probes. For more information about how to configure these probes, review the [Kubernetes documentation ↗](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/).

## Liveness

Liveness probes are defined to be able to understand whether a service instance (such as a container pod in Kubernetes) is running. Usually, these probes are configured to perform regular checks against service instances (such as HTTP requests or gRPC requests). Failing liveness probes indicate that the service instance has reached a state where it is unusable and needs to be restarted.

## Readiness

Readiness probes enable service owners to tell the infrastructure when their service is ready to accept network traffic after service start-up. This is useful usually when services need time to perform some startup actions like initiating database connections before accepting network requests.

## Configuration in Kubernetes

When running in Kubernetes Environments, Apollo supports retrieving liveness and readiness information about your workloads from Kubernetes and exposing it to users in the Apollo Hub. This information is collected automatically from every Entity that is managed by Apollo.

![Liveness and Readiness States](/docs/resources/apollo/core/liveness_readiness_states.png)
