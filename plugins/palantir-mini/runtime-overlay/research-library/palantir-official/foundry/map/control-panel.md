---
sourceUrl: "https://www.palantir.com/docs/foundry/map/control-panel/"
canonicalUrl: "https://palantir.com/docs/foundry/map/control-panel/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "c18845fd6d4a1cc1a2dbaca92053e2e3afd05e8fd93984be1aac8731cfdbb309"
product: "foundry"
docsArea: "map"
locale: "en"
upstreamTitle: "Documentation | Configuration > Control Panel"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Control Panel

Various organization-wide Map settings can be configured using the [Control Panel](/docs/foundry/administration/control-panel/). To modify Map settings, you will need the `Map Admin` role.

![Map section in Control Panel](/docs/resources/foundry/map/control-panel-map-defaults.png)

## Map Defaults

* **Default Viewport** defines the initial view, in terms of the center point (latitude and longitude) and zoom level, that a user will see when creating a new map.
* **Default time selection** defines the range of date options that will be shown to users when selecting the time range.
* **Default unit system** sets the different units system (metric, imperial, or nautical), for all users and/or specific users groups. Users can override this default in the [map settings](/docs/foundry/map/settings/).

## Configure data loading

* **Time series polling interval:** Define how frequently the map will check for updated time series data when in ["View Latest" mode](/docs/foundry/map/time-overview/#selected-time-and-time-range).
  * **Default polling interval:** Set the default polling interval (in seconds) for new maps. Users can override this setting within the map.
  * **Minimum allowed polling interval:** Set the minimum allowable polling interval override (in seconds). Users are prevented from setting a polling interval smaller than this value for individual maps.
* **Object search limits:** Control the maximum number of objects a user can add to a map from the search dialog.
* **Search around limits:** Control the maximum number of objects a user can add to a map as the result of a single Search Around.

## API Keys

### Mapbox: Enable Find Locations on map

The [Find Locations](/docs/foundry/map/navigation/#find-locations) feature uses a proprietary geocoding service from Mapbox. To enable this feature for your organization, you will need to configure an organization-specific Mapbox API key that includes access to the Mapbox Geocoding API.

### Bing Maps: Enable Bing Maps base layers

To use Bing Maps base layers, instead of the default Mapbox base layers, enter a Bing Maps API key.
