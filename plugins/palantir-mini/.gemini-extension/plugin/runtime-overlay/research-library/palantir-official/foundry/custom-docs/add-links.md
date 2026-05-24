---
sourceUrl: "https://www.palantir.com/docs/foundry/custom-docs/add-links/"
canonicalUrl: "https://palantir.com/docs/foundry/custom-docs/add-links/"
sourceLastmod: "2026-05-12T17:06:26.158Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "f328afab5e3050506e3db745bdbae9a18749bf8da422d82d2f7053543ee29be0"
product: "foundry"
docsArea: "custom-docs"
locale: "en"
upstreamTitle: "Documentation | Custom documentation > Add links to custom docs"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Add links to custom documentation pages

You can use standard Markdown syntax to add links to your custom docs. The standard Markdown syntax for adding a link is as follows:

```
[Display text for link](<link_url_or_reference>)
```

## Linking to a section on a page

The custom documentation supports standard Markdown anchor links to link directly to a Markdown header on a page. For example:

```
## This is a Markdown header

This [link](#this-is-the-destination-header) goes to the header below.

### This is the destination header

This [link](#this-is-a-markdown-header) goes to the first header in this example.
```

## Linking within the custom docs

You can also link to other custom documentation pages, even if they are in other custom documentation bundles, if you have the product ID for the destination. To do so, use `@product-id/page-name` in place of a URL in your Markdown link syntax.

For example, if you want to link to the overview of product `product-test`, you can use the following syntax:

```
This is a link to the [overview of the product](@product-test/overview).
```

You can use the same syntax for anchor links on a page as well:

```
This is a link to a section of the [overview of the product](@product-test/overview#section-header).
```

This syntax will automatically resolve to the correct link on the stack. If the link does not exist on your enrollment, the link will be replaced by plain text.

## Linking outside of the custom docs

You can create links to websites outside the Palantir platform with standard Markdown syntax. We recommend using the `↗` character to designate links external to the platform.

```
[Palantir website ↗](https://www.palantir.com)
```
