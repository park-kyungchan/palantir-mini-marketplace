---
sourceUrl: "https://www.palantir.com/docs/foundry/workshop/widgets-numeric-input/"
canonicalUrl: "https://palantir.com/docs/foundry/workshop/widgets-numeric-input/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "a749e5423a7407d7e313ade2edad8c01d91d900d44d5fe4e6ba8efbc57ec8d09"
product: "foundry"
docsArea: "workshop"
locale: "en"
upstreamTitle: "Documentation | Filtering widgets > Numeric Input"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Numeric Input

The Numeric Input widget allows users to enter numeric values.

## Configuration Options

* **Label**
  * Sets an optional label for the widget. This text is displayed across the top of the widget.
* **Show grouping**
  * If toggled on, formats the numeric input with a comma style thousands separator.
* **Include option to reset to default value**
  * If toggled on, adds a button on the widget’s for clearing out the input field.
* **Unit prefix**
  * If toggled on, displays read-only text or icon of choice in the left-hand side of the widget’s input field.
* **Unit suffix**
  * If toggled on, displays a read-only suffix in the right-hand side of the widget’s input field. The suffix can be text, an icon of choice, or a percent sign. If the percent sign is selected, the output variable of the widget will be the user-entered value divided by 100 to convert the value to percentage form.
* **Output data**
  * **Numeric value:** Output variable of the widget, storing the user’s inputted numeric value.
