---
sourceUrl: "https://www.palantir.com/docs/foundry/notepad/widgets-conditional-section/"
canonicalUrl: "https://palantir.com/docs/foundry/notepad/widgets-conditional-section/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "0fc0b82674a7d2b25d01b6719fda6eafa5185b5c4437e42699c0ff7594c183cf"
product: "foundry"
docsArea: "notepad"
locale: "en"
upstreamTitle: "Documentation | Widgets > Conditional section"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Conditional section

:::callout{theme="neutral"}
This widget is only available for [document templates](/docs/foundry/notepad/templates-overview/).
:::

**Conditional sections** in Notepad templates allow you to selectively include content in a generated document based on the value of a string template input.

![Example of a conditional section in a Notepad template.](/docs/resources/foundry/notepad/notepad_widgets_conditional_section_in_document.png)

## Add a conditional section

You can add a conditional section to a Notepad template by clicking **+ Add Widget** or typing `/` in a paragraph field to open the [widget insertion menu](/docs/foundry/notepad/embed-widgets/#from-a-document), then choosing the **Conditional Section** option under **Generator**.

First, select a string template input. You will be able to configure a rule based on the value of this template input.

!["Widget properties" panel for conditional section with no template input selected under "Configure template"](/docs/resources/foundry/notepad/notepad_widgets_conditional_section_without_template_input.png)

After selecting a string template input, you can configure a rule. The "If" section lets you set the condition of the rule, and the "then" section lets you set the consequence.

![Widget properties panel where "Configure template input" has doesPlaneNeedMaintenance with value YES, and "Configure rule" has the if/then statement "If doesPlaneNeedMaintenance is equal to YES, then Show"](/docs/resources/foundry/notepad/notepad_widgets_conditional_section_configured.png)

For example, if the `doesPlaneNeedMaintenance` template input equals `YES`, the contents of the conditional section will be displayed.

When a document is generated from a template, the rule configured by the user determines whether the conditional section's contents will be included in the generated document.

You can add a preview value to the selected template input to preview the behavior of the conditional section during template generation. The conditional section will have a green border if the contents will be displayed during template generation, and a red border if the contents will not be displayed.

## Template configuration

* **Configure template input:** Lets users pick a template input. The contents of the conditional section will be displayed if this template input satisfies the configured rule.

* **Configure rule:** Lets users configure the rule that determines whether the contents of the conditional section will be displayed.
