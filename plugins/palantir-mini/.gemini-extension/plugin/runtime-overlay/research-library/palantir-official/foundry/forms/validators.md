---
sourceUrl: "https://www.palantir.com/docs/foundry/forms/validators/"
canonicalUrl: "https://palantir.com/docs/foundry/forms/validators/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "5e427b710f5cdd8cf7cbc3128489f8572b1b0c2d4a28bbe6fc068cae8acbdc76"
product: "foundry"
docsArea: "forms"
locale: "en"
upstreamTitle: "Documentation | Core concepts > Validators"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Validators

:::callout{theme="warning"}
Foundry Forms is no longer the recommended approach for data entry or writeback workflows on Foundry. Instead, build user input workflows with the Foundry Ontology, representing the relevant data structures as object types and configuring the writeback interaction with Actions. Learn more in the [Forms overview](/docs/foundry/forms/overview/) documentation.
:::

In Foundry Forms, each form field can have one or more validators to guard against malformed input. Some examples of validators are:

* **Regex:** Value must match some [regular expression ↗](http://regexr.com/).
* **Required:** Value must be filled.
* **Range:** Value must be between `min` and `max` values.

:::callout{theme="neutral"}
The respondent will not be able to submit the form until all validator criteria is met.
:::

## Add validators

To add validators to a form field, follow the steps below:

1. First, double-click the field to open the Visual Editor in the right sidebar.
2. Next, from the **Validators** tab, toggle on the desired validators. <br><br>
   ![Configure validator criteria](/docs/resources/foundry/forms/add-validators-to-form.png) <br><br>
3. Configure the validators as necessary.
4. Select the green **Save** button in the bottom right.
