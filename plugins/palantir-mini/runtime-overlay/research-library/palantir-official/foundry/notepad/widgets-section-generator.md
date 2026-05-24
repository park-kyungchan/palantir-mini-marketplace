---
sourceUrl: "https://www.palantir.com/docs/foundry/notepad/widgets-section-generator/"
canonicalUrl: "https://palantir.com/docs/foundry/notepad/widgets-section-generator/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "98c8a7d4fdfee3a97bef0a8ed09e0ecaf1ba93a4ff3b60d26b63aa3fbc0ba089"
product: "foundry"
docsArea: "notepad"
locale: "en"
upstreamTitle: "Documentation | Widgets > Section generator"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Section generator

:::callout{theme="neutral"}
This widget is only available for [document templates](/docs/foundry/notepad/templates-overview/).
:::

![notepad\_section\_generator\_concept](/docs/resources/foundry/notepad/notepad_section_generator_concept.png)

The **Section generator** allows you to dynamically generate document content for every object in an object set. This generation step happens when a Notepad document is generated from the template (see figure above for a visualization of the concept).

To set up a Section generator, add it by clicking **+ Add Widget** or typing `/` in a paragraph field to open up the [widget insertion menu](/docs/foundry/notepad/embed-widgets/#from-a-document) and choosing the Section generator. Then, connect an object set template input by selecting the widget and configuring the **Generator object set** as shown in the figure below.

![notepad\_section\_generator\_template\_input](/docs/resources/foundry/notepad/notepad_section_generator_template_input.png)

### Connect embedded sections with generator

To connect an embedded widget's input parameter with its surrounding **Section Generator**, you need to set the parameter to `Object from Generator`. This parameter will be automatically selectable for widgets inside generators that accept object template inputs.

The figure below shows an example for an [object property](/docs/foundry/notepad/widgets-object-property/).

![notepad\_section\_generator\_connection](/docs/resources/foundry/notepad/notepad_section_generator_connection.png)

## Sort objects with the Section generator

To sort the objects that are returned from a generator, use the **Sorting** controls. Select an object property to sort by from the `Sort by` dropdown. Note that the number of objects that can be sorted is **capped at 2000**.

The figure below shows an example of sorting Airline objects by the `Number of Aircraft` property.

![notepad\_widgets\_generator\_sort](/docs/resources/foundry/notepad/notepad_widgets_generator_sort.png)

## Template configuration

* **Generator object set RID:** An object set to pass to the Section generator. The Section generator content will be generated for each object in this set. Note that the number of objects that can be passed is **capped at 30 objects**. Objects exceeding this limit will be ignored.

## Nested generators

Generators can be nested in a top-level section generator. We only support nesting generators one level deep, at most. The top-level section generator object can be configured to generate over an object set template input. A nested generator can be configured to generate over an object set template input, or over first-degree linked objects of the top-level generator object.

![A Notepad section generator linked objects generator.](/docs/resources/foundry/notepad/notepad_section_generator_linked_objects_from_generator.png)

## Section generator object limits

By default, the generation limit for top-level section generators is set to a maximum of 30 objects. For nested section generators, the limit is set to a maximum of 100 objects. Note that generating sections from a large set of objects can negatively impact template generation performance and document loading performance for the generated document.
