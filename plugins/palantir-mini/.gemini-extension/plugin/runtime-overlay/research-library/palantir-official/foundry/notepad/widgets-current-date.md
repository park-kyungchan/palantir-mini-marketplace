---
sourceUrl: "https://www.palantir.com/docs/foundry/notepad/widgets-current-date/"
canonicalUrl: "https://palantir.com/docs/foundry/notepad/widgets-current-date/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "c10a0182a4fde9bc01fab9b7868a9a0193ca3fb7fa81494b5f048fc02e438703"
product: "foundry"
docsArea: "notepad"
locale: "en"
upstreamTitle: "Documentation | Widgets > Current date"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Current date

The **Current date** widget lets you insert the current date into a Notepad document. Use the [insertion menu](/docs/foundry/notepad/embed-widgets/) to add it to your document.

The widget can also be configured to auto-update the displayed date on page reload. In addition, in document templates the current date widget can be configured to freeze the displayed date during template generation.

![date\_section](/docs/resources/foundry/notepad/date_section.png)

## Widget properties

* **Auto-update date:** If enabled, the date displayed will automatically update to the current date on document load. This option is disabled by default.
* **Select date format and timezone:** Allows selection of the format and the timezone that the date should be displayed in.
  * The available options for date format are:
    * Date,
    * Date and Time,
    * Date and Time (short),
    * ISO instant, and
    * Time.
  * By default, the timezone is set to the user's timezone. This means that the time is displayed in the timezone of the user viewing the document. Alternatively, you can pick a static time zone (e.g. `Europe/London` or `America/New_York`).

## Template configuration

* **Freeze date on template generation:** If enabled, the date widget will display the date as of generation time after going through the template generation process. For more information, refer to the docs on [generating and exporting documents from templates](/docs/foundry/notepad/workshop-templates/).
