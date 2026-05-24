---
sourceUrl: "https://www.palantir.com/docs/apollo/apollo-product-specification/hidden_liveness-and-readiness/"
canonicalUrl: "https://palantir.com/docs/apollo/apollo-product-specification/hidden_liveness-and-readiness/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "40f3cac456599ed9303bf5f4670cd9ca467607626444087939694db765791f4a"
product: "apollo"
docsArea: "apollo-product-specification"
locale: "en"
upstreamTitle: "Documentation | Apollo Product Specification > Liveness and Readiness"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Liveness and Readiness \[Beta]

This extension of the specification defines a service replica's liveness and readiness and how a service should communicate both.

## Liveness

Liveness is an indicator of the service replica's process state.
It is intended to indicate whether a process has reached an unresponsive state and needs to be restarted.
A product must include a liveness HTTPS endpoint that adheres to the following:

* Exposes an unauthenticated HTTPS `GET` endpoint.
* Is accessible at a path of `/status/liveness` relative to the service's configured [sls-status endpoint](/docs/apollo/apollo-product-specification/hidden_endpoints/)
* Any response code between \[200, 399] indicates the replica is live and does not need restarting.
  By convention, `200 OK` should be used.
* Response codes of < 200 and >= 400 indicates the replica should be restarted.
* The endpoint can be called every 5 seconds without impact on performance.
  Resource-intensive liveness checks are expected to be cached by the product to avoid negative impact on performance.
* The response body must be empty.

## Readiness

Readiness is an indicator of a service replica's ability to respond to network requests and will influence whether the replica should accept traffic destined for its service.
A product **must** include a readiness HTTPS endpoint that adheres to the following:

* Exposes an unauthenticated HTTPS `GET` endpoint.
* The endpoint should be accessible at a path of `/status/readiness` relative to the service's configured [sls-status endpoint](/docs/apollo/apollo-product-specification/hidden_endpoints/).
* Any response code between \[200, 399] indicates the node is ready to receive requests.
  By convention, `200 OK` should be used.
* Response codes of < 200 and >= 400 indicates the replica should not receive requests.
* Transport errors indicate the node should not receive requests.
* The endpoint can be called every 5 seconds without impact on performance.
  Resource-intensive readiness checks are expected to be cached by the product to avoid negative impact on performance.
* A product's readiness is a local concern to a service's replica and should not be influenced by its dependent services' readiness or liveness checks.
* The response body must be empty.

If a replica indicates it is not ready, no network traffic will be routed to it. To receive network traffic, either:

1. The node must indicate it is ready as soon as it is capable of responding to requests, even if results are primarily 4xx and 5xx responses. This allows for error pages to be reachable and other debugging information to be retrievable. *or*
2. The service must declare the `allow-traffic-when-not-ready` extension in its manifest (see example below). In this case, Kubernetes traffic routing will disregard readiness and node endpoints will be routable even if a pod is not available.

### Allow traffic when not ready manifest extension

Services may have their replicas receive traffic before becoming ready by declaring the `all-traffic-when-not-ready` manifest extension:

```yaml
extensions:
  allow-traffic-when-not-ready: true
```
