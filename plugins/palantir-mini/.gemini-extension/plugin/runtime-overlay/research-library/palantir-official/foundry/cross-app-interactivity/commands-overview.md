---
sourceUrl: "https://www.palantir.com/docs/foundry/cross-app-interactivity/commands-overview/"
canonicalUrl: "https://palantir.com/docs/foundry/cross-app-interactivity/commands-overview/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "801951cbb1c6cc753e49c95e219d866b1608afbc239cd3ffd58dc9c435ca181c"
product: "foundry"
docsArea: "cross-app-interactivity"
locale: "en"
upstreamTitle: "Documentation | Commands > Overview"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Commands

Commands are a pro-code language that enable a Palantir application to declare client-side operations executable by the application itself, other Palantir applications, workspace components, or [AIP Chatbots](/docs/foundry/chatbot-studio/getting-started/). Developed from the principle that builders should be able to configure commands for use across Palantir applications which safely automate manual application tasks and actions, commands provide both users and LLMs with a shared language for client-side interactions.

By adding one or multiple commands to a [Workshop module](/docs/foundry/workshop/overview/), you can configure and execute operations in other Palantir platform applications you [embed as a widget](/docs/foundry/workshop/widgets-embed-foundry-apps/). Additionally, you can use commands:

* As [tools in AIP Chatbot Studio](/docs/foundry/chatbot-studio/commands-as-tools/) to create [AIP Chatbots](/docs/foundry/chatbot-studio/overview/) that read from and write to any application that interoperates with commands.
* Inline as part of a [Notepad document](/docs/foundry/notepad/widgets-command/).

![A Workshop module displays an embedded Gaia map with commands enabling a user to draw, remove, and render map annotations, such as a polygon.](/docs/resources/foundry/cross-app-interactivity/commands-overview.png)

You can trigger commands in Workshop through three existing widgets:

* [**Button Group**](/docs/foundry/workshop/widgets-button-group/), by configuring a button that triggers a command **On click**.

![The On click menu in a button's configuration panel displays the command option.](/docs/resources/foundry/cross-app-interactivity/trigger-command-on-click-button.png)

* [**Metric card**](/docs/foundry/workshop/widgets-app-pairing/), by configuring an interactive metric that triggers a command.

![The interactive metric menu in a metric card's configuration panel displays the command option.](/docs/resources/foundry/cross-app-interactivity/trigger-command-on-metric-click.png)

* [**App Pairing**](/docs/foundry/workshop/widgets-app-pairing/), by adding a command trigger based on a variable updating in your application.

![The Add command trigger button in the App Pairing widget's configuration menu is displayed.](/docs/resources/foundry/cross-app-interactivity/trigger-command-on-variable-update.png)

Follow the instructions below to configure a command using [Button Group](#use-the-button-group-widget-to-configure-a-command), [Metric Card](#use-the-metric-card-widget-to-configure-a-command), or [App Pairing](#use-the-app-pairing-widget-to-configure-a-command) widgets.

## Use the Button Group widget to configure a command

Navigate to your Workshop module and add the Button Group widget to launch the [**Widget setup** panel](/docs/foundry/workshop/widgets-button-group/#widget-configuration-options) on the right side of your screen. Follow the instructions below to configure buttons that trigger a command:

1. Select **Button 1** from the **Button configuration** section of the **Widget setup** panel.
2. Enter a display name for your button in the **Text** input box.
3. Optionally configure your button's **Color**, **Left icon**, and **Right icon**.

:::callout{theme="neutral"}
If a command has an associated icon, then Workshop automatically populates the **Color** and icon options with that association by default.
:::

4. Write a description that will render as a tooltip when a user hovers over your button in Workshop.

![The Widget setup panel in a button's configuration window is displayed.](/docs/resources/foundry/cross-app-interactivity/command-button-configuration.png)

:::callout{theme="neutral"}
You can toggle on **Conditional visibility** and configure a **Boolean variable** which, when satisfied, will disable the command or hide it from a user's view.
:::

5. Choose **command** within the **On click** dropdown menu.
6. Select **Add command > Browse all commands...** to launch the **Select a command...** pop-up window.

![The Select a command... pop-up window displays all commands available in Workshop.](/docs/resources/foundry/cross-app-interactivity/browse-all-commands-dialog.png)

7. Search for and **Select** a command to configure, such as **Draw polygon**. Once selected, you can view the command's usage documentation in the right panel.

![The Documentation panel on the pop-up shows detailed information about the selected command.](/docs/resources/foundry/cross-app-interactivity/browse-command-dialog-documentation.png)

8. Add optional shape styling parameters from the **Parameters defaults** section, such as **Fill color** and **Fill pattern**.

![The Parameters defaults section of the Widget setup panel is displayed.](/docs/resources/foundry/cross-app-interactivity/command-button-configure-style-parameters.png)

9. Optionally, change the default state in the **Specify target app** section from **Paired app**; select **New map** if you want the command to execute on a new Gaia map or **Open existing map...** to add the shape to an existing map. You can use the default if you paired your Workshop with another application using the [App Pairing widget](/docs/foundry/cross-app-interactivity/app-pairing/).

:::callout{theme="neutral"}
By default, a command targets the **Paired app**. If your Workshop contains more than one paired application, then it will prompt you to select an application when you execute the command.
:::

![The Specify target app button configuration options are displayed.](/docs/resources/foundry/cross-app-interactivity/command-button-specify-target-app.png)

10. Optionally, map the command's output to a new or existing [variable](/docs/foundry/workshop/concepts-variables/) in your Workshop module.

### Create a command chain

You can chain multiple commands together by selecting **Add command** beneath **Output variables**. Chained commands execute in the order you add them to your Workshop module, enabling you to pass the output from one command as the input to another.

:::callout{theme="neutral"}
To create a valid command chain, all commands must derive from the same source application, such as Gaia or Graph. If a command fails, then chain execution continues with the next command in order.
:::

Use the **Prompt command input dialog** section of the **Widget setup** panel to configure user prompts to review or enter command inputs based on the following conditions:

* **Always prompt:** Always show the commands form pop-up window, enabling users to verify and edit its input values whenever they execute the command.
* **Never prompt, skip if missing required inputs:** Never show the commands form pop-up window, even if user inputs are invalid. If inputs are invalid, then Workshop skips the command and moves to the next in the chain. This is the default behavior for command chains you configure using the App Pairing widget.
* **Prompt missing any inputs:** Show the commands form pop-up window when any inputs are missing, required or optional.
* **Only prompt when missing required inputs:** Show the commands form pop-up window when any required inputs are missing. This is the default behavior for command chains you configure using the Button Group widget.

![The Prompt command input dialog menu and its options are displayed.](/docs/resources/foundry/cross-app-interactivity/prompt-command-input-dialog-menu.png)

Whether you configure one command or create a command chain, you can use the **On completion of command(s)** section to trigger an [action](/docs/foundry/action-types/overview/) or [event](/docs/foundry/workshop/concepts-events/) when a command completes. Commands trigger immediately after the triggering variable changes. To avoid sending stale data, configure a **Listener** for the derived variable directly. When you finish, select **Save and publish** from the top of your screen to save your changes to Workshop.

## Use the Metric Card widget to configure a command

Navigate to your Workshop module and add the Metric Card widget to open the [**Widget setup** panel](/docs/foundry/workshop/widgets-metric-card/#configuration-options) on the right side of your screen. Follow the instructions below to configure an interactive metric card that triggers a command when selected:

1. Select **Metric 1** from the **Metric configuration** section of the **Widget setup** panel.
2. Choose **Command** within the **Interactive metric** dropdown menu.
3. [Follow steps 6-10 from the Button Group widget instructions](#use-the-button-group-widget-to-configure-a-command) to select and configure your command.

The command triggers when a user selects the interactive metric. You can also create [command chains](#create-a-command-chain) and configure completion actions following the same process described in the [Button Group widget section](#use-the-button-group-widget-to-configure-a-command).

## Use the App Pairing widget to configure a command

You can configure the App Pairing widget to trigger one or multiple commands when a variable in your Workshop module updates. When editing your Workshop module, select your existing App Pairing widget to launch the **Widget setup** panel on the right side of your screen. Follow the instructions below to configure the trigger which executes a command or instantiates a chain of commands:

1. Select **Add command trigger** from the **Trigger commands on variable update** section of the **Widget setup panel**.
2. Set a **Listener** to identify the variable that, when changed, triggers your command.
3. Optionally add a **Conditional trigger** based on a new or existing Boolean variable. Workshop will skip command execution if the variable's value is `false`.

![The command trigger configuration window in the App Pairing widget is displayed.](/docs/resources/foundry/cross-app-interactivity/app-pairing-command-trigger-configuration.png)

With your command trigger identified, select **Add command** and [follow the same instructions for the Budget Group widget](#use-the-button-group-widget-to-configure-a-command) to create one or multiple commands in the App Pairing widget.
