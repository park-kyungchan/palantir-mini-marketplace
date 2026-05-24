---
sourceUrl: "https://www.palantir.com/docs/foundry/forms/sheets/"
canonicalUrl: "https://palantir.com/docs/foundry/forms/sheets/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "59a8da58f3c6ca4c1e56306fc52e9731e55b47933ed4d4f08546d61d36c0c0bc"
product: "foundry"
docsArea: "forms"
locale: "en"
upstreamTitle: "Documentation | Configure forms > Sheets"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Sheets

:::callout{theme="warning"}
Foundry Forms is no longer the recommended approach for data entry or writeback workflows on Foundry. Instead, build user input workflows with the Foundry Ontology, representing the relevant data structures as object types and configuring the writeback interaction with Actions. Learn more in the [Forms overview](/docs/foundry/forms/overview/) documentation.
:::

**Sheets** are wrappers around one or more fields. Each form includes one main sheet plus an optional number of **subsheets**. Like fields, sheets can be affected by [transforms](/docs/foundry/forms/transforms/), offering a convenient way to show, hide, or disable all fields within the sheet at once.

Through the Forms Visual Editor, users can perform a variety of sheet customizations:

* Set a title or hide the header and border.
* Set the number of columns.
* Set the default label position of all fields within the sheet.
* Set a description, and specify how it is displayed.
* Disable all fields within the sheet.
* Configure [multiplicity](/docs/foundry/forms/multiplicity/).

:::callout{theme="neutral"}
Sheets can only be added to the end of form. Users cannot add sheets to the middle of a form or add individual fields below sheets.
:::
