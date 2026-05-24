---
sourceUrl: "https://www.palantir.com/docs/foundry/code-repositories/create-transforms/"
canonicalUrl: "https://palantir.com/docs/foundry/code-repositories/create-transforms/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "bb12d8459be12c4e2a6d7675f5c25f2ec74ed61157c81ccb2eee52810d97764c"
product: "foundry"
docsArea: "code-repositories"
locale: "en"
upstreamTitle: "Documentation | Transforms > Create transforms"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Create transforms

Transforms can be created in Code Repositories using the file template configuration wizard. This wizard enables you to select a transform type and then bootstrap a minimal example by providing values for the variables required by the transform, such as input or output datasets.

To get started using the wizard, create new Python transforms repository. The wizard will be automatically opened. In existing repositories, the wizard can be opened by selecting **Add** and then **New file from template** in the Files side panel.

![The 'New file from template' menu option in the 'Add' menu of Code Repositories](/docs/resources/foundry/code-repositories/create-transforms-instructions.png)

After opening the wizard, you will be prompted to select a template. Each template represents a transform type. Illustrations and descriptions are provided to help contrast the different options and identify the correct choice for your use-case. Available templates include:

* **Lightweight transforms:** Generally recommended for transforms that operate on datasets of less than 10 million rows.
* **Spark transforms:** Leverage distributed computing to enable better performance for transforms on datasets of more than 10 million rows.

![The template selection page of the wizard, with options for Spark and Lightweight transforms](/docs/resources/foundry/code-repositories/create-transforms-template-page.png)

After choosing a template, select **Next** to open the template configuration page. Here, you can configure your template by supplying the required values and selecting resources from across Foundry. This page displays a live preview of your transform based on the current configuration; modifying any input or output variables will update the preview. Your configuration is automatically validated at this stage, and any errors must be addressed before the transform can be created.

Common validation errors include:

* **Using resources from different projects:** Input and output resources must be contained within the same project as the repository.
* **Duplicate parameter names:** All parameter names in your transform must be unique.
* **Not providing required parameters:** Some templates require at least one input or output variable. Provide a valid variable value to resolve this error.

![The configuration page of the wizard, displaying the required input and output variables](/docs/resources/foundry/code-repositories/create-transforms-configuration-page.png)

Once your configuration is valid, you will be able to create your transform by selecting **Generate file**. This will create a new file in your repository with the contents shown in the preview of the configuration page. If the template requires specific backing dependencies or libraries, these will be automatically configured so that your transform runs correctly.
