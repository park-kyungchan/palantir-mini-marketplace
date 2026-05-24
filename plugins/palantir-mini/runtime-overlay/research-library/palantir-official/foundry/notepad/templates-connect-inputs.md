---
sourceUrl: "https://www.palantir.com/docs/foundry/notepad/templates-connect-inputs/"
canonicalUrl: "https://palantir.com/docs/foundry/notepad/templates-connect-inputs/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "73843b9b26fe7991d338a43694d4046c0193e77bd92f680654f39459ab6a7200"
product: "foundry"
docsArea: "notepad"
locale: "en"
upstreamTitle: "Documentation | Templates > Connect inputs to widget"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Connect inputs to widget

After [adding template inputs](/docs/foundry/notepad/templates-inputs/) to your document, you need to connect the inputs to your templatizable widgets. Review the reference for each individual widget to learn more about which properties can be templatized for each widget in a document template.

Start by selecting the widget you want to connect to a template input and open the widget properties panel on the right. Then click on **Select** and select an existing template input or create a new one. This will connect the input with the widget.

In the example shown below, an [object property](/docs/foundry/notepad/widgets-object-property/) widget gets connected to the already existing `aircraft_parameter` input. After connecting it, the object property value is driven by the configured preview value for the `aircraft_parameter`.

![notepad\_template\_connect\_inputs](/docs/resources/foundry/notepad/notepad_template_connect_inputs.png)
