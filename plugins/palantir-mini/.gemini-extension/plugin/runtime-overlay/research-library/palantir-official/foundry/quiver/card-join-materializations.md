---
sourceUrl: "https://www.palantir.com/docs/foundry/quiver/card-join-materializations/"
canonicalUrl: "https://palantir.com/docs/foundry/quiver/card-join-materializations/"
sourceLastmod: "2026-05-12T17:06:26.156Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "60a3c56ed5bd069f9bfeb49eefdf81e5c601c4b22eb3399b57981b2bcc6915fc"
product: "foundry"
docsArea: "quiver"
locale: "en"
upstreamTitle: "Documentation | Detailed card index > Join materializations"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Join materializations

Performs a left, inner or right join of two materialized object data sets. Select which columns of data you wish to retain from the source and joining materializations. Optionally, add a prefix to incoming columns to avoid name collisions with existing columns, or to annotate the joined columns.

This is useful if you are trying to perform a visualization or calculation using properties across linked objects in the ontology. The native object set card [switch to linked object set](/docs/foundry/quiver/card-switch-to-linked-object-set/) will only perform a link traversal, resulting in the linked objects, but will not retain the original object information in the same row.

Alternatively, at smaller scales (less than 50,000 objects), a [join to linked objects](/docs/foundry/quiver/card-join-to-linked-objects/) card can be used in the transform table.

<img src="./media/join-materializations-panel.png" alt="Configuration panel for Join materializations" width="400">

## Input type

Object Set, Materialization

## Output type

Materialization

## Usage information

| Functionality | Availability |
| --- | --- |
| [Standard Quiver card](/docs/foundry/quiver/core-concepts/#cards) | Supported |
| [Transform table transform](/docs/foundry/quiver/cards-transform-table/) | Unsupported |

## See also

* [Join to linked objects](/docs/foundry/quiver/card-join-to-linked-objects/)
* [Switch to linked object set](/docs/foundry/quiver/card-switch-to-linked-object-set/)
