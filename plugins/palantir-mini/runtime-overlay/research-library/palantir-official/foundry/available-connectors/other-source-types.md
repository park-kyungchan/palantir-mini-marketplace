---
sourceUrl: "https://www.palantir.com/docs/foundry/available-connectors/other-source-types/"
canonicalUrl: "https://palantir.com/docs/foundry/available-connectors/other-source-types/"
sourceLastmod: "2026-05-12T17:06:26.148Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "f650bb6290141c82cc669dbc2e29f0a50a960f55c650a92285a7c1b1d25f1269"
product: "foundry"
docsArea: "available-connectors"
locale: "en"
upstreamTitle: "Documentation | Available connectors > Other source types"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Other source types

Foundry's Data Connection framework enables you to configure syncs from the full range of enterprise data systems. This includes data sources that are commonly used in particular industry sectors, such as manufacturing, utilities, and healthcare. This page provides a reference of some industry-specific data sources that have been integrated with Foundry.

If there is a data system you are interested in integrating with Foundry, contact your Palantir representative for more details.

## IOT / IIOT

Internet of Things (IOT) and Industrial Internet of Things (IIOT) systems often produce data streams and time series that can be synced into Foundry for analysis and operational workflows. Most commonly, IOT data sources are integrated using Data Connection's support for [streaming data](/docs/foundry/data-integration/streaming-guide/). Some examples of IOT / IIOT systems Foundry has been integrated with include:

* **Amazon IoT Core**
* **Azure Event Hub**
* **Google IoT Core**
* **OPC-UA**
* **OSI PI**

## Geospatial systems

Some examples of geospatial data systems that are commonly integrated with Foundry include:

* **ESRI / ArcGIS**
* **PostGIS**
* **Oracle Spatial DBs**
* **WFS**

Additionally, geospatial data exported in a wide variety of file formats can be easily integrated using the Data Connection [filesystem](/docs/foundry/available-connectors/filesystem/) and blob storage source types (such as [Amazon S3](/docs/foundry/available-connectors/amazon-s3/)). Geospatial file formats commonly used in Foundry include:

* **Shapefiles**
* **KMZ / KML**
* **FGDB**
* **Geojson**

Lastly, Data Connection's support for [REST APIs](/docs/foundry/available-connectors/rest-apis/) can be used to integrate with commonly used services such as the [Web Feature Service ↗](https://www.ogc.org/standards/wfs) (WFS).

## EHRs / EMRs

Data Connection has been used to connect to a wide range of Electronic Health Record (EHR) and Electronic Medical Record (EMR) systems internationally. Contact your Palantir representative for more details.

## Productivity tools

Connections with productivity and task management tools are commonly configured using Data Connection's support for [REST APIs](/docs/foundry/available-connectors/rest-apis/). Some examples of productivity tools that have previously been integrated with include:

* **Artifactory**
* **Asana**
* **Github**
* **JIRA**
* **PagerDuty**
* **ServiceNOW**
* **Slack**
