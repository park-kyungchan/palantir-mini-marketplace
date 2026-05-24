---
sourceUrl: "https://www.palantir.com/docs/apollo/managing-k8s-namespaces/install-entity-in-k8s-namespace/"
canonicalUrl: "https://palantir.com/docs/apollo/managing-k8s-namespaces/install-entity-in-k8s-namespace/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "15874f04911827cb7073f71d6ffd7ab51d4dd45569886027f3b59367130177d7"
product: "apollo"
docsArea: "managing-k8s-namespaces"
locale: "en"
upstreamTitle: "Documentation | Managing Kubernetes namespaces > Install an Entity in a Kubernetes namespace"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Install an Entity in a Kubernetes namespace

To learn about installing an Entity on an Environment, refer to [Adding and managing Entities](/docs/apollo/managing-entities/add-and-edit-entities/).

In the **K8s namespace** dropdown, select the desired namespace to install the Entity into. This value cannot be changed after the Entity has been created. If you do not have your own namespaces created yet, you can refer to [Create and delete a Kubernetes namespace](/docs/apollo/managing-k8s-namespaces/create-delete-k8s-namespace/) to create one.

![Select Kubernetes namespace during entity installation](/docs/resources/apollo/managing-k8s-namespaces/select-k8s-namespace-during-entity-installation.png)

The same Product can be installed into multiple namespaces within the same Environment as separate Entities with different names.
