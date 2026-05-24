---
sourceUrl: "https://www.palantir.com/docs/foundry/workshop/formatting/"
canonicalUrl: "https://palantir.com/docs/foundry/workshop/formatting/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "798772c67b3c868e524a85cf29f4aa7dde7970409edc8f1ef0579fc072bf37f6"
product: "foundry"
docsArea: "workshop"
locale: "en"
upstreamTitle: "Documentation | Workshop > Formatting"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Formatting

Workshop offers many formatting options across widgets that help users style their displays. In this section, we walk through two of these options: value formatting and conditional formatting.

## Value formatting

**Value formatting** applies special formatting when rendering values in user-facing applications, making raw values more display-friendly. In Workshop, value formatting can be used to render values when setting up time series property columns in the Object Table widget and time series property displays in the Metric Card widget. This formatting is local to the Workshop module, and not global to the ontology. [Learn more about setting up value formatting.](/docs/foundry/object-link-types/value-formatting/)

The example below shows how value formatting is used to style the value displayed in an Object table column named `Weekly Cases`, that features the weekly number of COVID-19 cases observed in each country.

![value\_formatting](/docs/resources/foundry/workshop/value_formatting.png)

## Conditional formatting

**Conditional formatting** applies rules to determine how numbers and sparklines are styled. In Workshop, conditional formatting can be used to style time series property columns in the Object Table widget and time series property displays in the Metric Card widget. This formatting is local to the Workshop module, and not global to the ontology. [Learn more about setting up conditional formatting.](/docs/foundry/object-link-types/conditional-formatting/)

The example below shows how conditional formatting is used to style the summarized value and the sparkline displayed in an Object table column named `Weekly Cases`, that features the weekly number of COVID-19 cases observed in each country.

![object\_table\_conditional\_formatting\_example](/docs/resources/foundry/workshop/object_table_conditional_formatting_example.png)
