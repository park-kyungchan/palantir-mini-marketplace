---
sourceUrl: "https://www.palantir.com/docs/foundry/workshop/widgets-aip-generated-content/"
canonicalUrl: "https://palantir.com/docs/foundry/workshop/widgets-aip-generated-content/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "7355a1aa5961cdb89f5d7697c6787d3ad77ed8be574c87627a0ea76d32c32443"
product: "foundry"
docsArea: "workshop"
locale: "en"
upstreamTitle: "Documentation | AIP widgets > AIP Generated Content"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# AIP Generated Content

The AIP Generated Content widget can display the response from an [AIP Logic](/docs/foundry/logic/overview/) function or visually stream the response from an LLM (similar to the [Stream LLM response into variable event](/docs/foundry/workshop/concepts-events/#stream-llm-response-into-variable)).

![Add the AIP generated content widget to your Workshop page with the available widget options.](/docs/resources/foundry/workshop/aip-generated-content-base.png)

## Configuration options

The AIP Generated Content widget has the following three options for generating a response:

1. **Logic:** This option requires selecting an [AIP Logic](/docs/foundry/logic/overview/) function.

2. **Direct to LLM:** This option enables displaying the response of an LLM in real time within the widget. It has the following configuration options:
   * **Prompt:** The string variable of your prompt.
   * **Clear output when prompt changes:** When enabled, this will clear the AIP Generated Content widget output when the prompt variable changes. This is useful when  the user is directly interacting with the prompt.
   * **Temperature:** The temperature to use with the model, a number between `0` and `1`. Higher values, like `0.8`, will make the output more random, while lower values, like `0.2`, will make the output more focused and deterministic.
   * **Model:** The language model to use. Four OpenAI models are supported: GPT-3, GPT-4, GPT-4 32K, and GPT-4-Turbo.

3. **LLM via prompt function:** This option is the same as **Direct to LLM**, but the prompt is a function instead of a string.

#### Other configuration options

* **Output variable:** The string or object set variable that stores the response.
* **Icon:** The icon to display at the top of the widget; defaults to Palantir's AIP icon.
* **Button label:** The label to use within the button; defaults to "Generate result using AIP".
* **Title:** The title to display in the center of the widget.
* **Loading state message:** The message to display as the response is loading.
* **Show loading spinner:** When enabled, it shows a spinner when loading instead of the loading state message.

The following example shows what the AIP Generated Content widget looks like when displaying a string response:

![The AIP generated content widget displaying a response from logic regarding a flight alert.](/docs/resources/foundry/workshop/aip-generated-content-response.png)
