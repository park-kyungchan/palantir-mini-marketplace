---
sourceUrl: "https://www.palantir.com/docs/foundry/workshop/widgets-scenario-selector/"
canonicalUrl: "https://palantir.com/docs/foundry/workshop/widgets-scenario-selector/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "622e0e134c50d0c647ad75ebf1ac4c851788ab22ccf6b8bc10e521b8b42727fb"
product: "foundry"
docsArea: "workshop"
locale: "en"
upstreamTitle: "Documentation | Scenarios > Widget: Scenario Selector"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Widget: Scenario Selector

The **Scenario selector** widget in Workshop allows a user to select a Scenario(s) from a list of Scenarios and output an active Scenario or Scenario array. Module builders configuring a Scenario Selector widget can enable user selection of separate single Scenarios or Scenario arrays either for comparison or to enable selection without giving users the ability to create Scenarios.

The screenshot below shows an example of a multi-select configuration of the Scenario selector. When placed in a section header, the widget becomes a dropdown instead of a panel.

![scenario\_selector\_example](/docs/resources/foundry/workshop/scenario-selector-overview.png)

## Configuration Options

Here is a screenshot of the initial state of a newly added Scenario Selector widget alongside its initial configuration panel:

![scenario\_selector\_example](/docs/resources/foundry/workshop/scenario-selector-config.png)

For the Scenario Selector widget, the core configuration options are the following:

* **Input data**
  * **Candidate Scenarios:** Select the appropriate Scenario array variable or list of Scenario variables to pull Scenarios into your selector.
  * **Output Scenario:** Choose between returning a Scenario array using multi-select or a single Scenario using single-select.
