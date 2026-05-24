---
sourceUrl: "https://www.palantir.com/docs/foundry/workshop/scenarios-load/"
canonicalUrl: "https://palantir.com/docs/foundry/workshop/scenarios-load/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "f1d492277638efd81c3793e9b6d33f1fb13e12a234a0ae38b28703b19466d102"
product: "foundry"
docsArea: "workshop"
locale: "en"
upstreamTitle: "Documentation | Scenarios > Load scenarios"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Load scenarios

Saved Scenario objects can be loaded into Workshop modules via the variable system. These saved Scenarios can be passed to the Scenario Manager, but can also be passed directly to any other Scenario-enabled widgets as well.

To load a saved Scenario, create a new Scenario array variable and select the “Scenario loaded from object set” option. This will convert an object set of objects that implement the Scenario trait into an array of Scenario objects.

![create-scenario-array-from-object](/docs/resources/foundry/workshop/create-scenario-array-from-object.png)

The object set can be populated using a normal object set variable which enables Search Arounds and filtering to access specific sets of Scenarios. In the example below, we find all Scenarios associated with a particular object selected in the application.

![select-scenario-object-set](/docs/resources/foundry/workshop/select-scenario-object-set.png)

If configured correctly, you will be able to preview the loaded Scenarios by name in the current value section of the variable tab.

![preview-scenario-array](/docs/resources/foundry/workshop/preview-scenario-array.png)

The Scenario array variable can then be used in any widget that accepts a Scenario array, such as the Scenario manager, and the widget will update to reflect the loaded scenarios as the underlying variables update.

![select-scenario-array](/docs/resources/foundry/workshop/select-scenario-array.png)

Events and Actions that cause the underlying Scenario Object Set to change will be reflected in the Scenario array variable. This allows for very flexible loading structures based on relationships to other Objects in the application. If you need to select a specific Scenario from the array to use in other widgets you can pass the array into either the Scenario manager or the Scenario selector widgets.
