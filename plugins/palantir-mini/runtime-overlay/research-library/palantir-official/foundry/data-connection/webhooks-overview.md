---
sourceUrl: "https://www.palantir.com/docs/foundry/data-connection/webhooks-overview/"
canonicalUrl: "https://palantir.com/docs/foundry/data-connection/webhooks-overview/"
sourceLastmod: "2026-05-12T17:06:26.147Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "f9b1cae362c49bc39c6b3f65ee1746e8df5fdc6b35810697687d6105b19b4a83"
product: "foundry"
docsArea: "data-connection"
locale: "en"
upstreamTitle: "Documentation | Webhooks > Overview"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Webhooks

You can use Data Connection to configure **Webhooks** to connect Foundry to systems and workflows outside of Foundry.

:::callout{theme="neutral"}
This section contains information on *outbound* Webhooks (Foundry making requests to another system). If you need to receive *inbound* Webhooks (another system sending requests to Foundry), consider using [listeners](/docs/foundry/data-connection/listeners-overview/) instead.
:::

Each Webhook provides a way to make a request to an external system outside of Palantir Foundry. For example, you could create a Webhook that performs an HTTP request to an external server when a user selects a button in a Foundry application, connecting that application to existing workflows and source systems.

Each Webhook is associated with a single [Source](/docs/foundry/data-connection/core-concepts/#sources) in Data Connection. The Source stores the credentials necessary for connecting to the external system. Depending on the type of Source the Webhook is associated with, certain Task types are available for use. For example, when using [REST](/docs/foundry/available-connectors/rest-apis/), you can flexibly configure an HTTP call that should be made to an external service.

Webhooks can be configured flexibly to accept specific inputs and capture outputs from external system requests. Additionally, you can set time, concurrency, and rate limits on Webhook executions. For detailed configuration options, see [Webhooks reference](/docs/foundry/data-connection/webhooks-reference/).

See these sections of the documentation to learn more about Webhooks:

* Follow the tutorial to [set up a Webhook](/docs/foundry/data-connection/webhooks-setup/).
* Review the [Webhooks reference](/docs/foundry/data-connection/webhooks-reference/) to learn more about configuration, limits, and permissions.
* See the [Actions documentation](/docs/foundry/action-types/webhooks/) to learn about how Webhooks can be configured for end-user applications.
* Learn how to call webhooks from [external Functions](/docs/foundry/data-connection/external-functions/) for writing custom code to interact with external systems.
