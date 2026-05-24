---
sourceUrl: "https://www.palantir.com/docs/foundry/notepad/widgets-table-row-generator/"
canonicalUrl: "https://palantir.com/docs/foundry/notepad/widgets-table-row-generator/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "728a848919786537ad4566cd5d47d9deb87a2e0b020f9706adee3275ed9a3e6f"
product: "foundry"
docsArea: "notepad"
locale: "en"
upstreamTitle: "Documentation | Widgets > Table row generator"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Table row generator

:::callout{theme="neutral"}
This widget is only available for [document templates](/docs/foundry/notepad/templates-overview/).
:::

The **Table row generator** enables dynamically generating a row for each object in an object set that is passed to a Notepad document template. The Table row generator is very similar to the [**Section generator**](/docs/foundry/notepad/widgets-section-generator/#connect-embedded-sections-with-generator), but instead of generic sections, the Table row generator returns rows and can only be used in Notepad tables.

![notepad\_row\_generator](/docs/resources/foundry/notepad/notepad_row_generator.png)

The row generator can be inserted into a regular Notepad table via the table right-click menu or table **Insert** operations located in the toolbar. Alternatively, select **+ Add Widget** or type `/` in a paragraph field to open the [widget insertion menu](/docs/foundry/notepad/embed-widgets/#from-a-document), from which you can insert a Table row generator that is prefilled with one regular row and one generator row.

## Connect embedded widgets with the Table row generator

To connect an embedded widget's input parameter with its surrounding **Table row generator**, set the input to `Object from generator`. The `Object from generator` input item will be automatically selectable for widgets inside generators that accept object template inputs.

The figure below shows an example for an [object property](/docs/foundry/notepad/widgets-object-property/).

![notepad\_row\_generator\_connection](/docs/resources/foundry/notepad/notepad_row_generator_connection.png)

## Sort objects with the Table row generator

To sort the objects that are returned from a generator, use the **Sorting** controls. Select an object property to sort by from the `Sort by` dropdown. Note that the number of objects that can be sorted is **capped at 2000**.

The figure below shows an example of sorting Airline objects by the `Number of Aircraft` property.

![notepad\_widgets\_generator\_sort](/docs/resources/foundry/notepad/notepad_widgets_generator_sort.png)

## Template configuration

* **Generator object set RID:** An object set to pass to the Table row generator. The Table row generator will generate a table row for each object in this set. Note that the amount of objects that can be passed is currently **capped at 100 objects**.

## Nested table row generators

Table row generators can be [nested within a top-level section generator](/docs/foundry/notepad/widgets-section-generator/#nested-generators). Nested table row generators can be configured to generate over an object set template input, or over first-degree linked objects of the top-level generator object.

![A Notepad row generator linked objects generator.](/docs/resources/foundry/notepad/notepad_row_generator_linked_objects_from_generator.png)

## Table row generator object limits

By default, the generation limit for top-level table row generators is set to a maximum of 100 objects. For table row generators nested within a section generator, the limit is set to a maximum of 100 objects. Note that generating rows from a large set of objects can negatively impact template generation performance and document loading performance for the generated document.
