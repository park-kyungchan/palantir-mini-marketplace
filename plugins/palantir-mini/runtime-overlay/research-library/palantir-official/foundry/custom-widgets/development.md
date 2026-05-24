---
sourceUrl: "https://www.palantir.com/docs/foundry/custom-widgets/development/"
canonicalUrl: "https://palantir.com/docs/foundry/custom-widgets/development/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "ef3a28c988d918f22b7cb7ea0438adf2c082feed7e020c43e480baf82d7e63b4"
product: "foundry"
docsArea: "custom-widgets"
locale: "en"
upstreamTitle: "Documentation | Custom widgets > Develop a widget set"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Development

## What is dev mode?

Dev mode is a development feature that allows you to preview widgets using non-production code directly within Foundry applications. When dev mode is active, your development server (running either locally or in Foundry) overrides the published widget assets, letting you see your code changes in real-time without needing to publish a new version.

Key characteristics of dev mode:

* **Personal:** Only affects your user account and other users continue to see the published version.
* **Temporary:** Automatically expires after 24 hours.
* **Live updates:** Code changes from your development server immediately appear in the widget.
* **Context-aware:** Works in both the custom widgets playground and host applications like Workshop.

## Set up a project

:::callout{theme="neutral"}
Your widget needs to have a first release published before it can be developed on. To ensure a first release, follow instructions in [Create a widget set](/docs/foundry/custom-widgets/create/).
:::

If you chose to use a Foundry Code Repository to store your source code, first follow the "Work locally" instructions in VS Code Workspace or the Code Repositories application to clone the repository to your local machine.

Set the `FOUNDRY_TOKEN` environment variable in your terminal with a [user-generated token](/docs/foundry/platform-security-third-party/user-generated-tokens/) with the following command, or the equivalent for your operating system.

```bash
export FOUNDRY_TOKEN=<token>
```

In the project directory, run the following commands to install dependencies and start the dev server:

```bash
npm install
npm run dev
```

A link will be printed to the terminal which you can open to set up dev mode for your widget set. This will redirect the browser to the widget set overview page once complete, from which you can select a widget to start developing against. The live code running from your development server will now be displayed in the widget playground and any changes to your code will immediately update the widget on the page.

![The npm run dev command in the terminal.](/docs/resources/foundry/custom-widgets/npm-run-dev.png)

## Dev mode environments

Once your dev server is running, you can preview your widgets in the different environments outlined below.

### Custom widgets playground

The custom widgets playground is a dedicated development environment for testing individual widgets which provides:

* **Isolated testing:** Preview widgets in different dimensions and configurations.
* **Parameter controls:** Interactive controls to test widget parameters you have defined.
* **Event monitoring:** A message log showing widget events and parameter updates from Foundry.
* **Dev mode integration:** When dev mode is active, the playground displays your development code.

![The widget in dev mode in the custom widgets playground.](/docs/resources/foundry/custom-widgets/playground-dev-mode.png)

### Workshop integration

When developing Workshop widgets, dev mode extends beyond the playground to actual Workshop applications. This allows you to:

* Preview widget changes in the full context where the widget will be used
* Test interactions with other Workshop components
* Validate the widget's behavior in real application scenarios

![The widget in dev mode in Workshop.](/docs/resources/foundry/custom-widgets/workshop-dev-mode.png)

### VS Code Workspaces integration

The development server can run directly from the terminal in a VS Code workspace. This is done automatically when the workspace starts, but can also be done manually using the following command in the terminal:

```bash
npm run dev:remote
```

The VS Code preview panel can then be used to select a widget to preview from the development server. A development server running in a VS Code workspace can also be used to preview changes in the custom widgets playground and in Workshop applications, just like a development server running on your local machine.

![The widget in dev mode in VS Code Workspaces.](/docs/resources/foundry/custom-widgets/vscode-workspaces-dev-mode.png)

## Dev mode controls and states

Dev mode can be controlled through the custom widgets playground interface. The controls indicate the current state and allow you to enable, disable, or pause dev mode as needed.

### Disabled state (default)

Dev mode is disabled by default. You can enable it through the playground controls, but it will remain inactive unless your dev server is running and has overrides for the current widget.

<img src="./media/dev-mode-disabled.png" alt="Dev mode controls in disabled state." width=350 />

### Enabled state

When active, dev mode displays content from your development server instead of the published widget version. This state confirms that your local changes are being previewed.

The controls display whether the source is a development server running on localhost:

<img src="./media/dev-mode-enabled-localhost.png" alt="Dev mode controls in enabled state using localhost." width=350 />

Or a VS Code workspace:

<img src="./media/dev-mode-enabled-vscode-workspace.png" alt="Dev mode controls in enabled state using a VS Code Workspace." width=350 />

### Enabled (inactive) state

This state indicates dev mode is enabled but no development server overrides exist for the current widget, so the published version is still displayed. This typically happens when your dev server is not running or does not include the widget you are viewing.

<img src="./media/dev-mode-enabled-inactive.png" alt="Dev mode controls in enabled inactive state." width=350 />

### Paused state

The paused state temporarily disables dev mode while keeping the controls visible in host applications like Workshop, making it easy to resume development when needed.

<img src="./media/dev-mode-paused.png" alt="Dev mode controls in enabled (inactive) state." width=350 />

## Add and modify parameters and events

The parameters and events for a widget are typically defined in a `main.config.ts` file. This is type-safe so adding or modifying parameters and events can be done easily without errors. For more information on supported parameter types and events, see [parameters and events](/docs/foundry/custom-widgets/parameters-and-events/).

```ts
// main.config.ts
import { defineConfig } from "@osdk/widget.client";

export default defineConfig({
  id: "<Widget ID>", // The unique identifier of the widget within your project
  name: "<Widget Name>", // A user friendly name for your widget
  description: "<Widget Description>", // A user friendly description of your widget
  type: "workshop",
  parameters: {
    headerText: {
      displayName: "Widget title",
      type: "string",
    },
    showWarning: {
      displayName: "Show warning callout",
      type: "boolean",
    },
    todoItems: {
      displayName: "Todo items",
      type: "array",
      subType: "string",
    },
  },
  events: {
    updateHeader: {
      displayName: "Update header",
      parameterUpdateIds: ["headerText"],
    },
    updateTodoItems: {
      displayName: "Update todo items",
      parameterUpdateIds: ["todoItems"],
    },
  },
});
```

:::callout{theme="neutral"}
Previewing changes to parameters and events is not currently supported. You must publish a new version of the widget set with the new configuration shape before being able to use it in the custom widgets playground or other Foundry application.
:::

## Unsupported features

The custom widgets runtime does not support certain browser APIs for persisting data such as:

* [Web Storage API ↗](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API) (`localStorage`, `sessionStorage`)
* [IndexedDB API ↗](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

To share state between multiple widgets on the page, use parameters configured through the host application (for example, variables in Workshop). To persist state, you may use saved states for Workshop variables, or write data to the ontology.

Non-Ontology APIs are also not supported in the custom widgets runtime.

The content security policy (CSP) of the custom widget runtime cannot be configured and is restrictive by design; no external requests are allowed. You may use Foundry resources to wrap external requests, such as functions and webhooks.
