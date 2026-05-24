---
sourceUrl: "https://www.palantir.com/docs/foundry/peer-manager/ontology-peering-overview/"
canonicalUrl: "https://palantir.com/docs/foundry/peer-manager/ontology-peering-overview/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "f2826ef7e3ce07173838d1dd28474f97809f6df14f656052e859994b11656f82"
product: "foundry"
docsArea: "peer-manager"
locale: "en"
upstreamTitle: "Documentation | Peer objects and links between enrollments > Ontology peering"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Ontology peering

Ontology peering enables you to synchronize [object](/docs/foundry/object-link-types/object-types-overview/) and [link types](/docs/foundry/object-link-types/link-types-overview/) from your ontology to an ontology on another enrollment across a [peer connection](/docs/foundry/peer-manager/create-a-peer-connection/).

## Key concepts

### Object references and mappings

You can reference a singular object or a set of objects across Palantir applications by its unique [RID](/docs/foundry/functions/object-identifiers/). The act of peering translates ontology RIDs that are specific to each enrollment across the connection to ensure users can reference the correct object when operating in applications within *their* enrollment. Before you enable peering and configure a peer connection, these object references *only* refer to the enrollment-specific RID. This translation is necessary to synchronize a Gotham file, such as a Gaia map, between two enrollments.

To perform this translation, create an [object type mapping](/docs/foundry/peer-manager/configure-ontology-peering/#create-the-object-type-mapping) to define how an object type and its properties are translated across a peer connection. You do not need to map *every* property; however, you must map any properties you wish to peer over the established connection.

### Types of ontology data peering

#### Source data peering

Source data is Ontology data from backing datasources, like datasets or Restricted Views. Source data peering is currently **unidirectional**. This means that when source data peering is set up, one enrollment is providing all the source data, and no source data can flow the other way.

You may not need to configure source data peering if both enrollments receive data from the same upstream source systems. If this the case, then you should configure [action data peering](#action-data-peering) to synchronize user edits across the two enrollments. Additionally, you will not need to configure source data peering for object types that do not have source data, meaning they are generated entirely from user actions.

Review the information below to learn more about source data peering's current capabilities and limitations:

* **Cloud-to-edge source data peering:** Source data peering between cloud and edge enrollments is supported.
* **Cloud-to-cloud source data peering:** Currently, the only way to peer source data from a cloud enrollment to another cloud enrollment is through object types backed by direct datasources. If your object types are backed by another source, like a dataset or Restricted View, then you should synchronize source data across enrollments using the Foundry connector.
* **Dataset synchronization:** You can use the [Foundry connector](/docs/foundry/available-connectors/foundry/) to synchronize an object type's backing dataset or stream between enrollments before establishing a peering connection to synchronize action-based edits. Source data peering does *not* enable you to peer objects on cloud enrollments backed by a dataset or stream to another cloud enrollment where the remote object is *also* backed by a separate dataset or stream.
* **Streams:** For cloud enrollments, streams can serve as both an object type's datasource and a direct datasource's feed. The former does not support actions or peering, the latter case supports actions, peering those actions, as well as source data exports and imports.
* **Only synchronize changed objects:** Source data peering only synchronizes objects that change based on backing dataset updates. As an example, if your object type's backing dataset's most recent [snapshot](/docs/foundry/data-integration/datasets/#snapshot) transaction only includes changes to five objects, then only those five objects will be synchronized.

#### Action data peering

[Action](/docs/foundry/action-types/overview/) data is ontology data derived from user changes submitted as an action on an object, such as creating, editing, or deleting an object or link. You can configure action data peering between cloud *and* edge Foundry enrollments.

You can establish bidirectional action data peering between any number of peer connections, and that data will peer in real-time. Additionally, action data peering is eventually consistent: if a real-time action peer fails, then Peer Manager will attempt to resend the data until it is acknowledged by the remote enrollment.

Review the information below to learn more about the current capabilities and limitations for action data peering:

* **Dataset support:** You can peer object types backed by datasets, Restricted Views, and direct datasources, including [multi-datasource object types](/docs/foundry/object-permissioning/multi-datasource-objects/).
* **Property matching:** Action data peering defines a specific property-to-property mapping between two object types. The properties do not need to have the same API name, but in order for a property to peer, both object type's property's type must be the same, such as `string` or `double`.
* **Selected property peering:** Action data peering can peer a subset of properties, as opposed to all properties, on an object type.
* **Unsupported property types:** Certain property types are not yet supported by action data peering:
  * [Cipher text](/docs/foundry/api/v2/ontologies-v2-resources/cipher-text-properties/cipher-text-property-basics)
  * [Time series](/docs/foundry/time-series/time-series-concepts-glossary/#sensor-object-type) via a linked sensor object type
  * [Vector](/docs/foundry/ontology/using-custom-models-to-create-a-semantic-search-workflow/)
* **Stream-backed object types:** Action data peering on a stream-backed object type is not yet supported.

### Link type peering

[Link types](/docs/foundry/object-link-types/link-types-overview/) define the relationship between two object types and peer automatically alongside object types containing the link properties. Review the guidance below to ensure your object's links peer correctly when configuring an ontology peering relationship.

* [**Foreign key relationships:**](/docs/foundry/object-link-types/create-link-type/#foreign-key-relationship-type) Links are stored as properties on the object, so there is no specific set up required to peer foreign key links. Rather, they are peered when both linked objects are peered, provided that the link type is defined in both Ontology instances.

* [**Join table dataset relationships:**](/docs/foundry/object-link-types/create-link-type/#join-table-dataset-relationship-type) Used for many-to-many links, you must configure these to peer. The join table may contain source data from backing datasources, and the links can receive user edits. Similar to an object type, a many-to-many link type can contain both source data and action data.

* [**Backing object relationships:**](/docs/foundry/object-link-types/create-link-type/#backing-object-relationship-type) Used for many-to-many links, the link is shared when both linked objects and the backing object are peered.

## Peering and automations

When an object type receives updates through ontology peering, those peered changes can trigger [Automate](/docs/foundry/automate/overview/) automations that monitor the object type. In environments that have peering connections where similar automation logic runs on both sides, this can cause duplicated or unintended side effects.

To prevent this, you can configure an automation to skip events that originate from peering patches. Learn more about this setting in the [Automate condition settings](/docs/foundry/automate/condition-settings/#skip-peering-events) documentation.

## Configure ontology peering

[Learn more about configuring ontology peering in Peer Manager](/docs/foundry/peer-manager/configure-ontology-peering/).
