---
sourceUrl: "https://www.palantir.com/docs/foundry/quiver/cards-formulas/"
canonicalUrl: "https://palantir.com/docs/foundry/quiver/cards-formulas/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "52ceb2a039db29d8eb2ea9e3f6af5018ecca1e67ea0c0d12c63514749d0dcd90"
product: "foundry"
docsArea: "quiver"
locale: "en"
upstreamTitle: "Documentation | Analysis > Formulas"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Formulas

Several types of Quiver cards allow you to type mathematical expressions into a formula box to transform data in your analysis. Inputs of formulas can be numbers, categorical charts, or time series. Quiver uses a custom mathematical expression language for formulas.

* Basic arithmetic operations are supported (multiplication, division, addition, subtraction, etc.), along with more complex mathematical expressions.
* You can refer to data in your analysis by using their global identifiers (e.g. `$A`).
* Quiver’s autocomplete will suggest built-in functions, along with matching inputs from your analysis based on their name.

The following Quiver card types support formulas:

* [Numeric formula](/docs/foundry/quiver/cards-index-numeric/#numeric-cards)
* [Numeric series formula](/docs/foundry/quiver/card-numeric-series-formula/)
* [Time series formula](/docs/foundry/quiver/card-time-series-formula/)
* [Categorical formula plot](/docs/foundry/quiver/card-categorical-formula-plot/)
* [Segment formula plot](/docs/foundry/quiver/card-segment-formula-plot/)

Formulas can also be found in some transform table transformations, such as Boolean formulas, numeric formulas, or time series formulas. In the transform table, you can reference input columns in formulas using the `@` symbol (e.g. `@column > 0`).

Consult the [formula syntax documentation](/docs/foundry/quiver/cards-formula-syntax/) for more details about supported expressions.
