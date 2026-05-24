---
sourceUrl: "https://www.palantir.com/docs/foundry/fusion/create-templates/"
canonicalUrl: "https://palantir.com/docs/foundry/fusion/create-templates/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "cfe9fceb8388fe929ea8e789c0894240f1692a8e6ae5fde49c2cd33e328d77f7"
product: "foundry"
docsArea: "fusion"
locale: "en"
upstreamTitle: "Documentation | Sheets > Create templates"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Create templates

Any Fusion spreadsheet can be converted into a template under the document tab in the toolbar.

![template](/docs/resources/foundry/fusion/templates.png)

When a Fusion document is marked as a template, attempting to open the Fusion document (e.g. by clicking on it in Foundry or navigating directly to the document's URL) will not open the underlying spreadsheet; instead, a copy of the spreadsheet will be made (the user will be prompted to select a location).

If you’d like to edit the master template (rather than make a copy), right click on the spreadsheet in Foundry and select **Actions** > **Edit template Fusion sheet**.

![edit\_template](/docs/resources/foundry/fusion/edit_template.png)

You can also have custom links to Fusion spreadsheets that make a copy with a specific change to the sheet. An example of a URL that copies with cell value overrides would be */copy?Sheet1!A1=test*.
