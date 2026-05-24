---
sourceUrl: "https://www.palantir.com/docs/foundry/map/series-panel/"
canonicalUrl: "https://palantir.com/docs/foundry/map/series-panel/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "9098e83370b1f98be052e1b77b4299f45aadebaad8e93e24c5b9007716d1687e"
product: "foundry"
docsArea: "map"
locale: "en"
upstreamTitle: "Documentation | Time > Series panel [Planned deprecation]"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Series panel \[Planned deprecation]

:::callout{theme="warning" title="Planned deprecation"}
The series panel in Map is in the [planned deprecation](/docs/foundry/platform-overview/development-life-cycle/) phase of development and will be unavailable after January 31, 2026. Use the [timeline](/docs/foundry/map/timeline/#time-series-beta) to view time-based data and further inspect time-based object properties in Map. <br><br>
Contact Palantir Support if you have questions about Map's timeline feature or require additional help migrating your workflows.
:::

You can use a map's **Series** panel to further inspect [time series](/docs/foundry/map/time-series/) and [linked events](/docs/foundry/map/events/#linked-events) synced with the timeline's selected time and time window.

![Series panel.](/docs/resources/foundry/map/time-series-view.png)

## Time series

[Time series](/docs/foundry/time-series/time-series-overview/) are measured values that change over time.

You can add a time series to the series panel using the following methods:

* Right-click an object and choose **Add series to series view** before selecting a series from the **Add series to series panel** menu.
* Select an object, [open the **Selection** panel](/docs/foundry/map/selection/#selection-panel), and navigate to the **Series** tab. Select the **…** icon that appears when hovering over a series row to open a menu that contains additional actions related to the selected time series. Then, select **Add to series view**.

<table>
  <tr>
    <th>Right-click to add a time series</th>
    <th>Use the <b>Selection</b> panel to add a time series</th>
  </tr>
  <tr>
    <td><img src="./media/series-panel_right-click.png" alt="Adding a series to the series panel from the right-click menu."></img></td>
    <td><img src="./media/series-panel_selection-panel.png" alt="Adding a series to the series panel from the selection panel."></img></td>
  </tr>
</table>

When you add a time series to the **Series** panel, a visualization of the series over time appears at the bottom of the map. You can use the **Series** panel to move through time by selecting the point in time you wish to view. Additionally, you can scroll across the rendered time range.
