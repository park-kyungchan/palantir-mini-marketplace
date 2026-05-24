---
source: https://www.palantir.com/docs/foundry/agent-studio/marketplace/
fetched: 2026-04-20
section: aip-stack
doc_title: Distribute AIP Agents using Marketplace
---

Distribute AIP Agents using Marketplace
=======================================

Use [Foundry DevOps](/docs/foundry/devops/overview/) to include your AIP Agents in [Marketplace products](/docs/foundry/devops/core-concepts/#product) for other users to install and reuse. [Learn how to create your first product.](/docs/foundry/foundry-devops/create-products/)

Supported features
------------------

All AIP Agents features are supported by Marketplace products, with the exception of:

* [Assist agents](/docs/foundry/assist/agents-in-aip-assist/)

Adding AIP Agents to Marketplace products
-----------------------------------------

To add an AIP Agent to a product, first create a product. In the Content step, search for and select the **AIP Agent** resource type.

Alternatively, if you have a [Workshop application](/docs/foundry/workshop/overview/) that embeds an AIP Agent via the [AIP Agent widget](/docs/foundry/workshop/widgets-aip-agent/), you can add the Workshop module to the product and the AIP Agent will be included automatically.

AIP Agents with document context
--------------------------------

When packaging an AIP Agent that is configured to use [document context retrieval](/docs/foundry/agent-studio/retrieval-context/#document-context), the [media set](/docs/foundry/data-integration/media-sets/) containing the documents will automatically be included in the product. This ensures that the AIP Agent has access to the necessary documents when installed.

Note: The entire media set, including any items not used by the AIP Agent, will be packaged in the product. If you want to limit the content to only the documents used by the AIP Agent, you should create a new media set containing only the necessary documents and reconfigure the AIP Agent to use it.
