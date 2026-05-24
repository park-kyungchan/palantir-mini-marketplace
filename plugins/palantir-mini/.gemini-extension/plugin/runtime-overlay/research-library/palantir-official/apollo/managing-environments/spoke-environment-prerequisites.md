---
sourceUrl: "https://www.palantir.com/docs/apollo/managing-environments/spoke-environment-prerequisites/"
canonicalUrl: "https://palantir.com/docs/apollo/managing-environments/spoke-environment-prerequisites/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "b60776a1e2329ed3e3651b03d39f0dec978e876073ca6602c18de2da9b34ead8"
product: "apollo"
docsArea: "managing-environments"
locale: "en"
upstreamTitle: "Documentation | Managing Environments > Spoke Environment prerequisites"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Spoke Environment prerequisites

## Overview

A Kubernetes cluster must meet certain prerequisites before it can be [managed by Apollo as an Environment](/docs/apollo/managing-environments/connect-new-environment/).

### Kubernetes distribution

A Spoke can run [any CNCF certified distribution of Kubernetes ↗](https://www.cncf.io/certification/software-conformance/#logos).

Apollo supports [any version currently supported by the Kubernetes Community ↗](https://kubernetes.io/releases/version-skew-policy/#supported-versions). If you require support for an older version, contact your Palantir representative to discuss options.

### Compute requirements

* The Kubernetes cluster must have at least 3 compute nodes. We recommend the cluster has at least 10 vCPU cores and 16GB of memory total for the Apollo Spoke Control Plane.
* The cluster must have root access to an instance located in the same Environment as your Kubernetes cluster to enable initial installation of the Apollo Spoke Control Plane.
* The compute nodes in the cluster must support the x86\_64 architecture.
* The nodes in the cluster must be able to talk to each other.
* If the Kubernetes Control Plane is separate from the compute nodes, as in the [EKS architecture ↗](https://docs.aws.amazon.com/eks/latest/userguide/clusters.html), the Control Plane must be able to talk to the compute nodes.
* The cluster has a default storage class and supports provisioning of persistent volumes.

### Networking requirements

* Your cluster’s egress IPs will need to be allowlisted to access the Apollo Hub. Please provide your Palantir representative with these IPs before getting started.
* If your CI is hosted within your organization's network, please provide your Palantir representative with your organization’s egress IPs to allow access. This is necessary so that the CI system can publish metadata about new versions of software to Apollo.
* The Spoke Environment must establish trust with the Apollo Hub. This will be done as part of the [Spoke Control Plane bootstrapping process](/docs/apollo/managing-environments/connect-new-environment/#connect-environment-to-apollo) using an Environment Keypair and configuration file. Your Palantir representative will provide this after allowlisting the cluster IPs.

### Kubernetes cluster permissions

The Apollo Spoke Control Plane that is responsible for managing Helm Charts within the Spoke Environment must be granted wildcard Kubernetes RBAC permissions. This allows Apollo to operate on any current or future Helm Charts that a user may need to manage with Apollo. Crucially, this prevents administrators from manually adding RBAC permissions to the helm-chart-operator piecemeal with each new Helm Chart that they would like to manage.
