---
sourceUrl: "https://www.palantir.com/docs/foundry/threads/getting-started/"
canonicalUrl: "https://palantir.com/docs/foundry/threads/getting-started/"
sourceLastmod: "2026-05-12T17:06:26.147Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d5845e9526e883bf24ee6878b8b5989ad494fc982c33066680bd1721d93a1b5c"
product: "foundry"
docsArea: "threads"
locale: "en"
upstreamTitle: "Documentation | AIP Threads > Getting started"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Getting started

This tutorial guides you through a simple workflow to upload a document, interact with the document, and interact with an AIP Chatbot.

## Access AIP Threads

AIP Threads can be accessed from the platform’s workspace navigation bar or by using the quick search shortcuts `CMD + J` (macOS) or `CTRL + J` (Windows).

## Application interface

The AIP Threads interface can be divided into two main components, numbered left-to-right in the notional screenshot below:

1. [Threads navigation](#basic-navigation)
2. [Thread interaction interface](#interact-with-documents)

![AIP Threads user interface, highlighting the thread navigation and the thread conversation elements.](/docs/resources/foundry/threads/threads-ui.png)

## Workflow overview

In a typical AIP Threads workflow, you can begin by [**selecting a previous conversation or starting a new one**](#basic-navigation) on the left panel (1), then using the right panel (2) to interact with documents or AIP Chatbots. To talk to an AIP Chatbot, simply select one from the [Thread configuration dropdown menu](#aip-chatbot-mode) (A) and begin interacting (C). To interact with documents, [upload](#upload-a-document) and [select documents](#interact-with-documents) in the **Document card** (B) then begin interacting (C).

## Left panel

The following section will discuss features configurable in the left panel.

### Basic navigation

You can create a new thread, select from existing threads, and delete threads.

### Dark mode

You can adjust the visual settings using the option under the thread history.

![Screenshot of AIP Threads in dark mode.](/docs/resources/foundry/threads/dark-mode.png)

### Minimize left panel

You can minimize the left panel with the following button.

![A screenshot of AIP Threads, indicating how to minimize the left panel.](/docs/resources/foundry/threads/minimize-history.png)

### Download

You can download the contents of a conversation (as JSON or PDF) using the **Export** option.

![A screenshot of AIP Threads, indicating how to minimize the left panel.](/docs/resources/foundry/threads/download-thread.png)

## Upload a document

AIP Threads currently supports native (non-scanned) PDF documents.

To upload a document, follow the **Upload** option in the **Documents** card.

![Screenshot of AIP Threads, highlighting the 'Upload documents' option in the top-right and the 'Upload documents to AIP Threads' option in the document card.](/docs/resources/foundry/threads/upload-documents.png)

After choosing a media set for the document storage location, drag and drop the documents to be processed.

![Showing upload document dialog with ability to select location, media set name, ontology, and PDFs.](/docs/resources/foundry/threads/upload-dialog.png)

## Interact with documents

Add documents to the context of a thread using the **Select documents** option to access the document selection dialog.

![Add documents to your Thread's context by 'Selecting documents' or adding recently uploaded documents.](/docs/resources/foundry/threads/upload-documents.png)

You may now start the thread by asking questions of the documents.

![A question answered with citations.](/docs/resources/foundry/threads/citation.png)

### Document modes

AIP Threads has two document modes: **full document text** and **relevant document chunks** (beta). Full document text extracts the entire text from the document, while relevant document chunks extract only the most semantically relevant chunks.

Full document text is useful for short and concise documents or when you need the LLM to review the entire content. For larger documents or when you need to focus on specific sections or details, relevant document chunks mode is more efficient. Keep in mind that using full document text may lead to context window limitations. To avoid exceeding the context capacity for the LLM, switch to relevant document chunks mode.

:::callout{theme="neutral"}
When using the relevant document chunks mode, the chunking strategy by default uses 4096 characters per chunk (~1024 tokens), 512 character chunk overlap (~128 tokens), and [Text embedding ada-002](/docs/foundry/aip/supported-llms/#available-text-embedding-models) as the embedding model. Enrollments that do not have access to the ada-002 model can use a different embedding model.
:::

![The two document modes available in AIP Threads](/docs/resources/foundry/threads/document-modes.png)

### Citations

The model has been instructed to provide citations to the original documents with each answer, and users should verify the responses of the LLM. The citations should point to the corresponding page number in the PDF document indicating where the information was sourced.

![Citation scrolled to page of interest.](/docs/resources/foundry/threads/document-preview-from-citation.png)

If you would like to change the documents in the context for a thread, either create a new thread and reselect the documents of interest or select **Start new thread with current configuration**, accessible from the [model dropdown menu](#model-mode) defined later on this page.

![Create a new thread and reselect the documents of interest or select 'Start new thread with current configuration'.](/docs/resources/foundry/threads/new-thread.png)

## Thread configuration

The following section outlines the different configuration options available.

### Model mode

Users can select the LLM used to interact with documents. The models available to you are a subset of those [enabled on your enrollment](/docs/foundry/aip/supported-llms/#llm-availability-prerequisites).

Users can modify the system prompt, which is an instruction for an LLM written in natural language. If you would like to modify the system prompt, keep in mind that a LLM only has access to the data that you specifically make available to it. In the case of the default AIP Threads experience, this would be just the documents you have added to the thread. This is different from [AIP Chatbot Mode](#aip-chatbot-mode).

Users can modify the model temperature to determine the balance between a more focused, deterministic output (default value `0`) and a more random output (maximum value `1`).

![How to change model details.](/docs/resources/foundry/threads/aip-chatbot-model-dropdown.png)

#### Upgrade a Thread configuration to an AIP Chatbot

If you find that a particular document or set of documents or configuration of the model and prompting is valuable enough to use again or to share with another user, you may upgrade the thread configuration to an [AIP Chatbot](/docs/foundry/chatbot-studio/core-concepts/) by using the option available in the model configuration dropdown menu.

![Upgrade thread configuration to a chatbot by selecting 'Upgrade to an AIP Chatbot.](/docs/resources/foundry/threads/upgrade-to-chatbot.png)

This will take you to AIP Chatbot Studio where you can [complete the configuration of the chatbot](/docs/foundry/chatbot-studio/getting-started/#create-an-aip-chatbot). Upon publishing in AIP Chatbot Studio and refreshing AIP Threads, you will be able to interact with it again in AIP Threads.

### AIP Chatbot Mode

To select an [AIP Chatbot](/docs/foundry/chatbot-studio/core-concepts/#aip-chatbots) to interact with, use the dropdown menu.

![How to select a chatbot.](/docs/resources/foundry/threads/chatbot-dropdown.png)

![A chatbot selected.](/docs/resources/foundry/threads/different-agent-threads.png)

To make a particular chatbot one of your default options to use when starting a new thread, set a chatbot as default.

![A chatbot pinned as a default for new threads.](/docs/resources/foundry/threads/pinned-chatbot-selection.png)
