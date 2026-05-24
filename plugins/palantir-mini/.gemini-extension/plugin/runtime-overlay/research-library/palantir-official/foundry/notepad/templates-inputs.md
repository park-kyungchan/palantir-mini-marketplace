---
sourceUrl: "https://www.palantir.com/docs/foundry/notepad/templates-inputs/"
canonicalUrl: "https://palantir.com/docs/foundry/notepad/templates-inputs/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "5d38b74cbfa42d092cd446cc959451260b587bb5056cc2484a7c296336a014f1"
product: "foundry"
docsArea: "notepad"
locale: "en"
upstreamTitle: "Documentation | Templates > Add template inputs"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Add template inputs

Document templates accept input parameters which are used to drive the widget content in new documents created from the template.

To add a parameter to a document template, open the template and select the template inputs panel in the left panel of the application. Use the **+ Add template input** option to add a string, number, date, timestamp, object, or object set input. The widget type dictates what input type can be consumed.

For each template input, you can set a **preview value**. A preview value allows you to link a template input to a specified value while configuring the template. Note that a preview value is not a default value and has no relevance for the generation step. Preview values are only used for ensuring that input parameters and widgets are correctly set up.

Afterward, you can use the template inputs to [drive the configuration](/docs/foundry/notepad/templates-connect-inputs/) of your templatizable widgets.

Existing input parameters can be renamed and assigned a new preview value. You can also delete input parameters if they are not in use by any widget.

![Notepad template inputs left panel.](/docs/resources/foundry/notepad/notepad_template_add_inputs.png)
