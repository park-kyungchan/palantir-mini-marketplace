---
sourceUrl: "https://www.palantir.com/docs/foundry/quiver/card-set-math/"
canonicalUrl: "https://palantir.com/docs/foundry/quiver/card-set-math/"
sourceLastmod: "2026-05-12T17:06:26.156Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "411fd10a807b87e34d89d0176c372347aba42457fea6ad8fef0e8aeb7a46335f"
product: "foundry"
docsArea: "quiver"
locale: "en"
upstreamTitle: "Documentation | Detailed card index > Set math"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Set math

Takes as input two (or more) object sets *of the same type* and returns a combined object set based on operations defined by the user. Supported operations are the union, intersection, or difference of two object sets.

## Input type

Object set

## Output type

Object set

## Examples

In the example below, we are using set math to find the difference between a set of 48,895 Airbnb objects (`$B`) and a filtered set of 22,326 Airbnb objects (`$D`). The output is the set (`$E`) of 26,569 Airbnb objects in `$B` but not in `$D`.

Airbnb data used in this example is open source.

![Example of set math](/docs/resources/foundry/quiver/resource-set-math.png)

## Usage information

| Functionality | Availability |
| --- | --- |
| [Standard Quiver card](/docs/foundry/quiver/core-concepts/#cards) | Supported |
| [Transform table transform](/docs/foundry/quiver/cards-transform-table/) | Unsupported |
