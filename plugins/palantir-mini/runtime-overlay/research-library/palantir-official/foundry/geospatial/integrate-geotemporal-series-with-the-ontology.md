---
sourceUrl: "https://www.palantir.com/docs/foundry/geospatial/integrate-geotemporal-series-with-the-ontology/"
canonicalUrl: "https://palantir.com/docs/foundry/geospatial/integrate-geotemporal-series-with-the-ontology/"
sourceLastmod: "2026-05-12T17:06:26.152Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "87db6f69463e674bd2346a6a557f8de2fa91071917b8d150b4d1a56bcb754611"
product: "foundry"
docsArea: "geospatial"
locale: "en"
upstreamTitle: "Documentation | Geotemporal series > Integrate geotemporal series with the Ontology"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Integrate geotemporal series with the Ontology

To establish a geotemporal series in the Ontology that drives analysis and visualization within Palantir applications, such as a Gaia map, you will use [Pipeline Builder](/docs/foundry/pipeline-builder/overview/) to:

* Create a [geotemporal series sync](/docs/foundry/geospatial/types-of-geospatial-and-geotemporal-data/#geotemporal-series-sync-gtss) using the [geotemporal series output](/docs/foundry/pipeline-builder/outputs-add-geotemporal-series-output/). The output will contain a [geotemporal series reference property (GTSR)](/docs/foundry/geospatial/types-of-geospatial-and-geotemporal-data/#geotemporal-series-reference-gtsr) to capture movement over time.
* Create a [geotemporal series object type](/docs/foundry/geospatial/types-of-geospatial-and-geotemporal-data/#geotemporal-series-object-type) using the [object type pipeline output](/docs/foundry/pipeline-builder/outputs-add-ontology-output/#add-an-object-type-output). The object type will contain the GTSR and static information about the tracked entity, such as a vessel's call sign or name.
* Map the geotemporal series reference property from your geotemporal series sync to your single geotemporal series object type.

![An overview diagram of the geotemporal series process.](/docs/resources/foundry/geospatial/integration-to-ontology-structure.png)

:::callout{theme="neutral"}
If you plan to add data from the Ontology to a Foundry [map](/docs/foundry/map/overview/) and *not* Gaia, use [time series](/docs/foundry/time-series/time-series-overview/) to view and analyze data associated with geospatial or geotemporal objects. Learn more about this in our [geospatial time series use case tutorial.](/docs/foundry/time-series/geospatial-time-series-use-case/).<br><br> Review the [geospatial FAQ page](/docs/foundry/geospatial/faq/) or contact Palantir Support with additional questions about which integration type you should use to index your geotemporal data into the Ontology based on your enrollment and specific use case.
:::

Follow the instructions below to add a geotemporal series sync output as a reference to a geotemporal series object type.

## Create a new pipeline in Pipeline Builder

1. Navigate to Pipeline Builder and select the green **New pipeline** button.
2. Name your pipeline and select a project where it will be saved.
3. Choose **Streaming pipeline** before selecting **Create pipeline**.

## Import and transform your geotemporal datasets

:::callout{theme="neutral"}
Review the existing [documentation on geotemporal data modeling](/docs/foundry/geospatial/data-modeling/) before proceeding.
:::

Identify the streaming and static [datasets](/docs/foundry/data-integration/datasets/) that will back your geotemporal series sync and object type and follow the instructions below to add them to your pipeline. While you can create both a geotemporal series object type and geotemporal series sync from *one* dataset, the steps below provide instructions using *two*: a live stream to back the geotemporal series sync and a static dataset to back the object type.

1. Select **Add Foundry data** if you have already ingested your data into the platform.
2. Search for your files in the **Add data** modal and select the **+** icon to add each dataset to your pipeline.
3. Select **Add data** in the bottom right corner of the **Add data** modal.

![A streaming and static dataset are displayed on a pipeline's graph canvas.](/docs/resources/foundry/geospatial/add-data-to-geotracker-pipeline.png)

### Transform your streaming dataset

:::callout{theme="neutral"}
At a minimum, your streaming dataset should contain columns that capture a tracked entity's movement over time, such as its latitude and longitude at a given timestamp, as well as a `string` column that enables you to join the geotemporal series sync to the object type. Columns that contain data that changes over time are referred to as *live* fields, whereas those that remain consistent (such as an entity's name) are called *static*.
:::

Your transform needs may vary depending on your streaming dataset's raw state upon ingest into Foundry. The example data outlined below contains the following columns that map to the sync's [primary fields](/docs/foundry/pipeline-builder/outputs-add-geotemporal-series-output/#mapping-primary-fields):

* **Series\_ID:** A `string` column used to join the geotemporal series sync to the static dataset-backed object type. [Learn more about configuring a series ID.](/docs/foundry/geospatial/data-modeling/#picking-a-series-id)
* **Timestamp:** A `timestamp` column containing the time recorded for the entity's location.
* **Geopoint:** A `geopoint` column containing the entity's latitude and longitude pair.

![The primary fields of a geotemporal series sync are displayed.](/docs/resources/foundry/geospatial/gtss-primary-fields.png)

The dataset contains *additional* columns which will map to the geotemporal series sync's **Properties** but are *not* required for the sync to function in a Palantir map application.

![The additional properties within a geotemporal series sync are displayed.](/docs/resources/foundry/geospatial/gtss-additional-properties.png)

If necessary, use Pipeline Builder's **Cast** and **Create GeoPoint** transforms to prepare your raw streaming dataset for output as a geotemporal series sync.

![Pipeline Builder's Cast and Create GeoPoint transform cards are displayed.](/docs/resources/foundry/geospatial/cast-and-create-geopoint.png)

Follow the instructions below to create a geotemporal series sync output from your transformed streaming data:

1. Select the streaming dataset or transform node to render the vertical menu bar, where you will choose the gold **+** icon to add a **New geotemporal series sync** output.
2. Enter a name and optionally change the default icon for your sync in **Name and icon**.
3. Select your **Destination namespace** to which Foundry will write the sync.
4. Assign the relevant columns from your streaming dataset to the sync's **Primary fields**.
5. Set your sync's **Observation schema** if one already exists. If one does *not* exist, then you can leave this field empty; Foundry will generate a new one from your sync's mapped properties. [Learn more about observation schema.](/docs/foundry/geospatial/data-modeling/#observation-schema)
6. Optionally toggle the **Live** icon to the right of any additional **Properties** to mark one or multiple as static.

![An explanatory tooltip renders after hovering over Live in the Properties panel.](/docs/resources/foundry/geospatial/mark-field-as-live-or-static.png)

:::callout{theme="neutral"}
Foundry records a **Live** property value for every new observation, such as an entity's velocity at a given timestamp. If you mark a property as static, then Foundry records and applies the latest value of that property for all observations in the series.
:::

7. Optionally configure any **Styles** for your sync to control its downstream rendering.
8. Optionally select **Dataset archive** in **Advanced settings** to retain all your sync's data in a long-term historical archive beyond the default live retention window of 14 days.

:::callout{theme="neutral"}
Contact Palantir Support with questions about expanding or contracting the default live retention window.
:::

9. Select **Save** to save your geotemporal series sync.

### Transform your static dataset

:::callout{theme="neutral"}
At a minimum, your static dataset should contain the same unique identifier for the tracked entity as the streaming dataset, such as a name or call sign.
:::

Next, you will transform your object type backing dataset to ensure it can be linked to your geotemporal series sync though a [geotemporal series reference (GTSR)](/docs/foundry/geospatial/types-of-geospatial-and-geotemporal-data/#geotemporal-series-reference-gtsr).

1. Select the static dateset in your pipeline and choose **Transform** to insert a new transform.
2. Search for and select **Apply expression**.
3. Select the input field labeled `Column, expression, or value` and choose your dataset's primary key column from **Columns**. In this example, the dataset's `mmsi` column contains a unique vessel identifier that can be used as the primary key.
4. Create a new column titled `Series_ID` that is a copy of the dataset's unique identifier, such as `mmsi`. You will use this new column to link your geotemporal series sync to the object type.

![An Apply expression transform block in Pipeline Builder displays an expression copying one column's value into another.](/docs/resources/foundry/geospatial/create-series-id-column.png)

5. Select **Apply** before saving the changes to your pipeline and previewing your data.

![A dataset preview is displayed in Pipeline Builder.](/docs/resources/foundry/geospatial/preview-object-dataset.png)

### Create an object type output

After transforming your static dataset, follow the instructions below to create an object type output and implement the [`Tracked Entity` interface.](/docs/foundry/geospatial/types-of-geospatial-and-geotemporal-data/#geotrackable-entity)

1. Select the transform node you just created to render the vertical menu bar, where you will choose the gold **+** icon to add a **New object type** output.

![The Add output menu accessible from a transform node is displayed.](/docs/resources/foundry/geospatial/new-object-type-output.png)

2. Enter a name and optionally change the default icon for your sync in **Name and icon**.
3. Select the ellipsis icon on the right side of a displayed property to set your primary key and title properties.

![Primary key and title properties are displayed.](/docs/resources/foundry/geospatial/set-primary-key-and-title.png)

4. Select the link icon next to your `Series_ID` property to map the GTSR property to your object type by choosing **Geotemporal series > From this pipeline**.

:::callout{theme="neutral"}
If you do not see **Geotemporal series** as an option, verify that Pipeline Builder's advanced geotemporal capabilities have not been disabled by another editor of your pipeline, as they are generally available and enabled by default. Select **Settings > Pipeline feature flags...** from the top ribbon. Next, ensure that **Enable advanced geotemporal series features** is set to **Enabled** before you close out of the **Pipeline feature flags** window.
:::

![A GTSR is linked to an object type's property.](/docs/resources/foundry/geospatial/link-gtsr-to-object.png)

5. Select **Implement interface** at the bottom of your screen and choose the `Tracked Entity` interface from the Palantir Core Ontology.

![The Tracked Entity interface modal is displayed.](/docs/resources/foundry/geospatial/tracked-entity-interface.png)

:::callout{theme="neutral"}
Contact Palantir Support to install the `Tracked Entity` interface on your enrollment if you are unable to access it in Ontology Manager.
:::

6. Choose **Implement and go to mapping** to navigate back to the object type creation window in Pipeline Builder before saving your changes.

## Deploy your pipeline

After configuring your geotemporal series sync, creating an object type and interface, and establishing a link between the two via the GTSR, follow the instructions below to deploy your pipeline:

1. Ensure all changes made to your pipeline are saved.

![The Save button is disabled in Pipeline Builder, as all changes made have been saved.](/docs/resources/foundry/geospatial/saved-pipeline.png)

2. Select **Deploy** to render the **Deploy this pipeline** panel.

![The Deploy this pipeline panel is displayed.](/docs/resources/foundry/geospatial/deploy-pipeline-panel.png)

3. Optionally **Replay on deploy** to re-run your pipeline from a specified point in time. Depending on your stream's size, replaying a pipeline may impact the pipeline's deployment speed. [Learn more about additional options for streaming pipelines in Pipeline Builder.](/docs/foundry/pipeline-builder/outputs-deliver-pipeline/#additional-options-for-streaming-pipelines)
4. Select **Deploy pipeline**.

Once your pipeline deploys and your object type is created in your ontology, you can [visualize its observations](#visualize-your-geotemporal-data) on a map.

![A successful pipeline deployment notification is displayed.](/docs/resources/foundry/geospatial/successful-pipeline-deployment.png)

## Visualize your geotemporal data

### Gaia

:::callout{theme="neutral"}
Gaia is only accessible if your enrollment contains Gotham. Contact Palantir Support with questions about access to Gaia or its additional documentation available in platform.
:::

To ensure Gotham can access object types in your Foundry ontology and render objects as part of a data layer on a Gaia map, you must [follow the instructions to type map your object type in Ontology Manager.](/docs/foundry/object-link-types/enable-gotham-integration/#toggle-on-type-mapping-in-foundrys-ontology-manager)

:::callout{theme="neutral"}
To support Pipeline Builder's advanced geotemporal features, you *must* complete the type mapping process to discover your object type in Gotham *even if* your enrollment contains [Map Rendering Service.](/docs/foundry/object-link-types/enable-gotham-integration/#how-to-check-if-your-enrollment-contains-mrs)
:::

Once you ensure your object type is discoverable by Gotham, you can [add it to your Gaia map.](/docs/foundry/geospatial/add-ontology-data-to-gaia/)

In addition to *adding* data from your ontology, you can review the existing documentation to learn more about [*creating* ontology data from](/docs/foundry/object-link-types/create-ontology-objects-from-gaia/) Gaia.

### Map

With your pipeline deployed, you can add your object type as a [layer](/docs/foundry/map/core-concepts/#layers) on a new or existing [map](/docs/foundry/map/overview/) in Foundry. Object data on a map will update in real-time when upstream changes are made, with those updates stored *both* within the object type and the sync's dataset archive.

:::callout{theme="neutral"}
The ability to view real-time geotemporal series object updates on a map may not be available on all enrollments. Contact Palantir Support to enable this feature if you are unable to view object updates from your geotemporal series object type after successful configuration and deployment in Pipeline Builder.
:::

[Learn more about visualizing data from your ontology in Foundry.](/docs/foundry/map/visualize-objects/)
