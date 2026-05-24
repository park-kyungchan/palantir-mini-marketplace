---
sourceUrl: "https://www.palantir.com/docs/foundry/autopilot/workbench-graph/"
canonicalUrl: "https://palantir.com/docs/foundry/autopilot/workbench-graph/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "63d0a621b9c17d91cc55b2452e0039eb69412b35054104a0d910f9a3d8999219"
product: "foundry"
docsArea: "autopilot"
locale: "en"
upstreamTitle: "Documentation | Autopilot > Dependency graph view"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Dependency graph view

Autopilot's graph view displays the complete dependency graph of your automation system, showing all automations, actions, functions, logic functions, and their relationships. This view helps you understand the architecture of your workflow, identify dependencies, and troubleshoot issues across your automation system.

The dependency graph is composed of nodes and edges:

* **Nodes:** Represent automations (composed of actions and logic) and Workshop applications (also composed of actions). Together, these show both automated and human-driven components of your workflow.
* **Edges:** Show dependencies and execution flow between nodes.

![Dependency graph view in Autopilot.](/docs/resources/foundry/autopilot/autopilot_graph_view.png)

## Human vs. automation components

The graph distinguishes between human-driven and automated components of your workflow:

* **Workshop nodes:** Human actions and Workshop applications appear as distinct nodes on the graph.
* **Transition breakdown:** View which state transitions are driven by human actions rather than automation.
* **Collaboration patterns:** Understand where humans and automation interact in your workflow.

## Historical object paths

View the historical path of an object as it moves through your workflow over time. When you select an object, you can display its path on the graph to view the following:

* The states the object has passed through
* The automations that processed the object at each stage
* The sequence and timing of state transitions

## Liveness indicators

When automations are actively executing, the graph displays real-time indicators:

* **Animated dotted lines:** Active processing appears as animated dotted lines on the edges connecting to the states where objects are currently being processed.
* **Node highlights:** Automations that are currently running are highlighted on the graph.

These indicators provide immediate visibility into system activity and help you monitor automation execution in real time.

![Example liveness indicators on the dependency graph.](/docs/resources/foundry/autopilot/autopilot_graph_liveness.png)

## Graph controls and navigation

Use the graph controls toolbar and navigation features to explore your workflow:

* **Auto-layout:** Automatically organize nodes to minimize edge crossings and improve readability.
* **Edge styling:** Choose between orthogonal (right-angled) or curved edges.
* **Expand all nodes:** Expand all collapsed sections of the graph to view the full workflow structure. When you expand nodes, you can see fallback effects configured in your automations. <br><br>
  ![Expanded node details in the dependency graph view.](/docs/resources/foundry/autopilot/autopilot_expanded_graph_node.png) <br><br>
* **Select nodes:** Select any node to view details in the right side panel.
* **Remove nodes:** Choose a node, then select **Remove from workbench** to remove it from your graph view.
