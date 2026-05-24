---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/geoDistanceInnerJoinV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/geoDistanceInnerJoinV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "5c43671b7ff865da840821974545f23a9a6e9855eb0779690563d38d44746d54"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Geo distance inner join"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Geo distance inner join

> Supported in: Batch

Inner joins left and right datasets together based on the distance between input geometries. Internally converts geometries into the given projected coordinate reference system prior to the join and back to WGS84.

**Transform categories**: Geospatial, Join

## Declared arguments

* **Condition for columns to select on the left:** All columns in the left input schema will be tested to see if they match this condition. If they match, the column will be selected in the output.<br>*ColumnPredicate*
* **Condition for columns to select on the right:** All columns in the right input schema will be tested to see if they match this condition. If they match, the column will be selected in the output.<br>*ColumnPredicate*
* **Distance:** The distance within which to join geometries, in the same units as the coordinate reference system.<br>*Literal\<DefiniteNumeric>*
* **Join key:** The geojson columns from the left and right inputs on which to join.<br>*Tuple\<Column\<Geometry>, Column\<Geometry>>*
* **Left dataset:** Left dataset to use in join.<br>*Table*
* **Projected coordinate system:** Input geometries will be converted to this coordinate system prior to the join, and distance will be measured in the units of the given coordinate system. Formatted as "authority:id", so for example UTM zone 18N could be identified by EPSG:32618.<br>*Literal\<String>*
* **Right dataset:** Right dataset to use in join.<br>*Table*
* *optional* **Prefix for columns from right:** Prefix to add to all columns on the right hand side.<br>*Literal\<String>*

## Examples

### Example 1: Base case

**Argument values:**

* **Condition for columns to select on the left:** <br>columnNameIsIn(<br> columnNames: \[geometryColLhs, lhs-1],<br>)
* **Condition for columns to select on the right:** <br>columnNameIsIn(<br> columnNames: \[geometryCol, arrayCol],<br>)
* **Distance:** 10.0
* **Join key:** (`geometryColLhs`, `geometryCol`)
* **Left dataset:** ri.foundry.main.dataset.left
* **Projected coordinate system:** EPSG:4326
* **Right dataset:** ri.foundry.main.dataset.right
* **Prefix for columns from right:** rhs\_

**Inputs:**

ri.foundry.main.dataset.left

| geometryColLhs | lhs-1 |
| ----- | ----- |
| {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,10.0],\[10.0,10.0],\[10.0,0.0],\[0.0,0.0]]]} | 42.0 |
| {"coordinates": \[55.0, 5.0], "type":"Point"} | 43.0 |
| {"coordinates": \[\[25.0, 0.0], \[0.0, 25.0]], "type":"LineString"} | 44.0 |

ri.foundry.main.dataset.right

| geometryCol | col1 | arrayCol |
| ----- | ----- | ----- |
| {"coordinates": \[\[\[20.0, 10.0], \[27.0, 10.0], \[27.0, 17.0], \[20.0, 17.0], \[20.0, 10.0]]], "type": "Polygon"} | rhsVal1 | \[ 0.0, 1.0 ] |
| {"coordinates": \[\[\[21.0, 21.0], \[27.0, 21.0], \[27.0, 27.0], \[21.0, 27.0], \[21.0, 21.0]]], "type": "Polygon"} | rhsVal2 | \[ 0.0, 1.0 ] |

**Output:**

| geometryColLhs | lhs-1 | rhs\_geometryCol | rhs\_arrayCol |
| ----- | ----- | ----- | ----- |
| {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,10.0],\[10.0,10.0],\[10.0,0.0],\[0.0,0.0]]]} | 42.0 | {"coordinates": \[\[\[20.0, 10.0], \[27.0, 10.0], \[27.0, 17.0], \[20.0, 17.0], \[20.0, 10.0]]], "type": "Polygon"} | \[ 0.0, 1.0 ] |
| {"coordinates": \[\[25.0, 0.0], \[0.0, 25.0]], "type":"LineString"} | 44.0 | {"coordinates": \[\[\[20.0, 10.0], \[27.0, 10.0], \[27.0, 17.0], \[20.0, 17.0], \[20.0, 10.0]]], "type": "Polygon"} | \[ 0.0, 1.0 ] |

***

### Example 2: Base case

**Argument values:**

* **Condition for columns to select on the left:** <br>columnNameIsIn(<br> columnNames: \[geometryColLhs, lhs-1],<br>)
* **Condition for columns to select on the right:** <br>columnNameIsIn(<br> columnNames: \[geometryColRhs, rhs-1],<br>)
* **Distance:** 1641
* **Join key:** (`geometryColLhs`, `geometryColRhs`)
* **Left dataset:** ri.foundry.main.dataset.left
* **Projected coordinate system:** epsg:2868
* **Right dataset:** ri.foundry.main.dataset.right
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

### Example 3: Base case

**Argument values:**

* **Condition for columns to select on the left:** <br>columnNameIsIn(<br> columnNames: \[geometryColLhs, lhs-1],<br>)
* **Condition for columns to select on the right:** <br>columnNameIsIn(<br> columnNames: \[geometryColRhs, rhs-1],<br>)
* **Distance:** 1641
* **Join key:** (`geometryColLhs`, `geometryColRhs`)
* **Left dataset:** ri.foundry.main.dataset.left
* **Projected coordinate system:** epsg:2868
* **Right dataset:** ri.foundry.main.dataset.right
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
* **Prefix for columns from right:** rhs\_

**Inputs:**

ri.foundry.main.dataset.left

| geometryColLhs | lhs-1 |
| ----- | ----- |
| {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,10.0],\[10.0,10.0],\[10.0,0.0],\[0.0,0.0]]]} | 42.0 |
| {"coordinates": \[55.0, 5.0], "type":"Point"} | 43.0 |

ri.foundry.main.dataset.right

| geometryCol | col1 | arrayCol |
| ----- | ----- | ----- |
| {"coordinates": \[\[\[20.0, 10.0], \[27.0, 10.0], \[27.0, 17.0], \[20.0, 17.0], \[20.0, 10.0]]], "type": "Polygon"} | rhsVal1 | \[ 0.0, 1.0 ] |
| {"coordinates": \[\[\[21.0, 21.0], \[27.0, 21.0], \[27.0, 27.0], \[21.0, 27.0], \[21.0, 21.0]]], "type": "Polygon"} | rhsVal2 | \[ 0.0, 1.0 ] |

**Output:**

| geometryColLhs | lhs-1 |
| ----- | ----- |
| {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,10.0],\[10.0,10.0],\[10.0,0.0],\[0.0,0.0]]]} | 42.0 |

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
* **Prefix for columns from right:** rhs\_

**Inputs:**

ri.foundry.main.dataset.left

| geometryColLhs | lhs-1 |
| ----- | ----- |
| {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,10.0],\[10.0,10.0],\[10.0,0.0],\[0.0,0.0]]]} | 42.0 |
| {"coordinates": \[55.0, 5.0], "type":"Point"} | 43.0 |

ri.foundry.main.dataset.right

| geometryCol | col1 | arrayCol |
| ----- | ----- | ----- |
| {"coordinates": \[\[\[20.0, 10.0], \[27.0, 10.0], \[27.0, 17.0], \[20.0, 17.0], \[20.0, 10.0]]], "type": "Polygon"} | rhsVal1 | \[ 0.0, 1.0 ] |
| {"coordinates": \[\[\[21.0, 21.0], \[27.0, 21.0], \[27.0, 27.0], \[21.0, 27.0], \[21.0, 21.0]]], "type": "Polygon"} | rhsVal2 | \[ 0.0, 1.0 ] |

**Output:**

| rhs\_geometryCol | rhs\_arrayCol |
| ----- | ----- |
| {"coordinates": \[\[\[20.0, 10.0], \[27.0, 10.0], \[27.0, 17.0], \[20.0, 17.0], \[20.0, 10.0]]], "type": "Polygon"} | \[ 0.0, 1.0 ] |

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
* **Prefix for columns from right:** rhs\_

**Inputs:**

ri.foundry.main.dataset.left

| geometryColLhs | lhs-1 |
| ----- | ----- |
| {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,10.0],\[10.0,10.0],\[10.0,0.0],\[0.0,0.0]]]} | 42.0 |
| {"coordinates": \[55.0, 5.0], "type":"Point"} | 43.0 |
| *null* | 43.0 |

ri.foundry.main.dataset.right

| geometryCol | col1 | arrayCol |
| ----- | ----- | ----- |
| {"coordinates": \[\[\[20.0, 10.0], \[27.0, 10.0], \[27.0, 17.0], \[20.0, 17.0], \[20.0, 10.0]]], "type": "Polygon"} | rhsVal1 | \[ 0.0, 1.0 ] |
| {"coordinates": \[\[\[21.0, 21.0], \[27.0, 21.0], \[27.0, 27.0], \[21.0, 27.0], \[21.0, 21.0]]], "type": "Polygon"} | rhsVal2 | \[ 0.0, 1.0 ] |
| *null* | rhsVal3 | \[ 0.0, 1.0 ] |

**Output:**

| geometryColLhs | lhs-1 | rhs\_geometryCol | rhs\_col1 | rhs\_arrayCol |
| ----- | ----- | ----- | ----- | ----- |
| {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,10.0],\[10.0,10.0],\[10.0,0.0],\[0.0,0.0]]]} | 42.0 | {"coordinates": \[\[\[20.0, 10.0], \[27.0, 10.0], \[27.0, 17.0], \[20.0, 17.0], \[20.0, 10.0]]], "type": "Polygon"} | rhsVal1 | \[ 0.0, 1.0 ] |

***
