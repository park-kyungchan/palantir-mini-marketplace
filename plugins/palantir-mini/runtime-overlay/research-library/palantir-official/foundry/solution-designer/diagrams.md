---
sourceUrl: "https://www.palantir.com/docs/foundry/solution-designer/diagrams/"
canonicalUrl: "https://palantir.com/docs/foundry/solution-designer/diagrams/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "c649baba309a6b4242d09a1d6137b85736cea54be2165c2df3e5ad3c2b6c7d19"
product: "foundry"
docsArea: "solution-designer"
locale: "en"
upstreamTitle: "Documentation | Solution Designer > Diagrams"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Diagrams

This section provides a summary of the Solution Designer graph functionality and the various configurations you can apply to your diagrams.

## Canvas

The canvas is where your diagram is built as you add nodes and create node groups. The following tools are useful for navigating the canvas.

![Canvas](/docs/resources/foundry/solution-designer/diagram-1.png)

1. Canvas toolbar
   * Zoom in
   * Zoom out
   * Center diagram
   * Lock diagram: Prevent unwanted changes
   * Show/hide background dots
   * Layout nodes automatically: Arranges nodes in a structured (grid-like) manner
   * Show/hide edge labels
   * Expand/collapse nodes
2. Canvas menu: Right-click on the canvas to open the menu
   * Add comment
   * Add empty group: Add an empty node that supports nested graphs
   * Layout nodes automatically: Arranges nodes in a structured (grid-like) manner
   * Show/hide edge labels: Control text visibility of text labels on edges
   * Hide edge validity: Ignore incorrect component connections
   * Expand/collapse nodes
3. Mini-map: Provides a preview of your current location on the canvas

## Nodes

The nodes on your canvas represent resources and applications available across the Palantir platform. Use the following tools to configure, contextualize, and connect your nodes across your diagram.

![Nodes](/docs/resources/foundry/solution-designer/diagram-2.png)

1. Configuration panel toggle: Expand or collapse the node configuration panel.
2. Ask AIP Assist: Prompt AIP Assist to explain a platform component.
3. Component information
   * About: A short description of the node and its intended use.
   * Documentation: Link to relevant documentation.
   * Example: Provides a preview for how the node can be used.
4. Title and node description
5. Delete node (displays on hover)
6. Node connectivity (displays on hover): Drag from here to connect nodes.
7. Resize node (displays on hover)
8. Create/redirect to a relevant part of the platform
9. Associate an RID with the resource.
10. Add relevant tags by selecting the pencil icon

### Context menu node actions

* Send forward: Bring node to front by one index
* Send back: Send node to back by one index
* Change Bg color: Change node color
* Group: Create single group
* Delete node

### Abstract nodes \[Beta]

:::callout{theme="neutral" title="Beta"}
Abstract nodes are in the [beta](/docs/foundry/platform-overview/development-life-cycle/) phase of development and may not be available on your enrollment. Functionality may change during active development.
:::

![Abstract node options](/docs/resources/foundry/solution-designer/diagram-3.png)

Abstract nodes function similarly to normal nodes. However, once connected, they generate suggestions based on the connected input and output nodes. You can choose from the suggested options to replace the abstract node with an appropriate selection.

![Abstract node](/docs/resources/foundry/solution-designer/diagram-4.png)

### Group nodes

Grouping nodes together allows you to combine components conceptually. Creating node groups can help to add modularity and organization to your diagrams, making it easier to understand and navigate.

To create a group, select multiple nodes by holding `Shift` and dragging your cursor across the canvas. You may also multi-select by selecting individual nodes and holding `Shift`.

![Create a node group.](/docs/resources/foundry/solution-designer/diagram-5.png)

Once your nodes are selected, right-click and select **Group** to group your nodes together. You can change the group contents by dragging nodes into or out of the group.
