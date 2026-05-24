---
sourceUrl: "https://www.palantir.com/docs/foundry/solution-designer/navigation/"
canonicalUrl: "https://palantir.com/docs/foundry/solution-designer/navigation/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "218f622e1353dbce7209a7a7bfe3e71905db603ac5dba82958861de8c37a78a2"
product: "foundry"
docsArea: "solution-designer"
locale: "en"
upstreamTitle: "Documentation | Solution Designer > Navigation"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Navigation

To make the best use of Solution Designer, we recommend familiarizing yourself with the various capabilities and navigation. The following numbered sections correspond to the numbers in the image below:

1. [New diagram](#1-new-diagram)
2. [Reference architecture library](#2-reference-architecture-diagrams)
   * [Search bar](#a-search-bar)
   * [Pattern selection](#b-pattern-selection)
   * [Interactive diagram preview](#c-interactive-diagram-preview)
   * [Preview controls](#d-preview-controls)
3. [Diagram metadata and diagram controls](#3-diagram-metadata-and-controls)
4. [Node toolbar](#4-node-toolbar)
5. [Upload diagrams](#5-upload-diagrams)

![Navigation of solution designer header](/docs/resources/foundry/solution-designer/tutorial-1.png)

## 1. New diagram

Get started with Solution Designer by opening a blank canvas or existing data lineage graph, or choose an existing architecture diagram.

## 2. Reference architecture diagrams

Our library of reference diagrams provide a foundation for creating your own solution diagrams by showcasing common architectural patterns and best practices that can be adapted to specific use cases and requirements.

![Navigation of solution designer reference library](/docs/resources/foundry/solution-designer/tutorial-3.png)

![Navigation of solution designer reference library preview](/docs/resources/foundry/solution-designer/tutorial-4.png)

### A. Search bar

Search for patterns of interest through the search functionality or associated categories. Categories are split into the following:

* **Workflow patterns:** Generalized solutions to common problems or challenges found in the design, modeling, and execution of workflow processes. These patterns capture the best practices and proven techniques for structuring, coordinating, and managing tasks, resources, and information flow within a process.
* **Industry patterns:** Standardized and proven solutions to common challenges or problems found in specific industries or business domains. These patterns are derived from best practices and successful strategies.
* **Technical patterns:** Reusable solutions to common problems or challenges encountered in software development, system architecture, or technology implementation. These patterns include best practices and effective techniques for designing, developing, and maintaining technical systems.

### B. Pattern selection

Select from the available patterns to open the pre-built diagram. Each pattern contains a title, short description and preview of the diagram.

### C. Interactive diagram preview

The diagram preview is a read-only version of the actual diagram. In preview mode, you can zoom in/out and pan across to review the graph. To enable edit mode, you must load and open the pattern.

### D. Preview controls

* Close preview: Close the current preview and return to **Reference architecture diagrams** view.
* **Create new diagram:** Load the pattern into Solution Design and enable edit mode.
* **Add pattern to existing diagram (edit-only):** The pattern will be added to the bottom of the existing diagram.
* **Override existing diagram (edit-only):** Replace the current diagram with one from the **Reference architecture diagrams**.

![Navigation of solution designer creation](/docs/resources/foundry/solution-designer/tutorial-2.png)

## 3. Diagram metadata and controls

**Diagram description (optional)** Add a brief explanation that outlines your use case at a high level.

* **[Reference architecture diagrams](#2-reference-architecture-diagrams):** Explore a variety of Palantir-designed patterns that represent common use cases.
* **Load from data lineage:** Load an existing data lineage graph into Solution Design.
* **Undo/redo:** Revert or reapply your most recent changes.
* **Open filesystem dialog:** Load an existing resource from your Palantir filesystem.
* **Save current diagram:** Secure your work by saving the diagram in your filesystem.
* **Actions:**
  * **Import diagram:** The import capability supports diagrams in JSON format.
  * **Export diagram:** Export functionality is enabled once your diagram is saved.
    * Export as JSON file
    * Copy to clipboard
  * **Export image:** Export PNG image representation of your diagram. This capability is enabled once your diagram is saved.

## 4. Node toolbar

**Search:** Browse though available platform components.

* **Node categories:** Explore nodes by their respective categories. Each entry includes the component's name as it appears on the platform along with a brief description.
* **Abstract nodes \[Beta]:** Nodes representing a conceptual idea in Palantir. Each node category contains a set of abstract nodes, represented by different shading. These nodes may not have a one-to-one correspondence. Review the [abstract nodes section](/docs/foundry/solution-designer/diagrams/#abstract-nodes-beta) for more detail.

## 5. Upload diagrams

Select an upload option to add a diagram. Choose from the **[Reference architecture diagram](#2-reference-architecture-diagrams):** options, or upload a saved diagram.
