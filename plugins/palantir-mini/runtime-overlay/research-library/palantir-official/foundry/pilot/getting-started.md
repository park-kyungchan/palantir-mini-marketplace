---
sourceUrl: "https://www.palantir.com/docs/foundry/pilot/getting-started/"
canonicalUrl: "https://palantir.com/docs/foundry/pilot/getting-started/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "e7a95b9697ddbb37bb250d65a525d68bc1dd348686026eb863ddecd30685c216"
product: "foundry"
docsArea: "pilot"
locale: "en"
upstreamTitle: "Documentation | Pilot > Getting started"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Getting started

This page walks you through creating your first application with Pilot. By the end of this guide, you will have a working application with generated ontology entities, a design specification, frontend code, and seed data running in a live preview.

## Open Pilot

To open Pilot, select **Pilot** from the application menu in the Foundry navigation sidebar. If you do not see Pilot in the application menu, confirm that your enrollment has Pilot enabled and that you have access to a project with ontology write permissions.

The Pilot welcome screen displays a prompt input, a **Save location** selector, and a list of recent applications.

![The Pilot welcome screen showing the prompt input, save location, and recent applications.](/docs/resources/foundry/pilot/pilot-welcome-screen.png)

## Create your first application

1. In the prompt input, describe the application you want to build. For example: `Build a task management application for tracking team projects with priorities and deadlines`.
2. (Optional) Select **Add** to attach additional context, such as existing object types, action types, or reference documents. For more details, see [Provide context and attachments](/docs/foundry/pilot/provide-context/).
3. Confirm the **Save location**, which determines the ontology where Pilot will use existing entities or create new ones.
4. Select **Create application**.

Pilot creates an isolated container where all code and ontology edits are safely made until you deploy the application explicitly.

## Wait for your container

After you select **Create application**, Pilot provisions a container for your application. This process may take a few moments. You can monitor progress using the status indicator in the top-right corner of the workspace. For more details on status monitoring, see [The Pilot workspace](/docs/foundry/pilot/workspace-overview/).

## Explore the workspace

Once the container is ready, the Pilot workspace will open. The workspace has two main areas:

* **Chat panel** (left): A chat interface where you can interact with Pilot to refine your application. The chat panel includes the prompt input, message history, and context attachments.
* **Application view** (center): Four tabs for viewing different aspects of your application:
  * **Preview:** A live preview of your generated application.
  * **Ontology:** An interactive graph showing the object types, action types, and relationships created by Pilot.
  * **Code:** The complete application source code in an embedded editor.
  * **Pilot Logs:** Container logs for debugging.

For a detailed walkthrough of each workspace area, see [The Pilot workspace](/docs/foundry/pilot/workspace-overview/).

## Refine with follow-up prompts

After Pilot finishes the initial build, you can continue iterating by typing follow-up prompts in the chat panel. For example:

* Add new features: `Add a dashboard that shows project completion statistics`
* Change the design: `Use a dark color scheme with blue accents`
* Modify the ontology: `Add a priority field to the task object type with values High, Medium, and Low`

Pilot processes your request and updates the relevant parts of the application. Changes appear in the live preview as soon as the agent finishes.

## Next steps

* [Build an application](/docs/foundry/pilot/build-an-application/): Understand the full build lifecycle, including ontology generation, design specification, and seed data.
* [The Pilot workspace](/docs/foundry/pilot/workspace-overview/): Learn about each workspace area in detail.
* [Deploy an application](/docs/foundry/pilot/deploy-an-application/): Promote your application to production.
