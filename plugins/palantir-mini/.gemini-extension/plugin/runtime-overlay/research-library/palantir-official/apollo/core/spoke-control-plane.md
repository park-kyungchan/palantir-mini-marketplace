---
sourceUrl: "https://www.palantir.com/docs/apollo/core/spoke-control-plane/"
canonicalUrl: "https://palantir.com/docs/apollo/core/spoke-control-plane/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "0b60ca6527bf90e2c7e0a1edfc8626b60506011b3df207bc0c0536a120dc7d9f"
product: "apollo"
docsArea: "core"
locale: "en"
upstreamTitle: "Documentation | Core concepts > Spoke Control Plane"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Spoke Control Plane

In every Spoke Environment that Apollo manages, there is a minimum set of functionality that needs to exist for Apollo to provide its workflows. This functionality is provided by the following components, which together make up the Spoke Control Plane.

## Apollo Agents

### helm-chart-operator

An Apollo Agent responsible for managing Apollo entities of type `helm-chart`. It is necessary for lifecycle actions (install, config changes) on Helm Charts managed by Apollo that run in an Environment.

`helm-chart-operator` is also responsible for managing all the other Spoke Control Plane services. It takes no dependencies on other services in the Spoke Control Plane and is the first service installed into a Spoke Environment.

#### Pod registry replacement and image pull secret injection

`helm-chart-operator` has an optional feature that allows you to:

* Rewrite container image registries to use your [Apollo Artifact Registry mirrors](/docs/apollo/managing-artifact-registries/mirrored-artifact-registries/).
* Inject image pull secrets for all Kubernetes Pod resources.

This feature is relevant for *non-Helm chart Pods*, such as Helm hook Pods or dynamically deployed Pods. It is provided by a Kubernetes mutating admission webhook that operates on all Pods deployed in namespaces with the label `apollo.palantir.com/env-id: <your env id>`. These namespaces can be managed by either Helm or Apollo.

To enable this feature:

1. Apply any network configurations your environment requires, such as CiliumNetworkPolicy, for the API server to reach the webhook service. To do this you may need the following information:
   * Webhook Kubernetes service name: `helm-chart-operator`
   * Webhook Kubernetes namespace: `<the namespace the helm-chart-operator product is installed into>`
   * Port: `9111`
   * Protocol: `TCP`
   * Pod label selector: `rubix-app: helm-chart-operator`

2. Set the following [configuration override](/docs/apollo/managing-entities/set-config-overrides/) on `helm-chart-operator`:
   * `enablePodRegistryReplacementMutatingWebhook: true`

To exclude a Pod from the mutating webhook once it is enabled, add the following label to the Pod: `apollo.palantir.com/skip-registry-mutation: ""`

### apollo-auth-broker

An Apollo Agent responsible for brokering authentication material on behalf of Apollo Agents between the Apollo Hub, the Spoke Environment, and any [Artifact Registries](/docs/apollo/managing-artifact-registries/overview/).

## Health

### expected-state-k8s

Takes the current state of the Kubernetes environment, converts the Kubernetes object model into an Apollo object model, and sends that information back to the Apollo Hub.

`expected-state-k8s`, for example, provides information from the Kubernetes environment related to how many replicas of a Pod should be running and provides that back to the Hub. It is also responsible for collecting health information from all managed Entities and forwarding it to the Apollo Hub to report health.
