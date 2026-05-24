---
sourceUrl: "https://www.palantir.com/docs/foundry/map/settings/"
canonicalUrl: "https://palantir.com/docs/foundry/map/settings/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "ce00bda3b78d9c95a8716b3f637acf81c865588fad0096a71a97d79ecf3d2cf7"
product: "foundry"
docsArea: "map"
locale: "en"
upstreamTitle: "Documentation | Configuration > Settings"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Settings

Click the settings gear icon (![Gear icon](/docs/resources/foundry/map/settings-icon.png)) in the top right corner of the Map screen to open the settings menu:

![Map settings menu](/docs/resources/foundry/map/settings.png)

## Units

You can specify the units in which distances are displayed. This is a per-user setting and is applied for you whenever you are using the Map application. The options for units are:

* Metric
* Imperial
* Nautical

## Enable GeoJSON panel

You can enable an additional GeoJSON panel in the bottom-right corner of the screen that allows you to enter and edit GeoJSON data, and create annotations based on the GeoJSON geometries. This is a per-user setting and is applied for you whenever you are using the Map application.

![GeoJSON panel](/docs/resources/foundry/map/geojson-panel.png)

## Polling interval

You can specify the frequency at which new time series and time series property values will be loaded when in ["View Latest" mode](/docs/foundry/map/time-overview/#selected-time-and-time-range). This is a per-map setting that applies for all users when using this specific saved map.

## Time zone

You can specify the time zone in which to display the map. This is a per-map setting that applies for all users when using this specific saved map. The options for time zone are:

* Local (this will use the time zone of the viewer's computer)
* UTC

## Enable experimental labels

You can enable an experimental method for displaying and positioning [objects labels](/docs/foundry/map/visualize-objects/#labels) on the map. This method applies a positioning algorithm that attempts to minimize instances of labels overlapping each other, or obscuring objects.  However, in some circumstances (such as with large numbers of labels) the resulting label positioning could be undesirable, or labels could reposition in undesirable or distracting ways. This is a per-map setting that applies for all users when using this specific saved map.
