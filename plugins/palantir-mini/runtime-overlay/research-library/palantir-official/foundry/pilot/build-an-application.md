---
sourceUrl: "https://www.palantir.com/docs/foundry/pilot/build-an-application/"
canonicalUrl: "https://palantir.com/docs/foundry/pilot/build-an-application/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "e0013a96364f4c2226898f4778f677052092a1da7703317adc05ffc9604bc340"
product: "foundry"
docsArea: "pilot"
locale: "en"
upstreamTitle: "Documentation | How-to guides > Build an application"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Build an application

This page guides you through the build lifecycle of a Pilot application, from ontology generation through seed data. For creating a new application, see [Getting started](/docs/foundry/pilot/getting-started/). For deploying to production, see [Deploy an application](/docs/foundry/pilot/deploy-an-application/).

## Ontology generation

After you describe your application, Pilot analyzes your prompt and creates the data model for your application using the ontology architect agent. Pilot creates the following resources based on your prompt:

* **Object types** that represent the core entities in your application. For example, a task management application might include `Task`, `Project`, and `Team Member` object types with relevant properties.
* **Action types** for your workflow. For example, `Create Task`, `Update Task Status`, `Assign Task`, and `Delete Task`.
* **Link types** that define relationships between object types. For example, a link between `Task` and `Project` to indicate which project a task belongs to.

The ontology architect documents design decisions in the chat panel, explaining the rationale for each entity. You can view the generated ontology graph by switching to the **Ontology** tab. For more details on the ontology graph, see the [ontology tab](/docs/foundry/pilot/ontology-tab/) documentation.

To refine the ontology, type instructions in the chat panel. For example, you might ask Pilot to add a new property, change a property type, or create a new relationship between object types.

:::callout{theme="neutral"}
If you attach existing ontology entities as context, Pilot will use them instead of creating duplicates. See [Provide context and attachments](/docs/foundry/pilot/provide-context/) for details.
:::

## Design specification

Once the ontology is defined, the design agent creates a detailed design specification for your application. The design agent reads the ontology and your requirements, then produces a design specification with the following:

* A color palette and semantic status colors
* Typography, including font family, sizes, and line heights
* A layout for the main application views
* Form design and interaction patterns such as hover states, animations, and validation feedback

You can view a summary of the design specification in the chat panel. The design specification guides the front-end generation that follows.

## Frontend generation

The app builder agent implements the front end using the ontology and design specification. This agent performs the following tasks:

* Reads the design specification, ontology definitions, and OSDK documentation
* Builds a React application that uses OSDK hooks for real-time data loading and mutations
* Generates components for creating, updating, filtering, and deleting records

When the agent finishes, the **Preview** tab displays a live preview of your application running in the container. You can interact with the preview to test functionality, and the [device selector](/docs/foundry/pilot/workspace-overview/) lets you preview the application at different screen sizes.

![A live preview of a generated application in the Preview tab.](/docs/resources/foundry/pilot/pilot-build-preview.png)

## Seed data

In editor view, Pilot generates seed data in the container so that AI agents never access real enterprise data. This prevents Pilot from hard-coding production values into your application code. You can view generated records in the **Ontology** tab by selecting an object type node and opening the data preview panel. See the [ontology tab](/docs/foundry/pilot/ontology-tab/) documentation for details.

To validate your application against real ontology data, switch to the **Deploy** view. On a deployment branch, ontology schema changes are scoped to that branch and do not affect `Main` until you merge. On `Main`, any actions performed in the application are live ontology edits. For details, see [Deploy an application](/docs/foundry/pilot/deploy-an-application/).

## Iterate on your application

After the initial build, you can refine your application through follow-up prompts.

* **Add features:** Describe new functionality, and Pilot updates the ontology, design, and code as needed.
* **Fix issues:** If the preview shows unexpected behavior, describe the problem and Pilot investigates and applies a fix.
* **Change the design:** Request color, layout, or typography changes and the design agent updates the specification.
* **Upload reference material:** Attach documents, images, or wireframes to guide Pilot. See [Provide context and attachments](/docs/foundry/pilot/provide-context/).
* **Edit code directly:** The code tab provides an embedded editor where you can make changes to the application source code directly.
* **Switch models or modes:** Use a different AI model, or switch between act and plan modes depending on the task. See [Models and agent modes](/docs/foundry/pilot/models-and-modes/) for more information.

If you encounter build errors in the **Preview** tab, you can select **Fix with Pilot** to prompt Pilot to diagnose and resolve the issue automatically.
