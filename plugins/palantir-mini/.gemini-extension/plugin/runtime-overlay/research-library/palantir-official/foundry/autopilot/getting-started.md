---
sourceUrl: "https://www.palantir.com/docs/foundry/autopilot/getting-started/"
canonicalUrl: "https://palantir.com/docs/foundry/autopilot/getting-started/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "5eb407d3d9f3ded8ec66e02800941d5386217f21630aa35c05a5410464014f31"
product: "foundry"
docsArea: "autopilot"
locale: "en"
upstreamTitle: "Documentation | Autopilot > Getting started"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Getting started

To get started, create an Autopilot workbench from one of the following entry points:

* **Directly in Autopilot:** Open Autopilot from the application portal and select object types (optionally selecting the related automations to import), or select automations directly.
* **From an [automation](/docs/foundry/automate/overview/):** On the overview page for an automation, select **Open in Autopilot** in the **Actions** menu.

## Set up your Autopilot workbench

Autopilot automatically generates an initial workbench for you based on the starting object types or automations you have selected. [Alerts at the top](#understand-alerts) of your workbench guide you through steps to configure a complete system view.

### Workbench configuration

1. **Review and add automations:** When you open your workbench, Autopilot will alert you to automations related to your workflow that are not yet included in your workbench. Follow the prompts to add relevant automations for a complete system view.
2. **Customize states:** Autopilot infers and automatically generates states (columns in your Kanban board) based on automations in your workbench. You can also add and manually define your own states.
   * In the **States** sidebar, drag states to reorganize the Kanban board. <br><br>
     ![The "States" sidebar in Autopilot.](/docs/resources/foundry/autopilot/autopilot_states_sidebar.png) <br><br>
3. **Enable [project-scoped mode](/docs/foundry/automate/history-visibility-and-scope/) for full visibility:** For the most comprehensive view of your automation system, enable project-scoped mode on your automations. This setting allows all workbench users to view automation execution events and discover dependencies between automations.

:::callout{theme="warning"}
Project-scoped mode expands permissions so that automation relationships are visible to all users in the project. Autopilot may not be able to infer relationships for user-scoped automations owned by another user.
:::

4. **Enable edit history tracking for object types:** Enable edit history for your object types to track changes and view detailed object histories within Autopilot.
5. **Ensure automations have run at least once:** Autopilot relies on historical executions to discover relationships between automations; if an automation has never run or the automation is scheduled, Autopilot cannot infer the dependent automations in a process.
6. **Enable trace logs per resource:** Trace logs show detailed execution for each automation run. Contact your enrollment administrator to enable logs.

:::callout{theme="neutral"}
For more granular logs, consider using `console` in your TypeScript functions or `import logging` in your Python functions.
:::

7. **Configure object card properties and object previews:** Define which object properties appear on Kanban cards, set conditional formatting for properties, and customize object views in Ontology Manager. Autopilot will render the panel object view for an object in the sidebar, when available. View the Autopilot [integrations documentation](/docs/foundry/autopilot/integrations/) for more details on working with Ontology Manager.

### Understand alerts

Autopilot continually analyzes your workflow and displays alerts for recommended configuration steps. These alerts help you:

* **Complete your workflow view:** Identify and add automations related to your workflow that are not yet included in your workbench.
* **Improve observability:** Enable settings like project-scoped mode, edit history tracking, and trace logs that enhance Autopilot's ability to show execution details and relationships.
* **Resolve configuration issues:** Address any missing permissions or settings that prevent Autopilot from displaying complete workflow information.

![A list of alerts in Autopilot.](/docs/resources/foundry/autopilot/autopilot_top_level_alerts.png)
