---
sourceUrl: "https://www.palantir.com/docs/foundry/workshop/branching-rebasing/"
canonicalUrl: "https://palantir.com/docs/foundry/workshop/branching-rebasing/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "0478da4932e2dc53c01163376bfcad5f56aff245fea3cfd40e0fe06b4469428b"
product: "foundry"
docsArea: "workshop"
locale: "en"
upstreamTitle: "Documentation | Workshop > Rebasing and conflict resolution"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Rebasing in Workshop \[Experimental]

:::callout{theme="warning" title="Experimental"}
Rebasing in Workshop is in the [experimental](/docs/foundry/platform-overview/development-life-cycle/) phase of development and may not be available on your enrollment. Functionality may change during active development. Contact Palantir Support to request access to this feature.
:::

Workshop rebasing enables multiple builders to edit a single module at the same time without needing to worry about overriding each other's changes.

Prior to merging workshop changes on a branch into `Main`, rebasing will be required if a change occurred on `Main` after the module was saved on a branch.

The rebasing user interface uses the [Changelog panel](/docs/foundry/workshop/changelog/) to depict the changes made in the module.

## Starting the rebase

If rebasing is required prior to merging, the **Changelog** panel will display a visual notification dot. Selecting the panel will show an option that allows the application builder to begin rebasing.

![Rebasing panel in Workshop.](/docs/resources/foundry/workshop/rebase_panel.png)

Rebasing will attempt to apply changes made on the branch to the latest `Main` version of the module. Changes that trigger merge conflicts will need to be resolved manually to proceed.

## Resolve a merge conflict

A change will be marked as a merge conflict if it was changed both on the `Main` version and the branch. Some common examples of merge conflicts:

* A widget or variable was modified on both `Main` and your branch.
* A section was deleted on `Main` and edited on the branch.
* A widget was moved from location `A` to `B` on `Main` and from `A` to `C` on your branch.

![An example of merge conflicts found.](/docs/resources/foundry/workshop/rebase_conflict.png)

When resolving a merge conflict, you can switch between three states within the module. Switching between these modifies the module in real time, allowing you to test how the different options affect the module.

* **Main:** The modification as it appears on `Main`.
* **Branch:** The modification as it appears on the branch.
* **Modification:** This option stores changes made to the component after beginning rebasing. This is useful when attempting to merge the two changes of `Main` and your branch.

## Finish rebase

Once you are happy with how your module looks and have resolved any merge conflicts, you can save the module to finish rebasing.

Once this is complete, you can safely merge your workshop changes from your branch into `Main`.

## Example

In the example below, we encounter a merge conflict with the object table widget when we try to rebase. On `Main`, a new column "Departure airport code" was added. However, on our current working branch, we added a column "Action required".

Main: <img src="./media/rebase_main_table.png" alt="Rebase conflict main object table with `Departure airport code` column showing." width="450">

Branch: <img src="./media/rebase_branch_table.png" alt="Rebase conflict branch object table with `Action required` column showing." width="450">

In this case, to keep both columns, first select `Main` and manually add the `Action required` column. From here, the conflict can be resolved.

![Rebase conflict modified object table.](/docs/resources/foundry/workshop/rebase_combined_table.png)
