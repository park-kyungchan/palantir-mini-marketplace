---
source: https://www.palantir.com/docs/foundry/agent-studio/application-state/
fetched: 2026-04-20
section: aip-stack
doc_title: Application state
---

Application state
=================

The application state of an AIP Agent was previously called *parameters*.

You can configure multiple string or object set application variables on an AIP Agent to configure the **application state**. When an AIP Agent with application variables is embedded in the [AIP Agent widget](/docs/foundry/workshop/widgets-aip-agent/) in Workshop, the list of variables will appear. You can then map each application variable to a [Workshop variable](/docs/foundry/workshop/concepts-variables/) of the corresponding type to show outputs in other widgets.

Configure application state in AIP Agent Studio
-----------------------------------------------

When setting up the application state of an AIP Agent, configure the following:

* **Identify application variables:** Identify which object set or string variables the LLM should interact with. These can be new variables that the LLM writes results to, or they might already exist in your workflow, such as a variable representing the user's current selection.
* **Name and describe the variable:** For each variable, write a description that explains its role. This description will be injected into the agent's prompt, providing the LLM with context on when to use a given variable.
* **Set value visibility:** You can choose whether agents can see values by setting value visibility. We recommend only allowing the LLM to read values when necessary to decrease confusion. For example, if you use an object set variable as an input for [Ontology context](/docs/foundry/agent-studio/retrieval-context/#ontology-context), the variable does not need to be visible to the LLM; the relevant contents of the object set value will be in the system prompt in each loop. However, if you have a string variable that contains a dynamic part of your system prompt, the variable *must* be set to visible so the LLM can read the contents of the variable.
* **Add variables as inputs:** You can choose to configure variables as inputs for Ontology retrieval context, allowing a deterministic input for a semantic search or a full object set given to the LLM. Additionally, function-backed context can receive a number of input variables to allow for stateful information to be included when running the function. The [**Object query** tool](/docs/foundry/agent-studio/tools/#types-of-tools) can also take in an initial object set variable per object type to provide a starting point for the LLM to apply additional filters or aggregations.

Application state can also be referenced in the user-defined **System prompt** by using the slash command `/` on your keyboard.

Application state can be tested using the **Debug application state** section. You can manually override the values of each variable, and the debug section will provide visual feedback when the agent updates a variable value.

Update application variables with agents
----------------------------------------

The application variables you configure can be modified through agent [tools](/docs/foundry/agent-studio/tools/) or the [retrieval context](/docs/foundry/agent-studio/retrieval-context/) added to the application state configuration. Variables can either be updated deterministically from the output of a tool or context or non-deterministically through the **Update application variable** tool.

### Automatic variable updates

Variables can be configured to deterministically update with values output from the **Object query** tool, function-backed context, or Ontology context. After each execution of the context or tool, Agent Studio will record the latest output and update the mapped application variable to the output value when the LLM finishes streaming. We recommend applying deterministic updates rather than non-deterministic updates to avoid LLM confusion. In some cases, you may want to completely hide the variable value from the LLM.

### Deterministic tool inputs

The **Action** and **Function** [tools](/docs/foundry/agent-studio/tools/) can be configured to use inputs from application variables instead of generating inputs dynamically through the LLM. This feature allows you to pass predetermined values directly to tools, improving consistency and reducing token usage.

Note that this feature only supports string and object set input types. The values passed are pinned to the initial value of the variables at the start of the reasoning loop, meaning that updates from previous tool calls in the same query will not be reflected in the values passed as deterministic inputs.

### Update variables with an LLM

If you want an LLM to configure a new variable to update, or conditionally apply an update based on the current user query, add the **Update application variable** tool. This tool supports a list of variables that the LLM can update.

### Variables as citations

You can also configure an object set variable to update when a citation is selected by the user. The configured object set variable will update with a static object set containing the cited object.

Configuration in Workshop
-------------------------

If an AIP Agent has been configured with an application state, you can configure the agent's application variables in Workshop. Review the [AIP Agent widget](/docs/foundry/workshop/widgets-aip-agent/#configure-the-aip-agent) documentation for more information.
