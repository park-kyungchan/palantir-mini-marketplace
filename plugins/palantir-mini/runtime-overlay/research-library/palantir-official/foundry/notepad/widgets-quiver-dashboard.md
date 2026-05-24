---
sourceUrl: "https://www.palantir.com/docs/foundry/notepad/widgets-quiver-dashboard/"
canonicalUrl: "https://palantir.com/docs/foundry/notepad/widgets-quiver-dashboard/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "157b3fdb41879664a06ac15c7bd9be68ccbde2e6d7cabfefa2b3554d03aff5b1"
product: "foundry"
docsArea: "notepad"
locale: "en"
upstreamTitle: "Documentation | Widgets > Quiver dashboard"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Quiver dashboard

Embedding a Quiver dashboard in a Notepad document allows you to export the dashboard to PDF or print it.
Embedding dashboards also allows you to lock data at a point in time.

You can embed a Quiver dashboard in a Notepad document by clicking [**+ Widget**](/docs/foundry/notepad/embed-widgets/#from-a-document).

![notepad\_widgets\_quiver\_dashboard\_add\_widget](/docs/resources/foundry/notepad/notepad_widgets_quiver_dashboard_add_widget.png)

## Widget properties

* **Dashboard:** select the dashboard you want to embed.
* **Version:** select the version of the dashboard, or toggle **Auto-update** if you would like to always show the latest version.

![notepad\_widgets\_quiver\_dashboard\_select](/docs/resources/foundry/notepad/notepad_widgets_quiver_dashboard_select.png)

## Template configuration

* **Dashboard Inputs:** if your dashboard has inputs defined, the inputs will be displayed in this section. You can map the inputs to variables in your Notepad document with the mapping table below.

|Quiver input type	|Notepad input type	|
|---	|---	|
|Boolean	|String	|
|Number	|Number	|
|String	|String	|
|Time	|Timestamp	|
|Time Range	|String, `ISO format - ISO format`	|
|Time Series	|*Not supported*	|
|Object	|Object	|
|Object Set	|Object Set	|
|String List	|String: `["option_1","option_2"]`	|

In the example below, the dashboard has one object input that has been configured directly in the editor.

![notepad\_widgets\_quiver\_dashboard\_wp\_overview](/docs/resources/foundry/notepad/notepad_widgets_quiver_dashboard_wp_overview.png)
