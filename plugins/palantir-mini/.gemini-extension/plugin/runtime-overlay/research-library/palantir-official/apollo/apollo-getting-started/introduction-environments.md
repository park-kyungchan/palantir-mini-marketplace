---
sourceUrl: "https://www.palantir.com/docs/apollo/apollo-getting-started/introduction-environments/"
canonicalUrl: "https://palantir.com/docs/apollo/apollo-getting-started/introduction-environments/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d5b69b90a44c7295d65aacd4f5a0381776e79cfc35ad67bd5008f629c679547e"
product: "apollo"
docsArea: "apollo-getting-started"
locale: "en"
upstreamTitle: "Documentation | Getting started > Connect an Environment"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Connect a Spoke Environment

The Apollo Hub is capable of managing many different types of Environments. The first step in using Apollo is to install Apollo’s [Spoke Control Plane](/docs/apollo/core/spoke-control-plane/) in your Kubernetes clusters so that they can be managed by your Apollo Hub. Your Hub is already running services that store Environment-specific configuration like maintenance windows and the list of Product versions that should exist in the Environment. The Hub also manages how your Environments should receive Product upgrades.

Follow the steps outlined in [Connect New Environment](/docs/apollo/managing-environments/connect-new-environment/) to create a new Environment in Apollo and connect it to your Kubernetes cluster.

You can repeat this process to connect more Kubernetes clusters to Apollo.

**Next → [Create a new Product and Product Release](/docs/apollo/apollo-getting-started/introduction-products/)**
