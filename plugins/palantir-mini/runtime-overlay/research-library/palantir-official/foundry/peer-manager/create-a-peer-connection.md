---
sourceUrl: "https://www.palantir.com/docs/foundry/peer-manager/create-a-peer-connection/"
canonicalUrl: "https://palantir.com/docs/foundry/peer-manager/create-a-peer-connection/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "7474460e48fae5b0239e1ec24423f085d5c613a621786b40b4fad15b5caa0f6c"
product: "foundry"
docsArea: "peer-manager"
locale: "en"
upstreamTitle: "Documentation | Create and update a peer connection > Create a peer connection"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Create a peer connection

You can create and delete peer connections from Peer Manager.

## Prerequisites

You must complete the steps below before you create a peer connection:

* Use the [network ingress](/docs/foundry/administration/configure-ingress/) and [network egress](/docs/foundry/administration/configure-egress/) extensions in Control Panel to configure ingress and egress policies for the [enrollments](/docs/foundry/administration/enrollments-and-organizations/) you will peer between.

:::callout{theme="neutral"}
To establish a peer connection that exports data from your enrollment, your local enrollment must permit egress to the remote enrollment. Additionally, the remote enrollment must permit ingress from your local enrollment. The opposite is true if you are establishing a peer connection that imports data into your local enrollment from a remote enrollment. Your local enrollment must permit ingress from the remote enrollment, and the remote enrollment must permit egress to your local enrollment.
:::

* Contact Palantir Support to establish a data relay or Multipass exchanger connection for your enrollment after you configure the relevant ingress and egress policies.
* Ensure that you are a manager of the local [space](/docs/foundry/security/orgs-and-spaces/#spaces) you wish to create a connection for.

## Initiate the peer connection

To initiate a peer connection:

1. Select **Create a peer request** from the top right of Peer Manager to launch the **Create a peering request** dialog.
2. Identify your enrollment's space in the **Select a space to peer** dropdown menu.
3. Choose the data types to export, import, or both.
4. Select **Copy invite code**.
5. Share the invite code with an administrator on the peer enrollment, who will import the peer connection.

![Peering connections' create a request dialog.](/docs/resources/foundry/peer-manager/create_new_request.png)

## Import the peer connection

To import a peer connection after you receive an invite code:

1. Select **Enter invite** code to launch the **Importing peer request** popup window.
2. Paste the invite code in the empty text box to render the **Connection details** panel of the popup window.

![Peering connections import code dialog.](/docs/resources/foundry/peer-manager/enter_invite_code.png)

3. Identify the space on your enrollment to which you will accept peered objects or Artifacts from the **Select a space to peer** dropdown menu.

4. Select **Set security** to optionally set the [security of the connection](/docs/foundry/peer-manager/core-concepts/#connection-security).

5. Select **Approve request**.

![Peering connections' imported code dialog.](/docs/resources/foundry/peer-manager/approve.png)

## Activate the peer connection

After a peer request is accepted, the originator of the request must **Activate** the connection in the lower right corner of its right-hand panel.

![Peering connections' activate dialog.](/docs/resources/foundry/peer-manager/activate.png)
