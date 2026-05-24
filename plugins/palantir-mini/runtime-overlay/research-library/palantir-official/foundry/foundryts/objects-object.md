---
sourceUrl: "https://www.palantir.com/docs/foundry/foundryts/objects-object/"
canonicalUrl: "https://palantir.com/docs/foundry/foundryts/objects-object/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d7a7e7e63175e2911f25eeba54f71a33c21f95403239be1884e3317b2f525873"
product: "foundry"
docsArea: "foundryts"
locale: "en"
upstreamTitle: "Documentation | API Reference > objects.Object"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# foundryts.objects.Object

## *class* foundryts.objects.Object(object\_type\_id)

An object type in the Ontology.

This class provides methods to create references to time series stored as time series properties on objects in
the Ontology.

* **Parameters:**
  **object\_type\_id** ([*str*](https://docs.python.org/3/library/stdtypes.html#str)) – ID of the object type in the Ontology.

:::callout{theme="warning" title="Note"}
Ensure you’re using the ID for `object_type_id` since there are three object type references available on
the platform: ID, API, RID.
:::

## Examples

```pycon
>>> aircraft_object_type = Object("aircraft") # object type reference
>>> airplane = airplane_object_type.id("aircraft-1") # you can now use the primary key to get the object reference
```

#### id(object\_primary\_key\_value)

Creates a reference to an Ontology object using its primary key.

* **Parameters:**
  **object\_primary\_key\_value** ([*str*](https://docs.python.org/3/library/stdtypes.html#str)) – The primary key of the object which can be found either in the dataset defining the object or in the
  [↗ Object Explorer](/docs/foundry/object-explorer/search-objects/).
* **Returns:**
  A reference to the Ontology object that can be used to access a time series property using
  Time Series Property with [`FoundryObject.property()`](/docs/foundry/foundryts/objects-foundry-object/)
* **Return type:**
  [`FoundryObject`](/docs/foundry/foundryts/objects-foundry-object/)

## Examples

```pycon
>>> aircraft_object_type = Object("aircraft")
>>> airplane = airplane_object_type.id("aircraft-1") # the object reference can be used for accessing the TSP
```

The example below shows a fuller implementation of performing a FoundryTS function on a time series property of a foundryts.objects.Object.

```python
...
import foundryts.functions as F
from foundryts.objects import Object
from foundryts import FoundryTS
# optional: from foundry_sdk_runtime.context_vars import FOUNDRY_HOSTNAME
from foundry_sdk_runtime.context_vars import FOUNDRY_TOKEN
import os

@function
def get_sensor_range() -> str:
    stack = "<your stack here>" #or use FOUNDRY_HOSTNAME

    os.environ["FOUNDRYTS_CODEX_HUB_URIS"] = f"https://{stack}.palantirfoundry.com/codex-hub/api"
    os.environ["FOUNDRYTS_ONTOLOGY_METADATA_URIS"] = f"https://{stack}.palantirfoundry.com/ontology-metadata/api"
    os.environ["FOUNDRYTS_OSS_URIS"] = f"https://{stack}.palantirfoundry.com/object-set-service/api"
    os.environ["FOUNDRY_AUTH_TOKEN"] = FOUNDRY_TOKEN.get()

    foundry = FoundryTS()

    sensor_object_type = Object("<object id>")
    sensor = sensor_object_type.id("<primary key>")
    series = sensor.property("<time series property>")
    end_dt = datetime(2025, 9, 23)
    series = F.time_range(start=0, end=end_dt)(series)
    return str(series.to_pandas())
```
