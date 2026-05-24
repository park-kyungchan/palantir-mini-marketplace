---
sourceUrl: "https://www.palantir.com/docs/foundry/aip/llm-provider-compatible-apis/"
canonicalUrl: "https://palantir.com/docs/foundry/aip/llm-provider-compatible-apis/"
sourceLastmod: "2026-05-12T17:06:26.146Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "479bf764332cd7f9af4b9af7ac16861a209d2e64fffb236772dc801983e8b4ad"
product: "foundry"
docsArea: "aip"
locale: "en"
upstreamTitle: "Documentation | AI Platform (AIP) > LLM-provider compatible APIs"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# LLM-provider compatible APIs

:::callout{title="Prerequisites" theme="neutral"}
To use Palantir-provided language models, [AIP must first be enabled on your enrollment](/docs/foundry/aip/enable-aip-features/). You must also have permissions to use [AIP builder capabilities](/docs/foundry/aip/aip-features/#aip-applications-and-builder-capabilities).
:::

Foundry provides proxy endpoints for popular LLM providers, accepting requests in the same format as the providers' native APIs. This enables use of open-source SDKs and tooling while benefiting from Foundry capabilities such as rate limiting, data governance, and usage tracking.

The currently supported provider APIs and corresponding Foundry endpoints are as follows:

* **[Anthropic messages ↗](/docs/foundry/api/v2/llm-apis/models/anthropic-messages-proxy):** `/api/v2/llm/proxy/anthropic/v1/messages`
* **[OpenAI chat completions ↗](/docs/foundry/api/v2/llm-apis/models/openai-chat-completions-proxy):** `/api/v2/llm/proxy/openai/v1/chat/completions`
* **[OpenAI responses ↗](/docs/foundry/api/v2/llm-apis/models/openai-responses-proxy):** `/api/v2/llm/proxy/openai/v1/responses`
* **[OpenAI embeddings ↗](/docs/foundry/api/v2/llm-apis/models/openai-embeddings-proxy):** `/api/v2/llm/proxy/openai/v1/embeddings`
* `[Beta]` **[xAI chat completions ↗](https://docs.x.ai/developers/rest-api-reference/inference/chat#chat-completions):** `/api/v2/llm/proxy/xai/v1/chat/completions`
* `[Beta]` **[xAI responses ↗](https://docs.x.ai/developers/rest-api-reference/inference/chat#create-new-response):** `/api/v2/llm/proxy/xai/v1/responses`
* `[Beta]` **[Google generateContent ↗](https://ai.google.dev/api/generate-content#method:-models.generatecontent):** `/api/v2/llm/proxy/google/v1/models/{model}:generateContent`
* `[Beta]` **[Google streamGenerateContent ↗](https://ai.google.dev/api/generate-content#method:-models.streamgeneratecontent):** `/api/v2/llm/proxy/google/v1/models/{model}:streamGenerateContent?alt=sse`

:::callout{theme="warning" title="Beta endpoints"}
The xAI and Google (Gemini) endpoints are currently in beta and actively being developed. Not all features or fields may be supported yet.
:::

:::callout{theme="neutral"}
The Google `streamGenerateContent` endpoint currently only supports the SSE response format. The query param `alt=sse` must be provided.
:::

## Request shapes

Authentication is sent using the following bearer token header:

```
Authorization: Bearer {FOUNDRY_TOKEN}
```

Requests to these endpoints should have the same shape as the corresponding provider endpoint. Refer to the provider’s documentation for the expected request format.

:::callout{theme="neutral"}
Some providers, for example, Anthropic, use a non-standard authentication header. When using their SDKs, you may need to configure the authentication method to use a bearer token instead. Providers that already use bearer token authentication, such as OpenAI, require no special configuration.
:::

## AIP integration and data governance

These endpoints enforce the same data governance as other AIP usage, such as zero data retention (ZDR) and georestriction requirements. We selectively enable provider API features that are compatible with these requirements.

Only models and providers that have been enabled on your enrollment will be available through these endpoints. For models served by multiple providers, requests will only be routed to enabled providers. Endpoint usage is visible in the Resource Management application, and is subject to rate limiting.
