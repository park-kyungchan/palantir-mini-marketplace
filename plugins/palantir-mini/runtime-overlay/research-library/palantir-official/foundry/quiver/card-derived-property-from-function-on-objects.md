---
sourceUrl: "https://www.palantir.com/docs/foundry/quiver/card-derived-property-from-function-on-objects/"
canonicalUrl: "https://palantir.com/docs/foundry/quiver/card-derived-property-from-function-on-objects/"
sourceLastmod: "2026-05-12T17:06:26.156Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "06d5e43dab5a2398551ea42f5e11bf482ce24c8c2300fd8cceb47ff6faf2e06a"
product: "foundry"
docsArea: "quiver"
locale: "en"
upstreamTitle: "Documentation | Detailed card index > Derived property from function on objects"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Derived property from function on objects

Add a new transform table column backed by a [Foundry function](/docs/foundry/functions/overview/). The new column can be of type boolean, string, number, or time, depending on the output of the function.

To use a function in this transform, it must satisfy the following requirements:

* The function input parameters must include an `ObjectSet<ObjectType>` parameter (and can optionally include other input parameters).
* The function return type must be a `FunctionsMap<ObjectType, CustomType>`.
* The `FunctionsMap` keys are objects with object IDs matching those in the table.
* The `FunctionsMap` values are primitives.

See [Function-backed columns](/docs/foundry/workshop/widgets-object-table/#function-backed-columns) for more information.

:::callout{theme="warning"}
When defining a function that returns a numerical value, we recommend returning either **Double** or **Integer** over **Float**.
:::

## Input type

String, number, time, boolean

## Output type

String

## Usage information

| Functionality | Availability |
| --- | --- |
| [Standard Quiver card](/docs/foundry/quiver/core-concepts/#cards) | Unsupported |
| [Transform table transform](/docs/foundry/quiver/cards-transform-table/) | Supported |
