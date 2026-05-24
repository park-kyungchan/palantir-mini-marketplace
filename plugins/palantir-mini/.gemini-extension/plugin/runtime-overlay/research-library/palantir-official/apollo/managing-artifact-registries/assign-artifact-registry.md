---
sourceUrl: "https://www.palantir.com/docs/apollo/managing-artifact-registries/assign-artifact-registry/"
canonicalUrl: "https://palantir.com/docs/apollo/managing-artifact-registries/assign-artifact-registry/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "dfe180d947b17314670f6111dca5857db7c852d1cabb6b1dd4b7af4f8bffc9ab"
product: "apollo"
docsArea: "managing-artifact-registries"
locale: "en"
upstreamTitle: "Documentation | Managing Artifact Registries > Assign an Artifact Registry to an Environment"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Assign an Artifact Registry to an Environment

This section will walk through how to assign an Artifact Registry to an Environment. To deploy containers that exist from an external OCI registry to an Environment, you must first assign the corresponding Artifact Registry to the Environment. This will allow the agents in the Environment to pull images from the Artifact Registry and deploy them.

## Step 1: Navigate to the Environment Artifact Registry settings

Navigate to the Environment, then under the **Settings** tab, select the **Artifact Registry** tab. This will display a list of Artifact Registries that have been assigned to the Environment. This list will remain empty until you assign at least one Artifact Registry.

![The "Artifact Registries" page for the environment, showing the currently assigned Artifact Registries for the environment and a button to edit which ones are in the environment](/docs/resources/apollo/managing-artifact-registries/artifact-registry-environment-page.png)

## Step 2: Assign the Artifact Registry to the Environment

Select **Add Artifact Registry** to assign a new Artifact Registry to the Environment. This will display a
list of all Artifact Registries that have been created in Apollo. Note that you can add or remove as many Artifact Registries as you would like, and all changes will be submitted at once when you select **Submit**.

![The "Artifact Registries" page for the environment, showing the pending Artifact Registries to be added to the envinronment](/docs/resources/apollo/managing-artifact-registries/artifact-registry-environment-add-registry.png)

Once submitted, a change request will be created. This change request will require an approval from a user in a team that has the "Assigner" RBAC role. Once approved, the Artifact Registry will be assigned to the Environment.

## Step 3: Ensure changes have been propagated to the Environment

Once approved, you can check the progress of the Artifact Registry assignment in the **Activity** tab of the
Environment. This will show the installation, change version, and uninstall Plans for Artifact Registries.

Once the install Plan has completed, you can view the connection status of the Artifact Registry, both on the Environment overview page widget and in the **Artifact Registries** tab in your Hub settings. The connection status will transition from "Pending" to "Connected" when the Artifact Registry has been successfully assigned to the Environment. At this point, you can install Products that rely on this Artifact Registry to the Environment.

:::callout{theme="warning"}
If the connection status is "Disconnected", then the Artifact Registry has not been successfully assigned to the Environment. This is likely due to a credential related issue. You should re-enter the credentials again to see if this fixes the issue.
:::
