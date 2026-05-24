---
sourceUrl: "https://www.palantir.com/docs/foundry/data-connection/webhooks-microsoft-graph-api/"
canonicalUrl: "https://palantir.com/docs/foundry/data-connection/webhooks-microsoft-graph-api/"
sourceLastmod: "2026-05-12T17:06:26.147Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d79229d2941e066a8ba8a2d9297fee08ab0be9f77c1dfd558cb4c4136134f7ba"
product: "foundry"
docsArea: "data-connection"
locale: "en"
upstreamTitle: "Documentation | Webhooks > Set up a Webhook for the Microsoft Graph API"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Set up a Webhook for the Microsoft Graph API

This guide shows step-by-step how to configure a webhook for the Microsoft Graph API to access Microsoft Cloud service resources from Foundry.

[Learn more about the Microsoft Graph API ↗](https://learn.microsoft.com/en-us/graph/use-the-api).

## Prerequisites

Prior to configuration, you must:

* Sign in to your Microsoft account by typing `login.microsoftonline.com` into your browser to authenticate and generate an access token you can use to create the webhook.
* Configure [network egress policies](/docs/foundry/administration/configure-egress/) for both `login.microsoftonline.com` and `graph.microsoft.com` to allow outbound connections from Foundry.

## Instructions

1. [Create a REST API source](/docs/foundry/data-connection/webhooks-setup/#create-a-source) for your webhook.
2. Include `login.microsoftonline.com` and `graph.microsoft.com` as the source's **Domains** without any **Authentication** restraints.
3. Set any necessary **Additional secrets**, such as  the `TenantId`, `ClientId` and `ClientSecret` that you will use to authenticate against `login.microsoftonline.com`. You will find these after you [register an application in Microsoft Entra ↗](https://learn.microsoft.com/en-us/graph/auth-register-app-v2).
4. Add the network egress policies you [created above](#prerequisites) in the **Network connectivity** section before choosing **Save and continue**.

![The Source Setup window is displayed.](/docs/resources/foundry/data-connection/microsoft-graph-api-source-setup.png)

After you configure your REST API source, you will next configure your webhook to make two `POST` requests that:

1. Login using the `login.microsoftonline.com` credentials created on the source to get a short-lived access token.
2. Make an API call to `graph.microsoft.com` using the access token in the response from the first call as the bearer token in the call's authentication header.

![The Calls configuration window is displayed.](/docs/resources/foundry/data-connection/microsoft-graph-api-calls.png)

[Learn more about configuring Webhooks in Data Connection](/docs/foundry/data-connection/webhooks-reference/).
