---
sourceUrl: "https://www.palantir.com/docs/foundry/code-repositories/recall-artifact/"
canonicalUrl: "https://palantir.com/docs/foundry/code-repositories/recall-artifact/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "bd2dd35ba9e9a0595e7bc6a41aa7ff362f255f7a64508de13a1bbdf46893d968"
product: "foundry"
docsArea: "code-repositories"
locale: "en"
upstreamTitle: "Documentation | Artifact repositories > Recall an Artifact"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Recall an Artifact

It is possible to recall Conda Artifacts to stop downstream consumers from compiling code with the recalled version. We recommend having patch versions available for recalled Artifacts before starting the recall process.

Follow these steps to recall an Artifact:

1. [Search](/docs/foundry/code-repositories/artifact-repositories-nav/) for the Conda Artifact in your Artifact Repository and select it to view the Version History section in the summary page.

2. Select the version to recall and then choose **Recall**. <br><br>
   ![Select version and click Recall](/docs/resources/foundry/code-repositories/ar-recall-select.png) <br><br>

3. A **Recall artifacts** pop-up will appear. Enter the reason for recalling the Artifact in the field. <br><br> <img src="./media/ar-recall-reason.png" alt ="Enter recall reason" width="300"> <br><br>

4. View the Version History again to see that the Artifact is now marked as `Recalled`. <br><br>
   ![Version marked as recalled.](/docs/resources/foundry/code-repositories/ar-recall-overview.png) <br><br>

## Unrecall

You can unrecall an Artifact.

To unrecall an Artifact, select the version of a recalled Artifact and click **Unrecall**.

![Unrecall](/docs/resources/foundry/code-repositories/ar-unrecall.png)

## Delete

Conda Artifacts can be recalled, but it is not possible to delete any Artifacts in an Artifact repository. If you explicitly need to delete an Artifact, you must [delete the Artifact repository](/docs/foundry/code-repositories/delete-artifact-repository/).
