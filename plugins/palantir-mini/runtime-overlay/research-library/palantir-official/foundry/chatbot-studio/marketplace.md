---
sourceUrl: "https://www.palantir.com/docs/foundry/chatbot-studio/marketplace/"
canonicalUrl: "https://palantir.com/docs/foundry/chatbot-studio/marketplace/"
sourceLastmod: "2026-05-12T17:06:26.146Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "e84890dbc524a52ed33e7a3e6d62642a40e940f9ae1c3ed4ec3cd04a9a933354"
product: "foundry"
docsArea: "chatbot-studio"
locale: "en"
upstreamTitle: "Documentation | AIP Chatbot Studio > Distribute AIP Chatbots using Marketplace"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Distribute AIP Chatbots using Marketplace

Use [Foundry DevOps](/docs/foundry/devops/overview/) to include your AIP Chatbots in [Marketplace products](/docs/foundry/devops/core-concepts/#product) for other users to install and reuse. [Learn how to create your first product.](/docs/foundry/foundry-devops/create-products/)

## Supported features

All AIP Chatbots features are supported by Marketplace products, with the exception of:

* [Assist agents](/docs/foundry/assist/agents-in-aip-assist/)

## Adding AIP Chatbots to Marketplace products

To add an AIP Chatbot to a product, first [create a product](/docs/foundry/foundry-devops/create-products/). In the **Add resources** step, search for and select your AIP Chatbot from the **Add files** option.

Alternatively, if you have a [Workshop application](/docs/foundry/workshop/overview/) that embeds an AIP Chatbot via the [AIP Chatbot widget](/docs/foundry/workshop/widgets-aip-chatbot/), you can add the Workshop module to the product and the AIP Chatbot will be included automatically.

## AIP Chatbots with document context

When packaging an AIP Chatbot that is configured to use [document context retrieval](/docs/foundry/chatbot-studio/retrieval-context/#document-context), the [media set](/docs/foundry/data-integration/media-sets/) containing the documents will automatically be included in the product. This ensures that the AIP Chatbot has access to the necessary documents when installed.

:::callout{theme="warning" title="Media set content"}
The entire media set, including any items not used by the AIP Chatbot, will be packaged in the product. If you want to limit the content to only the documents used by the AIP Chatbot, you should create a new media set containing only the necessary documents and reconfigure the AIP Chatbot to use it.
:::
