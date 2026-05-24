---
sourceUrl: "https://www.palantir.com/docs/apollo/apollo-getting-started/introduction-install/"
canonicalUrl: "https://palantir.com/docs/apollo/apollo-getting-started/introduction-install/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "7777aaac89a1bdbd74ad1cababa4bbb22431f1eb4738765ae2d860db132d685f"
product: "apollo"
docsArea: "apollo-getting-started"
locale: "en"
upstreamTitle: "Documentation | Getting started > Install a Release"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Install a Release into your Environment

In this task, you will install the Release that you created in the [previous step](/docs/apollo/apollo-getting-started/introduction-products/) into your connected Spoke Environment(s).

1. Navigate to your Environment page and choose **⊕ Install helm charts** from the **Actions** dropdown.
2. Make the following selections in the **Install helm-charts** dialog:
   * Product: Select `nginx` or your own Helm chart from the dropdown.
   * Name: Leave the default value.
   * K8s namespace: Enter `default`.
   * Release channel subscription: Choose `RELEASE` from the dropdown.
   * Supported versions: Select the field and choose the highest available version.
3. Select **Add** when you are finished. The Apollo Orchestration Engine is now evaluating the relevant Environment and Product constraints to determine whether it can install the Release. Since you have not set any such constraints, the installation will begin immediately.
4. Open your Environment’s **Activity** tab, which contains a searchable, immutable log of all upgrades, downgrades, and configuration changes in your Environment over time. The Nginx Product version you selected will appear at the top as **Completed** or **In progress**, and eventually **Completed**.
5. Once the Release installation has completed, open your Environment’s **Entities** tab. The Product you installed now appears as a row alongside the Spoke Control Plane services. You can verify that the installation is successful when the service reports as `Healthy` and `Up to date`, as shown in the example below (version numbers may vary).

![New products will show up as an entity in your environment](/docs/resources/apollo/apollo-getting-started/intro_publish_2.png)

This Nginx Release is now being managed as an installed service in your Environment. You can repeat this process for other Helm charts.

**Next → [Recall a Release](/docs/apollo/apollo-getting-started/introduction-recall/)**
