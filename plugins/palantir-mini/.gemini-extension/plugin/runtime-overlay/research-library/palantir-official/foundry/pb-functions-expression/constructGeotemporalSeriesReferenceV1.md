---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/constructGeotemporalSeriesReferenceV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/constructGeotemporalSeriesReferenceV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "4b4c75748267858254eb78128e47b3b96d0fd30d27f1f82fb6318e5d4f6f2ff5"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Create geotemporal series reference"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Create geotemporal series reference

> Supported in: Batch, Streaming

Generate the required values for a geotemporal series reference object property type, which consists of a reference to a series of geotemporal observations and the RID to the geotemporal series integration that contains the series.

**Expression categories:** Geospatial, Other, String

## Declared arguments

* **Geotemporal series integration RID:** The RID of the geotemporal series integration to reference.<br>*ResourceIdentifier*
* **Series ID:** The column with the series ID values that correspond to series in the geotemporal integration.<br>*Expression\<String>*

**Output type:** *Geotemporal series reference*

## Examples

### Example 1: Base case

**Argument values:**

* **Geotemporal series integration RID:** ri.geotime-catalog..integration.05a40ec0-3a7d-406d-88d6-043ed2cb6af8
* **Series ID:** `seriesIdColumn`

| seriesIdColumn | **Output** |
| ----- | ----- |
| series1 | {"seriesId":"series1","geotimeSeriesIntegrationRid":"ri.geotime-catalog..integration.05a40ec0-3a7d-406d-88d6-043ed2cb6af8"} |

***

### Example 2: Null case

**Argument values:**

* **Geotemporal series integration RID:** ri.geotime-catalog..integration.05a40ec0-3a7d-406d-88d6-043ed2cb6af8
* **Series ID:** `seriesIdColumn`

| seriesIdColumn | **Output** |
| ----- | ----- |
| *null* | *null* |

***

### Example 3: Edge case

**Argument values:**

* **Geotemporal series integration RID:** ri.geotime-catalog..integration.05a40ec0-3a7d-406d-88d6-043ed2cb6af8
* **Series ID:** `seriesIdColumn`

| seriesIdColumn | **Output** |
| ----- | ----- |
| specialCharacters!! | {"seriesId":"specialCharacters!!","geotimeSeriesIntegrationRid":"ri.geotime-catalog..integration.05a40ec0-3a7d-406d-88d6-043ed2cb6af8"} |
| using spaces | {"seriesId":"using spaces","geotimeSeriesIntegrationRid":"ri.geotime-catalog..integration.05a40ec0-3a7d-406d-88d6-043ed2cb6af8"} |
| *empty string* | {"seriesId":"","geotimeSeriesIntegrationRid":"ri.geotime-catalog..integration.05a40ec0-3a7d-406d-88d6-043ed2cb6af8"} |

***
