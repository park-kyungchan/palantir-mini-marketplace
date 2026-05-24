---
sourceUrl: "https://www.palantir.com/docs/foundry/custom-widgets/auto-sizing/"
canonicalUrl: "https://palantir.com/docs/foundry/custom-widgets/auto-sizing/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "262ebb992db66e7599e987d7d46299183d0317adad8bc2335824085965afb8b7"
product: "foundry"
docsArea: "custom-widgets"
locale: "en"
upstreamTitle: "Documentation | Custom widgets > Auto sizing"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Auto sizing

Custom widgets can be used in two types of layouts:

1. To fill the provided container space given by the parent application, for example in Workshop "absolute" and "flex" layouts.
2. To control the container size based on content size, for example in Workshop "auto" layouts.

To achieve option one, custom widget styles can apply `height: 100%` and/or `width: 100%` as is appropriate to the document HTML and body elements. This should make child content responsive to the available space.

To achieve option two, the height and/or width of the document body element will be used for auto sizing in the parent application. Custom widget styles **should not** apply `height: 100%` or `width: 100%` to the document HTML and body elements. Instead, custom widget styles should ensure that the size of the document body element responsively grows or shrinks with respect to the size of its child content. A minimum version of [`@osdk/widget.client-react` ↗](https://www.npmjs.com/package/@osdk/widget.vite-plugin) `3.3.0` is required for this functionality.
