---
sourceUrl: "https://www.palantir.com/docs/foundry/global-branching/rebasing-and-conflict-resolution/"
canonicalUrl: "https://palantir.com/docs/foundry/global-branching/rebasing-and-conflict-resolution/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "abd393ae31011446c59c4a04677558d2ea185066f1ad0e29b30b625823e80d64"
product: "foundry"
docsArea: "global-branching"
locale: "en"
upstreamTitle: "Documentation | Usage > Rebasing and conflict resolution"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Workshop rebasing and conflict resolution

Workshop allows you to rebase your branch when there are changes on the `Main` branch that are not available on your branch.

To rebase your branch from `Main`, navigate to the [**Changelog** panel](/docs/foundry/workshop/changelog/) in Workshop. If the `Main` branch contains updates that do not exist on your branch, the following message will be displayed: `Your module is out of date. There is a new version on the main branch. Rebase module to integrate new changes.`

![Workshop changelog panel with rebase message.](/docs/resources/foundry/global-branching/workshop-changelog-panel.png)

Merge checks within the branching taskbar also alert if a rebase is needed.

![Workshop rebase failing check.](/docs/resources/foundry/global-branching/workshop-rebase-checks.png)

![Workshop rebase message.](/docs/resources/foundry/global-branching/workshop-rebase-message.png)

Select **Rebase** to integrate the new changes into your branch. To confirm, select the **Rebase module** option.

![Rebase module message.](/docs/resources/foundry/global-branching/workshop-rebase-module-message-popup.png)

Conflicts when rebasing occur when changes from the main branch differ from changed tracked on your working base. To resolve these conflicts, select the conflicts to review the differences between what exists on your branch and main branch. Select the change you would like to persist on your branch and then select the **Resolve** button.

![Resolvling merge conflicts.](/docs/resources/foundry/global-branching/workshop-resolve-merge-conflicts.png)
