---
sourceUrl: "https://www.palantir.com/docs/foundry/automate/history-visibility-and-scope/"
canonicalUrl: "https://palantir.com/docs/foundry/automate/history-visibility-and-scope/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "53b2304b94d97c78b73dd51b73e49cce111a5404ab45803eb58f9efea981cdf0"
product: "foundry"
docsArea: "automate"
locale: "en"
upstreamTitle: "Documentation | Security and permissions > History visibility and scope"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Automation history visibility and scope

Automations can be configured with different scoping options that determine who can access run history for action and Logic executions.

:::callout{theme="warning"}
Regardless of scoping mode, automations execute as the owner. This means:

* **Action criteria**: The owner must satisfy submission requirements (group membership and permissions).
* **Compute tokens**: Functions receive the owner's authentication token.
* **Edit attribution**: Object edit history and audit logs show changes as performed by the owner.
* **Permissions**: All ontology reads/writes use the owner's access level.
:::

![Automation scoping options, showing project scoped automations highlighted.](/docs/resources/foundry/automate/project-scoped.png)

## Project-scoped automations (recommended)

:::callout{theme="warning"}
Project-scoped automations require all transitive resources used in the automation to be imported into the project. When dependencies change (for example, an action references a new version of a function), update the automation to reimport references and regenerate the scope.
:::

Project scope mode is the recommended set-up for automations, if possible. Project scope enables team collaboration by making run history (including effect executions) visible to all users who satisfy the markings on a run. Project scoped automations still run as the owner of the automation.

### Limitations

Project-scoped mode currently does not support:

* Stateful functions, including:
  * [Deployed Python functions](/docs/foundry/functions/functions-deployed/)
  * [AIP Chatbot functions](/docs/foundry/chatbot-studio/chatbots-as-functions/)
* Object types with [restricted views](/docs/foundry/object-permissioning/configuring-rv-access-controls/)
* Python and Typescript v2 functions that use a platform SDK
* [Notification effects](/docs/foundry/automate/effect-notification/)

Additionally, dependency computation for Typescript v1 is best-effort and may miss entities, meaning dependencies may be incorrectly computed. Consider using Typescript v2.

## User-scoped automations

In user-scoped mode, only the owner of the automation has access to the run history. For better team collaboration and debugging, project-scoped mode is the recommended setup for automations.

With **Shared trigger history** enabled, users with permissions on marked data in the condition can see that runs were executed, but effect executions remain visible only to the automation's owner. For more information about configuring and viewing shared history, review the [shared history events](/docs/foundry/automate/history/#history-visibility) documentation.
