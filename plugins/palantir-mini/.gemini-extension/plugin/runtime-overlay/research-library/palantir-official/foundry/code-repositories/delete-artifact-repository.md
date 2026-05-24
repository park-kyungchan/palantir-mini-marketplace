---
sourceUrl: "https://www.palantir.com/docs/foundry/code-repositories/delete-artifact-repository/"
canonicalUrl: "https://palantir.com/docs/foundry/code-repositories/delete-artifact-repository/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "2583bed108f2f415b4fc5dd2b72e6d1306b35f20723ebd5d980074dd045f583f"
product: "foundry"
docsArea: "code-repositories"
locale: "en"
upstreamTitle: "Documentation | Artifact repositories > Delete an Artifact repository"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Delete an Artifact repository

:::callout{theme="danger"}
Deleting an Artifact repository will remove all Artifacts contained within the Artifact repository. This is considered a breaking change and all consumers of the deleted Artifacts will be impacted. Take care when deleting Artifact respositories.
:::

To delete an Artifact Repository, first navigate to the Project that contains the Artifact Repository. Then, right-click on the Artifact Repository and choose **Move to trash**.

<img src="./media/ar-delete.png" alt ="Delete" width="300">

To permanently delete an Artifact Repository, navigate to the **Trash** tab within the Project. Right-click on the Artifact Repository and select **Delete permanently**. This action cannot be undone.

It may be possible to restore an Artifact Repository. First, navigate to the **Trash** tab within the Project. Then, right-click on the Artifact Repository and select **Restore**. If you do not see the **Trash** tab, be sure you are in the Project overview rather than a folder within the Project.

<img src="./media/ar-restore.png" alt ="Restore" width="400">

Learn more about [deleting and restoring files in Foundry](/docs/foundry/compass/use-project-navigation-panel/#trash).
