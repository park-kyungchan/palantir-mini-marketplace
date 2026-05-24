---
sourceUrl: "https://www.palantir.com/docs/foundry/notepad/templates-overview/"
canonicalUrl: "https://palantir.com/docs/foundry/notepad/templates-overview/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "19a67e3df6d824d21b7307e2d7509575a88f31d12a823a29339c10508db302ac"
product: "foundry"
docsArea: "notepad"
locale: "en"
upstreamTitle: "Documentation | Templates > Notepad templates"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Notepad templates

Notepad templates serve as a blueprint for generating new documents from existing content based on new inputs.

Templates accept inputs such as strings, objects, or object sets. Widgets in the template can be configured to use these parameters. When creating a new template copy based on inputs, content is adjusted dynamically.

Some Notepad widgets are designed for use in templates.

* The [Table Row Generator](/docs/foundry/notepad/widgets-table-row-generator/) allows you to generate a table row per object from an object set passed as an input.
* The [Section Generator](/docs/foundry/notepad/widgets-section-generator/) generates whole sections per object.
* The [Functions](/docs/foundry/notepad/widgets-functions/) widget enables generating strings from [TypeScript functions](/docs/foundry/functions/overview/).

![notepad\_template\_concept](/docs/resources/foundry/notepad/notepad_template_concept.png)

In the example above, the `Airplane Information Template` takes two input parameters, an `Aircraft` object and an object set of `Flights` to generate new aircraft-specific documents.

## Generate documents from templates

Templates must be published before they can be used to generate documents. The methods for generating documents from templates are described below.

### From the Notepad home page

You can generate a document from a template on the Notepad home page by selecting the **New from template** option, or by selecting the **New from this template** icon on an existing template.

![The Notepad home page with options for generating documents from templates.](/docs/resources/foundry/notepad/notepad_generate_from_templates_from_splash_page.png)

**Note:** This will generate a document from the *latest* published version of the template.

### From the Notepad application header

You can generate a document from a template in the Notepad application header by opening the **File** menu and selecting the **New from this template** option.

![The Notepad header File menu with the New from this template option.](/docs/resources/foundry/notepad/notepad_generate_from_templates_from_application_header.png)

**Note:** This will generate a document from the *latest* published version of the template.

### From Workshop

To generate new template copies, embed your template in [Workshop](/docs/foundry/workshop/overview/) with the **[Notepad: New Notepad Button](/docs/foundry/notepad/workshop-templates/)** widget. This connects Workshop variables with the template inputs needed to drive the generation process.

![The New Notepad Button widget in Workshop.](/docs/resources/foundry/notepad/notepad_new_notepad_button_workshop.png)
