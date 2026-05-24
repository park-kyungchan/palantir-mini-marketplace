---
sourceUrl: "https://www.palantir.com/docs/foundry/document-intelligence/core-concepts/"
canonicalUrl: "https://palantir.com/docs/foundry/document-intelligence/core-concepts/"
sourceLastmod: "2026-05-12T17:06:26.146Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "df72696c51de17de10495e4dd5f51d2b82586640cd486aea79968517d2b65fd1"
product: "foundry"
docsArea: "document-intelligence"
locale: "en"
upstreamTitle: "Documentation | AIP Document Intelligence > Core concepts"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Core concepts

## Preprocessing

For use cases that work with more complex documents, combining VLMs with preprocessing techniques has proven quite successful. Under **Configuration > Generative AI**, toggle on **Preprocess document**. Document preprocessing essentially runs traditional OCR (Optical Character Recognition) on the document, then passes that output *in addition* to the document page itself to a VLM, giving the model more context to successfully analyze the document.

![The preprocessing configuration section found in AIP Document Intelligence.](/docs/resources/foundry/document-intelligence/preprocessing.png)

## Evaluations

:::callout{theme="warning"}
Currently, you can only perform extraction evaluations if Anthropic Claude 4 Sonnet is available for your enrollment.
:::

For each run of an extraction strategy, you can choose to view a qualitative rubric that leverages your selected VLM as a judge. We fine-tuned the prompt to rank various area from 1 (worst) to 5 (best), including how well a given strategy extracted tables, headers, and more. Evaluations allow you to quickly iterate and make judgments as you test different prompts and strategies.

## Deployment paths

Once you are satisfied with a particular strategy, you can deploy it in a batch pipeline to run it over your wider dataset. Currently, we only support a Python transform deployment path.

### Python transform

You can export your strategy to a Python transform repository template that is fully dynamic; the dataset RID/path, model RID/path, custom prompt, and selected configuration are all automatically configured. We recommend you verify this work before triggering a build.

Learn more about the [features](/docs/foundry/document-intelligence/overview/#features) of AIP Document Intelligence and how to [get started](/docs/foundry/document-intelligence/overview/#getting-started).
