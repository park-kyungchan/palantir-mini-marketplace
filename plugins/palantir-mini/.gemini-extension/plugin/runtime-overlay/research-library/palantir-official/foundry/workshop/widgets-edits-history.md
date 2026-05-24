---
sourceUrl: "https://www.palantir.com/docs/foundry/workshop/widgets-edits-history/"
canonicalUrl: "https://palantir.com/docs/foundry/workshop/widgets-edits-history/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "e341f1caf17ef2da6cbc9844c9dcbf3e603947a76931ae62a5db9a271a68e153"
product: "foundry"
docsArea: "workshop"
locale: "en"
upstreamTitle: "Documentation | Visualization widgets > Edit History"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Edit History

The **Edit History** widget displays the list of user edits made to an object's properties after [**Track user edit history**](/docs/foundry/object-edits/user-edit-history/) has been enabled for the object type within Ontology Manager. Edits completed prior to enabling Edit History, edits completed by a pipeline, or edits completed while on Object Storage V1 will not be reflected.

## Audit trail and data permanence

The Edit History widget provides an **immutable audit trail** of all changes made to ontology objects. Changelog records are designed for auditing purposes and **cannot be deleted or modified** by end users, even if the corresponding ontology edits are reverted or deleted. This ensures a permanent and accurate history of all changes for compliance and traceability requirements.

<img src="./media/widgets_edits_history_example.png" alt="Edits history example">

## Configuration options

* **Object set**
  * The input variable which determines the object data that will be displayed within the widget.
  * If the object set contains more than one object, only the first object will be displayed within the widget.
* **Edits sort order**
  * Specify how edits should be ordered, either oldest-to-newest or newest-to-oldest.
* **Property configuration**
  * Select the properties to be displayed in the widget. You may also choose to display all properties on an object.
