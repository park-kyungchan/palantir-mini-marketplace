---
sourceUrl: "https://www.palantir.com/docs/foundry/autopilot/"
canonicalUrl: "https://palantir.com/docs/foundry/autopilot/"
sourceLastmod: "2026-05-12T17:06:26.160Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "0af17f4a4f47caf67e7bec3371c7ba0b8c1c8991678ae8ad9ca0e9bf8cfe9651"
product: "foundry"
docsArea: "autopilot"
locale: "en"
upstreamTitle: "Documentation | Autopilot > Overview"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Autopilot \[Beta]

:::callout{theme="warning" title="Beta"}
Autopilot is in the [beta](/docs/foundry/platform-overview/development-life-cycle/) phase of development. Functionality may change during active development. Contact Palantir Support to request access to Autopilot.
:::

**Autopilot** is your control center for managing Ontology automation workflows at scale. It enables teams to visualize, monitor, and optimize complex systems while troubleshooting issues in real time.

![A Kanban board view in Autopilot.](/docs/resources/foundry/autopilot/autopilot_overview.png)

## Capabilities

Autopilot has two main tabs for managing your automation workflows:

* **[Workbench](/docs/foundry/autopilot/workbench/):** Visualize your workflow using Kanban boards and dependency graphs, monitor object states, and interact with your automation system.
* **[Object execution](/docs/foundry/autopilot/object-execution/):** View detailed execution logs, trace automation runs, and troubleshoot issues across your entire workflow. Enable the experimental **Object execution** tab and allow failures to appear in the Kanban view in the Autopilot settings sidebar (bottom left).

:::callout{theme="warning"}
Workflows with a high number of automations may increase memory usage and cause browser performance issues.
:::

### Visualize complex agentic workflows

The [Workbench](/docs/foundry/autopilot/workbench/) provides coordinated views for understanding your automation workflows:

* **[Kanban boards](/docs/foundry/autopilot/workbench-kanban/)** display your state machine, where each card represents a single object in a given state.
* **[Dependency graphs](/docs/foundry/autopilot/workbench-graph/)** display all system components, including automations, actions, functions, logic functions, and their relationships.

![View your workflow as a Kanban-style work queue or as a dependency graph.](/docs/resources/foundry/autopilot/autopilot_split_view.png)

### Monitor system performance and debug issues in real time

* Track automation event failures at the object level to quickly triage problematic event executions.
* Explore object details, view an object's edit history with resource attribution (automation, workshop, actions), and filter your workbench to all linked objects for a given object.
* Use workbench search (`Cmd+F` for macOS and `Ctrl+F` for Windows) to find any object by title or resource identifier (RID).

![Filter your Kanban board to all linked objects.](/docs/resources/foundry/autopilot/autopilot_filter_to_linked_objects.png)

* View the liveness of your system; see which automations are currently executing and on which objects.
* Follow the entire lifecycle of an automation with detailed telemetry.
* Manually retry automations on any object.
* Modify automation conditions directly within Autopilot.
