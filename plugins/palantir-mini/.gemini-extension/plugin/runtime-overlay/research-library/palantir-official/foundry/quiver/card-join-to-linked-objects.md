---
sourceUrl: "https://www.palantir.com/docs/foundry/quiver/card-join-to-linked-objects/"
canonicalUrl: "https://palantir.com/docs/foundry/quiver/card-join-to-linked-objects/"
sourceLastmod: "2026-05-12T17:06:26.156Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "b15867770001d991e09459601d9ea258ef71f925d287ee848c3b561e5a6c8cc5"
product: "foundry"
docsArea: "quiver"
locale: "en"
upstreamTitle: "Documentation | Detailed card index > Join to linked objects"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Join to linked objects

Perform an inner join with linked objects using a link relation.

This is useful if you are trying to perform a visualization or calculation using properties across linked objects in the ontology.  The native object set card [switch to linked object set](/docs/foundry/quiver/card-switch-to-linked-object-set/) will only perform a link traversal, resulting in the linked objects, but will not retain the original object information in the same row.

Alternatively, if your set is larger than 50,000 rows and cannot use the transform table, use a [join materializations](/docs/foundry/quiver/card-join-materializations/) card to join objects across links at scale.

## Input type

Transform table

## Output type

Transform table

## Usage information

| Functionality | Availability |
| --- | --- |
| [Standard Quiver card](/docs/foundry/quiver/core-concepts/#cards) | Unsupported |
| [Transform table transform](/docs/foundry/quiver/cards-transform-table/) | Supported |

## See also

* [Join materializations](/docs/foundry/quiver/card-join-materializations/)
* [Switch to linked object set](/docs/foundry/quiver/card-switch-to-linked-object-set/)
