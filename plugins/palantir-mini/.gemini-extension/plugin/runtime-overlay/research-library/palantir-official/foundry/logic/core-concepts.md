---
sourceUrl: "https://www.palantir.com/docs/foundry/logic/core-concepts/"
canonicalUrl: "https://palantir.com/docs/foundry/logic/core-concepts/"
sourceLastmod: "2026-05-12T17:06:26.146Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "2fd80607a2f9a800df9573ddb42f5dda022277bd1ae9905e93d4204c94e71de4"
product: "foundry"
docsArea: "logic"
locale: "en"
upstreamTitle: "Documentation | AIP Logic > Core concepts"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Core concepts

The following core concepts are essential to understanding and getting the most out of AIP Logic. You can learn more about applying these concepts in the [getting started](/docs/foundry/logic/getting-started/) tutorial.

## Logic function

A Logic function takes inputs like Ontology objects or text strings, and returns an output that can be a value (such as a string), an object, or an edit to the Ontology itself.

Logic functions can be leveraged and used like any other function in the platform, such as in Workshop modules. To edit the Ontology, Logic functions must be published and called from an action. For more information, see how to [use a Logic function](/docs/foundry/logic/getting-started/#use-a-logic-function) in an action.

## Blocks

Logic functions are composed of [blocks](/docs/foundry/logic/blocks/). Blocks have many different purposes, such as reading or writing to the Ontology, performing a calculation, aggregating data, calling other functions, or interacting with an LLM. The output of a block can be used in subsequent blocks, enabling complex operations to be constructed by chaining blocks together.

## Evaluations

After publishing a Logic function, you can configure [Evaluations](/docs/foundry/aip-evals/overview/), which enable you to write detailed tests for your Logic functions. Evaluations for AIP Logic can be used to:

* Debug and improve Logic functions and prompts.
* Compare different models, like GPT-4 vs. GPT-3.5 on your functions.
* Examine variance across multiple runs of Logic functions.

## Debugging

After composing a Logic function, you can run the function as a test. Running your function will open the **Debugger** panel, showing the LLM chain-of-thought (CoT) for the component blocks in the Logic function. Examining the LLM's CoT makes debugging easier by showing each individual step of the LLM’s "thought process" and providing information on any supporting tools used by the LLM.
