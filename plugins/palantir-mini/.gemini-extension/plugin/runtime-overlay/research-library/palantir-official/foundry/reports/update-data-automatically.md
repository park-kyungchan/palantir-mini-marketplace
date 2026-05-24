---
sourceUrl: "https://www.palantir.com/docs/foundry/reports/update-data-automatically/"
canonicalUrl: "https://palantir.com/docs/foundry/reports/update-data-automatically/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "cc54c0e0935623eea063e6af6523584492ac74bfb60ebd532d98f55b08e8ed41"
product: "foundry"
docsArea: "reports"
locale: "en"
upstreamTitle: "Documentation | Reports > Update data automatically"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Update data automatically

## Auto-update data when a report is opened

Reports are live by default, which means that whenever a report is opened, all the charts inside will load the latest data reflected in the underlying Foundry resources.

In order for underlying Contour analyses to automatically update to the latest available data, ensure that the **Refresh analysis data on open** setting is enabled for any Contour analyses used in the Report.

### Refresh a specific widget

If a chart’s data updates while you’re viewing or editing the report, or auto-refreshing is turned off, you will see an out-of-date warning on the chart along with an option to refresh the data. Click **Update dataset and logic** to update that specific widget:

![Widget update banner example](/docs/resources/foundry/reports/widget-update-banner.png)

### Enable refresh report data and logic

1. *(If needed)* Switch to Editing mode.

2. Click the **Settings** button in the application header. <br><br>
   ![Settings button in header](/docs/resources/foundry/reports/settings-button-in-header.png) <br><br>

3. Click **Refresh report data and logic** in the settings menu to toggle refreshing on. <br><br>
   ![Auto-refresh data and logic turned on](/docs/resources/foundry/reports/refresh-report-data-and-logic-on.png) <br><br>

Your report will now refresh all widgets within the report that have updates each time you open your report.

## Disable data updating in a report

To make your report static and show data from a specific point in time, change the **Update settings** of your report:

* When **Display out-of-date warnings** is turned off, you (and viewers of this report) will not see the out of date warning on individual widgets.
* When **Refresh report data and logic** is turned off, the report will not auto update to the latest data whenever the report is opened. You can manually refresh the data for a particular widget by clicking on the "Update dataset and logic" text inside a widget's out-of-date warning.

## Disable out-of-date warnings

1. *(If needed)* Switch to Editing mode.

2. Click the **Settings** button in the application header. <br><br>
   ![Settings button in header](/docs/resources/foundry/reports/settings-button-in-header.png) <br><br>

3. Click **Display out-of-date warnings** in the settings menu to toggle warnings off. You should see any update warnings disappear. <br><br>
   ![Example of toggling update warnings off](/docs/resources/foundry/reports/disable-update-warning.gif) <br><br>

### Disable refresh report data and logic

1. *(If needed)* Switch to Editing mode.

2. Click the Settings button in the application header. <br><br>
   ![Settings button in header](/docs/resources/foundry/reports/settings-button-in-header.png) <br><br>

3. Toggle **Refresh report data and logic** in the settings menu to turn refreshing on or off. <br><br>
   ![Disable refresh report data toggle](/docs/resources/foundry/reports/refresh-report-data-and-logic-off.png) <br><br>
