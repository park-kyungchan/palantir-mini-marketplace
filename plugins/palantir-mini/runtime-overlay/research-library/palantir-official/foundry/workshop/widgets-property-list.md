---
sourceUrl: "https://www.palantir.com/docs/foundry/workshop/widgets-property-list/"
canonicalUrl: "https://palantir.com/docs/foundry/workshop/widgets-property-list/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d0e6372afd6b4aa355ca6ea72e15596cd60c2f0567393e2dc12b2e002ab6e4ca"
product: "foundry"
docsArea: "workshop"
locale: "en"
upstreamTitle: "Documentation | Core display widgets > Property List"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Property List

The **Property List** widget displays a list of properties from a single provided object.

<img src="./media/widgets-property-list.png" alt="Property list example" width=600>

## Configuration Options

* **Input object set**
  * The input variable which determines the object data that will be displayed within the widget.
  * If the object set contains more than one object, only the first object will be displayed within the widget.
* **Load data from scenario**
  * If toggled on, allows loading object data from a selected [Scenario](/docs/foundry/workshop/scenarios-overview/).
* **Layout**
  * Adjusts the positioning of properties displayed in the widget. Property values can either be displayed adjacent to their corresponding property type labels or below.
* **Property configuration**
  * Select which properties to be displayed in the widget and specify the number of columns displayed.
* **Hide null properties**
  * If enabled, null properties will be hidden from the list.

### Unsupported property types

Some large properties, such as Geoshape and Vector, are not loaded by default to improve performance. In View mode, users can select **Load** next to an unsupported property to reveal its value on demand. During configuration, unsupported properties are indicated with a warning icon and tooltip.

## Inline editing

The Property List widget supports inline editing of property values. To enable inline editing for a property, configure an inline action for the property in the Ontology Manager. Once the inline action is configured, users can edit property values directly within the Property List widget.

:::callout{theme="neutral"}
If inline editing is not working for a property in the Property List widget, verify that an inline action has been configured for that property in the Ontology Manager.
:::
