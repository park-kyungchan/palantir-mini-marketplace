---
sourceUrl: "https://www.palantir.com/docs/foundry/vs-code/benefits/"
canonicalUrl: "https://palantir.com/docs/foundry/vs-code/benefits/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "1186a512a37019a1bde266c51bd9eb986388a0701f66e86f0d2a7e8293927fbf"
product: "foundry"
docsArea: "vs-code"
locale: "en"
upstreamTitle: "Documentation | VS Code workspaces > Benefits of VS Code workspaces"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Benefits of VS Code workspaces

This page provides an overview of the benefits of using VS Code in Foundry to write and manage code. In particular, the benefits below should be considered when deciding whether to switch from Code Repositories to VS Code in Foundry.

## AI-powered coding assistance with Continue

VS Code in Foundry comes with [Continue](/docs/foundry/vs-code/ai-development-tools/#continue), an AI coding assistant preconfigured to work with Palantir-provided language models and equipped with knowledge about relevant Palantir SDKs and your Python transforms or OSDK repository. With this contextual understanding of your data structures, ontology, and organization, Continue can generate more accurate and relevant code suggestions and access Foundry-specific tools to accelerate your workflows.

## Enhanced preview features

VS Code in Foundry provides powerful preview capabilities that go beyond basic sampling:

* **Full dataset preview in Python transforms repositories:** Use [full dataset preview](/docs/foundry/palantir-extension-for-visual-studio-code/transforms-preview/#full-dataset) to preview the full output of transforms without random sampling, giving you accurate results that match production behavior.
* **Accurate incremental preview:** The Palantir extension runs the same [incremental resolution and evaluation logic](/docs/foundry/palantir-extension-for-visual-studio-code/transforms-preview/#understanding-incremental-preview-results) as production builds for both Spark and lightweight transforms, with full support for v1 and v2 incremental semantics. This way, you can see exactly how your incremental transforms will behave.
* **Custom filtering:** Specify your own [code-defined filters](/docs/foundry/palantir-extension-for-visual-studio-code/code-defined-filtering/) to control exactly what data gets loaded during preview, enabling targeted testing of specific scenarios.

## Optimized VS Code language server

The highly optimized language server in VS Code enables an efficient, responsive developer experience, with major speed boosts for features like linting and auto-complete.

## Integrated terminal

VS Code's integrated terminal gives you full control over your development environment. Automate workflows with scripts, run commands to perform bulk operations, and efficiently manage version control with the command line interface.

## Flexibility to work in Foundry or locally

**VS Code workspaces** provide you with an environment deployed on Palantir infrastructure and accessible from the Palantir platform. Alternatively, the [**Palantir extension for Visual Studio Code**](/docs/foundry/palantir-extension-for-visual-studio-code/overview/) can be installed in your local VS Code IDE to integrate directly with your code in Foundry.

For a detailed comparison to help you decide which is right for you, review our documentation on [choosing between local development and VS Code workspaces](/docs/foundry/vs-code/local-vs-workspace-guide/).

## Customizable user experience

VS Code workspaces enables you to customize your workflow and save your coding preferences, such as custom key bindings, configurable color themes and layouts, and other UI settings.

Learn more about the motivation for [VS Code integration with Foundry ↗](https://community.palantir.com/t/why-we-built-it-foundry-for-vs-code/3486) and additional [features of the VS Code extension](/docs/foundry/palantir-extension-for-visual-studio-code/extension-features/).

***

Note: AIP feature availability is subject to change and may differ between customers.

VS Code workspaces and the Palantir extension for Visual Studio Code are not affiliated with or endorsed by Microsoft.

The Continue extension is a product of Continue Dev, Inc. No affiliation or endorsement is implied.
