---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/geoPointToPoint3dDistanceInnerJoinV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/geoPointToPoint3dDistanceInnerJoinV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "0c50142148ce896c2f85b76e3a89ec367117ea2ce49b6e3a1ea7ae208b7c1ba3"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > GeoPoint-to-GeoPoint 3d distance inner join"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# GeoPoint-to-GeoPoint 3d distance inner join

> Supported in: Batch

Inner joins left and right datasets together based on the distance between point geometries. The geometries must represent points, and may optionally include a z-coordinate. Internally converts geometries into the given projected coordinate reference system prior to the join and back to WGS84. Non-point geometries are ignored, and the  entire right dataset must be able to  fit into driver and executor memory. A 3 gb executor should be able to handle up to 4 million points in the neighbors dataset.

**Transform categories**: Geospatial, Join

## Declared arguments

* **Condition for columns to select on the left:** All columns in the left input schema will be tested to see if they match this condition. If they match, the column will be selected in the output.<br>*ColumnPredicate*
* **Condition for columns to select on the right:** All columns in the right input schema will be tested to see if they match this condition. If they match, the column will be selected in the output.<br>*ColumnPredicate*
* **Distance:** The distance within which to join geometries, in the same units as the coordinate reference system.<br>*Literal\<DefiniteNumeric>*
* **Join key:** The geojson columns from the left and right inputs on which to join.<br>*Tuple\<Column\<Geometry>, Column\<Geometry>>*
* **Left dataset:** Left dataset to use in join.<br>*Table*
* **Projected coordinate system:** Input geometries will be converted to this coordinate system prior to the join, and distance will be measured in the units of the given coordinate system. Formatted as "authority:id", so for example UTM zone 18N could be identified by EPSG:32618.<br>*Literal\<String>*
* **Right dataset:** Right dataset to use in join.<br>*Table*
* **Use z-coordinate:** Whether to include z-coordinates and calculate the 3 dimensional distance. If false, z-coordinates are ignored and 2 dimensional distances are calculated.<br>*Literal\<Boolean>*
* *optional* **Prefix for columns from right:** Prefix to add to all columns on the right hand side.<br>*Literal\<String>*

## Examples

### Example 1: Base case

**Argument values:**

* **Condition for columns to select on the left:** <br>columnNameIsIn(<br> columnNames: \[geometryColLhs, lhs-1],<br>)
* **Condition for columns to select on the right:** <br>columnNameIsIn(<br> columnNames: \[geometryCol, arrayCol],<br>)
* **Distance:** 2.5
* **Join key:** (`geometryColLhs`, `geometryCol`)
* **Left dataset:** ri.foundry.main.dataset.left
* **Projected coordinate system:** EPSG:4326
* **Right dataset:** ri.foundry.main.dataset.right
* **Use z-coordinate:** false
* **Prefix for columns from right:** rhs\_

**Inputs:**

ri.foundry.main.dataset.left

| geometryColLhs | lhs-1 |
| ----- | ----- |
| {"coordinates": \[0.0, 0.0, 0.0], "type":"Point"} | 42.0 |
| {"coordinates": \[0.0, 0.0, 5.0], "type":"Point"} | 43.0 |
| {"coordinates": \[0.0, 0.0], "type":"Point"} | 44.0 |

ri.foundry.main.dataset.right

| geometryCol | col1 | arrayCol |
| ----- | ----- | ----- |
| {"coordinates": \[0.0, 0.0, 2.0], "type":"Point"} | rhsVal1 | \[ 0.0, 1.0 ] |
| {"coordinates": \[0.0, 1.0], "type":"Point"} | rhsVal2 | \[ 0.0, 1.0 ] |

**Output:**

| geometryColLhs | lhs-1 | rhs\_geometryCol | rhs\_arrayCol |
| ----- | ----- | ----- | ----- |
| {"coordinates": \[0.0, 0.0, 0.0], "type":"Point"} | 42.0 | {"coordinates": \[0.0, 0.0, 2.0], "type":"Point"} | \[ 0.0, 1.0 ] |
| {"coordinates": \[0.0, 0.0, 0.0], "type":"Point"} | 42.0 | {"coordinates": \[0.0, 1.0], "type":"Point"} | \[ 0.0, 1.0 ] |
| {"coordinates": \[0.0, 0.0, 5.0], "type":"Point"} | 43.0 | {"coordinates": \[0.0, 0.0, 2.0], "type":"Point"} | \[ 0.0, 1.0 ] |
| {"coordinates": \[0.0, 0.0, 5.0], "type":"Point"} | 43.0 | {"coordinates": \[0.0, 1.0], "type":"Point"} | \[ 0.0, 1.0 ] |
| {"coordinates": \[0.0, 0.0], "type":"Point"} | 44.0 | {"coordinates": \[0.0, 0.0, 2.0], "type":"Point"} | \[ 0.0, 1.0 ] |
| {"coordinates": \[0.0, 0.0], "type":"Point"} | 44.0 | {"coordinates": \[0.0, 1.0], "type":"Point"} | \[ 0.0, 1.0 ] |

***

### Example 2: Base case

**Argument values:**

* **Condition for columns to select on the left:** <br>columnNameIsIn(<br> columnNames: \[geometryColLhs, lhs-1],<br>)
* **Condition for columns to select on the right:** <br>columnNameIsIn(<br> columnNames: \[geometryCol, arrayCol],<br>)
* **Distance:** 2.5
* **Join key:** (`geometryColLhs`, `geometryCol`)
* **Left dataset:** ri.foundry.main.dataset.left
* **Projected coordinate system:** EPSG:4326
* **Right dataset:** ri.foundry.main.dataset.right
* **Use z-coordinate:** true
* **Prefix for columns from right:** rhs\_

**Inputs:**

ri.foundry.main.dataset.left

| geometryColLhs | lhs-1 |
| ----- | ----- |
| {"coordinates": \[0.0, 0.0, 0.0], "type":"Point"} | 42.0 |
| {"coordinates": \[0.0, 0.0, 5.0], "type":"Point"} | 43.0 |
| {"coordinates": \[0.0, 5.0], "type":"Point"} | 44.0 |

ri.foundry.main.dataset.right

| geometryCol | col1 | arrayCol |
| ----- | ----- | ----- |
| {"coordinates": \[0.0, 0.0, 2.0], "type":"Point"} | rhsVal1 | \[ 0.0, 1.0 ] |
| {"coordinates": \[1.0, 1.0, 6.0], "type":"Point"} | rhsVal2 | \[ 0.0, 1.0 ] |
| {"coordinates": \[0.0, 0.0, 3.0], "type":"Point"} | rhsVal3 | \[ 0.0, 1.0 ] |
| {"coordinates": \[0.0, 0.0], "type":"Point"} | rhsVal4 | \[ 0.0, 1.0 ] |

**Output:**

| geometryColLhs | lhs-1 | rhs\_geometryCol | rhs\_arrayCol |
| ----- | ----- | ----- | ----- |
| {"coordinates": \[0.0, 0.0, 0.0], "type":"Point"} | 42.0 | {"coordinates": \[0.0, 0.0, 2.0], "type":"Point"} | \[ 0.0, 1.0 ] |
| {"coordinates": \[0.0, 0.0, 5.0], "type":"Point"} | 43.0 | {"coordinates": \[0.0, 0.0, 3.0], "type":"Point"} | \[ 0.0, 1.0 ] |
| {"coordinates": \[0.0, 0.0, 5.0], "type":"Point"} | 43.0 | {"coordinates": \[1.0, 1.0, 6.0], "type":"Point"} | \[ 0.0, 1.0 ] |

***

### Example 3: Base case

**Argument values:**

* **Condition for columns to select on the left:** <br>columnNameIsIn(<br> columnNames: \[geometryColLhs, lhs-1],<br>)
* **Condition for columns to select on the right:** <br>columnNameIsIn(<br> columnNames: \[geometryColRhs, rhs-1],<br>)
* **Distance:** 1641
* **Join key:** (`geometryColLhs`, `geometryColRhs`)
* **Left dataset:** ri.foundry.main.dataset.left
* **Projected coordinate system:** epsg:2868
* **Right dataset:** ri.foundry.main.dataset.right
* **Use z-coordinate:** false
* **Prefix for columns from right:** *null*

**Inputs:**

ri.foundry.main.dataset.left

| geometryColLhs | lhs-1 |
| ----- | ----- |
| {"coordinates": \[-112.14843750000001,33.440609443703586], "type":"Point"} | 42.0 |
| *null* | 43.0 |

ri.foundry.main.dataset.right

| geometryColRhs | rhs-1 |
| ----- | ----- |
| {"coordinates": \[-112.14560508728029,33.44082430962016], "type":"Point"} | rhsVal1 |
| {"coordinates": \[-112.11796760559083,33.440895931474124], "type":"Point"} | rhsVal2 |

**Output:**

| geometryColLhs | lhs-1 | geometryColRhs | rhs-1 |
| ----- | ----- | ----- | ----- |
| {"coordinates": \[-112.14843750000001,33.440609443703586], "type":"Point"} | 42.0 | {"coordinates": \[-112.14560508728029,33.44082430962016], "type":"Point"} | rhsVal1 |

***

### Example 4: Base case

**Argument values:**

* **Condition for columns to select on the left:** <br>columnNameIsIn(<br> columnNames: \[geometryColLhs, lhs-1],<br>)
* **Condition for columns to select on the right:** <br>columnNameIsIn(<br> columnNames: \[],<br>)
* **Distance:** 10.0
* **Join key:** (`geometryColLhs`, `geometryCol`)
* **Left dataset:** ri.foundry.main.dataset.left
* **Projected coordinate system:** EPSG:4326
* **Right dataset:** ri.foundry.main.dataset.right
* **Use z-coordinate:** false
* **Prefix for columns from right:** rhs\_

**Inputs:**

ri.foundry.main.dataset.left

| geometryColLhs | lhs-1 |
| ----- | ----- |
| {"coordinates": \[15.0, 5.0], "type":"Point"} | 42.0 |
| {"coordinates": \[55.0, 5.0], "type":"Point"} | 43.0 |

ri.foundry.main.dataset.right

| geometryCol | col1 | arrayCol |
| ----- | ----- | ----- |
| {"coordinates": \[15.0, 5.0], "type":"Point"} | rhsVal1 | \[ 0.0, 1.0 ] |

**Output:**

| geometryColLhs | lhs-1 |
| ----- | ----- |
| {"coordinates": \[15.0, 5.0], "type":"Point"} | 42.0 |

***

### Example 5: Base case

**Argument values:**

* **Condition for columns to select on the left:** <br>columnNameIsIn(<br> columnNames: \[],<br>)
* **Condition for columns to select on the right:** <br>columnNameIsIn(<br> columnNames: \[geometryCol, arrayCol],<br>)
* **Distance:** 10.0
* **Join key:** (`geometryColLhs`, `geometryCol`)
* **Left dataset:** ri.foundry.main.dataset.left
* **Projected coordinate system:** EPSG:4326
* **Right dataset:** ri.foundry.main.dataset.right
* **Use z-coordinate:** false
* **Prefix for columns from right:** rhs\_

**Inputs:**

ri.foundry.main.dataset.left

| geometryColLhs | lhs-1 |
| ----- | ----- |
| {"coordinates": \[15.0, 5.0], "type":"Point"} | 42.0 |
| {"coordinates": \[55.0, 5.0], "type":"Point"} | 43.0 |

ri.foundry.main.dataset.right

| geometryCol | col1 | arrayCol |
| ----- | ----- | ----- |
| {"coordinates": \[55.0, 5.0], "type":"Point"} | rhsVal1 | \[ 0.0, 1.0 ] |

**Output:**

| rhs\_geometryCol | rhs\_arrayCol |
| ----- | ----- |
| {"coordinates": \[55.0, 5.0], "type":"Point"} | \[ 0.0, 1.0 ] |

***

### Example 6: Null case

**Argument values:**

* **Condition for columns to select on the left:** <br>columnNameIsIn(<br> columnNames: \[geometryColLhs, lhs-1],<br>)
* **Condition for columns to select on the right:** <br>columnNameIsIn(<br> columnNames: \[geometryCol, col1, arrayCol],<br>)
* **Distance:** 10.0
* **Join key:** (`geometryColLhs`, `geometryCol`)
* **Left dataset:** ri.foundry.main.dataset.left
* **Projected coordinate system:** EPSG:4326
* **Right dataset:** ri.foundry.main.dataset.right
* **Use z-coordinate:** false
* **Prefix for columns from right:** rhs\_

**Inputs:**

ri.foundry.main.dataset.left

| geometryColLhs | lhs-1 |
| ----- | ----- |
| {"coordinates": \[15.0, 5.0], "type":"Point"} | 42.0 |
| {"coordinates": \[55.0, 5.0], "type":"Point"} | 43.0 |
| {"coordinates": \[\[\[20.0, 10.0], \[27.0, 10.0], \[27.0, 17.0], \[20.0, 17.0], \[20.0, 10.0]]], "type": "Polygon"} | 44.0 |
| *null* | 45.0 |

ri.foundry.main.dataset.right

| geometryCol | col1 | arrayCol |
| ----- | ----- | ----- |
| {"coordinates": \[15.0, 5.0], "type":"Point"} | rhsVal1 | \[ 0.0, 1.0 ] |
| {"coordinates": \[\[\[21.0, 21.0], \[27.0, 21.0], \[27.0, 27.0], \[21.0, 27.0], \[21.0, 21.0]]], "type": "Polygon"} | rhsVal2 | \[ 0.0, 1.0 ] |
| {"coordinates": \[\[\[20.0, 10.0], \[27.0, 10.0], \[27.0, 17.0], \[20.0, 17.0], \[20.0, 10.0]]], "type": "Polygon"} | rhsVal3 | \[ 0.0, 1.0 ] |
| *null* | rhsVal4 | \[ 0.0, 1.0 ] |

**Output:**

| geometryColLhs | lhs-1 | rhs\_geometryCol | rhs\_col1 | rhs\_arrayCol |
| ----- | ----- | ----- | ----- | ----- |
| {"coordinates": \[15.0, 5.0], "type":"Point"} | 42.0 | {"coordinates": \[15.0, 5.0], "type":"Point"} | rhsVal1 | \[ 0.0, 1.0 ] |

***
