---
sourceUrl: "https://www.palantir.com/docs/foundry/flow-capture/"
canonicalUrl: "https://palantir.com/docs/foundry/flow-capture/"
sourceLastmod: "2026-05-12T17:06:26.160Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "ee83c7035c106b1db02193d4953c54fedfb4c58220b4faa9489e5285cdf56e8f"
product: "foundry"
docsArea: "flow-capture"
locale: "en"
upstreamTitle: "Documentation | Flow Capture > Overview"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Flow Capture

:::callout{theme="neutral"}
Flow Capture is in the [beta](/docs/foundry/platform-overview/development-life-cycle/) phase of development and may not be available on your enrollment. Functionality may change during active development. To enable Flow Capture, contact your platform administrator to [modify application access](/docs/foundry/administration/configure-application-access/) in Control Panel.
:::

Flow Capture is a tool for recording workflows in Foundry and converting them into structured, customizable documentation. It records mouse clicks, screenshots, optional audio with transcription, and contextual metadata while you navigate an application in a recording session. Captured assets can be edited, combined with prompts and model selection, and transformed into Markdown documentation that you can review, edit, and export.

## Application access

To activate Flow Capture, enable it in the [**Application access**](/docs/foundry/administration/configure-application-access/) section of Control Panel. You can [configure a checkpoint](/docs/foundry/checkpoints/configure-checkpoints/) to warn users before they perform sensitive actions, such as exporting generated content.

## Key features

### Screenshots

Flow Capture provides users with auto-capture and manual capture options. Screenshots are stored as individual snapshot assets and can be included in the final documentation in context, or as standalone images.

### Audio recordings with transcription

You can optionally include a microphone recording during a Flow Capture session. Audio files and their transcriptions are stored as assets and can be used to enrich documentation generation by providing additional context and instructions.

### Image editing

Crop and blur areas of captured images directly in Flow Capture to remove or redact sensitive areas before generation or export.

### Customizable content

Add a prompt to provide additional context such as style guides, desired structure or additional instructions to shape tone, level of detail, and structure of the generated Markdown.

### Edit and view modes

Flow Capture offers edit and view modes, allowing users to create and preview generated documentation. View mode displays generated documentation in presentation or preview form, while edit mode can be used to modify generated Markdown, create additional recordings, and adjust images or transcriptions before re-generating, saving, or exporting.

### LLM model selection and templates

Choose a system prompt or template, and a model to influence how content is generated. General documentation and feature requests are examples of different content types. Models and templates affect style, length, and level of technical detail.

### Exports

Export the final documentation in multiple formats, such as [Notepad](/docs/foundry/notepad/overview/) documents, [Walkthroughs](/docs/foundry/walkthroughs/overview/), PDFs, or a zipped bundle of images and Markdown.

:::callout{theme="warning"}
It is the user’s responsibility to ensure that appropriate security checks related to markings and group-based access are applied to created Flow Capture resources to reflect the security checks of the captured content.
:::
