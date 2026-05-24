---
sourceUrl: "https://www.palantir.com/docs/foundry/insight/faq/"
canonicalUrl: "https://palantir.com/docs/foundry/insight/faq/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "f4618d838d42934e90515bd39a11fa3660fff523d4d6eddca715b30ca391c8fc"
product: "foundry"
docsArea: "insight"
locale: "en"
upstreamTitle: "Documentation | Insight > FAQ and troubleshooting"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# FAQ and troubleshooting

## How do I navigate to Ontology Manager from Insight?

If you are working with an analysis path that uses a *single* object type (not an object set), hover over the object type to view a pop-up card with more details. Select **Manage** in the top right corner to navigate to the object type page in Ontology Manager.

![The Manage button in the top right of the object type pop-up card provides a link to Ontology Manager.](/docs/resources/foundry/insight/get-to-ontology-manager.png)

## Does Insight work with AIP?

Insight will soon be able to integrate with [AIP Chatbots](/docs/foundry/chatbot-studio/overview/) (formerly known as AIP Agents) on the platform.

## What is the purpose of an object set if I can save and share my workbook?

Object sets let you save a curated view of your data for reuse across multiple applications (including [Quiver](/docs/foundry/quiver/objects-overview/#import-a-saved-object-set) and [Vertex](/docs/foundry/vertex/explore-object-relationships/)) without filtering or combining data each time. They also support direct modifications to object types, making them useful beyond what a workbook alone provides.

## How do I analyze an interface?

You can use interfaces to start an analysis and bring the relevant object types into the path. Expanded interface analysis support is coming soon.

## Can I rearrange the order of my step cards in the path?

Step cards in an analysis path cannot be rearranged; changing card order can produce unexpected results (for example, moving a filter card for an object type to a point after a link card would alter the resulting data). To reorganize an analysis path, first [duplicate the path](/docs/foundry/insight/analysis-panel/#path-menu), then add, delete, or disable steps as needed.

![Duplicate a path to explore different arrangements of your analytical step.](/docs/resources/foundry/insight/duplicate-path.png)
