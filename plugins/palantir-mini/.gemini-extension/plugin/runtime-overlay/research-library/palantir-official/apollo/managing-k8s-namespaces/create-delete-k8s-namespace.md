---
sourceUrl: "https://www.palantir.com/docs/apollo/managing-k8s-namespaces/create-delete-k8s-namespace/"
canonicalUrl: "https://palantir.com/docs/apollo/managing-k8s-namespaces/create-delete-k8s-namespace/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "a05b7523c9644e5b377e90999a99e656f26c4841cb14292b36b1dd76bfefd28c"
product: "apollo"
docsArea: "managing-k8s-namespaces"
locale: "en"
upstreamTitle: "Documentation | Managing Kubernetes namespaces > Create and delete a Kubernetes namespace"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Create and delete a Kubernetes namespace

To manage Kubernetes namespaces for an Environment, navigate to the **K8s Namespaces** section of the *Settings* tab.

:::callout{theme="neutral"}
The **K8s Namespaces** section will only be visible once the `k8s-namespace-agent` agent for the Environment has successfully reported to Apollo.
This requires both `helm-chart-operator` agent and `apollo-auth-broker` agent to report to Apollo first.
:::

![K8s Namespaces section in Environment Settings tab](/docs/resources/apollo/managing-k8s-namespaces/empty-k8s-namespaces-section.png)

## Create a Kubernetes namespace

To create a new Kubernetes namespace, select the **New K8s Namespace** button. This will open a dialog where you can provide the name and an optional description for the new namespace. All namespace names must be valid [RFC 1123 DNS labels ↗](https://kubernetes.io/docs/concepts/overview/working-with-objects/names/#dns-label-names) (for example `example-namespace` is valid, but `ExampleNamespace` is not).

![Create new K8s Namespace dialog](/docs/resources/apollo/managing-k8s-namespaces/k8s-namespace-creation-dialog.png)

Upon submission, a change request will be created. Once approved by a user with the Environment editor role, Apollo will issue a Plan that creates the namespace in your Environment.

![K8s Namespace creation change request](/docs/resources/apollo/managing-k8s-namespaces/k8s-namespace-creation-change-request.png)

You can then [install Entities into the newly created namespace](/docs/apollo/managing-k8s-namespaces/install-entity-in-k8s-namespace/).

![K8s Namespace created](/docs/resources/apollo/managing-k8s-namespaces/k8s-namespace-created.png)

## Delete a Kubernetes namespace

:::callout{theme="neutral"}
Apollo will only delete a Kubernetes namespace if there are no installed Entities in the namespace. If there are installed Entities, you must first uninstall those Entities before Apollo can delete the namespace.
:::

To delete an existing Kubernetes namespace, you must first mark it as unprotected. The protection marking is an extra layer of safety to prevent accidental deletion, which is enabled by default. You can select the three-dot menu next to the namespace you want to delete and select **Change protection marking**. You can toggle the protection marking back on later if you change your mind.

![Change protection marking action](/docs/resources/apollo/managing-k8s-namespaces/change-k8s-namespace-protection-marking-action.png)

This will open a dialog where you can confirm the change to the protection marking.

![Change K8s Namespace protection marking confirmation dialog](/docs/resources/apollo/managing-k8s-namespaces/unprotect-namespace-dialogue.png)

This will create a change request, which must be approved by a user with the Environment editor role. Once approved, the namespace will show as **Pending protection status change** until Apollo has issued a Plan to unprotect it.

![Pending protection status change](/docs/resources/apollo/managing-k8s-namespaces/protection-status-marking.png)

Once the namespace no longer shows as **Pending protection status change**, you can delete it using the **Change deletion marking** action.

![Delete K8s Namespace action](/docs/resources/apollo/managing-k8s-namespaces/delete-k8s-namespace-action.png)

This will open a dialog where you can confirm the deletion. If you have any installed Entities in the namespace, Apollo will warn you that the namespace cannot be deleted until those Entities are uninstalled.

![Delete K8s Namespace confirmation dialog](/docs/resources/apollo/managing-k8s-namespaces/delete-k8s-namespace-confirmation-dialog.png)

Upon submission, a change request will be created. Once approved by a user with the Environment editor role, Apollo will issue a Plan that deletes the namespace, which you can view in the Environment's **Activity** tab.
