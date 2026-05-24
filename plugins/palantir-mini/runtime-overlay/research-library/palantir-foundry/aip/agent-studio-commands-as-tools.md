---
source: https://www.palantir.com/docs/foundry/agent-studio/commands-as-tools/
fetched: 2026-04-20
section: aip-stack
doc_title: Use commands as tools in AIP Agent Studio
---

Use commands as tools in AIP Agent Studio
=========================================

You can add [commands](/docs/foundry/cross-app-interactivity/commands-overview/) as [tools to AIP agents](/docs/foundry/agent-studio/tools/), enabling the agent to interact with and act on behalf of a user in Palantir applications. Commands run directly in the user's application, giving them access to the current application state and screen. This enables integrations that traditional backend tools struggle to support. For example, the agent can use commands to navigate the user interface, like setting the view to a specific location on a map.

Add command tools to an AIP Agent
---------------------------------

Agents can use commands as tools once an application declares and produces the command. To add commands as tools to an agent, select **Add tool > Commands** from the **Agent configuration** panel.

Search for and select one or multiple commands from the **Search commands...** modal. You can select a command multiple times if you need to configure distinct prompts for each instance of that command. Add the selected commands to your agent and apply configurations as needed.

AIP Agents that use commands as tools have a retention window that is automatically set to expire after 24 hours of inactivity.

Configure command tools [Beta]
------------------------------

After you add one or multiple commands as tools to your agent, you can select a command to open a modal with additional configurations the agent uses to inform its actions.

### Additional descriptions

Provide command-specific context *in addition to* the default documentation made available to help the agent's backing model understand the action it will execute. While each command contains default documentation that helps the agent use it as a tool, you can provide more detail in **Additional documentation** to help the agent decide precisely *when* and *how* it should call the tool.

### Input parameters

Some commands accept input parameters when you configure them as a tool. Use **Input parameters** to set input values for command parameters.

By default, the agent determines the value of all required parameters based on your **Instructions** and the user's prompt. For optional parameters, the agent may optionally determine the value based on your **Instructions** and the user's prompt.

To override the default behavior, select **Add parameter override**, choose the parameter you want to override, and configure it using one of the following override options:

* **Agent decides (default):** The agent determines the value. This is the default behavior.
* **Preset values:** Hard-code a static value to consistently use the same value as an input parameter.
* **Application variable:** Use a preconfigured string or object set variable.
* **Don't pass the parameter to agent:** Instruct the agent not to provide a value for an optional parameter. This option is available for optional parameters only.

### Asks for user approval before execution

Enabled by default, your agent will ask a user to review the command payload data and either **Reject** or **Approve** the command's action or output from their prompt before the command is executed. When disabled, your agent will execute commands based on a user's prompt without manual approval intervention.

Test an AIP Agent's ability to use commands as tools
----------------------------------------------------

After you configure your commands in AIP Agent Studio, you can follow the instructions below to test your agent and validate its configurations *before* you save and publish:

1. In a separate browser window, open the application that produces your agent's command tool(s) and arrange it next to a window containing your agent in AIP Agent Studio.
2. Select **Choose an app to pair with... > Pair** for the application launched in the separate browser window, such as a Gaia map.
3. Enter prompts in your agent's chat input window to test its ability to use the commands you added as tools.

Pair your agent with multiple applications
------------------------------------------

Through App Pairing, your agent will automatically discover other applications you have open in your browser. To pair your agent with multiple application instances, select **Add** next to the **Discovered** application to create a pairing **Group**.

If your agent is not paired with an application to execute a command, then it will prompt the user to select an application to pair.

Embed your agent in AIP Assist or Workshop
------------------------------------------

While you can use AIP Agent Studio with your paired application to test your agent's performance, you should embed the agent in a Workshop module or AIP Assist panel for a streamlined user experience. In both cases, the agent will automatically pair to the application with which it interacts.

### Publish your agent to AIP Assist

To make your agent accessible to AIP Assist, choose the rocket icon on the left side of your screen in AIP Agent Studio to launch the **Usage** panel before selecting the **AIP Assist** toggle. Next, select **Publish** on the top right of your screen.

### Add your agent to Workshop

Use Workshop's [AIP Agent](/docs/foundry/workshop/widgets-aip-agent/) widget to embed your agent in a module, where you can also use the [Iframe](/docs/foundry/workshop/widgets-iframe/) widget to embed one or more applications within sections adjacent to the AIP Agent widget. An AIP Agent widget and an iframe-embedded application in a Workshop module will automatically pair, and all relevant commands you configure as tools will target the iframe-embedded application.
