---
sourceUrl: "https://www.palantir.com/docs/foundry/workflow-lineage/manage-security/"
canonicalUrl: "https://palantir.com/docs/foundry/workflow-lineage/manage-security/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d9ac692e7ec3676b8534a7cc3f5b96bf233da24c0eca3f7a0d1e3e7dc7b7b06a"
product: "foundry"
docsArea: "workflow-lineage"
locale: "en"
upstreamTitle: "Documentation | Workflow Lineage > Manage security"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Manage security

:::callout{theme="neutral"}
The application previously known as Workflow Builder is now called Workflow Lineage.
:::

To start using Workflow Lineage, open a Workshop application or functions repository and use the keyboard shortcut `Command + I` (macOS) or `Ctrl + I` (Windows) to view the relevant Workflow Lineage graph depicting the objects, actions, and functions that back the application.

You can also navigate directly to the Workflow Lineage application and manually add resources to the graph.

![Example Workflow Lineage with security coloring.](/docs/resources/foundry/workflow-lineage/workflow-lineage-security-coloring.png)

The color legend in Workflow Lineage allows you to view both Ontology and resource permissions. There are two types of Ontology permissions:

* **Definition:** Whether or not the specified user can view or edit entity definitions.
* **Data and execution:** Whether or not the specified user can view object data or execute actions.

To understand the access permissions of a specific user, you can input their username into the **View as** dropdown menu for a preview.

### Bulk update ontology roles on resources

You can also bulk edit [ontology role permissions](/docs/foundry/object-permissioning/ontology-permissions-legacy/#ontology-roles) on objects and actions by following the steps below:

1. Navigate to a resource and right-click on it, then select **Edit permissions** from the context menu.

![The Edit permissions option in the dropdown menu.](/docs/resources/foundry/workflow-lineage/ontology-roles-edit-permissions.png)

This will bring you to the **Edit ontology resource permissions** window, displaying the selected resources.

![The Edit ontology resource permissions dialog.](/docs/resources/foundry/workflow-lineage/ontology-roles-window.png)

2. In the **Ontology roles to grant** section, search for the group that you want to add. After selecting the role, you should see it displayed next to the selected group.

![Example Workflow Lineage with model usage coloring.](/docs/resources/foundry/workflow-lineage/ontology-roles-add.png)

3. Confirm the action by selecting **Grant roles** in the bottom right. A dialog will appear with the prompt, `Are you sure you want to share these resources?`.

4. Select **Yes, share** to proceed. Note that this action is immediate and cannot be undone.

![Example Workflow Lineage with model usage coloring.](/docs/resources/foundry/workflow-lineage/ontology-roles-confirm.png)

## Bulk update action submission criteria

Additionally, you can update an action's submission criteria to match the submission criteria of a source action. From the Workflow Lineage graph, select the actions you wish to update. Then, navigate to **Update submission criteria** from the bottom panel.

![Example of upgrading functions for a particular Workshop application.](/docs/resources/foundry/workflow-lineage/workflow-lineage-update-submission-crit.png)

On the left side of the panel, select the source action whose submission criteria you want applied to the other actions. The submission criteria of the source action can be viewed under the selected source action.

When completed, select the blue **Update x actions** button where **x** is the number of actions that will be updated. This will create a proposal you can approve and submit for the changes to take effect.
