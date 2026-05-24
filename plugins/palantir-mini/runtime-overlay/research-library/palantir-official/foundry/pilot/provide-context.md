---
sourceUrl: "https://www.palantir.com/docs/foundry/pilot/provide-context/"
canonicalUrl: "https://palantir.com/docs/foundry/pilot/provide-context/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "f99b46f44a8a7bfe9e65d24c60e06637bc851afe0c55d5b6f7f5632f9edc457e"
product: "foundry"
docsArea: "pilot"
locale: "en"
upstreamTitle: "Documentation | How-to guides > Provide context and attachments"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Provide context and attachments

Pilot produces better results when you provide relevant context alongside your prompts. This page describes the types of context you can attach and best practices for effective prompting.

## Ontology context

You can attach existing [ontology](/docs/foundry/ontology/overview/) entities to your prompt, allowing Pilot to use an existing data model instead of creating duplicate entities. Attach ontology context using the steps below:

1. Select **Add** in the chat panel.
2. Choose the type of entity to attach:
   * **Object types:** Existing object types from your ontology
   * **Action types:** Existing action types from your ontology
   * **Functions:** Existing Foundry functions (when available)
3. Search for and select the entities you want to include.

Selected entities appear as tags in the context area below the prompt input. Each tag displays the entity name and an indicator for edit permissions.

![The Add menu showing options for attaching ontology context, documents, and images.](/docs/resources/foundry/pilot/pilot-add-menu.png)

:::callout{theme="neutral"}
Providing ontology context allows Pilot to use an existing data model. This is especially useful when building an application that extends or integrates with data already in your ontology.
:::

## Document uploads

You can upload documents to provide additional context for your application. Supported formats include:

* **PDF:** Requirements documents, specifications, data dictionaries
* **Markdown:** Technical documentation, API references
* **Plain text:** Notes, requirements, or any text-based reference material

To upload a document, select **Add** in the chat panel and choose **Files**. You can also drag and drop files into the chat panel or paste content from your clipboard.

Pilot reads the uploaded documents and uses them to inform your application's design and implementation.

## Image uploads

You can upload images to guide Pilot's design and layout decisions. Common use cases include:

* Screenshots of existing applications you want to replicate or improve
* Wireframes and mockups showing desired layouts
* Design system references showing color palettes and component styles

Pilot interprets uploaded images and incorporates visual elements into the design specification and front end generation. To upload an image, select **Add** and choose **Files**, or paste an image directly from your clipboard.

## Effective prompting tips

The quality of your prompt directly affects the quality of the generated application. Consider these guidelines:

* **Be specific about the data model:** Describe the entities, properties, and relationships your application needs. For example, instead of `Build a project tracker`, try `Build a project tracker with projects that have a name, description, status (Active, Completed, On Hold), and a list of tasks with priorities and due dates`.
* **Describe user workflows, not just screens:** Explain what users should be able to do, not just what the interface should look like. For example: `Users should be able to filter tasks by status and assignee, drag tasks between status columns, and receive a notification when a task is overdue`.
* **Reference uploaded context:** When you attach documents or images, describe what they contain and how Pilot should use them. For example: `Use the attached wireframe as the layout for the main dashboard. The sidebar should match the navigation structure shown in the image`.
* **Iterate incrementally:** Start with core functionality and add features through follow-up prompts rather than trying to describe everything at once.
