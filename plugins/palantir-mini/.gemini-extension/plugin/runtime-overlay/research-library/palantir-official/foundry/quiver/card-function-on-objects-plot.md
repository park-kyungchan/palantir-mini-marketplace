---
sourceUrl: "https://www.palantir.com/docs/foundry/quiver/card-function-on-objects-plot/"
canonicalUrl: "https://palantir.com/docs/foundry/quiver/card-function-on-objects-plot/"
sourceLastmod: "2026-05-12T17:06:26.156Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "0c3884662e0074725ade0407d72f5269dd72ea62949c085220592f9f11357dbf"
product: "foundry"
docsArea: "quiver"
locale: "en"
upstreamTitle: "Documentation | Detailed card index > Code function categorical plot"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Code function categorical plot

Use a [Function](/docs/foundry/functions/overview/) to create a categorical chart (bar, line, scatter) in Quiver.

Configuring a code function categorical plot requires writing a function that returns either a `TwoDimensionalAggregation` or `ThreeDimensionalAggregation`.

The function should be the same as the one used for a [function-backed workshop chart layer](/docs/foundry/workshop/widgets-chart/#function-aggregations-function-backed-layers).

## Input type

Object set, single object

## Output type

Categorical chart

## See also

[Categorical formula plot](/docs/foundry/quiver/card-categorical-formula-plot/)

## Usage information

| Functionality | Availability |
| --- | --- |
| [Standard Quiver card](/docs/foundry/quiver/core-concepts/#cards) | Supported |
| [Transform table transform](/docs/foundry/quiver/cards-transform-table/) | Unsupported |
