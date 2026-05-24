---
sourceUrl: "https://www.palantir.com/docs/foundry/geospatial/types-of-geospatial-and-geotemporal-data/"
canonicalUrl: "https://palantir.com/docs/foundry/geospatial/types-of-geospatial-and-geotemporal-data/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "0bd66efc771d3e695e009f02ac6b2dd002ee94810aed9fec678f0ac98d365aa9"
product: "foundry"
docsArea: "geospatial"
locale: "en"
upstreamTitle: "Documentation | Geospatial and geotemporal > Types of geospatial and geotemporal data"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Types of geospatial and geotemporal data

There are many types of geospatial and geotemporal data that you may work with in Foundry. It is important to understand what type of data you have when planning how to use it.

There are two main types of geospatial data: [**raster**](#raster-data) and [**vector**](#vector-data). Geospatial data with a temporal component is known as [**geotemporal**](#geotemporal-data) data.

All example images use notional or open-source data.

## Raster data

Raster data consists of a matrix of cells organized into rows and columns, in which each cell represents specific information. Examples of raster data include satellite imagery sources, scanned maps, and digital elevation models (DEMs).

Learn more about [processing raster data](/docs/foundry/geospatial/raster-data/).

<img src="./media/data_type_raster_example.png" alt="Example of Raster Data: Satellite Weather Imagery" width="500" />

## Vector data

Vector data is used for storing data that has discrete boundaries and represents these data as points, lines, and polygons. Examples of vector data include points representing cities on a map of the United States, lines representing roads in a state, and polygons representing electoral district boundaries.

Learn more about [processing vector data in transforms](/docs/foundry/geospatial/vector-data-in-transforms/).

<img src="./media/data_type_vector_example.png" alt="Example of Vector Data: a choropleth map of Oregon with overlaid electric transmission lines" width="500" />

## Geotemporal data

Geospatial data may have a temporal component, such as the location of a vehicle over time or satellite images taken at different times. In these cases, the data is considered **geotemporal** (also referenced as "track" data). Learn more about geotemporal data in Foundry by reviewing the key concepts below.

### Key geotemporal data concepts

:::callout{theme="neutral"}
The concepts defined below cite the implementation of Palantir's geotemporal [interfaces](/docs/foundry/interfaces/interface-overview/) available for installation as part of the `Core Ontology Store` in [Marketplace](/docs/foundry/marketplace/getting-started/). <br><br>
Contact Palantir Support if these interfaces are not available on your enrollment, or if you have questions about Marketplace installation or are unable to locate the `Core Ontology Store`.
:::

### Geotemporal activity

A geotemporal activity is an ontology object that:

* References a specific [geotemporal series sync](#geotemporal-series-sync-gtss) through a [geotemporal series reference](#geotemporal-series-reference-gtsr) property.
* Represents individual observations through its implementation of the `Geotemporal Observation` [interface](/docs/foundry/interfaces/interface-overview/). The `Geotemporal Observation` interface defines an [observation](#observation) as a timestamped position that encodes geotemporal data from varying sources.
* Links to clusters, or collections of geotemporal data of the same type, of observations through its implementation of the `Geotemporal Cluster` interface. The `Geotemporal Cluster` interface contains the geotemporal data of the cluster's latest observation.

#### Geotemporal series

A geotemporal series is a sequence of position and timestamp data representing the location of an entity over time. Each sequence is identified by a [series ID](#series-id). Individual points in the series are referred to as [observations](#observation). For example, a flight from San Francisco to New York City could be represented as a geotemporal series where each reported location from the plane during the flight is an observation.

:::note{theme="neutral"}
Geotemporal series may also be referred to as *geotime series*.
:::

[Learn more about geotemporal series data](/docs/foundry/geospatial/geotemporal-series-overview/).

#### Geotemporal series object type

A geotemporal series object type contains one or more [geotemporal series reference](#geotemporal-series-reference-gtsr) properties, and optionally, other properties about the geotemporal series being referenced. For example, an object type representing a flight may include the origin and destination airports as string properties along with the flight path as a geotemporal series reference. A **geotemporal series activity** object references a [geotemporal series sync](#geotemporal-series-sync-gtss).

Other variations of object types that drive geotemporal workflows include the following:

* **Geotemporal observation activity:** An object that contains latitude, longitude, and timestamp properties and represents a point-in-time observation as opposed to a track. These objects implement the `Geotemporal Observation` interface.

* **Geotemporal cluster activity:** An object that links to multiple **geotemporal observation activity** objects and contains `timestamp` and `geopoint` properties, which represent the time and position of the *latest* observation linked to the cluster. These objects implement the `Geotemporal Cluster` interface.

#### Geotemporal series reference (GTSR)

A geotemporal series reference (GTSR) property type is used to reference a particular geotemporal series from a geotemporal series integration. Foundry applications use this reference to fetch the backing geotemporal data for the series.

#### Geotemporal series sync (GTSS)

A geotemporal series sync (GTSS) indexes the geotemporal series data into Foundry's geotemporal series database. Once indexed, the geotemporal data is accessible from the GTSR property on an object type. All values for a series ID should be contained in the same sync. The sync can be created using the geotemporal series sync output in [Pipeline Builder](/docs/foundry/pipeline-builder/outputs-add-geotemporal-series-output/), which enables you to write a GTSS to Foundry's live or historical geotemporal series databases as well as render it as a layer on a Gaia map.

![The Advanced settings of a GTSS displays the option to select Live streaming or Dataset archive.](/docs/resources/foundry/geospatial/write-gtss-to-live-or-historical.png)

**Live streaming** enables real time GTSS rendering and is best for high-frequency streams that require low latency, storing observations for 14 days by default. **Dataset archive** provides persistent storage of high volumes of historic GTSS data within a [dataset](/docs/foundry/data-integration/datasets/).

#### Geotracker

Geotracker is an entity-tracking capability supported by the Ontology, where an entity's location on a [Gaia map](/docs/foundry/geospatial/integrate-geotemporal-series-with-the-ontology/#gaia) is derived from one or multiple linked [object types](/docs/foundry/object-link-types/object-types-overview/).

#### Geotrackable entity

An object type representing an entity, such as a car or plane, is *geotrackable* when:

* Its current and historical locations derive from linked objects that contain data about its activities, or a series of one or more timestamped positions that encode geotemporal data from one or multiple sources, such as an airplane's movement over time. This data is often captured by a [GTSR](#geotemporal-series-reference-gtsr) property.
* It implements the `Tracked Entity` interface.

#### Observation

An observation is an individual point in a geotemporal series that consists of a series ID, timestamp, position, and other integration-defined properties. For example, a single GPS ping from a plane would be an observation in a geotemporal series. These can also be called "ticks".

#### Series ID

A series ID is an identifier that groups multiple geotemporal observations into a single series. The series ID must be unique within a given geotemporal series integration. For example, the concatenation of the flight number, origin, destination, and date could be used to uniquely identify a single flight.
