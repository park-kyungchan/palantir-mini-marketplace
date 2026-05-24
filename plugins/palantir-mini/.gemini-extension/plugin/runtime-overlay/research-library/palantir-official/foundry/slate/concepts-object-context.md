---
sourceUrl: "https://www.palantir.com/docs/foundry/slate/concepts-object-context/"
canonicalUrl: "https://palantir.com/docs/foundry/slate/concepts-object-context/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "c9128a62b7e5ae71ccc882658ced18d42b3a6ce3a9250b076a9d9d50b8fafce5"
product: "foundry"
docsArea: "slate"
locale: "en"
upstreamTitle: "Documentation | Read and write data > Retrieve individual objects"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Retrieve individual objects

The Object Context panel lets you:

* Access the properties of an object directly using `{{o_object_context1.property1}}` notation, instead of manipulating JSON.
* Create a Slate application that will be dependent on a single object, which is a common pattern when using Slate to build a tab or custom widget to embed in an Object View.

## Constructing an Object Context

To construct an Object Context `o_object_context1`, you need to enter a single object RID by:

* Referencing a function or object query that returns a single RID (like `{{return_single_object}}`), or by
* Directly entering a static object RID, like `ri.phonograph2-objects.main.object.09d2e0e9-dd3c-49b2-8b96-0cb1bf005c1d`.

![object-context](/docs/resources/foundry/slate/object-context.png)

Once the Object Context is defined, you will be able to:

* Access its properties (for example, `o_object_context1.title or o_object_context1.property1`) and
* Use this output in the rest of Slate’s functions, variables, events, or widget properties.
