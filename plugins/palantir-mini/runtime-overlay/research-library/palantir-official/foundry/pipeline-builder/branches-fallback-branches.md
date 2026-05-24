---
sourceUrl: "https://www.palantir.com/docs/foundry/pipeline-builder/branches-fallback-branches/"
canonicalUrl: "https://palantir.com/docs/foundry/pipeline-builder/branches-fallback-branches/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "52343e7f4e18c40fa5f4cae09e4a19a80ddb03b223903d72110a54a647343736"
product: "foundry"
docsArea: "pipeline-builder"
locale: "en"
upstreamTitle: "Documentation | Branches > Fallback branches"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Fallback branches

Pipeline Builder allows you to build datasets on any branch and view the effect your logic has on the data. If an input dataset to your pipeline has not been built on the current branch, Pipeline Builder makes an attempt to locate a built version from a list of fallback branches instead. The default branch will automatically be set as the fallback branch unless configured otherwise. You can set different fallback branches to each branch and have more than one fallback if needed.

## Configure fallback branches in Pipeline Builder

To configure fallback branches, follow the steps below:

1. Select **Settings > Manage branches**.

<img src="./media/branches-fallback-settings.png" alt="Screenshot of branches available." width="350">

2. Select the **Fallback branches** tab and expand your branch using the double arrow icon on the right. To change the fallback branch configuration, search under the **Check the following branches in order** field by either typing the branch directly into the text box or dragging to reorder the fallback branch order in the **Drag to reorder** section below.

![Screenshot of fallback branches subtab.](/docs/resources/foundry/pipeline-builder/branches-fallback-branches-collapsed.png)

![Screenshot of fallback branches configuration change.](/docs/resources/foundry/pipeline-builder/branches-fallback-branches-expanded.png)

3. Select **Save** after completing branch fallback configurations.

If your branch is not listed under the **Fallback branches** tab, use **Add a new configuration** on the bottom right of the pop-up window. To delete a branch’s fallback configuration, select the trash can icon on the right side of the branch.
