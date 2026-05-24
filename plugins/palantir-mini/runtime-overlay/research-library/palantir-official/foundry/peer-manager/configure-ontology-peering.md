---
sourceUrl: "https://www.palantir.com/docs/foundry/peer-manager/configure-ontology-peering/"
canonicalUrl: "https://palantir.com/docs/foundry/peer-manager/configure-ontology-peering/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "8907bce640d87eaf43c025cd210d9b68e6aab738ae9e4a40263111dbc5a15883"
product: "foundry"
docsArea: "peer-manager"
locale: "en"
upstreamTitle: "Documentation | Peer objects and links between enrollments > Configure Ontology peering"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Configure ontology peering

After you [establish a peering relationship between two spaces](/docs/foundry/peer-manager/create-a-peer-connection/), you can use Peer Manager to create and approve [object type](/docs/foundry/object-link-types/object-types-overview/) mappings which enable you to peer its objects over the connection.

:::callout{theme="neutral" title="Note"}
To synchronize objects and links through a peering relationship, the object type to peer must exist on both enrollments, and its properties must remain in sync. A peering relationship where properties fall out of sync will be unable to send new object data until the synchronization is restored. Use [Marketplace](/docs/foundry/marketplace/overview/) to create a [product](/docs/foundry/foundry-devops/create-products/) on the source enrollment that contains the object type to peer before deploying the product to the remote enrollment. When schematic changes are made to the object type on the source enrollment, then the remote enrollment can receive those updates through the product's configured [release channel](/docs/foundry/foundry-devops/manage-products/#release-channels). <br><br>

Review the [core concepts for ontology peering](/docs/foundry/peer-manager/ontology-peering-overview/) before you proceed.
:::

## Make the object type available to peer

Navigate to Peer Manager and follow the instructions below for *both* the local and remote sides of the peer connection to make the object type available to peer:

1. Choose the relevant peer connection and select the **Ontology** tab from the top of your screen.
2. Select the **Unmapped** tab before choosing **+ Add ontology entities**.
3. Search for and select one or multiple object types you will make available for peering over the connection before choosing **Confirm selection** to launch the **Configure peering permissions** popup window.
4. Optionally change Peer Manager's default peer permissions state, which allows *both* exports and imports of the associated ontology resources' data.

:::callout{theme="neutral"}
If you want to establish a unidirectional object type peering relationship where the local space sends objects to the remote space *without* receiving object edits the remote side makes, then you can select **Imports blocked**.
:::

![Peer permissions are set for resources added to the peer connection.](/docs/resources/foundry/peer-manager/configure-ot-peering-permissions.png)

5. Select **Add ontology entities** to finish adding the object types to the **Unmapped** section of the **Ontology**.

## Create the object type mapping

Once you make the object type available to peer across both sides of the peer connection, you can next follow the instructions below to configure the object type mapping from either side of the relationship:

1. Align the corresponding object types from the **Local ontology** and **Remote ontology** in the **Unmapped** section of the **Ontology** tab.
2. Select **+** on the right side of the **Remote ontology** object type to launch the **Create ontology mapping** popup window.
3. Map the corresponding properties across the local and remote object types in the **Map properties** section.

![Create a mapping between local and remote object types in the Create ontology mapping popup window to enable peering between the two.](/docs/resources/foundry/peer-manager/map-object-type-properties.png)

:::callout{theme="neutral"}
You do not need to map every property; however, you must map any properties you wish to peer over the established connection.
:::

4. Configure the peering relationship's **Source data** and **Actions** directionality in the **Configure peering** section. [Learn more about peer relationship directionality](/docs/foundry/peer-manager/ontology-peering-overview/).

* **Source data** is the base data for the object type derived from its backing datasources, such as [datasets](/docs/foundry/data-integration/datasets/), [virtual tables](/docs/foundry/data-integration/virtual-tables/), or [restricted views](/docs/foundry/security/restricted-views/). Support for source data peering depends on the type of backing data as well as the environment type. [Learn more about source data peering](/docs/foundry/peer-manager/ontology-peering-overview/#source-data-peering).

* **Actions** produce data from user edits applied onto **Source data**. In most cases, you should bidirectionally peer **Actions** if edits are enabled for the object type, so you should ensure *both* **Export** and **Import** are selected.

5. Review the configuration for the object type in the **Summary** section and choose **Submit** to save the mapping.

Foundry immediately instantiates the peering relationship for your object type after you press submit. You can monitor the connection's health in Peer Manager's **Overview** panel.
