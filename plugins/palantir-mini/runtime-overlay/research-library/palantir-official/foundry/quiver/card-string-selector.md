---
sourceUrl: "https://www.palantir.com/docs/foundry/quiver/card-string-selector/"
canonicalUrl: "https://palantir.com/docs/foundry/quiver/card-string-selector/"
sourceLastmod: "2026-05-12T17:06:26.156Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "56a069e4ddf14eb307e738b06c32cef7382ecb59f1823dc3b8866420e545772b"
product: "foundry"
docsArea: "quiver"
locale: "en"
upstreamTitle: "Documentation | Detailed card index > String selector"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# String selector

Creates a multiselect (or single select) parameter based on an array of specified string values. This is useful when trying to restrict user selection to a set of predefined values in a dashboard.

Also commonly used in conjunction with the [**Unique column values (materialization)**](/docs/foundry/quiver/card-unique-column-values-materialization/) card to create a property value selector when using materializations. When selecting property values on object sets, a [property value select parameter](/docs/foundry/quiver/card-property-value-select-parameter/) can be used instead.

## Input type

String array

## Output type

String, String array

## Usage information

| Functionality | Availability |
| --- | --- |
| [Standard Quiver card](/docs/foundry/quiver/core-concepts/#cards) | Supported |
| [Transform table transform](/docs/foundry/quiver/cards-transform-table/) | Unsupported |
