---
sourceUrl: "https://www.palantir.com/docs/foundry/peer-manager/configure-file-peering/"
canonicalUrl: "https://palantir.com/docs/foundry/peer-manager/configure-file-peering/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "21bb1af65eac4c0cc57f8ac306d224eb076ed9cbbb22f8e965f9478343389741"
product: "foundry"
docsArea: "peer-manager"
locale: "en"
upstreamTitle: "Documentation | Peer Manager > Configure file peering"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Configure file peering

After you [establish a peering relationship between two spaces](/docs/foundry/peer-manager/create-a-peer-connection/), you can use Peer Manager to configure file peering. File peering enables you to synchronize Gotham files, such as [Gaia maps](/docs/foundry/object-link-types/create-ontology-objects-from-gaia/), between your enrollment and another across a peer connection.

:::callout{theme="neutral"}
To peer files between spaces, your enrollment must use both Foundry and Gotham. <br><br>
Contact Palantir Support with questions about Gotham files or their additional documentation present in platform.
:::

![The Files page displays file peering configuration options for a peer connection in Peer Manager.](/docs/resources/foundry/peer-manager/file-peering-page.png)

## Enable file peering for each file type

Before you are able to peer files across a peer connection, navigate to the connection in Peer Manager and select **Settings** from the top ribbon to ensure [the connection's settings](/docs/foundry/peer-manager/peer-connection-settings/) enable file export and import.

![The Files section of a peer connection's Settings tab in Peer Manager is displayed.](/docs/resources/foundry/peer-manager/enable-file-exports-imports.png)

Once you configure the peer connection's file export and import settings, select **Files** to set the desired peer behavior for each file type. Choose a **File type** from the **File peering** panel to launch its configuration in a drawer popover on the right side of your screen.

:::callout{theme="neutral"}
You must configure file type peering behavior on **both** the local and remote sides of the peer connection.
:::

![The side panel displays configuration options for a file type's peer settings.](/docs/resources/foundry/peer-manager/file-peering-side-panel.png)

Within the drawer popover, you can set the file's **Export selection** to automatically peer all files or only a selection based on an applied tag or temporal parameter.
