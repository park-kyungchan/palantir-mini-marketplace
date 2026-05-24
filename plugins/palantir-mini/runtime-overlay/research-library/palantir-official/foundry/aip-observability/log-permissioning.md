---
sourceUrl: "https://www.palantir.com/docs/foundry/aip-observability/log-permissioning/"
canonicalUrl: "https://palantir.com/docs/foundry/aip-observability/log-permissioning/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "83b07ea7e5800b0e3393b897da6295e26ad8a863c0dd493deb7d34e886dc023a"
product: "foundry"
docsArea: "aip-observability"
locale: "en"
upstreamTitle: "Documentation | AIP observability > Log permissions"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Log permissions

## Required roles

The following table lists the required roles for various operations in AIP observability.

| Capability | Required role |
| --- | --- |
| View [metrics](/docs/foundry/aip-observability/metrics/) | `View` permission on the resource |
| View [run history](/docs/foundry/aip-observability/run-history/) | `Edit` permission on the resource |
| View [trace](/docs/foundry/aip-observability/trace-view/) and [service logs](/docs/foundry/aip-observability/service-logs-and-debugging/)¹ | `Edit` permission on the resource + Log access enabled² + Access to all markings |
| [Search logs](/docs/foundry/aip-observability/log-search/)¹ | `Edit` permission on the resource + Log access enabled² + Access to all markings |
| [Configure log visibility](/docs/foundry/administration/configure-logging/#in-platform-log-access-for-ontology-and-aip-workflows) | `Information security officer` or `Enrollment administrator` role |
| [Delete logs](#delete-logs) | `Information security officer` or `Enrollment administrator` role |

¹Users always have access to logs for their own executions from the past 24 hours with just `Edit` permission, independent of log access settings.

²Log access enablement: An administrator must enable log access either on the source executor resource directly (as a resource override) or on the source executor's project (and attributed project if the resource has been moved). See [log access requirements](#log-access-requirements) below for full details.

## Log access requirements

To view the run history for a resource, you must have **edit** permission on the resource.

To view the trace and service logs for an execution you did not invoke, log reading must be enabled on the project of the **source executor** (and attributed project if the resource has been moved). You must also have access to all configured markings. The source executor is the first executable resource in the call chain and can be a function, action, automation, AIP logic or AIP agent.

Users with the **Information security officer** or **Enrollment administrator** role can configure log access at the project level. To learn more about managing project-level log access for Ontology and AIP workflows, review the Control Panel [configure logging](/docs/foundry/administration/configure-logging/) documentation.

![Control Panel showing project log access configuration interface.](/docs/resources/foundry/aip-observability/project-log-access-control-panel.png)

When log access is not enabled for the project the source executor resides in, selecting **View log details** for an execution invoked by another user or automation will show the following message: **Logs disabled for source execution resource**.

![Example Workflow Lineage logs disabled](/docs/resources/foundry/aip-observability/workflow-lineage-logs-disabled.png)

Users always have access to logs for their own executions from the past 24 hours, independent of administrator log access settings. This also applies to [log search](/docs/foundry/aip-observability/log-search/), which aggregates logs across all executions for a source executor. When log access is enabled, log search covers all executions; otherwise, only your own executions from the past 24 hours are searchable.

![User viewing their own execution logs secured by user ID.](/docs/resources/foundry/aip-observability/user-id-secured-log-access.png)

When log access is enabled for the project and marking permissions are satisfied, **Source executor log access** will show as enabled. Logs will be visible for all executions originating from the enabled project.

![Project-level log access showing enabled status for all executions.](/docs/resources/foundry/aip-observability/project-level-secured-log-access.png)

## Source executor log access override for legacy Ontology permissions

Actions must be migrated to [Ontology project-based permissions](/docs/foundry/object-permissioning/ontology-permissions/) to be managed at the project level. If your actions are managed by [legacy Ontology permissions](/docs/foundry/object-permissioning/ontology-permissions-legacy/), review the guide on [migrating to project-based permissions](/docs/foundry/ontology-manager/migrate-to-project-based-permissions/). Note that once your actions are migrated, an administrator will need to update the project attribution of each by clearing the legacy ontology resource identifier.

To enable log access for an action with legacy Ontology permissions during this transition period, administrators can create a resource override. This allows enabling access without needing to migrate. Select **Edit permissions** and then **Configure log visibility** in the top right corner of the **Run history** table.

![Workflow Lineage showing the Edit permissions button in the Run history table.](/docs/resources/foundry/aip-observability/workflow-lineage-run-history-edit-permissions.png)

The administrator will be prompted to override the project permissions for the action. For actions with legacy Ontology permissions, the Action's ontology resource identifier will appear as the project. Administrators cannot enable this identifier and do not have access to it through Foundry's project and file system.

<img src="./media/creating-log-access-override-for-action.png" alt="Example Workflow Lineage enable log reading dialog." width="500">

When overriding, they can apply necessary markings to restrict the log access and select **Next**.

<img src="./media/configure-log-access-controls-action-override.png" alt="Example Workflow Lineage enable log reading dialog." width="500">

Then **Apply changes**.

<img src="./media/workflow-lineage-enable-logging-ack.png" alt="Example Workflow Lineage enable log reading dialog." width="500">

## Updating the project attribution of a source executor

A source executor is linked to an **Attributed** project for log access purposes. By default, the attributed project is the project where the source executor was located when it first wrote a log. If a resource is moved after writing its first log, log access is enforced based on both the attributed project and the current project. When these two projects differ, an administrator can update the attributed project to match the resource's current project at any time.

<img src="./media/log-access-attributed-project.png" alt="Example Workflow Lineage enable log reading dialog." width="500">

## Delete logs

Users with the **Information security officer** or **Enrollment administrator** role can also delete logs at any time by selecting **Edit permissions**, **Delete log history**, and then **Delete logs**.

<img src="./media/workflow-lineage-delete-logs-popup.png" alt="Example Workflow Lineage delete log selection." width="500">

:::callout{theme="danger"}
Choosing to delete log history is irreversible and will permanently delete all logs for executions originating from this resource.
:::

<img src="./media/workflow-lineage-delete-logs.png" alt="Example Workflow Lineage delete logs pop up." width="500">

## Related documentation

* [Execution history](/docs/foundry/aip-observability/run-history/): View available executions
* [Service logs](/docs/foundry/aip-observability/service-logs-and-debugging/): Access logs once permissions are configured
* [Log search](/docs/foundry/aip-observability/log-search/): Search across logs from all executions for a source executor
* [AIP security and privacy](/docs/foundry/aip/aip-security/): Learn about AIP security model
