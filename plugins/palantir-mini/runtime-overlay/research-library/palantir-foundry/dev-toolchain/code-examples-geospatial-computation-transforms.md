---
source: https://www.palantir.com/docs/foundry/code-examples/geospatial-computation-transforms
fetched: 2026-04-20
section: dev-toolchain
doc_title: Geospatial Computation (Transforms)
---

- Documentation

  * [Documentation](/docs/foundry/)
  * [Apollo](/docs/apollo/)
  * [Gotham](/docs/gotham/)

Search

+

K

[API Reference ↗](/docs/foundry/api-reference/)Send feedback

en

enjpkrzh

ABXY

ABXYABXYABXYABXYABXYABXY

* Capabilities

  + [AI Platform (AIP)](/docs/foundry/aip/overview/)
  + [Data connectivity & integration](/docs/foundry/data-integration/overview/)
  + [Model connectivity & development](/docs/foundry/model-integration/overview/)
  + [Ontology building](/docs/foundry/ontology/overview/)
  + [Developer toolchain](/docs/foundry/dev-toolchain/overview/)
  + [Use case development](/docs/foundry/app-building/overview/)
  + [Observability](/docs/foundry/observability/overview/)
  + [Analytics](/docs/foundry/analytics/overview/)
  + [Product delivery](/docs/foundry/devops/overview/)
  + [Security & governance](/docs/foundry/security/overview/)
  + [Management & enablement](/docs/foundry/administration/overview/)
* [Getting started](/docs/foundry/getting-started/overview/)
* [Architecture center](/docs/foundry/architecture-center/overview/)
* Platform updates

  + [Announcements](/docs/foundry/announcements/)
  + [Release notes](/docs/foundry/announcements/release-notes/)

* Product QAs

  + [Automate](/docs/foundry/questions-answers/automate/)
  + [Builds](/docs/foundry/questions-answers/builds/)
  + [Carbon (Community)](/docs/foundry/questions-answers/carbon-community/)
  + [Code Repositories](/docs/foundry/questions-answers/code-repositories/)
  + [Code Repositories (Community)](/docs/foundry/questions-answers/code-repositories-community/)
  + [Code Workspaces](/docs/foundry/questions-answers/code-workspaces/)
  + [Code Workspaces (Community)](/docs/foundry/questions-answers/code-workspaces-community/)
  + [Contour](/docs/foundry/questions-answers/contour/)
  + [Contour (Community)](/docs/foundry/questions-answers/contour-community/)
  + [Data Connection](/docs/foundry/questions-answers/data-connection/)
  + [Foundry Metadata (Community)](/docs/foundry/questions-answers/foundry-metadata-community/)
  + [Functions](/docs/foundry/questions-answers/functions/)
  + [Functions (Community)](/docs/foundry/questions-answers/functions-community/)
  + [Linter](/docs/foundry/questions-answers/linter/)
  + [Media sets](/docs/foundry/questions-answers/media-sets/)
  + [Media sets (Community)](/docs/foundry/questions-answers/media-sets-community/)
  + [Notepad](/docs/foundry/questions-answers/notepad/)
  + [Notifications (Community)](/docs/foundry/questions-answers/notifications-community/)
  + [Object Views (Community)](/docs/foundry/questions-answers/object-views-community/)
  + [Ontology](/docs/foundry/questions-answers/ontology/)
  + [Ontology SDK](/docs/foundry/questions-answers/ontology-sdk/)
  + [Pipeline Builder](/docs/foundry/questions-answers/pipeline-builder/)
  + [Pipeline Builder (Community)](/docs/foundry/questions-answers/pipeline-builder-community/)
  + [Projects (Community)](/docs/foundry/questions-answers/projects-community/)
  + [Quiver](/docs/foundry/questions-answers/quiver/)
  + [Quiver (Community)](/docs/foundry/questions-answers/quiver-community/)
  + [Slate](/docs/foundry/questions-answers/slate/)
  + [Streaming](/docs/foundry/questions-answers/streaming/)
  + [Vertex](/docs/foundry/questions-answers/vertex/)
  + [Webhooks](/docs/foundry/questions-answers/webhooks/)
  + [Workshop](/docs/foundry/questions-answers/workshop/)
  + [Workshop (Community)](/docs/foundry/questions-answers/workshop-community/)
* Code examples

  + Notional data generation

    - [Transforms](/docs/foundry/code-examples/notional-data-generation-transforms/)
  + Raw file parsing

    - [Functions on Objects](/docs/foundry/code-examples/raw-file-parsing-functions-on-objects/)
    - [Transforms](/docs/foundry/code-examples/raw-file-parsing-transforms/)
  + Functions on objects

    - [Functions on Objects](/docs/foundry/code-examples/functions-on-objects-functions-on-objects/)
  + Dataset metadata operations

    - [Code Repositories](/docs/foundry/code-examples/dataset-metadata-operations-code-repositories/)
    - [Local environment](/docs/foundry/code-examples/dataset-metadata-operations-local-environment/)
  + Graph and tree structured datasets

    - [Transforms](/docs/foundry/code-examples/graph-and-tree-structured-datasets-transforms/)
    - [Functions on Objects](/docs/foundry/code-examples/graph-and-tree-structured-datasets-functions-on-objects/)
  + Common operations

    - [Code Repositories](/docs/foundry/code-examples/common-operations-code-repositories/)
    - [Transforms](/docs/foundry/code-examples/common-operations-transforms/)
    - [Functions on Objects](/docs/foundry/code-examples/common-operations-functions-on-objects/)
  + Geospatial computation

    - [Transforms](/docs/foundry/code-examples/geospatial-computation-transforms/)
  + Fuzzy matching

    - [Transforms](/docs/foundry/code-examples/fuzzy-matching-transforms/)
  + Incremental transforms

    - [Transforms](/docs/foundry/code-examples/incremental-transforms-transforms/)
  + Foundry APIs

    - [Local environment](/docs/foundry/code-examples/foundry-apis-local-environment/)
  + External transforms

    - [Transforms](/docs/foundry/code-examples/external-transforms-transforms/)

Code examplesGeospatial computation[Transforms](/docs/foundry/code-examples/geospatial-computation-transforms/)

Transforms
==========

Python
------

### Combine shapefiles and convert to GeoJSON

How do I combine multiple shapefiles and convert them to GeoJSON format?

This code uses the `geospatial_tools` library to read multiple shapefiles, convert their geometries to GeoJSON format, and combine them into a single PySpark DataFrame. It also computes the centroid of each geometry and converts it to a geohash.

```
Copied!

1
2
3
4
5
6
7
8
9
10
11
12
13
14
15
16
17
18
19
20
21
22
23
24
25
26
27
28
29
30
31
32
33
34
35
36
37
38
39
40
41
42
43
44
45
46
47
48
from transforms.api import transform, Input, Output
from geospatial_tools import geospatial
from geospatial_tools.functions import clean_geometry, centroid, geojson_to_geohash
import tempfile
import shutil
import geopandas as gpd
from pyspark.sql import types as T
from pyspark.sql import functions as F
import json
from shapely.geometry import mapping


@geospatial()
@transform(
    output=Output(),
    input_data=Input(),
)
def compute(ctx, input_data, output):
    fs = input_data.filesystem()
    schema = T.StructType([T.StructField("geoshape", T.StringType()),
                           T.StructField("name", T.StringType()),
                           T.StructField("centroid", T.StringType())])
    shapefiles = [f.path.replace('.shp', '') for f in fs.ls(glob='*shp')]
    combined_data = ctx.spark_session.createDataFrame([], schema)
    for shapefile in shapefiles:  # NOQA
        with tempfile.TemporaryDirectory() as tmp_dir:
            # Copy all files for the shapefile to the local filesystem
            # There are multiple files associated with a shapefile, such as .prj and .cpg
            for shapefile_file in fs.ls(glob=f'{shapefile}.*'):
                with open(f'{tmp_dir}/{shapefile_file.path}', 'wb') as tmp_file:
                    with fs.open(shapefile_file.path, 'rb') as f:
                        shutil.copyfileobj(f, tmp_file)
            # Create a GeoJSON geometry column
            pdf = gpd.read_file(f'{tmp_dir}/{shapefile}.shp')
            pdf['geometry'] = pdf.geometry.apply(lambda x: json.dumps(mapping(x)))
            df = ctx.spark_session.createDataFrame(pdf)
            
            # Convert everything to EPSG:4326 format expected by Foundry
            crs = gpd.read_file(f'{tmp_dir}/{shapefile}.shp').crs.to_string()
            df = df.withColumn(
                "geoshape",
                clean_geometry('geometry', crs, lat_long=(crs != "EPSG:4326"))
                ).select("geoshape")
            df = df.withColumn('name', F.lit(shapefile))
            df = df.withColumn('centroid', geojson_to_geohash(centroid('geoshape')))
            combined_data = combined_data.unionByName(df)

    return output.write_dataframe(combined_data)
```

* Date submitted: 2024-05-23
* Tags: `geospatial`, `shapefile`, `geojson`, `geohash`, `pyspark`, `geopandas`

### Geospatial join with buffer in PySpark

How do I perform a geospatial join with a buffer in PySpark?

This code uses the `geospatial_tools` library to perform a geospatial join between two datasets, lines, and points, with a 30,000 meters buffer around the points. It then returns a DataFrame with the `point_id` and `line_id`.

```
Copied!

1
2
3
4
5
6
7
8
9
10
11
12
13
14
15
16
17
18
19
20
21
22
23
24
from pyspark.sql import functions as F
from transforms.api import configure, transform_df, Input, Output
from geospatial_tools import geospatial
from geospatial_tools.functions import buffer, lat_long_to_geometry

@configure(profile=['GEOSPARK'])
@geospatial()
@transform_df(
    Output(),
    lines=Input(),
    points=Input()
)
def compute(lines, points):
    lines = lines.select(F.col('id').alias('line_id'), 'geometry')
    points = points.withColumn(
        'geometry', lat_long_to_geometry('latitude', 'longitude', 'EPSG:4326')
        ).withColumn('geometry_buff', buffer('geometry', meters=30000)
        ).select('point_id', 'geometry_buff')
    df = points.spatial_join(
            lines,
            ('geometry_buff', 'geometry'),
            'left'
        ).select(points.point_id, lines.line_id)
    return df
```

* Date submitted: 2024-04-25
* Tags: `geospatial`, `pyspark`, `geospatial_tools`, `buffer`, `spatial_join`

[←

PREVIOUSCommon operations / Functions on Objects](/docs/foundry/code-examples/common-operations-functions-on-objects/)

[NEXTFuzzy matching / Transforms

→](/docs/foundry/code-examples/fuzzy-matching-transforms/)

© 2026 Palantir Technologies Inc. All rights reserved.

[Cookies Statement ↗](https://www.palantir.com/cookie-statement/)[Privacy Statement ↗](https://www.palantir.com/privacy-and-security/)

Cookie Settings

Contents
--------

* [Transforms](#transforms)
  + [Python](#python)
