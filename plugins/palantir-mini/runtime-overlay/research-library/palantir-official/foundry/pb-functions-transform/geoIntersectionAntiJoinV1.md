---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/geoIntersectionAntiJoinV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/geoIntersectionAntiJoinV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "f8e191957c4cfa03d110f070623a0c56deabd54e5190329f26934c4981e78d1d"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Geo intersection left anti join"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Geo intersection left anti join

> Supported in: Streaming

Anti joins input datasets based on whether input geometries overlap. Returns only rows from the left dataset where the geometry does not intersect with any geometry in the right dataset. Rows with null or invalid join keys are considered non-intersecting.

**Transform categories**: Geospatial, Join

## Declared arguments

* **Condition for columns to select on the left:** All columns in the left input schema will be tested to see if they match this condition. If they match, the column will be selected in the output.<br>*ColumnPredicate*
* **Condition for columns to select on the right:** All columns in the right input schema will be tested to see if they match this condition. If they match, the column will be selected in the output.<br>*ColumnPredicate*
* **Join key:** GeoJSON columns from the left and right inputs on which to join.<br>*Tuple\<Column\<Geometry>, Column\<Geometry>>*
* **Left dataset:** Left dataset to use in join.<br>*Table*
* **Right dataset:** Right dataset to use in join.<br>*Table*
* *optional* **Prefix for columns from right:** Prefix to add to all columns on the right hand side.<br>*Literal\<String>*

## Examples

### Example 1: Base case

**Argument values:**

* **Condition for columns to select on the left:** <br>allColumns(<br><br>)
* **Condition for columns to select on the right:** <br>allColumns(<br><br>)
* **Join key:** (`geometryColLhs`, `geometryColRhs`)
* **Left dataset:** ri.foundry.main.dataset.left
* **Right dataset:** ri.foundry.main.dataset.right
* **Prefix for columns from right:** *null*

**Inputs:**

ri.foundry.main.dataset.left

| geometryColLhs | col1Lhs |
| ----- | ----- |
| {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,10.0],\[10.0,10.0],\[10.0,0.0],\[0.0,0.0]]]} | 42.0 |
| {"coordinates": \[55.0, 5.0], "type":"Point"} | 43.0 |

ri.foundry.main.dataset.right

| geometryColRhs | col1Rhs |
| ----- | ----- |
| {"coordinates": \[\[\[2.0, 2.0], \[7.0, 2.0], \[7.0, 7.0], \[2.0, 7.0], \[2.0, 2.0]]], "type": "Polygon"} | rhsVal1 |
| {"coordinates": \[\[\[12.0, 12.0], \[17.0, 12.0], \[17.0, 17.0], \[12.0, 17.0], \[12.0, 12.0]]], "type": "Polygon"} | rhsVal2 |
| {"coordinates": \[0.0, 0.0], "type":"Point"} | rhsVal3 |
| {"coordinates": \[15.0, 15.0], "type":"Point"} | rhsVal4 |

**Output:**

| geometryColLhs | col1Lhs |
| ----- | ----- |
| {"coordinates": \[55.0, 5.0], "type":"Point"} | 43.0 |

***

### Example 2: Base case

**Argument values:**

* **Condition for columns to select on the left:** <br>allColumns(<br><br>)
* **Condition for columns to select on the right:** <br>allColumns(<br><br>)
* **Join key:** (`geometryColLhs`, `geometryColRhs`)
* **Left dataset:** ri.foundry.main.dataset.left
* **Right dataset:** ri.foundry.main.dataset.right
* **Prefix for columns from right:** *null*

**Inputs:**

ri.foundry.main.dataset.left

| geometryColLhs | lhs1 |
| ----- | ----- |
| {} | 42.0 |
| {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,10.0],\[10.0,10.0],\[10.0,0.0],\[0.0,0.0]]]} | 43.0 |

ri.foundry.main.dataset.right

| geometryColRhs | rhs1 |
| ----- | ----- |
| {"coordinates": \[\[\[2.0, 2.0], \[7.0, 2.0], \[7.0, 7.0], \[2.0, 7.0], \[2.0, 2.0]]], "type": "Polygon"} | rhsVal1 |

**Output:**

| geometryColLhs | lhs1 |
| ----- | ----- |
| {} | 42.0 |

***

### Example 3: Base case

**Argument values:**

* **Condition for columns to select on the left:** <br>columnNameIsIn(<br> columnNames: \[lhs1],<br>)
* **Condition for columns to select on the right:** <br>allColumns(<br><br>)
* **Join key:** (`geometryColLhs`, `geometryColRhs`)
* **Left dataset:** ri.foundry.main.dataset.left
* **Right dataset:** ri.foundry.main.dataset.right
* **Prefix for columns from right:** *null*

**Inputs:**

ri.foundry.main.dataset.left

| geometryColLhs | lhs1 |
| ----- | ----- |
| {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,10.0],\[10.0,10.0],\[10.0,0.0],\[0.0,0.0]]]} | 42.0 |
| {"coordinates": \[55.0, 5.0], "type":"Point"} | 43.0 |

ri.foundry.main.dataset.right

| geometryColRhs | rhs1 |
| ----- | ----- |
| {"coordinates": \[\[\[2.0, 2.0], \[7.0, 2.0], \[7.0, 7.0], \[2.0, 7.0], \[2.0, 2.0]]], "type": "Polygon"} | rhsVal1 |

**Output:**

| lhs1 |
| ----- |
| 43.0 |

***

### Example 4: Base case

**Argument values:**

* **Condition for columns to select on the left:** <br>allColumns(<br><br>)
* **Condition for columns to select on the right:** <br>allColumns(<br><br>)
* **Join key:** (`geometryColLhs`, `geometryColRhs`)
* **Left dataset:** ri.foundry.main.dataset.left
* **Right dataset:** ri.foundry.main.dataset.right
* **Prefix for columns from right:** *null*

**Inputs:**

ri.foundry.main.dataset.left

| geometryColLhs | col1Lhs |
| ----- | ----- |
| {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,10.0],\[10.0,10.0],\[10.0,0.0],\[0.0,0.0]]]} | 1.0 |
| {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,10.0],\[10.0,10.0],\[10.0,0.0],\[0.0,0.0]]]} | 2.0 |

ri.foundry.main.dataset.right

| geometryColRhs | col1Rhs |
| ----- | ----- |
| {"coordinates": \[\[\[2.0, 2.0], \[7.0, 2.0], \[7.0, 7.0], \[2.0, 7.0], \[2.0, 2.0]]], "type": "Polygon"} | rhsVal1 |

**Output:**

| geometryColLhs | col1Lhs |
| ----- | ----- |

***

### Example 5: Base case

**Argument values:**

* **Condition for columns to select on the left:** <br>allColumns(<br><br>)
* **Condition for columns to select on the right:** <br>allColumns(<br><br>)
* **Join key:** (`geometryColLhs`, `geometryColRhs`)
* **Left dataset:** ri.foundry.main.dataset.left
* **Right dataset:** ri.foundry.main.dataset.right
* **Prefix for columns from right:** *null*

**Inputs:**

ri.foundry.main.dataset.left

| geometryColLhs | col1Lhs |
| ----- | ----- |
| {"coordinates": \[55.0, 5.0], "type":"Point"} | 1.0 |
| {"coordinates": \[\[\[21.0, 21.0], \[27.0, 21.0], \[27.0, 27.0], \[21.0, 27.0], \[21.0, 21.0]]], "type": "Polygon"} | 2.0 |
| {"coordinates": \[15.0, 15.0], "type":"Point"} | 3.0 |

ri.foundry.main.dataset.right

| geometryColRhs | col1Rhs |
| ----- | ----- |
| {"coordinates": \[\[\[2.0, 2.0], \[7.0, 2.0], \[7.0, 7.0], \[2.0, 7.0], \[2.0, 2.0]]], "type": "Polygon"} | rhsVal1 |
| {"coordinates": \[0.0, 0.0], "type":"Point"} | rhsVal2 |

**Output:**

| geometryColLhs | col1Lhs |
| ----- | ----- |
| {"coordinates": \[55.0, 5.0], "type":"Point"} | 1.0 |
| {"coordinates": \[\[\[21.0, 21.0], \[27.0, 21.0], \[27.0, 27.0], \[21.0, 27.0], \[21.0, 21.0]]], "type": "Polygon"} | 2.0 |
| {"coordinates": \[15.0, 15.0], "type":"Point"} | 3.0 |

***

### Example 6: Base case

**Argument values:**

* **Condition for columns to select on the left:** <br>allColumns(<br><br>)
* **Condition for columns to select on the right:** <br>allColumns(<br><br>)
* **Join key:** (`geometryColLhs`, `geometryColRhs`)
* **Left dataset:** ri.foundry.main.dataset.left
* **Right dataset:** ri.foundry.main.dataset.right
* **Prefix for columns from right:** *null*

**Inputs:**

ri.foundry.main.dataset.left

| geometryColLhs | col1Lhs |
| ----- | ----- |
| {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,10.0],\[10.0,10.0],\[10.0,0.0],\[0.0,0.0]]]} | 1.0 |
| {"coordinates": \[55.0, 5.0], "type":"Point"} | 2.0 |
| {"coordinates": \[15.0, 5.0], "type":"Point"} | 3.0 |
| {"coordinates": \[\[\[20.0, 10.0], \[27.0, 10.0], \[27.0, 17.0], \[20.0, 17.0], \[20.0, 10.0]]], "type": "Polygon"} | 4.0 |
| {"coordinates": \[\[\[21.0, 21.0], \[27.0, 21.0], \[27.0, 27.0], \[21.0, 27.0], \[21.0, 21.0]]], "type": "Polygon"} | 5.0 |

ri.foundry.main.dataset.right

| geometryColRhs | col1Rhs |
| ----- | ----- |
| {"coordinates": \[\[\[2.0, 2.0], \[7.0, 2.0], \[7.0, 7.0], \[2.0, 7.0], \[2.0, 2.0]]], "type": "Polygon"} | rhsVal1 |
| {"coordinates": \[0.0, 0.0], "type":"Point"} | rhsVal2 |
| {"coordinates": \[\[-1.0, -1.0], \[5.0, 5.0]], "type":"LineString"} | rhsVal3 |

**Output:**

| geometryColLhs | col1Lhs |
| ----- | ----- |
| {"coordinates": \[55.0, 5.0], "type":"Point"} | 2.0 |
| {"coordinates": \[15.0, 5.0], "type":"Point"} | 3.0 |
| {"coordinates": \[\[\[20.0, 10.0], \[27.0, 10.0], \[27.0, 17.0], \[20.0, 17.0], \[20.0, 10.0]]], "type": "Polygon"} | 4.0 |
| {"coordinates": \[\[\[21.0, 21.0], \[27.0, 21.0], \[27.0, 27.0], \[21.0, 27.0], \[21.0, 21.0]]], "type": "Polygon"} | 5.0 |

***

### Example 7: Base case

**Argument values:**

* **Condition for columns to select on the left:** <br>allColumns(<br><br>)
* **Condition for columns to select on the right:** <br>allColumns(<br><br>)
* **Join key:** (`geometryColLhs`, `geometryColRhs`)
* **Left dataset:** ri.foundry.main.dataset.left
* **Right dataset:** ri.foundry.main.dataset.right
* **Prefix for columns from right:** *null*

**Inputs:**

ri.foundry.main.dataset.left

| geometryColLhs | col1Lhs |
| ----- | ----- |
| {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,10.0],\[10.0,10.0],\[10.0,0.0],\[0.0,0.0]]]} | 1.0 |
| {"coordinates": \[55.0, 5.0], "type":"Point"} | 2.0 |

ri.foundry.main.dataset.right

| geometryColRhs | col1Rhs |
| ----- | ----- |
| {"coordinates": \[\[\[2.0, 2.0], \[7.0, 2.0], \[7.0, 7.0], \[2.0, 7.0], \[2.0, 2.0]]], "type": "Polygon"} | rhsVal1 |
| {"coordinates": \[\[\[12.0, 12.0], \[17.0, 12.0], \[17.0, 17.0], \[12.0, 17.0], \[12.0, 12.0]]], "type": "Polygon"} | rhsVal2 |
| {"coordinates": \[0.0, 0.0], "type":"Point"} | rhsVal3 |
| {"coordinates": \[15.0, 15.0], "type":"Point"} | rhsVal4 |
| {"coordinates": \[\[-1.0, -1.0], \[5.0, 5.0]], "type":"LineString"} | rhsVal5 |
| {"coordinates": \[\[20.0, 20.0], \[21.0, 23.0]], "type":"LineString"} | rhsVal6 |

**Output:**

| geometryColLhs | col1Lhs |
| ----- | ----- |
| {"coordinates": \[55.0, 5.0], "type":"Point"} | 2.0 |

***

### Example 8: Base case

**Argument values:**

* **Condition for columns to select on the left:** <br>allColumns(<br><br>)
* **Condition for columns to select on the right:** <br>allColumns(<br><br>)
* **Join key:** (`geometry`, `geometry`)
* **Left dataset:** ri.foundry.main.dataset.left
* **Right dataset:** ri.foundry.main.dataset.right
* **Prefix for columns from right:** rhs\_

**Inputs:**

ri.foundry.main.dataset.left

| geometry | value |
| ----- | ----- |
| {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,10.0],\[10.0,10.0],\[10.0,0.0],\[0.0,0.0]]]} | 42.0 |
| {"coordinates": \[55.0, 5.0], "type":"Point"} | 43.0 |

ri.foundry.main.dataset.right

| geometry | value |
| ----- | ----- |
| {"coordinates": \[\[\[2.0, 2.0], \[7.0, 2.0], \[7.0, 7.0], \[2.0, 7.0], \[2.0, 2.0]]], "type": "Polygon"} | rhsVal1 |
| {"coordinates": \[\[\[12.0, 12.0], \[17.0, 12.0], \[17.0, 17.0], \[12.0, 17.0], \[12.0, 12.0]]], "type": "Polygon"} | rhsVal2 |
| {"coordinates": \[0.0, 0.0], "type":"Point"} | rhsVal3 |
| {"coordinates": \[15.0, 15.0], "type":"Point"} | rhsVal4 |

**Output:**

| geometry | value |
| ----- | ----- |
| {"coordinates": \[55.0, 5.0], "type":"Point"} | 43.0 |

***

### Example 9: Base case

**Argument values:**

* **Condition for columns to select on the left:** <br>columnNameIsIn(<br> columnNames: \[geometryColLhs],<br>)
* **Condition for columns to select on the right:** <br>allColumns(<br><br>)
* **Join key:** (`geometryColLhs`, `geometryColRhs`)
* **Left dataset:** ri.foundry.main.dataset.left
* **Right dataset:** ri.foundry.main.dataset.right
* **Prefix for columns from right:** *null*

**Inputs:**

ri.foundry.main.dataset.left

| geometryColLhs | col1Lhs |
| ----- | ----- |
| {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,10.0],\[10.0,10.0],\[10.0,0.0],\[0.0,0.0]]]} | 42.0 |
| {"coordinates": \[55.0, 5.0], "type":"Point"} | 43.0 |

ri.foundry.main.dataset.right

| geometryColRhs | col1Rhs |
| ----- | ----- |
| {"coordinates": \[\[\[2.0, 2.0], \[7.0, 2.0], \[7.0, 7.0], \[2.0, 7.0], \[2.0, 2.0]]], "type": "Polygon"} | rhsVal1 |

**Output:**

| geometryColLhs |
| ----- |
| {"coordinates": \[55.0, 5.0], "type":"Point"} |

***

### Example 10: Null case

**Argument values:**

* **Condition for columns to select on the left:** <br>allColumns(<br><br>)
* **Condition for columns to select on the right:** <br>allColumns(<br><br>)
* **Join key:** (`geometryColLhs`, `geometryColRhs`)
* **Left dataset:** ri.foundry.main.dataset.left
* **Right dataset:** ri.foundry.main.dataset.right
* **Prefix for columns from right:** *null*

**Inputs:**

ri.foundry.main.dataset.left

| geometryColLhs | lhs1 |
| ----- | ----- |
| {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,10.0],\[10.0,10.0],\[10.0,0.0],\[0.0,0.0]]]} | 1.0 |
| *null* | 2.0 |
| {} | 3.0 |
| {"coordinates": \[55.0, 5.0], "type":"Point"} | 4.0 |

ri.foundry.main.dataset.right

| geometryColRhs | rhs1 |
| ----- | ----- |
| {"coordinates": \[\[\[2.0, 2.0], \[7.0, 2.0], \[7.0, 7.0], \[2.0, 7.0], \[2.0, 2.0]]], "type": "Polygon"} | rhsVal1 |
| *null* | rhsVal2 |

**Output:**

| geometryColLhs | lhs1 |
| ----- | ----- |
| *null* | 2.0 |
| {} | 3.0 |
| {"coordinates": \[55.0, 5.0], "type":"Point"} | 4.0 |

***

### Example 11: Null case

**Argument values:**

* **Condition for columns to select on the left:** <br>allColumns(<br><br>)
* **Condition for columns to select on the right:** <br>allColumns(<br><br>)
* **Join key:** (`geometryColLhs`, `geometryColRhs`)
* **Left dataset:** ri.foundry.main.dataset.left
* **Right dataset:** ri.foundry.main.dataset.right
* **Prefix for columns from right:** *null*

**Inputs:**

ri.foundry.main.dataset.left

| geometryColLhs | lhs1 |
| ----- | ----- |
| *null* | 42.0 |
| {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,10.0],\[10.0,10.0],\[10.0,0.0],\[0.0,0.0]]]} | 43.0 |

ri.foundry.main.dataset.right

| geometryColRhs | rhs1 |
| ----- | ----- |
| {"coordinates": \[\[\[2.0, 2.0], \[7.0, 2.0], \[7.0, 7.0], \[2.0, 7.0], \[2.0, 2.0]]], "type": "Polygon"} | rhsVal1 |

**Output:**

| geometryColLhs | lhs1 |
| ----- | ----- |
| *null* | 42.0 |

***
