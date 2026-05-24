---
sourceUrl: "https://www.palantir.com/docs/foundry/workshop/widgets-object-view/"
canonicalUrl: "https://palantir.com/docs/foundry/workshop/widgets-object-view/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "e31c61dd54026d2da204b232eef7152f07bbc2821ed09008429d740f45654a57"
product: "foundry"
docsArea: "workshop"
locale: "en"
upstreamTitle: "Documentation | Core display widgets > Object View"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Object View

The **Object View widget** provides detailed information about a single object by displaying an embedded [object view](/docs/foundry/object-views/overview/) within a Workshop module. A builder configuring an Object View widget can:

* Choose the input object set, which determines the object that will be displayed.
* Choose between the [full](/docs/foundry/object-views/use-full-views-in-platform/) or [panel](/docs/foundry/object-views/use-panel-views-in-platform/) object view.
* Hide or display the object view header.
* Define a mapping of variables for the interface of the object view.
* Customize the tab behavior of the full object view.

This is an example of a configured Object View widget displaying a single `Airport` object:

<img alt="Object View widget example" src="./media/object_view_example.png" height="400"/>

## Configuration options

This is the initial state of an Object View widget and its configuration panel:

<img alt="Blank Object View widget configuration" src="./media/object_view_empty.png" height="400"/>

### Core configuration options

* **Input data**
  * **Object to display:** The input variable that determines the object(s) that will be displayed. For the full object view form factor, only the first object will be shown if the object set contains multiple objects. For the panel object view form factor, the display behavior depends on the [configured panel behavior.](#form-factor-configuration-options)
* **Display & formatting**

  * **Form factor:** Controls whether the full or panel object view is displayed. See [form factor configuration options](#form-factor-configuration-options) below for additional configuration available for each form factor.
  * **Hide header:** If toggled on, the object view header will be hidden.
  * **Empty state:** Configures the appearance when the widget's input variable is empty. Builders can select an icon and configure a custom message to display.

    <img alt="Object View widget custom empty state example" src="./media/object_view_custom_empty_state.png" height="400"/>

### Form factor configuration options

* **Full object view**
  * **Hide tabs:** Hides the tabs of the object view. Tabs are always hidden for object views with a single tab, so this is only applicable to object views with multiple tabs. Users will be unable to navigate to different tabs of the object view when this option is selected.

  * **Go to initial tab on object switch:** Automatically navigates back to the initial tab when the displayed object changes. The initial tab is the first tab in the object view by default, but can be configured to a different tab using the parameter below.

  * **Initial object view tab ID:** This controls the tab that will initially display when the object view is first opened. If not configured, the first tab will show by default.

  * **Interface configuration:** Defines a mapping from the current module's variables to an object view tab's [module interface](/docs/foundry/workshop/module-interface/). Start by adding an object type to the mapping, then select a tab that has a module interface defined and populate the interface. For more details, visit the [interface configuration section](/docs/foundry/workshop/embedded-modules/#interface-configuration) for embedded modules. [Legacy object view](/docs/foundry/object-views/config-legacy-object-views/) tabs are not supported.

  * **Revert to legacy widget:** This downgrades the object view widget to the legacy version. The legacy widget loads legacy object view tabs faster, but does not support interface configuration.

* **Panel object view**
  * **Panel behavior:** Controls how the panel displays objects based on the input object set. Three modes are available:

    * **Object instance:** Always displays the first object of the input object set as a single object view, regardless of the object count.
    * **Adaptive:** Automatically switches between object instance view and object set view based on the input. When the object set contains exactly one object, it displays the object instance view. When the object set contains zero or multiple objects, it displays the object set view.
    * **Object set:** Always displays the object set view, regardless of the object count.

    <img alt="Object view panel behavior" src="./media/object_view_panel_behavior.png" height="250"/>

  * **Interface configuration:** Defines a mapping from the current module's variables to an object view panel's [module interface](/docs/foundry/workshop/module-interface/). Configure this by adding an object type to the mapping and populating the panel's module interface. For more details, visit the [interface configuration section](/docs/foundry/workshop/embedded-modules/#interface-configuration) for embedded modules.

    <img alt="Object View module interface mapping" src="./media/object_view_module_interface.png" height="250"/>
