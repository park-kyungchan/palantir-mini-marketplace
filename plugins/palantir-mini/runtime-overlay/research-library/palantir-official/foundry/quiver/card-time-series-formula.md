---
sourceUrl: "https://www.palantir.com/docs/foundry/quiver/card-time-series-formula/"
canonicalUrl: "https://palantir.com/docs/foundry/quiver/card-time-series-formula/"
sourceLastmod: "2026-05-12T17:06:26.156Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "7bceb97d043995265c148f16442788ed376bcfb4df426e46034c88beda24500e"
product: "foundry"
docsArea: "quiver"
locale: "en"
upstreamTitle: "Documentation | Detailed card index > Time series formula"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Time series formula

In the formula box, use any of the assigned plot variable names to type in a mathematical formula returning a numerical value.

* Basic arithmetic operations are supported (multiplication, division, addition, or subtraction, for example), along with more complex mathematical expressions.
* Quiver’s autocomplete will suggest built-in functions along with existing series based on parameter name or series properties.
* Quiver uses a custom mathematical expression language for formulas. More details about supported expressions are available in the [formula documentation](/docs/foundry/quiver/cards-formula-syntax/).
* The Object selector is optional and must only be filled out when using the '@' symbol to reference properties.

[Learn more about how interpolation affects this operation.](/docs/foundry/quiver/cards-interpolation-usage/#time-series-formula)

## Input type

Time series

## Output type

Time series

## Examples

![TS formula example](/docs/resources/foundry/quiver/card-ts-formula.png)

## Usage information

| Functionality | Availability |
| --- | --- |
| [Standard Quiver card](/docs/foundry/quiver/core-concepts/#cards) | Supported |
| [Transform table transform](/docs/foundry/quiver/cards-transform-table/) | Supported |
