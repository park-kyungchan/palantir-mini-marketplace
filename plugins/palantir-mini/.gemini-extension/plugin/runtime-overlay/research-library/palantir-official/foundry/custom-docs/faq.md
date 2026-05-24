---
sourceUrl: "https://www.palantir.com/docs/foundry/custom-docs/faq/"
canonicalUrl: "https://palantir.com/docs/foundry/custom-docs/faq/"
sourceLastmod: "2026-05-12T17:06:26.158Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "cf1d87f0497f811a958177167b0a6ea940e3051f6f65a2db2fa89d577e458a15"
product: "foundry"
docsArea: "custom-docs"
locale: "en"
upstreamTitle: "Documentation | Custom documentation > FAQ"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# FAQ

### What are the differences between standard Markdown and the syntax required for custom docs?

The most important differences from standard Markdown in the in-platform custom documentation are:

* Page titles must be specified with the `@` syntax (`@name` for `overview.md` or `@title` for non-overview pages), instead of an H1 header (`#`). Note that the actual filename and `@title` do not need to be the same.
* All pages must be specified in the [`ordering.md`](/docs/foundry/custom-docs/custom-docs-bundle-structure/) file to be published successfully.
* All pages must have a [*section annotation*](/docs/foundry/custom-docs/custom-docs-bundle-structure/#section-annotations) (for example, `@concept` or `@howto`).

### Does in-platform custom documentation support changelogs?

No, changelogs for custom documentation are currently not supported.

### Does custom documentation support branching?

You can work on branches in a documentation repository, but only the `master` branch is published to the in-platform custom documentation.

### Why does Markdown formatting not display in a callout?

Since [callouts](/docs/foundry/custom-docs/add-callouts/) are designated with HTML, Markdown formatting is not available between the `<div>` and `</div>` in the callout; for example, to bold text within a callout you should use the HTML syntax `<strong>This is bold text.</strong>` rather than the Markdown syntax `**This is bold text.**`
