---
sourceUrl: "https://www.palantir.com/docs/foundry/interfaces/interface-metadata/"
canonicalUrl: "https://palantir.com/docs/foundry/interfaces/interface-metadata/"
sourceLastmod: "2026-05-12T17:06:26.152Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "804e01a824e14a3bd27e4b935797cf61da6684ed285055311bf526ceb0dd1caf"
product: "foundry"
docsArea: "interfaces"
locale: "en"
upstreamTitle: "Documentation | Interfaces > Metadata reference"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Metadata reference

An interface is represented in the Ontology by the following metadata:

* **RID:** An automatically generated unique identifier for every resource in Palantir. An interface’s RID will be referenced in error messages across the platform.
* **Icon:** A picture and color used as a visual identifier that will appear in applications when a user views this interface. Interfaces have dashed lines around their icons to visually distinguish them from object type icons. For example, the building icon surrounded by dashed lines may be used to depict the `Facility` interface.
* **Display name:** The name shown to anyone accessing this interface in user applications. For example, the display name for the `Facility` interface may be "Facility".
* **Description:** Explanatory text about the interface that anyone can read in user applications. For example, the description of the `Facility` interface may be "An abstract object type interface for representing airline facilities".
* **API name:** The name used when referring to the interface programmatically in code. For example, the API name of the `Facility` interface may be `facility`.
* **Status:** A signal to users and Ontology builders about where in the development process the interface stands. It can be `active`, `experimental`, `example`, or `deprecated`. By default, the `Facility` interface will have the `experimental` status. Learn more about [statuses](/docs/foundry/object-link-types/metadata-statuses/).
* **Searchable:** A boolean value that specifies whether the interface is searchable. Searchable interfaces enable users to load or search all objects of the interface at once. Searchable interfaces are limited to 50 implementing object types, whereas non-searchable interfaces are limited to 1,000. By default, the `Facility` interface will be searchable.
