---
sourceUrl: "https://www.palantir.com/docs/apollo/managing-environments/suppression-windows-and-cancelling-plans/"
canonicalUrl: "https://palantir.com/docs/apollo/managing-environments/suppression-windows-and-cancelling-plans/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "2da98730a1dfda9f613c254a9d66475af0dd3f884d560766a2c7d01de25741c4"
product: "apollo"
docsArea: "managing-environments"
locale: "en"
upstreamTitle: "Documentation | Managing Environments > Suppression windows and canceling Plans"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Suppression windows and canceling Plans

Suppression windows prevent work on an Environment or Entity. During a suppression window, Apollo will not issue Plans for the Environment or Entity. Suppression windows supersede maintenance windows, so Plans will not be issued for Environments or Entities with a suppression in place even if there is an active maintenance window.

There are two types of suppression windows:

* Environment-level: Prevent work on the Environment and all Entities in the Environment
* Entity-level: Prevent work only on a specific Entity in the Environment

Apollo will automatically create Entity-level suppression windows when an Entity:

* Acts as a test Environment for [canary-based Release promotion](/docs/apollo/managing-release-channels/configure-promotion-pipeline/#canary-promotion-stage)
* Fails a Plan (to prevent re-issuing the failed Plan)

Apollo will automatically create an Environment-level suppression window if the number of Entities in the Environment that are under automatic suppression windows exceeds the [configured threshold](#optional-override-the-required-number-of-auto-suppressed-entities-for-environment-level-auto-suppression).

You can view the active suppression windows on an Environment and its Entities by navigating to the Environment's **Settings** page and selecting **Maintenance and Suppressions**. The **Suppressions** table lists all Environment and Entity suppression windows.

<img alt="Suppressions table." src="./media/suppressions-table.png" width=800>

You can filter suppression windows by their scope (Environment or Entity), type (manual or automatic), and whether they are active, scheduled, or ended.

You can view Entity-level suppression windows by navigating to the Entity page, then selecting **Overrides and Suppressions** from the **Activity** tab.

![Entity suppressions](/docs/resources/apollo/managing-environments/entity-suppressions-activity-tab.png)

This section describes how to create and remove suppression windows for Entities and Environments.

## Create an Environment-level manual suppression window

[Environment editors](/docs/apollo/core/authorization/) can create suppression windows for the Environment and its Entities. To create an Environment-level suppression window, navigate to the Environment **Settings** tab and select **Create suppression** from the maintenance window calendar.

<img alt="Creating an environment-level suppression window" src="./media/create-environment-suppression.png" width=800>

This will open the suppression window creation form.

<img alt="Form for creating a suppression window." src="./media/suppression-form.png" width=600>

After you create a suppression window for an Environment, banners at the top of the Environment page and the Entity pages will display the active suppression windows for the Environment. The banner includes a popover that you can select to view details about active suppressions. The popover also includes an action to [remove each suppression window](#remove-a-suppression-window).

![Suppression in place](/docs/resources/apollo/managing-environments/environment-suppression-banner.png)

### (Optional) Override the required number of auto-suppressed Entities for Environment-level auto-suppression

Apollo will automatically create an Environment-level suppression window if the number of Entities in the Environment that are under automatic suppression windows exceeds the [configured threshold](/docs/apollo/core/plans-and-constraints/#plan-failures-suppressions-and-rollbacks).

You can edit the threshold for Environment-level auto-suppression by setting the following optional flag in your [Environment settings](/docs/apollo/managing-environments/environment-settings/):

`suppress-deployment-after-num-autosuppressions: 30`

## Create an Entity-level manual suppression window

Environment and Entity editors and operators can set Entity-level suppression windows.

To create a suppression window, navigate to the Entity home page and select the **Suppress helm-chart** option under the **Actions** dropdown menu.

This will open the suppression window creation form. Configuring the suppression window from here is identical to Environment-level suppression windows. Similar to the Environment-level suppression window banner, selecting the details popover will list details for active suppression windows on the Entity, and give you an action to remove each suppression window.

After you create a suppression window for an Entity, a banner at the top of the Entity page will display the active suppression windows for both the Entity and the Environment.

![Entity suppression banner.](/docs/resources/apollo/managing-environments/entity-suppression-banner.png)

## Remove a suppression window

To remove any suppression window, whether created manually or automatically, navigate to the **Suppressions** table for the Environment or Entity and select the delete icon to the right of the suppression window. You can bulk remove all suppression windows for the Environment or Entity by selecting the remove suppressions option at the top of the table.

<img alt="Remove suppression." src="./media/remove-suppression-window.png" width=800>

Note that removing an Environment-level suppression window from one Entity will remove it from all Entities.

You can also select the banner for the suppression window at the top of the Environment or Entity page and then select the delete icon.

<img alt="Remove Entity suppression." src="./media/remove-entity-suppression-from-banner.png" width=300>

## Cancel active Plans

To cancel all active Plans for an Environment or Entity, navigate to the Environment or Entity page and select **Cancel active plan** from the **Actions** dropdown.

You can also cancel specific active Plans for an Entity by navigating to an active Plan in the **Activity** tab and selecting **Cancel active plan** from the **Actions** dropdown.

<img alt="Cancel active plan from activity tab" src="./media/cancel-active-plans-activity-tab.png" width=500>

These actions will open the cancellation form. You should enter a reason for cancellation. Apollo will prompt you to create a 30 minute suppression window after canceling the Plan. This is recommended because Apollo may immediately issue the same Plan if no suppression window is created.

<img alt="Cancel active plan" src="./media/cancel-active-plans-form.png" width=500>

### Create a short suppression window

You can also cancel active Plans for an Environment or Entity by creating a short suppression window.

When creating the suppression window, you can check the **Cancel Active Plans** box, which will cancel all active Plans in the suppression window's scope, either Entity or Environment.

<img alt="Cancel plans" src="./media/cancel-active-plans-suppression-window.png" width=500>

After the suppression window is created, Apollo will cancel all active Plans in the scope of the suppression. You can then remove the suppression window or wait for it to end.

:::callout{theme="warning"}
Canceling a Plan might not be immediate. To terminate a Plan, Apollo must communicate to the agent that the Plan should be aborted. In cases where the agent is down or unresponsive, this could take a long time or never happen.
:::
