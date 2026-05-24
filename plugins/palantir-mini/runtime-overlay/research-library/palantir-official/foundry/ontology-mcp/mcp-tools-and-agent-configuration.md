---
sourceUrl: "https://www.palantir.com/docs/foundry/ontology-mcp/mcp-tools-and-agent-configuration/"
canonicalUrl: "https://palantir.com/docs/foundry/ontology-mcp/mcp-tools-and-agent-configuration/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "12d91b22fd150d40a420d96d40b9a3463d8b98ea2f33d2b9384a41a7155f4029"
product: "foundry"
docsArea: "ontology-mcp"
locale: "en"
upstreamTitle: "Documentation | Ontology MCP > MCP tools and agent configuration"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# MCP tools and agent configuration

## Action tool description

Use the **Agent tool description** field in the Ontology Manager application to update the description the agent sees when using the action as a tool. This allows you to provide specific guidance to AI agents about when and how to use each action. For example, an action that creates a new task and gets the project ID for linking the tasks could include instructions on how to obtain the project ID.

![The Agent tool description field in Ontology Manager.](/docs/resources/foundry/ontology-mcp/mcp-agent-tool-description.png)

## Using Ontology MCP with Claude skills

[Claude skills ↗](https://docs.anthropic.com/en/docs/claude-code/skills) are reusable instruction sets that extend what Claude can do. You can integrate Ontology MCP (OMCP) tools with your skills to encode more complex business logic into your agent.

In the example below, a skill named `get-or-create-task` guides the agent on how to use both the search tool and the create task action tool in combination. This prevents duplicate tasks from being created by first searching for an existing task before creating a new one.

```markdown
---
name: get-or-create-task
description: Searches for a task by title in a project, returns it if found, or creates a new task if not found
---

# Get or create task

Find an existing task by title within a project, or create a new task if no match is found.

## Instructions

1. Search for the task by title using the search tool:
   - Tool: `search-osdk-todo-task`
   - Filter results by `project_id` if provided

2. Evaluate results:
   - If a match is found, return the existing task details
   - If multiple matches are found, use the first match
   - If no matches are found, proceed to create a new task

3. Create a new task using the create task action tool:
   - Tool: `create-osdk-todo-task`
   - Required parameters: `title`, `project_id`
   - Optional parameters: `description`, `status`, `assigned_to`, `start_date`, `due_date`

4. Return the task details including ID, title, project, status, and assignee
```

## Microsoft Copilot Studio integration

Microsoft Copilot Studio integration only supports [authorization code grant](/docs/foundry/platform-security-third-party/writing-oauth2-clients/#authorization-code-grant) in a Confidential Client. This means that when creating the [Developer Console application](/docs/foundry/developer-console/overview/) for your Ontology MCP integration with Microsoft Copilot Studio, you should choose [**Backend service**](/docs/foundry/developer-console/how-to-bootstrapping-server-side-typescript/#1-create-an-osdk-package-using-developer-console) and **User's permissions**. This will create the required service user that Copilot Studio uses to issue the token on behalf of your users.

### Using Adaptive Cards to format and display Ontology MCP data

Developed by Microsoft, [Adaptive Cards ↗](https://adaptivecards.microsoft.com/) are a versatile UI framework for Teams, Copilot, and Outlook integrations. When paired with Ontology MCP tools, Adaptive Cards let your agent return structured data from your ontology and display it as a formatted card rather than plain text.

![An Adaptive Card rendered in Microsoft Teams showing a customer portfolio with risk status and renewal dates.](/docs/resources/foundry/ontology-mcp/mcp-adaptive-card-in-teams.png)

Additionally, you can use `Action.OpenUrlDialog` in your Adaptive Cards to trigger a URL that opens a custom dialog in Teams or Copilot, allowing users to interact with the data returned from your Ontology MCP tools.

![An example of an Adaptive Card with an Action.OpenUrlDialog button that opens a custom dialog in Teams.](/docs/resources/foundry/ontology-mcp/mcp-adaptive-card-open-url-dialog.png)

#### Prerequisites

Before you begin, install the following VS Code extensions:

* [Microsoft 365 Agents Toolkit ↗](https://marketplace.visualstudio.com/items?itemName=TeamsDevApp.ms-teams-vscode-extension)
* [Adaptive Card Previewer ↗](https://marketplace.visualstudio.com/items?itemName=TeamsDevApp.vscode-adaptive-cards)

#### Configure your Ontology MCP server in VS Code

Create a `.vscode/mcp.json` file in your project to connect VS Code to your Ontology MCP server:

```json
{
  "inputs": [],
  "servers": {
    "todo-confidential": {
      "type": "http",
      "url": "<your-ontology-mcp-server-url>",
      "headers": {
        "Authorization": "Bearer ${env:FOUNDRY_TOKEN}",
        "Accept": "application/json, text/event-stream"
      }
    }
  }
}
```

Replace `<your-ontology-mcp-server-url>` with your Ontology MCP server's URL, which you can find in your Developer Console application.

#### Create an adaptive agent

1. Select **Start** in the Microsoft 365 Agents Toolkit panel and connect to your Ontology MCP server.

![An example mcp.json file is displayed, connecting the Microsoft 365 Agents Toolkit to an Ontology MCP server.](/docs/resources/foundry/ontology-mcp/mcp-vs-code-mcp-json.png)

2. Follow the guided steps in the Microsoft 365 Agents Toolkit to create a new adaptive agent.

![The Microsoft 365 Agents Toolkit VS Code extension is displayed.](/docs/resources/foundry/ontology-mcp/mcp-agent-toolkit.png)

#### Add capabilities to your agent

To render an Adaptive Card from the Ontology MCP tool output, add a `capabilities` block to your agent's tool definition. The `static_template` property points to an Adaptive Card template file that defines how the returned data is displayed.

The following example configures a `GetCustomerList` tool to render its response using an Adaptive Card:

```json
{
    "name": "GetCustomerList",
    "description": "List all customers.\n\n    Returns:\n        A list of CustomerSummary objects with key customer properties.",
    "parameters": {
        "type": "object",
        "properties": {},
        "required": []
    },
    "capabilities": {
        "response_semantics": {
            "data_path": "$",
            "static_template": {
                "file": "adaptiveCards/customerList.json"
            }
        }
    }
}
```

The `data_path` property specifies the JSON path to the data in the tool response, and `static_template.file` points to the Adaptive Card template that renders the data.

#### Optional: Generate Adaptive Cards with a Claude skill

You can create a [Claude skill](#using-ontology-mcp-with-claude-skills) that automatically generates Adaptive Card templates based on the schema of your Ontology MCP tools. First, follow the instructions on the [Developer Console MCP page](/docs/foundry/developer-console/ontology-mcp/) to connect your Ontology MCP server to Claude Code. Then, save the following skill file to your project's `.claude/skills` directory, such as the `.claude/skills/build-adaptive-card.md` example below:

````markdown
---
name: build-adaptive-card
description: Build an Adaptive Card for a specific MCP tool connected to Claude Code
---

# Build Adaptive Card for MCP Tool

You are helping the user build an Adaptive Card for a specific MCP tool that is connected
to Claude Code in this session.

## Instructions

Follow these steps precisely:

### Step 1: Identify the target tool

Ask the user which MCP tool they want to build an Adaptive Card for. List the available
MCP tools you know about from the connected MCP server. If the user has already named the
tool, skip asking.

### Step 2: Call the tool to get a real response sample

Call the named MCP tool with minimal or sample arguments to get a real response. If the
tool requires arguments, use the most minimal and representative ones possible. Capture the
full JSON response.

If the tool requires arguments you cannot guess, ask the user for sample argument values
before calling.

### Step 3: Validate the response shape

Inspect each property of the returned object. If any property value is a string that is
itself valid JSON (starts with `[` or `{` and parses as JSON), the tool is double-serializing
its output. Stop and tell the user:

> The tool is returning its data as a JSON-encoded string instead of a native JSON
> object or array. Adaptive Card templates cannot bind to a string. Fix the MCP server
> tool implementation to return a native Python dict or list instead of `json.dumps(...)`.

Do not proceed until the user confirms the tool has been fixed.

If the response is valid JSON, determine:
- Is the top-level response an object with a `value` array? (MCP envelope pattern)
- Or is it a flat array or a single object?
- What are the field names, types, and which fields are nullable?
- Which fields are numeric and might benefit from formatting (currency, percentages)?

### Step 4: Generate the Adaptive Card JSON

Create an Adaptive Card (version 1.5) following these rules:

**Template binding:**
- If response is `{"value": [...]}`, use `"$data": "${value}"` on the repeating Container
- If response is a flat array, use `"$data": "${$root}"` on the repeating Container
- If response is a single object, bind fields directly with `${fieldName}`

**Card structure:**
- Start with a header Container (`style: "emphasis"`, `bleed: true`) with a title TextBlock
- For list responses: use a repeating Container with a ColumnSet inside
- For single-object responses: use a FactSet or labeled rows
- Use `"wrap": true` on all TextBlocks
- For nullable fields, add `"$when": "${field != null}"` guards
- For currency fields: use `formatNumber` for display formatting
- For status color coding: use conditional `if()` expressions
- Do NOT use `.length` on arrays (not supported in template language)
- Do NOT use date functions, structs, arrays, or window functions

**File naming:** `appPackage/adaptiveCards/<toolName>.json` (camelCase the tool name)

Write the card JSON to `appPackage/adaptiveCards/<toolName>.json`.

Next, write a companion `.data.json` file at `appPackage/adaptiveCards/<toolName>.data.json`
containing the actual sample response for design-time preview data.

### Step 5: Wire up response_semantics in ai-plugin.json

Read `appPackage/ai-plugin.json`. Find the function entry matching the tool name. Add or
update the `capabilities` block:

```json
"capabilities": {
    "response_semantics": {
        "data_path": "$",
        "static_template": {
            "file": "adaptiveCards/<toolName>.json"
        }
    }
}
```

### Step 6: Report to the user

Print a summary of the card file created, the data sample file created, the function updated
in `ai-plugin.json`, the `data_path` used, and key design decisions made.

## Key constraints

- `response_semantics` must be inside `capabilities`, not directly on the function
- `static_template` uses `"file": "adaptiveCards/foo.json"` (the toolkit inlines at build time)
- Adaptive Card template language does not support `.length`
- `$schema` for the card: `"http://adaptivecards.io/schemas/adaptive-card.json"`
- Card version: `"1.5"`
````

Save your skill and invoke it in Claude Code with a prompt like `Build a card for the GetCustomerList tool`. The skill calls the MCP tool, inspects the response shape, generates the Adaptive Card template, and wires it into your agent configuration. [Learn more about how to create and use Claude skills with Ontology MCP](#using-ontology-mcp-with-claude-skills).

:::callout{theme="info"}
See the [Palantir DevCon4 presentation and demo ↗](https://www.youtube.com/watch?v=QMKRMEuCoaU) for additional examples and guidance on using Ontology MCP.
:::
