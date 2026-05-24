---
sourceUrl: "https://www.palantir.com/docs/foundry/peer-manager/peer-connection-settings/"
canonicalUrl: "https://palantir.com/docs/foundry/peer-manager/peer-connection-settings/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "ce1dc4ec5ad83e365df2d06896d084c596aa5b65ef1d6ea5cfdd11972b0f1b2d"
product: "foundry"
docsArea: "peer-manager"
locale: "en"
upstreamTitle: "Documentation | Create and update a peer connection > Update a peer connection's settings"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Update a peer connection's settings

After you or another enrollment administrator [create a peer connection](/docs/foundry/peer-manager/create-a-peer-connection/), you can modify its status, security, or peered data types through the **Settings** tab when viewing the connection in Peer Manager.

![The Settings tab in Peer Manager allows administrators to modify a connection.](/docs/resources/foundry/peer-manager/peer-manager-settings.png)

## Modify a peer connection's status

Use the dropdown in the **Status** section to disable the peer connection by selecting **Disabled**.

![The Status section of the Settings tab in Peer Manager is displayed.](/docs/resources/foundry/peer-manager/disable-peer-connection.png)

All data ceases to peer if *either* the local or remote side of the peer connection chooses to disable the connection. Data will not peer until the connection is re-enabled.

## Modify a peer connection's security

The **Security** section enables you to modify the [peer connection's security](/docs/foundry/peer-manager/core-concepts/#connection-security). Select **Manage** to change the configured **Classification Markings** or **Other Markings**.

Security modifications alter the data that may peer over the connection, so *all* security changes must be approved by the remote enrollment before they take effect. When one side of the peer connection changes the security, Peer Manager will open a change request on the other side of the connection for approval.

![The Peer Manager home page displays pending security change requests.](/docs/resources/foundry/peer-manager/change-request-home.png)
