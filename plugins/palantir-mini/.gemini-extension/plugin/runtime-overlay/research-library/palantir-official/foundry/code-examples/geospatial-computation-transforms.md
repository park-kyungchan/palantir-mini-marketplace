---
sourceUrl: "https://www.palantir.com/docs/foundry/code-examples/geospatial-computation-transforms/"
canonicalUrl: "https://palantir.com/docs/foundry/code-examples/geospatial-computation-transforms/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "9cabab02d727a2f5da648bd11b0b95473b16a225a7182cba8412d04cc46f03b5"
product: "foundry"
docsArea: "code-examples"
locale: "en"
upstreamTitle: "Documentation | Geospatial computation > Transforms"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Transforms

## Python

### Combine shapefiles and convert to GeoJSON

How do I combine multiple shapefiles and convert them to GeoJSON format?

This code uses the `geospatial_tools` library to read multiple shapefiles, convert their geometries to GeoJSON format, and combine them into a single PySpark DataFrame. It also computes the centroid of each geometry and converts it to a geohash.

```python
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

```python
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
