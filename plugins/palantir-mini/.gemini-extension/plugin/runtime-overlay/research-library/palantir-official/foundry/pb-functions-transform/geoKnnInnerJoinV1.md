---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/geoKnnInnerJoinV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/geoKnnInnerJoinV1/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "7fdd9bfe08fa1477b0e4207b5ac6a97a5f20c2c718dd90221ca6640732466be7"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Geometry knn inner join"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Geometry knn inner join

> Supported in: Batch

Selects the k closest points from the neighbors dataset for each valid input geometry from the base dataset. Internally converts the input datasets to the given coordinate reference system, and back to WGS84. The entire neighbors dataset must be able to fit into driver and executor memory. A 3 gb executor should be able to handle up to 1 million points in the neighbors dataset.

**Transform categories**: Geospatial, Join

## Declared arguments

* **Base dataset:** Base dataset to use in join.<br>*Table*
* **Condition for columns to select on the left:** All columns in the left input schema will be tested to see if they match this condition. If they match, the column will be selected in the output.<br>*ColumnPredicate*
* **Condition for columns to select on the right:** All columns in the right input schema will be tested to see if they match this condition. If they match, the column will be selected in the output.<br>*ColumnPredicate*
* **Join key:** The GeoJSON column from the query dataset and the geopoint column from the neighbors dataset.<br>*Tuple\<Column\<Geometry>, Column\<GeoPoint>>*
* **K:** The number of neighbors to select from the right dataset for each valid geometry in the left dataset.<br>*Literal\<Integer>*
* **Neighbors dataset:** Dataset of potential neighbors to use in join.<br>*Table*
* **Projected coordinate system:** Input geometries will be converted to this coordinate system prior to the join, and distance will be measured in the units of the given coordinate system. Formatted as "authority:id", so for example UTM zone 18N could be identified by EPSG:32618.<br>*Literal\<String>*
* *optional* **Prefix for columns from right:** Prefix to add to all column names on the right hand side.<br>*Literal\<String>*

## Examples

### Example 1: Base case

**Argument values:**

* **Base dataset:** ri.foundry.main.dataset.left
* **Condition for columns to select on the left:** <br>columnNameIsIn(<br> columnNames: \[geometryCol, lhsCol],<br>)
* **Condition for columns to select on the right:** <br>columnNameIsIn(<br> columnNames: \[geometryCol, col],<br>)
* **Join key:** (`geometryCol`, `geometryCol`)
* **K:** 2
* **Neighbors dataset:** ri.foundry.main.dataset.right
* **Projected coordinate system:** epsg:2868
* **Prefix for columns from right:** rhs\_

**Inputs:**

ri.foundry.main.dataset.left

| geometryCol | lhsCol |
| ----- | ----- |
| {"coordinates": \[-112.14843750000001,33.440609443703586], "type":"Point"} | 42.0 |

ri.foundry.main.dataset.right

| geometryCol | col |
| ----- | ----- |
| {<br> **latitude**: 33.440609443703586,<br> **longitude**: -112.14843750000001,<br>} | rhsVal1 |
| {<br> **latitude**: 33.44082430962016,<br> **longitude**: -112.14560508728029,<br>} | rhsVal2 |
| {<br> **latitude**: 33.440895931474124,<br> **longitude**: -112.11796760559083,<br>} | rhsVal3 |

**Output:**

| geometryCol | lhsCol | rhs\_geometryCol | rhs\_col |
| ----- | ----- | ----- | ----- |
| {"coordinates": \[-112.14843750000001,33.440609443703586], "type":"Point"} | 42.0 | {<br> **latitude**: 33.440609443703586,<br> **longitude**: -112.14843750000001,<br>} | rhsVal1 |
| {"coordinates": \[-112.14843750000001,33.440609443703586], "type":"Point"} | 42.0 | {<br> **latitude**: 33.44082430962016,<br> **longitude**: -112.14560508728029,<br>} | rhsVal2 |

***

### Example 2: Base case

**Argument values:**

* **Base dataset:** ri.foundry.main.dataset.left
* **Condition for columns to select on the left:** <br>columnNameIsIn(<br> columnNames: \[geometryColLhs, lhs-1],<br>)
* **Condition for columns to select on the right:** <br>columnNameIsIn(<br> columnNames: \[geometryColRhs, rhs-1],<br>)
* **Join key:** (`geometryColLhs`, `geometryColRhs`)
* **K:** 1
* **Neighbors dataset:** ri.foundry.main.dataset.right
* **Projected coordinate system:** epsg:2868
* **Prefix for columns from right:** *null*

**Inputs:**

ri.foundry.main.dataset.left

| geometryColLhs | lhs-1 |
| ----- | ----- |

ri.foundry.main.dataset.right

| geometryColRhs | rhs-1 |
| ----- | ----- |

**Output:**

| geometryColLhs | lhs-1 | geometryColRhs | rhs-1 |
| ----- | ----- | ----- | ----- |

***

### Example 3: Base case

**Argument values:**

* **Base dataset:** ri.foundry.main.dataset.left
* **Condition for columns to select on the left:** <br>columnNameIsIn(<br> columnNames: \[geometryCol, lhsCol],<br>)
* **Condition for columns to select on the right:** <br>columnNameIsIn(<br> columnNames: \[geometryCol, col],<br>)
* **Join key:** (`geometryCol`, `geometryCol`)
* **K:** 2
* **Neighbors dataset:** ri.foundry.main.dataset.right
* **Projected coordinate system:** epsg:2868
* **Prefix for columns from right:** rhs\_

**Inputs:**

ri.foundry.main.dataset.left

| geometryCol | lhsCol |
| ----- | ----- |
| {"coordinates": \[-112.14843750000001,33.440609443703586], "type":"Point"} | 42.0 |
| {"coordinates": \[-112.14843750000001,33.440609443703586], "type":"Point"} | 43.0 |

ri.foundry.main.dataset.right

| geometryCol | col |
| ----- | ----- |
| {<br> **latitude**: 33.440609443703586,<br> **longitude**: -112.14843750000001,<br>} | rhsVal1 |
| {<br> **latitude**: 33.44082430962016,<br> **longitude**: -112.14560508728029,<br>} | rhsVal2 |
| {<br> **latitude**: 33.440895931474124,<br> **longitude**: -112.11796760559083,<br>} | rhsVal3 |

**Output:**

| geometryCol | lhsCol | rhs\_geometryCol | rhs\_col |
| ----- | ----- | ----- | ----- |
| {"coordinates": \[-112.14843750000001,33.440609443703586], "type":"Point"} | 42.0 | {<br> **latitude**: 33.440609443703586,<br> **longitude**: -112.14843750000001,<br>} | rhsVal1 |
| {"coordinates": \[-112.14843750000001,33.440609443703586], "type":"Point"} | 43.0 | {<br> **latitude**: 33.440609443703586,<br> **longitude**: -112.14843750000001,<br>} | rhsVal1 |
| {"coordinates": \[-112.14843750000001,33.440609443703586], "type":"Point"} | 42.0 | {<br> **latitude**: 33.44082430962016,<br> **longitude**: -112.14560508728029,<br>} | rhsVal2 |
| {"coordinates": \[-112.14843750000001,33.440609443703586], "type":"Point"} | 43.0 | {<br> **latitude**: 33.44082430962016,<br> **longitude**: -112.14560508728029,<br>} | rhsVal2 |

***

### Example 4: Base case

**Argument values:**

* **Base dataset:** ri.foundry.main.dataset.left
* **Condition for columns to select on the left:** <br>columnNameIsIn(<br> columnNames: \[geometryCol, lhsCol],<br>)
* **Condition for columns to select on the right:** <br>columnNameIsIn(<br> columnNames: \[geometryCol, col],<br>)
* **Join key:** (`geometryCol`, `geometryCol`)
* **K:** 3
* **Neighbors dataset:** ri.foundry.main.dataset.right
* **Projected coordinate system:** epsg:2868
* **Prefix for columns from right:** rhs\_

**Inputs:**

ri.foundry.main.dataset.left

| geometryCol | lhsCol |
| ----- | ----- |
| {"coordinates": \[-112.14843750000001,33.440609443703586], "type":"Point"} | 42.0 |

ri.foundry.main.dataset.right

| geometryCol | col |
| ----- | ----- |
| {<br> **latitude**: 33.440609443703586,<br> **longitude**: -112.14843750000001,<br>} | rhsVal1 |
| {<br> **latitude**: 33.440609443703586,<br> **longitude**: -112.14843750000001,<br>} | rhsVal1 |
| {<br> **latitude**: 33.44082430962016,<br> **longitude**: -112.14560508728029,<br>} | rhsVal2 |
| {<br> **latitude**: 33.44082430962016,<br> **longitude**: -112.14560508728029,<br>} | rhsVal2 |
| {<br> **latitude**: 33.440895931474124,<br> **longitude**: -112.11796760559083,<br>} | rhsVal3 |

**Output:**

| geometryCol | lhsCol | rhs\_geometryCol | rhs\_col |
| ----- | ----- | ----- | ----- |
| {"coordinates": \[-112.14843750000001,33.440609443703586], "type":"Point"} | 42.0 | {<br> **latitude**: 33.440609443703586,<br> **longitude**: -112.14843750000001,<br>} | rhsVal1 |
| {"coordinates": \[-112.14843750000001,33.440609443703586], "type":"Point"} | 42.0 | {<br> **latitude**: 33.440609443703586,<br> **longitude**: -112.14843750000001,<br>} | rhsVal1 |
| {"coordinates": \[-112.14843750000001,33.440609443703586], "type":"Point"} | 42.0 | {<br> **latitude**: 33.44082430962016,<br> **longitude**: -112.14560508728029,<br>} | rhsVal2 |

***

### Example 5: Base case

**Argument values:**

* **Base dataset:** ri.foundry.main.dataset.left
* **Condition for columns to select on the left:** <br>columnNameIsIn(<br> columnNames: \[geometryColLhs, lhs-1],<br>)
* **Condition for columns to select on the right:** <br>columnNameIsIn(<br> columnNames: \[geometryColRhs, rhs-1],<br>)
* **Join key:** (`geometryColLhs`, `geometryColRhs`)
* **K:** 1
* **Neighbors dataset:** ri.foundry.main.dataset.right
* **Projected coordinate system:** epsg:2868
* **Prefix for columns from right:** *null*

**Inputs:**

ri.foundry.main.dataset.left

| geometryColLhs | lhs-1 |
| ----- | ----- |

ri.foundry.main.dataset.right

| geometryColRhs | rhs-1 |
| ----- | ----- |
| {<br> **latitude**: 33.44082430962016,<br> **longitude**: -112.14560508728029,<br>} | *null* |
| {<br> **latitude**: 33.440895931474124,<br> **longitude**: -112.11796760559083,<br>} | rhsVal2 |
| *null* | rhsVal3 |

**Output:**

| geometryColLhs | lhs-1 | geometryColRhs | rhs-1 |
| ----- | ----- | ----- | ----- |

***

### Example 6: Base case

**Argument values:**

* **Base dataset:** ri.foundry.main.dataset.left
* **Condition for columns to select on the left:** <br>columnNameIsIn(<br> columnNames: \[geometryColLhs, lhs-1],<br>)
* **Condition for columns to select on the right:** <br>columnNameIsIn(<br> columnNames: \[geometryColRhs, rhs-1],<br>)
* **Join key:** (`geometryColLhs`, `geometryColRhs`)
* **K:** 1
* **Neighbors dataset:** ri.foundry.main.dataset.right
* **Projected coordinate system:** epsg:2868
* **Prefix for columns from right:** *null*

**Inputs:**

ri.foundry.main.dataset.left

| geometryColLhs | lhs-1 |
| ----- | ----- |
| {"coordinates": \[-112.14843750000001,33.440609443703586], "type":"Point"} | 42.0 |
| {"coordinates": \[-112.14560508728029,33.44082430962016], "type":"Point"} | 43.0 |

ri.foundry.main.dataset.right

| geometryColRhs | rhs-1 |
| ----- | ----- |

**Output:**

| geometryColLhs | lhs-1 | geometryColRhs | rhs-1 |
| ----- | ----- | ----- | ----- |

***

### Example 7: Base case

**Argument values:**

* **Base dataset:** ri.foundry.main.dataset.left
* **Condition for columns to select on the left:** <br>columnNameIsIn(<br> columnNames: \[geometryCol, lhsCol],<br>)
* **Condition for columns to select on the right:** <br>columnNameIsIn(<br> columnNames: \[geometryCol, col1, arrayCol],<br>)
* **Join key:** (`geometryCol`, `geometryCol`)
* **K:** 5
* **Neighbors dataset:** ri.foundry.main.dataset.right
* **Projected coordinate system:** epsg:4326
* **Prefix for columns from right:** rhs\_

**Inputs:**

ri.foundry.main.dataset.left

| geometryCol | lhsCol |
| ----- | ----- |
| {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,10.0],\[10.0,10.0],\[10.0,0.0],\[0.0,0.0]]]} | 42.0 |

ri.foundry.main.dataset.right

| geometryCol | col1 | arrayCol | toDrop |
| ----- | ----- | ----- | ----- |
| {<br> **latitude**: 33.440609443703586,<br> **longitude**: -112.14843750000001,<br>} | rhsVal1 | \[ 0.0, 1.1 ] | 1.0 |
| {<br> **latitude**: 33.44082430962016,<br> **longitude**: -112.14560508728029,<br>} | rhsVal2 | \[ 0.0, 1.1 ] | 1.0 |
| {<br> **latitude**: 33.440895931474124,<br> **longitude**: -112.11796760559083,<br>} | rhsVal3 | \[ 0.0, 1.1 ] | 1.0 |

**Output:**

| geometryCol | lhsCol | rhs\_geometryCol | rhs\_col1 | rhs\_arrayCol |
| ----- | ----- | ----- | ----- | ----- |
| {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,10.0],\[10.0,10.0],\[10.0,0.0],\[0.0,0.0]]]} | 42.0 | {<br> **latitude**: 33.440609443703586,<br> **longitude**: -112.14843750000001,<br>} | rhsVal1 | \[ 0.0, 1.1 ] |
| {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,10.0],\[10.0,10.0],\[10.0,0.0],\[0.0,0.0]]]} | 42.0 | {<br> **latitude**: 33.44082430962016,<br> **longitude**: -112.14560508728029,<br>} | rhsVal2 | \[ 0.0, 1.1 ] |
| {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,10.0],\[10.0,10.0],\[10.0,0.0],\[0.0,0.0]]]} | 42.0 | {<br> **latitude**: 33.440895931474124,<br> **longitude**: -112.11796760559083,<br>} | rhsVal3 | \[ 0.0, 1.1 ] |

***

### Example 8: Base case

**Argument values:**

* **Base dataset:** ri.foundry.main.dataset.left
* **Condition for columns to select on the left:** <br>columnNameIsIn(<br> columnNames: \[geometryColLhs, lhs-1],<br>)
* **Condition for columns to select on the right:** <br>columnNameIsIn(<br> columnNames: \[geometryColRhs, rhs-1],<br>)
* **Join key:** (`geometryColLhs`, `geometryColRhs`)
* **K:** 1
* **Neighbors dataset:** ri.foundry.main.dataset.right
* **Projected coordinate system:** epsg:2868
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
| {<br> **latitude**: 33.44082430962016,<br> **longitude**: -112.14560508728029,<br>} | *null* |
| {<br> **latitude**: 33.440895931474124,<br> **longitude**: -112.11796760559083,<br>} | rhsVal2 |
| *null* | rhsVal3 |

**Output:**

| geometryColLhs | lhs-1 | geometryColRhs | rhs-1 |
| ----- | ----- | ----- | ----- |
| {"coordinates": \[-112.14843750000001,33.440609443703586], "type":"Point"} | 42.0 | {<br> **latitude**: 33.44082430962016,<br> **longitude**: -112.14560508728029,<br>} | *null* |

***

### Example 9: Base case

**Argument values:**

* **Base dataset:** ri.foundry.main.dataset.left
* **Condition for columns to select on the left:** <br>columnNameIsIn(<br> columnNames: \[geometryColLhs, lhs-1],<br>)
* **Condition for columns to select on the right:** <br>columnNameIsIn(<br> columnNames: \[],<br>)
* **Join key:** (`geometryColLhs`, `geometryColRhs`)
* **K:** 1
* **Neighbors dataset:** ri.foundry.main.dataset.right
* **Projected coordinate system:** epsg:2868
* **Prefix for columns from right:** *null*

**Inputs:**

ri.foundry.main.dataset.left

| geometryColLhs | lhs-1 |
| ----- | ----- |
| {"coordinates": \[-112.14843750000001,33.440609443703586], "type":"Point"} | 42.0 |
| {"coordinates": \[-112.14560508728029,33.44082430962016], "type":"Point"} | 43.0 |

ri.foundry.main.dataset.right

| geometryColRhs | rhs-1 |
| ----- | ----- |
| {<br> **latitude**: 33.44082430962016,<br> **longitude**: -112.14560508728029,<br>} | *null* |
| {<br> **latitude**: 33.440895931474124,<br> **longitude**: -112.11796760559083,<br>} | rhsVal2 |
| *null* | rhsVal3 |

**Output:**

| geometryColLhs | lhs-1 |
| ----- | ----- |
| {"coordinates": \[-112.14843750000001,33.440609443703586], "type":"Point"} | 42.0 |
| {"coordinates": \[-112.14560508728029,33.44082430962016], "type":"Point"} | 43.0 |

***

### Example 10: Base case

**Argument values:**

* **Base dataset:** ri.foundry.main.dataset.left
* **Condition for columns to select on the left:** <br>columnNameIsIn(<br> columnNames: \[],<br>)
* **Condition for columns to select on the right:** <br>columnNameIsIn(<br> columnNames: \[geometryColRhs, rhs-1],<br>)
* **Join key:** (`geometryColLhs`, `geometryColRhs`)
* **K:** 1
* **Neighbors dataset:** ri.foundry.main.dataset.right
* **Projected coordinate system:** epsg:2868
* **Prefix for columns from right:** *null*

**Inputs:**

ri.foundry.main.dataset.left

| geometryColLhs | lhs-1 |
| ----- | ----- |
| {"coordinates": \[-112.14843750000001,33.440609443703586], "type":"Point"} | 42.0 |
| {"coordinates": \[-112.14560508728029,33.44082430962016], "type":"Point"} | 43.0 |

ri.foundry.main.dataset.right

| geometryColRhs | rhs-1 |
| ----- | ----- |
| {<br> **latitude**: 33.44082430962016,<br> **longitude**: -112.14560508728029,<br>} | *null* |
| {<br> **latitude**: 33.440895931474124,<br> **longitude**: -112.11796760559083,<br>} | rhsVal2 |
| *null* | rhsVal3 |

**Output:**

| geometryColRhs | rhs-1 |
| ----- | ----- |
| {<br> **latitude**: 33.44082430962016,<br> **longitude**: -112.14560508728029,<br>} | *null* |
| {<br> **latitude**: 33.44082430962016,<br> **longitude**: -112.14560508728029,<br>} | *null* |

***

### Example 11: Base case

**Argument values:**

* **Base dataset:** ri.foundry.main.dataset.left
* **Condition for columns to select on the left:** <br>allColumns(<br><br>)
* **Condition for columns to select on the right:** <br>columnNameIsIn(<br> columnNames: \[geometryCol, col1, arrayCol],<br>)
* **Join key:** (`geometryCol`, `geometryCol`)
* **K:** 1
* **Neighbors dataset:** ri.foundry.main.dataset.right
* **Projected coordinate system:** epsg:4326
* **Prefix for columns from right:** rhs\_

**Inputs:**

ri.foundry.main.dataset.left

| geometryCol | lhsCol |
| ----- | ----- |
| {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,10.0],\[10.0,10.0],\[10.0,0.0],\[0.0,0.0]]]} | 42.0 |
| {"coordinates": \[55.0, 5.0], "type":"Point"} | 43.0 |
| {"coordinates": \[\[40.0, 0.0], \[0.0, 40.0]], "type":"LineString"} | 44.0 |
| {"coordinates": \[\[\[20.0, 10.0], \[27.0, 10.0], \[27.0, 17.0], \[20.0, 17.0], \[20.0, 10.0]]], "type": "Polygon"} | 45.0 |
| {"coordinates": \[\[\[21.0, 21.0], \[27.0, 21.0], \[27.0, 27.0], \[21.0, 27.0], \[21.0, 21.0]]], "type": "Polygon"} | 46.0 |
| {"coordinates": \[\[\[\[2.0, 2.0], \[7.0, 2.0], \[7.0, 7.0], \[2.0, 7.0], \[2.0, 2.0]]], \[\[\[12.0, 12.0], \[17.0, 12.0], \[17.0, 17.0], \[12.0, 17.0], \[12.0, 12.0]]]], "type":"MultiPolygon"} | 47.0 |
| {"coordinates": \[\[\[\[170.0, 170.0], \[190.0, 170.0], \[190.0, 190.0], \[170.0, 190.0], \[170.0, 170.0]]], \[\[\[12.0, 12.0], \[17.0, 12.0], \[17.0, 17.0], \[12.0, 17.0], \[12.0, 12.0]]]], "type":"MultiPolygon"} | 48.0 |

ri.foundry.main.dataset.right

| geometryCol | col1 | arrayCol | toDrop |
| ----- | ----- | ----- | ----- |
| {<br> **latitude**: 5.0,<br> **longitude**: 5.0,<br>} | rhsVal1 | \[ 0.0, 1.1 ] | 1.0 |
| {<br> **latitude**: 100.0,<br> **longitude**: 100.0,<br>} | rhsVal2 | \[ 0.0, 1.1 ] | 1.0 |

**Output:**

| geometryCol | lhsCol | rhs\_geometryCol | rhs\_col1 | rhs\_arrayCol |
| ----- | ----- | ----- | ----- | ----- |
| {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,10.0],\[10.0,10.0],\[10.0,0.0],\[0.0,0.0]]]} | 42.0 | {<br> **latitude**: 5.0,<br> **longitude**: 5.0,<br>} | rhsVal1 | \[ 0.0, 1.1 ] |
| {"coordinates": \[55.0, 5.0], "type":"Point"} | 43.0 | {<br> **latitude**: 5.0,<br> **longitude**: 5.0,<br>} | rhsVal1 | \[ 0.0, 1.1 ] |
| {"coordinates": \[\[40.0, 0.0], \[0.0, 40.0]], "type":"LineString"} | 44.0 | {<br> **latitude**: 5.0,<br> **longitude**: 5.0,<br>} | rhsVal1 | \[ 0.0, 1.1 ] |
| {"coordinates": \[\[\[20.0, 10.0], \[27.0, 10.0], \[27.0, 17.0], \[20.0, 17.0], \[20.0, 10.0]]], "type": "Polygon"} | 45.0 | {<br> **latitude**: 5.0,<br> **longitude**: 5.0,<br>} | rhsVal1 | \[ 0.0, 1.1 ] |
| {"coordinates": \[\[\[21.0, 21.0], \[27.0, 21.0], \[27.0, 27.0], \[21.0, 27.0], \[21.0, 21.0]]], "type": "Polygon"} | 46.0 | {<br> **latitude**: 5.0,<br> **longitude**: 5.0,<br>} | rhsVal1 | \[ 0.0, 1.1 ] |
| {"coordinates": \[\[\[\[2.0, 2.0], \[7.0, 2.0], \[7.0, 7.0], \[2.0, 7.0], \[2.0, 2.0]]], \[\[\[12.0, 12.0], \[17.0, 12.0], \[17.0, 17.0], \[12.0, 17.0], \[12.0, 12.0]]]], "type":"MultiPolygon"} | 47.0 | {<br> **latitude**: 5.0,<br> **longitude**: 5.0,<br>} | rhsVal1 | \[ 0.0, 1.1 ] |
| {"coordinates": \[\[\[\[170.0, 170.0], \[190.0, 170.0], \[190.0, 190.0], \[170.0, 190.0], \[170.0, 170.0]]], \[\[\[12.0, 12.0], \[17.0, 12.0], \[17.0, 17.0], \[12.0, 17.0], \[12.0, 12.0]]]], "type":"MultiPolygon"} | 48.0 | {<br> **latitude**: 5.0,<br> **longitude**: 5.0,<br>} | rhsVal1 | \[ 0.0, 1.1 ] |

***
