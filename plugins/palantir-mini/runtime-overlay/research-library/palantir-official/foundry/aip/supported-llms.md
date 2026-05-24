---
sourceUrl: "https://www.palantir.com/docs/foundry/aip/supported-llms/"
canonicalUrl: "https://palantir.com/docs/foundry/aip/supported-llms/"
sourceLastmod: "2026-05-12T17:06:26.146Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "69a75a86741e8c4a85f97a7d7614205cc145340d84e0a3db5d5ea11a26fe795d"
product: "foundry"
docsArea: "aip"
locale: "en"
upstreamTitle: "Documentation | AI Platform (AIP) > Supported LLMs"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Supported LLMs

Palantir AIP supports a wide range of LLMs (large language models) and text embedding models from leading providers, including xAI, OpenAI, Anthropic, Meta, and Google. Supported models are listed on this page and can be used across the Palantir platform to power AIP workflows, though [availability](#llm-availability-prerequisites) may differ across enrollments (for instance, due to [georestriction](#llm-availability-by-geography)).

To use a specific model, an enrollment administrator must first enable the model family for use through Control Panel. Learn how to [configure the selection of LLMs available for use on your enrollment.](/docs/foundry/aip/enable-aip-features/#enable-llms)

## Available LLMs

The following LLMs are supported for use with AIP, subject to [enrollment availability](#llm-availability-prerequisites).

* [Grok-3 ↗](https://docs.x.ai/docs/models#models-and-pricing)
* [Grok-3-Mini-Reasoning ↗](https://docs.x.ai/docs/models#models-and-pricing)
* [Grok-4 ↗](https://docs.x.ai/docs/models#models-and-pricing)
* [Grok-4-Fast (Reasoning) ↗](https://docs.x.ai/docs/models#models-and-pricing)
* [Grok-4-Fast (Non-Reasoning) ↗](https://docs.x.ai/docs/models#models-and-pricing)
* [Grok-4-1-Fast (Reasoning) ↗](https://docs.x.ai/docs/models#models-and-pricing)
* [Grok-4-1-Fast (Non-Reasoning) ↗](https://docs.x.ai/docs/models#models-and-pricing)
* [Grok-Code-Fast-1 ↗](https://docs.x.ai/docs/models#models-and-pricing)
* [GPT-4o ↗](https://platform.openai.com/docs/models/gpt-4o)
* [GPT-4o mini ↗](https://developers.openai.com/api/docs/models/gpt-4o-mini)
* [GPT-4.1 ↗](https://developers.openai.com/api/docs/models/gpt-4.1)
* [GPT-4.1 mini ↗](https://developers.openai.com/api/docs/models/gpt-4.1-mini)
* [GPT-4.1 nano ↗](https://developers.openai.com/api/docs/models/gpt-4.1-nano)
* [GPT-5 ↗](https://developers.openai.com/api/docs/models/gpt-5)
* [GPT-5 Codex ↗](https://developers.openai.com/api/docs/models/gpt-5-codex)
* [GPT-5 mini ↗](https://developers.openai.com/api/docs/models/gpt-5-mini)
* [GPT-5 nano ↗](https://developers.openai.com/api/docs/models/gpt-5-nano)
* [GPT-5.1 ↗](https://developers.openai.com/api/docs/models/gpt-5.1)
* [GPT-5.1 Codex↗](https://developers.openai.com/api/docs/models/gpt-5.1-codex)
* [GPT-5.1 Codex Max↗](https://developers.openai.com/api/docs/models/gpt-5.1-codex-max)
* [GPT-5.1 Codex Mini↗](https://developers.openai.com/api/docs/models/gpt-5.1-codex-mini)
* [GPT-5.2 ↗](https://platform.openai.com/docs/models/gpt-5.2)
* [GPT-5.2 Codex ↗](https://developers.openai.com/api/docs/models/gpt-5.2-codex)
* [GPT-5.3 Codex ↗](https://platform.openai.com/docs/models/gpt-5.3-codex)
* [GPT-5.4 ↗](https://openai.com/index/introducing-gpt-5-4/)
* [o1 ↗](https://developers.openai.com/api/docs/models/o1)
* [o3-mini ↗](https://platform.openai.com/docs/models/o3-mini)
* [o3 ↗](https://developers.openai.com/api/docs/models/o3)
* [o4-mini ↗](https://developers.openai.com/api/docs/models/o4-mini)
* [Anthropic Claude 3 Haiku ↗](https://www.anthropic.com/claude/haiku)
* [Anthropic Claude 3.5 Haiku ↗](https://www.anthropic.com/claude/haiku)
* [Anthropic Claude 3.5 Sonnet ↗](https://www.anthropic.com/claude/sonnet)
* [Anthropic Claude 3.5 Sonnet v2 ↗](https://www.anthropic.com/claude/sonnet)
* [Anthropic Claude 3.7 Sonnet ↗](https://www.anthropic.com/claude/sonnet)
* [Anthropic Claude 4 Sonnet ↗](https://www.anthropic.com/claude/sonnet)
* [Anthropic Claude 4 Opus ↗](https://www.anthropic.com/claude/opus)
* [Anthropic Claude 4.1 Opus ↗](https://www.anthropic.com/claude/opus)
* [Anthropic Claude 4.5 Haiku ↗](https://www.anthropic.com/claude/haiku)
* [Anthropic Claude 4.5 Sonnet ↗](https://www.anthropic.com/claude/sonnet)
* [Anthropic Claude 4.5 Opus ↗](https://www.anthropic.com/claude/opus)
* [Mistral 7B ↗](https://docs.mistral.ai/getting-started/models/models_overview/)
* [Mixtral 8X7B ↗](https://docs.mistral.ai/getting-started/models/models_overview/)
* [Mistral Small 24B ↗](https://docs.mistral.ai/getting-started/models/models_overview/)
* [Llama 3\_8B ↗](https://github.com/meta-llama/llama-models/blob/main/models/llama3/MODEL_CARD.md)
* [Llama 3\_70B ↗](https://github.com/meta-llama/llama-models/blob/main/models/llama3/MODEL_CARD.md)
* [Llama 3.1\_8B ↗](https://www.llama.com/docs/model-cards-and-prompt-formats/llama3_1/)
* [Llama 3.1\_70B ↗](https://www.llama.com/docs/model-cards-and-prompt-formats/llama3_1/)
* [Llama 3.2 NV EmbedQA 1B v2 ↗](https://build.nvidia.com/nvidia/llama-3_2-nv-embedqa-1b-v2)
* [Llama 3.3\_70B ↗](https://www.llama.com/docs/model-cards-and-prompt-formats/llama3_3/)
* [Llama 3.3 Nemotron Super 49b v1.5 ↗](https://build.nvidia.com/nvidia/llama-3_3-nemotron-super-49b-v1_5/modelcard)
* [Llama 4\_16B Scout ↗](https://www.llama.com/docs/model-cards-and-prompt-formats/llama4/)
* [Llama 4\_128B Maverick ↗](https://www.llama.com/docs/model-cards-and-prompt-formats/llama4/)
* [Gemini 2.0 Flash ↗](https://ai.google.dev/gemini-api/docs/pricing#gemini-2.0-flash)
* [Gemini 2.5 Pro ↗](https://ai.google.dev/gemini-api/docs/pricing#gemini-2.5-pro)
* [Gemini 2.5 Flash ↗](https://ai.google.dev/gemini-api/docs/pricing#gemini-2.5-flash)
* [Gemini 2.5 Flash Lite ↗](https://ai.google.dev/gemini-api/docs/pricing#gemini-2.5-flash-lite)
* [Gemini 3 Pro ↗](https://ai.google.dev/gemini-api/docs/pricing#gemini-3-pro-preview)
* [Gemini 3 Flash ↗](https://ai.google.dev/gemini-api/docs/pricing#gemini-3-flash-preview)
* [Gemini 3.1 Flash-Lite ↗](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-1-flash-lite/)

## Available text embedding models

Palantir AIP also supports the following text embedding models:

* [`ada` embedding ↗](https://developers.openai.com/api/docs/guides/embeddings)
* [text-embedding-3-large ↗](https://developers.openai.com/api/docs/guides/embeddings)
* [text-embedding-3-small ↗](https://developers.openai.com/api/docs/guides/embeddings)
* [Snowflake Arctic Embed ↗](https://www.snowflake.com/en/data-cloud/arctic/)

## LLM availability prerequisites

AIP is model-agnostic and supports a diverse selection of models for LLM-powered use cases; for more information, refer to [this list of all models available in AIP](#llm-availability-by-geography).

However, LLM selection and availability differs across enrollments based on certain prerequisites for a specific model to be available on an enrollment. These prerequisites determine whether a model family appears as **enabled**, **disabled**, or **disallowed** in Control Panel. Learn more about [model states in the Model enablement interface](/docs/foundry/aip/enable-aip-features/#understanding-model-states).

The criteria are listed below:

* **Model has been integrated with AIP:** Palantir aims to support the latest flagship models in the industry and is actively developing support in line with model releases and updates.
* **Legal acknowledgment has been given where required:** Enrollment administrators must accept the legal requirements and terms of use of a provider to have certain models enabled. This can usually be done in Control Panel under the **Model enablement** tab. Models awaiting legal acknowledgment appear in a **disabled** state.
* **AIP has been enabled on an enrollment to use an LLM:** For usage in products such as AIP Logic, Transforms, Functions, and Pipeline Builder, the permissions for AIP capabilities for custom workflows must be enabled for intended user groups.
* **Regional availability compatibility (for external provider models):** For models like GPT, Claude, and Gemini, you may need to consider regional availability if you are on a geography-restricted enrollment. For example, GPT4o and Claude 3 Sonnet were both only available in the US on release from each respective model provider before they were available in the EU, UK, and other regions. Review the [model georestriction section](#llm-availability-by-geography) for details. Models unavailable due to geographical restrictions appear in a **disallowed** state.
* **Additional reviews have been conducted (for certain Palantir-provided models):** Open-source models, such as Llama and Mixtral, may require an additional Palantir engineering review to support your environment. Models requiring these reviews appear in a **disallowed** state.
* **Sufficient time to integration with a specific AIP frontend product:** New LLMs take time to be fully supported on all AIP products (for example, in AIP Logic and in Pipeline Builder's use LLM node feature).
* **Risk consideration (for experimental models):** As experimental models might break or require a manual migration to a newer model, we limit their rollout and customers may be required to acknowledge the same before usage is enabled. The term "experimental" is as described by the model provider and not intended for operational usage.

## LLM rate limits

[For information on LLM rate limits, review the documentation on LLM capacity management.](/docs/foundry/aip/llm-capacity-management/)

### LLM availability by geography

Some enrollments may have access to a limited set of models because of geographical restriction (or georestriction for short); georestriction for a certain region means that any AIP request to a LLM stays within the boundaries of that region. For example, if an enrollment is defined as EU geo-restricted, all LLM requests will be processed in the EU. Non-georestricted enrollments have access to the full set of Palantir-supported models.

The following table indicates the regional georestriction options for the various models supported by AIP. Note that the regional georestriction refers to the enrollment setup, not to the location of a specific user.

|Model Provider	|Model	|US	|EU	|UK	|CA	|AU	|JP	|KSA	|IL2	|IL4	|IL5	|
|---	|---	|---	|---	|---	|---	|---	|---	|---	|---	|---	|---	|
|xAI	|Grok-4	|✅	|	|	|	|	|	|	|	|	|	|
|xAI	|Grok 4.1 Fast (Reasoning)	|✅	|	|	|	|	|	|	|	|	|	|
|xAI	|Grok 4.1 Fast (Non-Reasoning)	|✅	|	|	|	|	|	|	|	|	|	|
|Bedrock / Vertex / Anthropic	|Claude 4.5 Sonnet	|✅	|✅	|✅	|	|	|✅	|	|	|	|	|
|Bedrock / Vertex / Anthropic	|Claude 4.5 Haiku	|✅	|✅	|✅	|✅	|✅	|✅	|	|	|	|	|
|Bedrock / Vertex / Anthropic	|Claude 4.5 Opus	|✅	|✅	|✅	|	|	|	|	|	|	|	|
|Bedrock / Vertex / Anthropic	|Claude 4.6 Opus	|✅	|✅	|✅	|✅	|	|	|	|	|	|	|
|Bedrock / Vertex / Anthropic	|Claude 4.6 Sonnet	|✅	|✅	|✅	|✅	|✅	|✅	|	|	|	|	|
|Vertex	|Gemini 2.5 Flash Lite	|✅	|✅	|	|	|	|	|	|	|	|	|
|Azure / OpenAI	|GPT-5.1	|✅	|✅	|✅	|	|	|	|	|	|	|	|
|Azure / OpenAI	|GPT-5.1 Codex	|✅	|	|	|	|	|	|	|	|	|	|
|Azure / OpenAI	|GPT-5.1 Codex Max	|✅	|	|	|	|	|	|	|	|	|	|
|Azure / OpenAI	|GPT-5.1 Codex Mini	|✅	|	|	|	|	|	|	|	|	|	|
|Azure / OpenAI	|GPT-5-mini	|✅	|✅	|	|	|	|	|	|	|	|	|
|Azure / OpenAI	|GPT-5-nano	|✅	|✅	|	|	|	|	|	|	|	|	|
|Azure / OpenAI	|GPT-4.1	|✅	|✅	|✅	|	|	|	|	|✅	|✅	|✅	|
|Azure / OpenAI	|GPT-4.1-mini	|✅	|✅	|✅	|✅	|✅	|✅	|	|	|	|	|
|Azure / OpenAI	|GPT-4.1-nano	|✅	|✅	|	|	|	|	|	|	|	|	|
|Azure / OpenAI	|ada002	|✅	|✅	|✅	|✅	|✅	|✅	|	|✅	|✅	|✅	|
|Azure / OpenAI	|embedding3-large	|✅	|✅	|	|	|	|✅	|	|✅	|✅	|✅	|
|Azure / OpenAI	|embedding3-small	|✅	|	|	|✅	|✅	|✅	|	|✅	|✅	|✅	|
|Azure	|o4-mini	|✅	|✅	|	|	|	|	|	|	|	|	|
|Azure	|o3	|✅	|✅	|	|	|	|	|	|	|	|	|
|Bedrock	|Llama4 16B Scout	|✅	|	|	|	|	|	|	|	|	|	|
|Bedrock	|Llama4 128B Maverick	|✅	|	|	|	|	|	|	|	|	|	|
|xAI	|Grok-3	|✅	|	|	|	|	|	|	|	|	|	|
|xAI	|Grok-3 mini	|✅	|	|	|	|	|	|	|	|	|	|
|xAI	|Grok-Code-Fast-1	|✅	|	|	|	|	|	|	|	|	|	|
|xAI	|Grok 4 Fast (Reasoning)	|✅	|	|	|	|	|	|	|	|	|	|
|xAI	|Grok 4 Fast (Non-Reasoning)	|✅	|	|	|	|	|	|	|	|	|	|
|Bedrock / Vertex / Anthropic	|Claude 4.1 Opus	|✅	|✅	|	|	|	|	|	|	|	|	|
|Bedrock / Vertex / Anthropic	|Claude 4 Sonnet	|✅	|✅	|✅	|	|	|	|	|	|	|	|
|Vertex / Anthropic	|Claude 4 Opus	|✅	|✅	|	|	|	|	|	|	|	|	|
|Bedrock / Vertex / Anthropic	|Claude 3.7 Sonnet	|✅	|✅	|✅	|	|	|	|	|✅	|✅	|✅	|
|Bedrock	|Claude 3 Haiku	|✅	|✅	|✅	|	|	|	|	|	|	|	|
|Bedrock	|Claude 3.5 Haiku	|✅	|✅	|	|	|	|	|	|	|	|	|
|Bedrock	|Claude3.5 Sonnet v2	|✅	|✅	|	|	|	|	|	|	|	|	|
|Bedrock	|Claude3.5 Sonnet	|✅	|✅	|	|	|	|	|	|✅	|✅	|✅	|
|Vertex	|Gemini 2.5 Pro	|✅	|✅	|	|	|	|	|	|	|	|	|
|Vertex	|Gemini 2.5 Flash	|✅	|✅	|✅	|	|	|	|	|	|	|	|
|Azure / OpenAI	|GPT-5	|✅	|✅	|	|	|	|	|	|	|	|	|
|Azure / OpenAI	|GPT-5 Codex	|✅	|	|	|	|	|	|	|	|	|	|
|Azure / OpenAI	|GPT-5.2	|✅	|	|	|	|	|	|	|	|	|	|
|Azure / OpenAI	|GPT-5.2 Codex	|✅	|	|	|	|	|	|	|	|	|	|
|Azure / OpenAI	|GPT-5.3 Codex	|✅	|	|	|	|	|	|	|	|	|	|
|Azure / OpenAI	|GPT-5.4	|✅	|	|	|	|	|	|	|	|	|	|
|Azure / OpenAI	|GPT-4o	|✅	|✅	|✅	|✅	|✅	|✅	|	|✅	|✅	|✅	|
|Azure / OpenAI	|GPT-4o-mini	|✅	|✅	|✅	|	|	|✅	|✅	|✅	|✅	|✅	|
|Azure	|o3-mini	|✅	|✅	|	|	|	|	|	|✅	|✅	|✅	|
|Azure	|o1	|✅	|✅	|	|	|	|	|	|	|	|	|
|Open source (Palantir-hosted)	|Llama3.1 8B	|✅	|✅	|✅	|✅	|✅	|✅	|	|✅	|✅	|✅	|
|Open source (Palantir-hosted)	|Llama3.3 70B	|✅	|✅	|✅	|✅	|✅	|✅	|	|✅	|✅	|✅	|
|Open source (Palantir-hosted)	|Llama3.3 Nemotron Super 49b v1.5	|✅	|✅	|✅	|✅	|✅	|✅	|	|✅	|✅	|✅	|
|Open source (Palantir-hosted)	|Llama3.2 NV EmbedQA 1B v2	|✅	|✅	|✅	|✅	|✅	|✅	|	|✅	|✅	|✅	|
|Open source (Palantir-hosted)	|Mixtral 8x7B	|✅	|✅	|✅	|✅	|✅	|✅	|	|✅	|✅	|✅	|
|Open source (Palantir-hosted)	|Document Information Extraction	|✅	|✅	|✅	|✅	|✅	|✅	|	|✅	|✅	|✅	|

## Bring your own model (LLM)

Bring your own model is a capability that provides first-class support for customers that would like to connect their own LLMs or accounts to use in AIP with all Palantir developer products - AIP Logic, Pipeline Builder, Chatbot Studio, Workshop, etc.

Review the [bring your own model](/docs/foundry/aip/bring-your-own-model/) documentation to learn how to register models for use in AIP.

***

Note: AIP feature availability is subject to change and may differ between customers.

*The "OpenAI" name and the “GPT” brands are property of OpenAI.*

All third-party trademarks (including logos and icons) referenced remain the property of their respective owners. No affiliation or endorsement is implied.
