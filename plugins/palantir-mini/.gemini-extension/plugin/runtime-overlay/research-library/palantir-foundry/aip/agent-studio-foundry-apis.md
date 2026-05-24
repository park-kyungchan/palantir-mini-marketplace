---
source: https://www.palantir.com/docs/foundry/agent-studio/foundry-apis/
fetched: 2026-04-20
section: aip-stack
doc_title: Use AIP Agents through Foundry APIs
---

Use AIP Agents through Foundry APIs
===================================

To build applications on top of the Foundry platform, you can embed agents into your applications using the [Palantir APIs](/docs/foundry/api/v2/aip-agents-v2-resources/sessions/create-session).

What can I do with the APIs?
----------------------------

Easily build multi-shot interactions with your agents over the API, using its options to:

* Start new conversations for a given task or context by [creating](/docs/foundry/api/v2/aip-agents-v2-resources/sessions/create-session) a new session with your agent.
* Orchestrate complex back-and-forth task prompts with the [streaming](/docs/foundry/api/v2/aip-agents-v2-resources/sessions/streaming-continue-session) or [blocking](/docs/foundry/api/v2/aip-agents-v2-resources/sessions/blocking-continue-session) APIs, with built-in state management to track these updates to your sessions for you.
* Provide custom application inputs to the agent through the options for application state in the API. These use the `parameter` previously used in Agent Studio, now available as Application state/variables. Use the `parameterInputs` field in requests to provide inputs. Use the `parameterUpdates` field for blocking responses (or load the session exchange after streaming) to read custom outputs.

For straightforward, single-use tasks that do not need extensive session management, consider using [agents as functions](/docs/foundry/agent-studio/agents-as-functions/).

Deploy an AIP Agent to a Developer Console application
------------------------------------------------------

Once you have configured and published your AIP Agent, you can create and configure a Developer Console application to interact with your AIP Agent in a custom application.

To enable your Developer Console application to interact with your AIP Agent using platform APIs, follow the steps in create a new Developer Console application to create a new SDK application with access to Platform SDK resources:

To use an AIP Agent from an Ontology SDK application, you must configure the AIP Agent to only use object types, action types or function types from a single Ontology.

1. On the **Resources** page, select the Ontology used by your AIP Agent, then select all object types, action types and function types used in your AIP Agent configuration.
2. Next, select the **Platform SDK** tab. Under **Projects access**, add the project containing your AIP Agent.
3. If your AIP Agent is configured to use any other filesystem resources, such as a media set for document context, ensure these are in the same project as your AIP Agent, or add all additional projects for these resources to the **Projects access** section.
4. Finally, enable operations for the **AIP Agents API** in the **Client allowed operations** table.

To allow your Developer Console application to create and send messages in conversation sessions with an AIP Agent, you must enable the **AIP Agents write permission**.

### Update an AIP Agent used in Developer Console applications

Once you have configured a Developer Console application to allow interaction with an AIP Agent through **Platform SDK** resources, you will need to update the application if any of the Ontology or platform resources used by your AIP Agent are modified.

### Create conversations with AIP Agents in custom applications

Once you have created your application, use the Create Session platform API to create a new conversation with your AIP Agent.

The **Sessions** APIs for AIP Agents require you to specify the `agentRid` for the AIP Agent to use for conversation session interactions.

Once you have created a new session, use the `sessionRid` value in the returned response to send a new message to the AIP Agent and get responses using the `Blocking continue session` or `Streaming continue session` platform APIs.

You can use the `Get Session Trace` API to retrieve the sequence of steps taken by the AIP Agent, which can be useful for debugging or understanding the agent's reasoning process. The endpoint requires a `sessionTraceId` which you can obtain in two ways:

* For new exchanges: Generate a random UUIDv4 to use as the `sessionTraceId` in the request to the Blocking or Streaming continue session APIs.
* For existing exchanges: Inspect the `sessionTraceId` field on the exchange results in the response from the `Get Content` API.
