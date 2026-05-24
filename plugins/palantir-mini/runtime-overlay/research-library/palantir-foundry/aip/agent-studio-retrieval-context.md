---
source: https://www.palantir.com/docs/foundry/agent-studio/retrieval-context/
fetched: 2026-04-20
section: aip-stack
doc_title: Retrieval context
---

Retrieval context
=================

AIP Agents can have retrieval context configured. Retrieval context is deterministically run with **every** new user message and the retrieved information is passed into the LLM.

You may configure your agent with any number of the following retrieval context types:

* [Ontology context](#ontology-context)
* [Document context](#document-context)
* [Function-backed context](#function-backed-context)

Ontology context
----------------

Ontology context provides your agent with context from objects within the Ontology. You can either supply a fixed set of *N* objects or perform a semantic search to identify the *K* most relevant objects to a user query, provided that your object type has a vector embedding property.

When configuring Ontology context, you can choose the starting object set to be either a **Static input**, which includes the full object type, or a **Variable input**, which may consist of a filtered object set passed in as an application state variable.

You can also configure a list of object properties that determines which properties are printed and passed to the LLM as context for each retrieved object. By default, all properties are selected, excluding those that cannot be printed (such as a media reference or a vector embedding).

Additionally, you can integrate Ontology context with your application state by configuring variables for the object set output and citation variable output.

Document context
----------------

Document context allows users to include relevant text from documents with each message sent to the LLM. Documents can be selected and included in the configuration of an AIP Agent in the same way they are added to a conversation in [AIP Threads](/docs/foundry/threads/getting-started/#interact-with-documents).

There are two modes for providing document context:

1. **Full document text mode:** This mode gives the entire text content of the document to the LLM to be used as context.
2. **Relevant chunks mode:** This mode performs a semantic search over the documents to return the *K* most relevant chunks to the LLM as context.

Function-backed context
-----------------------

Function-backed context enables users to perform their own retrieval on each query. This is ideal for situations where the retrieval methods provided out-of-the-box via Ontology context or document context do not satisfy a given use case. For example, if a user wanted to combine different retrieval methods, like keyword search and semantic search, then they would write a function to do that since it is not currently supported in Agent Studio.

Users can write these functions in TypeScript in [Code Repositories](/docs/foundry/code-repositories/overview/). To do so, navigate to a TypeScript repository and import the `AipAgentsContextRetrieval` function interface.

Then, write a function that satisfies the interface as shown below. Note that the function must have `messages` as the only required input in order to satisfy the contract.

```typescript
@AipAgentsContextRetrieval()
public exampleRetrievalFunction(messages: MessageList): RetrievedContext {
    let combinedText: string[] = [];
    messages.forEach((message) => {
        ...
    })
    return {
        retrievedPrompt: "..."
    }
}
```

The retrieval function must output a `retrievedPrompt` string, which will be pasted into the LLM system prompt by AIP Agents to answer user queries.

After publishing your function, choose **Function-backed context** in Agent Studio under the **Retrieval context** panel to select a function for retrieval.

### Application variables in retrieval functions

Retrieval functions can also take in the values of [application variables](/docs/foundry/agent-studio/application-state/) on the agent as input. To configure this, add optional arguments to the function definition. Currently, only string and object set application variables are supported, so the function input must be one of these types.

```typescript
@AipAgentsContextRetrieval()
public movieRetrievalFunction(messages: MessageList, movieTitle?: string, movieSet?: ObjectSet<Movie>): RetrievedContext {
    ...
}
```

Use the API name for object types. This can be found in Ontology Manager. You can then configure a mapping between the application variables on the agent and the function inputs that match their respective types.

### Write retrieval functions in AIP Logic

Users will soon be able to write these functions in AIP Logic, which offers a walk-up usable interface for developing no-code LLM-powered functions.

### Custom citations

The AIP Agent interface will render citation bubbles if the LLM responds with citations in a specific XML format. With function-backed context, users can render these citations by having their function return a string that prompts the LLM to write citations in this given format. Refer to [citation formats](/docs/foundry/agent-studio/citations/#citation-formats) for the list of provided formats.
