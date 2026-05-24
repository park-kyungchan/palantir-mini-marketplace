---
sourceUrl: "https://www.palantir.com/docs/foundry/notepad/widgets-contour-chart/"
canonicalUrl: "https://palantir.com/docs/foundry/notepad/widgets-contour-chart/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "391a9a2214661277a4f25b34ddb664656765d3c8d2c76ab7bb5d656fbe633c29"
product: "foundry"
docsArea: "notepad"
locale: "en"
upstreamTitle: "Documentation | Widgets > Contour chart"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Contour chart

Charts and tables from [Contour](/docs/foundry/contour/overview/) analyses can be embedded using the **Contour chart** section. You can add one either by clicking + Add Widget or typing / in a paragraph field to open up the [widget insertion menu](/docs/foundry/notepad/embed-widgets/#from-a-document), or directly via the [Copy for Notepad button](/docs/foundry/notepad/embed-widgets/#from-a-resource) on the Contour analysis itself.

Note that the source data is updated by Notepad when you open a Notepad document with a Contour board.

![notepad\_widgets\_contour\_chart\_with\_parameters](/docs/resources/foundry/notepad/notepad_widgets_contour_chart_with_parameters.png)

:::callout{theme="neutral" title="Interactive locking for the Contour widget"}
The lock data feature on the Contour widget functions differently from other widgets. When applied, it locks both the visualization and data of the Contour widget while still allowing user interaction. On the other hand, locking other widgets produces a non-interactive snapshot of the widget. Interactively locked widgets will not load the locked visual if the backing transactions have been deleted either manually or by a retention policy. Contour widgets will not lock if they are configured with [Notepad template input parameters](/docs/foundry/notepad/templates-inputs/). <br><br>
For more information, refer to the [documentation on the lock data feature.](/docs/foundry/notepad/snapshot-widgets/)
:::

### Widget properties

* **Path:** Specify a path from the selected Contour Analysis.
* **Board:** Define which board should be shown from the selected path.
* **Parameters:** (Case-dependent) The parameters configuration will only be shown if the source Contour analysis defines and uses [parameters](/docs/foundry/contour/analysis-parameterize/). The configuration allows overwriting these parameter variable values separately. If no value is specified, the default parameter value from the Contour analysis will be used.

### Template configuration

**Parameter overrides:** (Optional) You can specify Notepad template input parameters to override Contour parameters. These values will be passed to the embedded Contour chart, allowing you to customize the chart's [external parameters](/docs/foundry/contour/analysis-parameterize/). To enable this configuration option in Notepad, ensure that the Contour chart is set up to use Contour parameters. If the chart does not use Contour parameters, this configuration option will not be available.

In a Notepad template there are two editing modes for overriding Contour parameters with template input parameters; **Use form** and **Use JSON**.

#### Use form

This is the default mode for overriding Contour parameters. You can map individual Contour parameters to Notepad parameters. There are two ways to input override values:

* **Static input values:** Directly enter values into fields. These values remain static for each Notepad document generated.
* **Notepad template input parameters:** Use a [Notepad template input](/docs/foundry/notepad/templates-inputs/) parameter that matches the type of the Contour parameter.

**Note:** Contour parameters may be configured to allow multiple values. Since Notepad does not currently support array parameters, you must use the **Use JSON** editing mode to override these parameters. In **Use form** mode, these values can be overridden with a single value, but the option to configure a template input parameter is not available.

![The "Use form" mode in the Notepad Contour widget.](/docs/resources/foundry/notepad/notepad_widgets_contour_use_form.png)

#### Use JSON

In this mode, you can specify a single JSON string for Contour parameters and their associated override values. To switch to this mode select **Use JSON**. The override values will be passed to the embedded Contour chart to override its [external parameters](/docs/foundry/contour/analysis-parameterize/).

![notepad\_widgets\_contour\_use\_json](/docs/resources/foundry/notepad/notepad_widgets_contour_use_json.png)

Below are examples of how to provide the required JSON string:

|Contour input type	|Example Contour parameter name	|Example JSON string	|
|---	|---	|---	|
|String | `carrier_code`	|`{"carrier_code": "OO"}`	|
|Array of String | `carrier_codes`	|`{"carrier_codes": ["OO", "MQ"]}`	|
|Number	| `booking_class`| `{"booking_class": 2}`	|
|Array of Number	| `booking_classes`| `{"booking_classes": [1,2]}`	|
|Date	| `departure_date` |`{"departure_date": "2022-09-01T00:00:00+02:00"}`|

You can combine multiple values into a single JSON string as shown below:

`{"carrier_code": "OO", "booking_class": 2}`

Refer to the example below on how to provide a template input with a preview value and connect it to the Contour parameters.

![notepad\_widgets\_contour\_chart\_with\_parameters](/docs/resources/foundry/notepad/notepad_widgets_contour_parameter_overwrite.png)
