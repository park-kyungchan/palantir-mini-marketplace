---
sourceUrl: "https://www.palantir.com/docs/foundry/workshop/widgets-prominent-terms/"
canonicalUrl: "https://palantir.com/docs/foundry/workshop/widgets-prominent-terms/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "566d579d79f89922f8750d73ee2b8db873cf8985deae0bcf3b49daad3da4681e"
product: "foundry"
docsArea: "workshop"
locale: "en"
upstreamTitle: "Documentation | Filtering widgets > Prominent Term"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Prominent Terms \[Beta]

:::callout{theme="neutral" title="Beta"}
The Prominent Terms widget is in the [beta](/docs/foundry/platform-overview/development-life-cycle/) phase of development and may not be available on your enrollment. Functionality may change during active development. Contact Palantir Support to request access to this widget.
:::

Use the **Prominent Terms** widget to define prominently-used terms and phrases to match on within an object set. Showcase the number of matched results, and use the widget as a way to define a custom set of terms for users to apply as filters.

\<img src=./media/widgets-prominent-terms.png alt="Prominent Terms widget example" width=400>

## Configuration options

* **Base object set:** Define an object set from which to base the filter options.
* **Property:** Select a property on which to filter.
* **Filter variable:** An object set filter variable that contains the currently applied filtering criteria from the widget; this can be used to filter object set variables within this module.
* **Hide empty terms:** Toggle to enable/disable hiding terms that return with no results.
* **Terms:**
  * **Filter using value:** The value on which to filter the object set, determining the total count of results returned to display in the term’s row. Note that the filter uses an exact match.
  * **Display name:** The name displayed in the term’s row.
  * **Icon:** Add an icon to display to in the term’s row.
