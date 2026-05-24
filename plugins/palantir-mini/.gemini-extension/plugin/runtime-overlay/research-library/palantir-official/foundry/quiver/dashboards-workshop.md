---
sourceUrl: "https://www.palantir.com/docs/foundry/quiver/dashboards-workshop/"
canonicalUrl: "https://palantir.com/docs/foundry/quiver/dashboards-workshop/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "8a538874e4709206565f71d08c157b9f996019e8bbda35d920454007afe10d98"
product: "foundry"
docsArea: "quiver"
locale: "en"
upstreamTitle: "Documentation | Dashboards > Embed in a Workshop module"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Embed in a Workshop module

You can embed published Quiver dashboards in [Workshop modules](/docs/foundry/workshop/overview/).

The main purpose of inputs and outputs is to pass data to and from an application where the dashboard is embedded. For example, charts in the embedded dashboard can update based on an object set selection in the application, or a Workshop metric card can highlight a value computed in the embedded dashboard.

In the example below, we filter the Workshop `Aircraft` object set for aircrafts with `high priority` maintenance issues.
The embedded Quiver dashboard automatically updates to show a bar plot of aircrafts by current location and a list of objects next to it. As we select only the aircrafts located  in `DFW` and `DEN` from the bar plot, the Workshop metric card at the top updates accordingly to show the object count in the Quiver bar plot selection.

![Example of embedded dashboard](/docs/resources/foundry/quiver/howto-dashboards-embedded-dashboard-example.gif)

## Embedding a dashboard

In Workshop, select **Add widget**, then choose **Quiver dashboard** from the menu.

![Workshop widget](/docs/resources/foundry/quiver/quiver-dashboard-widget.png)

In the widget editor, select the dashboard you want to embed. The list shows all the published dashboards to which you have access. Hover over the information tooltip next to each dashboard to get more information, or open it in a new tab.

<img alt="Select dashboard" src="./media/workshop-widget-select-dashboard.png" width="300px">

## Configuring inputs and outputs

You can define multiple inputs and outputs to your dashboard.

If the selected dashboard has inputs or outputs configured, Workshop will prompt you to map them to Workshop variables.
Quiver dashboard inputs and outputs can be mapped to Workshop variables according to the following mapping table:

| [Quiver data type](/docs/foundry/quiver/analysis-data-model/) | Workshop variable type |
| --- | --- |
| Boolean | Boolean |
| Number | Numeric |
| String | String |
| Time | Timestamp, Date |
| Time Range | String (because Workshop does not have a range variable type, pass the [range start](/docs/foundry/quiver/card-range-start/) and [range end](/docs/foundry/quiver/card-range-end/) as strings instead) |
| Time Series | Object (because Workshop does not have a time series variable type, pass the time series object instead) |
| Object | Object |
| Object Set | Object Set |

Finally, make sure you have the correct dashboard version selected. If you want the dashboard to automatically show the latest version, enable the **Auto-update** toggle.

<img alt="Embedded dashboard configuration" src="./media/howto-dashboards-dashboard-config.png" width="500px">
