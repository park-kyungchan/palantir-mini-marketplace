---
sourceUrl: "https://www.palantir.com/docs/foundry/notepad/custom-functions/"
canonicalUrl: "https://palantir.com/docs/foundry/notepad/custom-functions/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d28fb0d7fc5f762fe4a349b2ec00ab0e49ae1e84d26c9207a11f6e4a415af1dd"
product: "foundry"
docsArea: "notepad"
locale: "en"
upstreamTitle: "Documentation | Documents > Custom functions"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Custom functions

Custom functions are particularly useful when a workflow requires rich text-formatted inputs, or if a workflow outputs rich text-formatted content. Function inputs can be rich or plain text, and you can choose whether outputs should be rich or plain text as well. Note that your function should accept Markdown if you require rich text inputs.

:::callout{theme="neutral"}
This feature is compatible with functions that take a single string as input, and have an output of type string, Boolean, date, double, float, integer, or long.
:::

## Use custom functions in Notepad

To use custom functions in Notepad, you must first create a function. Functions can be written in TypeScript or Python; refer to the [function documentation](/docs/foundry/functions/overview/) for use cases, supported features and guides on function creation. Once you have created a custom function, follow the steps below to use it in Notepad:

1. In Notepad, open or create a document or document template. Populate the document with content, and select the function input in one of two ways:
   * Manually highlight the relevant content and select **Edit with AIP** in the toolbar.
   * Place your cursor on the relevant content and select **Edit with AIP** in the toolbar. A block-level selection will automatically be made for you.

:::callout{theme="neutral"}
If AIP is not enabled for your enrollment, custom functions in Notepad are still available. Instead of **Edit with AIP**, select **Edit with functions** in the toolbar and disregard step two. <img src="./media/edit_with_functions_button.png" alt="The 'Edit with functions' option in the toolbar" width=600>
:::

2. When your selection is made, a pop-up menu will appear. Choose the **Functions** option to edit the selection with a custom function.
3. In the function pop-up window, select a function and the function's input type. Choose between plain text or Markdown in the **Function input** dropdown menu.

<img src="./media/aip-function-input-format.png" alt="Select the function input format." >

4. Optionally preview the input, and run the function.
5. View the function output, and choose whether the output should be plain text or formatted with [Markdown](/docs/foundry/notepad/markdown-features/). By default, the output type will be the same as the input type.

<img src="./media/aip-function-output-format.png" alt="Select the function output format." >

6. Insert the output into your document by selecting **Replace**.
