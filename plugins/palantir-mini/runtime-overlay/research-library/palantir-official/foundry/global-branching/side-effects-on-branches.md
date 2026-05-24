---
sourceUrl: "https://www.palantir.com/docs/foundry/global-branching/side-effects-on-branches/"
canonicalUrl: "https://palantir.com/docs/foundry/global-branching/side-effects-on-branches/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "ab6aad6508a0b5314a5a4e6b37c91aab59038813c5738cd467124f8af1878cef"
product: "foundry"
docsArea: "global-branching"
locale: "en"
upstreamTitle: "Documentation | Core concepts > Managing side effects on branches"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Managing side effects via actions on branches

:::callout{theme="neutral"}
The following information applies specifically to webhooks, functions with external calls, and notifications that are applied **via actions** on branches. Side-effects applied through other means will behave as defined by those consumers.
:::

## Webhooks

By default, if your action type has webhooks configured, the webhooks will not execute when the action is applied on a branch. This behavior is to prevent accidentally writing to external systems while in a testing environment.

In such cases, you will see a toast notification indicating this behavior.

![A toast notification indicating action applied but webhook not executed.](/docs/resources/foundry/global-branching/action-webhook-toast.png)

However, there are some cases where testing a webhook on a branch is desirable, for instance when hitting a READ endpoint.

To override the default behavior, configure the action type's **Security and submission criteria** tab in Ontology Manager to enable webhook executions on branches.

![Enable webhooks on branches setting.](/docs/resources/foundry/global-branching/action-webhook-setting.png)

:::callout{theme="neutral"}
If webhooks on branches are enabled, the webhook will run exactly as it would on `Main`. By consequence, if the webhook is configured to hit an external production environment, it will continue to do that even if the action is executed on a branch.
:::

## Functions with external calls

By default, if your action type is function-backed, and the function makes an external call, the action will fail entirely when executed on a branch. This behavior is to prevent accidentally writing to external systems while in a testing environment.

In such cases, you will see a toast notification indicating failure, with an explanation of the behavior.

![Action failed to execute due to external function call.](/docs/resources/foundry/global-branching/action-function-error-toast.png)

However, testing on branches is sometimes necessary, for example, when calling READ endpoints. You can override this restriction by enabling functions with external calls on branches in the action type's **Security and submission criteria** tab in Ontology Manager.

![Enable functions with external calls on branches setting.](/docs/resources/foundry/global-branching/action-function-setting.png)

:::callout{theme="neutral"}
If functions with external calls on branches are enabled, the function will make the same external calls as it would on `Main`. By consequence, if the function is configured to hit an external production environment, it will continue to do that even if the action is executed on a branch.
:::

## Notifications

By default, if your action type has notifications configured, the notifications will not be sent when the action is executed on a branch. This behavior is to prevent accidentally notifying recipients while in a testing environment.

In such cases, you will see a toast notification indicating this behavior.

![Toast notification indicating action applied but notification not executed.](/docs/resources/foundry/global-branching/action-notification-toast.png)

However, there are some cases where testing notifications on a branch is desirable.

To override the default behavior, you can enable notifications on branches in the action type’s **Security and submission criteria** tab in Ontology Manager.

Additionally, you can specify the notification recipients when the action runs on a branch:

* **Branch owner:** Send all notifications to the branch owner.
* **Default recipients:** Notify the recipients configured on the original notification(s).

![Enable notifications on branches setting.](/docs/resources/foundry/global-branching/action-notification-setting.png)
