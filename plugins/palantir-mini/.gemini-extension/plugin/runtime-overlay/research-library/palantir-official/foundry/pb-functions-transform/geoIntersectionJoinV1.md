---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/geoIntersectionJoinV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/geoIntersectionJoinV1/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "6e0a17cb5d133f694609aebb8af2c411b8fdc3eb96a477fadda0fa291e47c84f"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Geometry intersection join"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Geometry intersection join

> Supported in: Batch

Inner joins left and right datasets together based on whether input geometries overlap. Returns a row containing all of the columns from both datasets if the join key column pair has geometries which intersect. Currently does not support joining on multiple join keys. Silently filters null join key geometry values. Left and right datasets must not have the same column names. Silently nullifies invalid GeoJSON in join columns.

**Transform categories**: Geospatial, Join

## Declared arguments

* **Join key:** A list of GeoJSON columns from left and right inputs on which to join. A row will be selected if any column pair in this list has intersecting geometries.<br>*List\<Tuple\<Column\<Geometry>, Column\<Geometry>>>*
* **Left dataset:** Left dataset to use in join.<br>*Table*
* **Right dataset:** Right dataset to use in join.<br>*Table*

## Examples

### Example 1: Base case

**Argument values:**

* **Join key:** \[(`geometryColLhs`, `geometryColRhs`)]
* **Left dataset:** ri.foundry.main.dataset.left
* **Right dataset:** ri.foundry.main.dataset.right

**Inputs:**

ri.foundry.main.dataset.left

| geometryColLhs | lhs-1 |
| ----- | ----- |
| {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,10.0],\[10.0,10.0],\[10.0,0.0],\[0.0,0.0]]]} | 42.0 |

ri.foundry.main.dataset.right

| geometryColRhs | rhs-1 |
| ----- | ----- |
| {"coordinates": \[\[\[2.0, 2.0], \[7.0, 2.0], \[7.0, 7.0], \[2.0, 7.0], \[2.0, 2.0]]], "type": "Polygon"} | rhsVal1 |
| {"coordinates": \[\[\[12.0, 12.0], \[17.0, 12.0], \[17.0, 17.0], \[12.0, 17.0], \[12.0, 12.0]]], "type": "Polygon"} | rhsVal2 |
| {"coordinates": \[0.0, 0.0], "type":"Point"} | rhsVal3 |
| {"coordinates": \[15.0, 15.0], "type":"Point"} | rhsVal4 |
| {"coordinates": \[\[-1.0, -1.0], \[5.0, 5.0]], "type":"LineString"} | rhsVal5 |
| {"coordinates": \[\[20.0, 20.0], \[21.0, 23.0]], "type":"LineString"} | rhsVal6 |
| {"coordinates": \[\[-1.0, -1.0], \[5.0, 5.0]], "type":"LineString"} | rhsVal7 |
| {"coordinates": \[\[20.0, 20.0], \[21.0, 23.0]], "type":"LineString"} | rhsVal8 |
| {"coordinates": \[\[\[\[2.0, 2.0], \[7.0, 2.0], \[7.0, 7.0], \[2.0, 7.0], \[2.0, 2.0]]], \[\[\[12.0, 12.0], \[17.0, 12.0], \[17.0, 17.0], \[12.0, 17.0], \[12.0, 12.0]]]], "type":"MultiPolygon"} | rhsVal9 |
| {"coordinates": \[\[\[\[170.0, 170.0], \[190.0, 170.0], \[190.0, 190.0], \[170.0, 190.0], \[170.0, 170.0]]], \[\[\[12.0, 12.0], \[17.0, 12.0], \[17.0, 17.0], \[12.0, 17.0], \[12.0, 12.0]]]], "type":"MultiPolygon"} | rhsVal10 |

**Output:**

| geometryColLhs | lhs-1 | geometryColRhs | rhs-1 |
| ----- | ----- | ----- | ----- |
| {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,10.0],\[10.0,10.0],\[10.0,0.0],\[0.0,0.0]]]} | 42.0 | {"coordinates": \[\[\[2.0, 2.0], \[7.0, 2.0], \[7.0, 7.0], \[2.0, 7.0], \[2.0, 2.0]]], "type": "Polygon"} | rhsVal1 |
| {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,10.0],\[10.0,10.0],\[10.0,0.0],\[0.0,0.0]]]} | 42.0 | {"coordinates": \[0.0, 0.0], "type":"Point"} | rhsVal3 |
| {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,10.0],\[10.0,10.0],\[10.0,0.0],\[0.0,0.0]]]} | 42.0 | {"coordinates": \[\[-1.0, -1.0], \[5.0, 5.0]], "type":"LineString"} | rhsVal5 |
| {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,10.0],\[10.0,10.0],\[10.0,0.0],\[0.0,0.0]]]} | 42.0 | {"coordinates": \[\[-1.0, -1.0], \[5.0, 5.0]], "type":"LineString"} | rhsVal7 |
| {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,10.0],\[10.0,10.0],\[10.0,0.0],\[0.0,0.0]]]} | 42.0 | {"coordinates": \[\[\[\[2.0, 2.0], \[7.0, 2.0], \[7.0, 7.0], \[2.0, 7.0], \[2.0, 2.0]]], \[\[\[12.0, 12.0], \[17.0, 12.0], \[17.0, 17.0], \[12.0, 17.0], \[12.0, 12.0]]]], "type":"MultiPolygon"} | rhsVal9 |

***

### Example 2: Base case

**Argument values:**

* **Join key:** \[(`geometryColLhs`, `geometryColRhs`)]
* **Left dataset:** ri.foundry.main.dataset.left
* **Right dataset:** ri.foundry.main.dataset.right

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

| geometryColLhs | lhs1 | geometryColRhs | rhs1 |
| ----- | ----- | ----- | ----- |
| {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,10.0],\[10.0,10.0],\[10.0,0.0],\[0.0,0.0]]]} | 43.0 | {"coordinates": \[\[\[2.0, 2.0], \[7.0, 2.0], \[7.0, 7.0], \[2.0, 7.0], \[2.0, 2.0]]], "type": "Polygon"} | rhsVal1 |

***

### Example 3: Null case

**Argument values:**

* **Join key:** \[(`geometryColLhs`, `geometryColRhs`)]
* **Left dataset:** ri.foundry.main.dataset.left
* **Right dataset:** ri.foundry.main.dataset.right

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
| {"coordinates": \[0.0, 0.0], "type":"Point"} | rhsVal2 |
| *null* | rhsVal3 |

**Output:**

| geometryColLhs | lhs1 | geometryColRhs | rhs1 |
| ----- | ----- | ----- | ----- |
| {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,10.0],\[10.0,10.0],\[10.0,0.0],\[0.0,0.0]]]} | 43.0 | {"coordinates": \[\[\[2.0, 2.0], \[7.0, 2.0], \[7.0, 7.0], \[2.0, 7.0], \[2.0, 2.0]]], "type": "Polygon"} | rhsVal1 |
| {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,10.0],\[10.0,10.0],\[10.0,0.0],\[0.0,0.0]]]} | 43.0 | {"coordinates": \[0.0, 0.0], "type":"Point"} | rhsVal2 |

***

### Example 4: Null case

**Argument values:**

* **Join key:** \[(`geometryColLhs`, `geometryColRhs`)]
* **Left dataset:** ri.foundry.main.dataset.left
* **Right dataset:** ri.foundry.main.dataset.right

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

| geometryColLhs | lhs1 | geometryColRhs | rhs1 |
| ----- | ----- | ----- | ----- |
| {"type":"Polygon","coordinates":\[\[\[0.0,0.0],\[0.0,10.0],\[10.0,10.0],\[10.0,0.0],\[0.0,0.0]]]} | 43.0 | {"coordinates": \[\[\[2.0, 2.0], \[7.0, 2.0], \[7.0, 7.0], \[2.0, 7.0], \[2.0, 2.0]]], "type": "Polygon"} | rhsVal1 |

***

### Example 5: Edge case

**Argument values:**

* **Join key:** \[(`geometryColLhs`, `geometryColRhs`)]
* **Left dataset:** ri.foundry.main.dataset.left
* **Right dataset:** ri.foundry.main.dataset.right

**Inputs:**

ri.foundry.main.dataset.left

| geometryColLhs | lhs1 |
| ----- | ----- |
| {"coordinates": \[\[\[170.0, 170.0], \[190.0, 170.0], \[190.0, 190.0], \[170.0, 190.0], \[170.0, 170.0]]], "type": "Polygon"} | 42.0 |

ri.foundry.main.dataset.right

| geometryColRhs | rhs1 |
| ----- | ----- |
| {"coordinates": \[\[\[175.0, 175.0], \[195.0, 175.0], \[195.0, 195.0], \[175.0, 195.0], \[175.0, 175.0]]], "type": "Polygon"} | rhsVal1 |

**Output:**

| geometryColLhs | lhs1 | geometryColRhs | rhs1 |
| ----- | ----- | ----- | ----- |
| {"coordinates": \[\[\[170.0, 170.0], \[190.0, 170.0], \[190.0, 190.0], \[170.0, 190.0], \[170.0, 170.0]]], "type": "Polygon"} | 42.0 | {"coordinates": \[\[\[175.0, 175.0], \[195.0, 175.0], \[195.0, 195.0], \[175.0, 195.0], \[175.0, 175.0]]], "type": "Polygon"} | rhsVal1 |

***

### Example 6: Edge case

**Argument values:**

* **Join key:** \[(`geometryColLhs`, `geometryColRhs`)]
* **Left dataset:** ri.foundry.main.dataset.left
* **Right dataset:** ri.foundry.main.dataset.right

**Inputs:**

ri.foundry.main.dataset.left

| geometryColLhs | lhs1 |
| ----- | ----- |
| {"coordinates": \[\[\[0.0, 0.0], \[5.0, 5.0], \[0.0, 10.0], \[10.0, 5.0], \[0.0, 0.0]]], "type":"Polygon"} | 42.0 |

ri.foundry.main.dataset.right

| geometryColRhs | rhs1 |
| ----- | ----- |
| {"coordinates": \[\[\[0.0, 5.0], \[2.5, 7.5], \[4.0, 5.0], \[2.5, 2.5], \[0.0, 5.0]]], "type":"Polygon"} | rhsVal1 |
| {"coordinates": \[\[\[0.0, 5.0], \[2.0, 7.0], \[4.0, 5.0], \[2.0, 3.0], \[0.0, 5.0]]], "type":"Polygon"} | rhsVal2 |

**Output:**

| geometryColLhs | lhs1 | geometryColRhs | rhs1 |
| ----- | ----- | ----- | ----- |
| {"coordinates": \[\[\[0.0, 0.0], \[5.0, 5.0], \[0.0, 10.0], \[10.0, 5.0], \[0.0, 0.0]]], "type":"Polygon"} | 42.0 | {"coordinates": \[\[\[0.0, 5.0], \[2.5, 7.5], \[4.0, 5.0], \[2.5, 2.5], \[0.0, 5.0]]], "type":"Polygon"} | rhsVal1 |

***

### Example 7: Edge case

**Argument values:**

* **Join key:** \[(`geometryColLhs`, `geometryColRhs`)]
* **Left dataset:** ri.foundry.main.dataset.left
* **Right dataset:** ri.foundry.main.dataset.right

**Inputs:**

ri.foundry.main.dataset.left

| geometryColLhs |
| ----- |
| {"coordinates": \[0.0, 0.0], "type":"Point"} |

ri.foundry.main.dataset.right

| geometryColRhs |
| ----- |
| {"coordinates": \[0.0, 0.0], "type":"Point"} |
| {"coordinates": \[15.0, 15.0], "type":"Point"} |

**Output:**

| geometryColLhs | geometryColRhs |
| ----- | ----- |
| {"coordinates": \[0.0, 0.0], "type":"Point"} | {"coordinates": \[0.0, 0.0], "type":"Point"} |

***

### Example 8: Edge case

**Argument values:**

* **Join key:** \[(`geometryColLhs`, `geometryColRhs`)]
* **Left dataset:** ri.foundry.main.dataset.left
* **Right dataset:** ri.foundry.main.dataset.right

**Inputs:**

ri.foundry.main.dataset.left

| geometryColLhs | lhs1 |
| ----- | ----- |
| {"coordinates": \[0.0, 0.0], "type":"Point"} | 42.0 |

ri.foundry.main.dataset.right

| geometryColRhs | rhs1 |
| ----- | ----- |
| {"coordinates": \[0.0, 0.0], "type":"Point"} | rhsVal1 |
| {"coordinates": \[15.0, 15.0], "type":"Point"} | rhsVal2 |

**Output:**

| geometryColLhs | lhs1 | geometryColRhs | rhs1 |
| ----- | ----- | ----- | ----- |
| {"coordinates": \[0.0, 0.0], "type":"Point"} | 42.0 | {"coordinates": \[0.0, 0.0], "type":"Point"} | rhsVal1 |

***

### Example 9: Edge case

**Argument values:**

* **Join key:** \[(`geometryColLhs`, `geometryColRhs`)]
* **Left dataset:** ri.foundry.main.dataset.left
* **Right dataset:** ri.foundry.main.dataset.right

**Inputs:**

ri.foundry.main.dataset.left

| geometryColLhs | lhs1 |
| ----- | ----- |
| {"coordinates": \[\[\[0.0, 0.0, 0.0], \[10.0, 0.0, 0.0], \[10.0, 10.0, 0.0], \[10.0, 10.0, 10.0], \[0.0, 10.0, 10.0], \[0.0, 0.0, 10.0], \[0.0, 0.0, 0.0]]], "type": "Polygon"} | 42.0 |

ri.foundry.main.dataset.right

| geometryColRhs | rhs1 |
| ----- | ----- |
| {"coordinates": \[\[\[2.0, 2.0, 2.0], \[7.0, 2.0, 2.0], \[7.0, 7.0, 2.0], \[7.0, 7.0, 7.0], \[2.0, 7.0, 7.0], \[2.0, 2.0, 7.0], \[2.0, 2.0, 2.0]]], "type": "Polygon"} | rhsVal1 |
| {"coordinates": \[\[\[12.0, 12.0, 12.0], \[17.0, 12.0, 12.0], \[17.0, 17.0, 12.0], \[17.0, 17.0, 17.0], \[12.0, 17.0, 17.0], \[12.0, 12.0, 17.0], \[12.0, 12.0, 12.0]]], "type": "Polygon"} | rhsVal2 |

**Output:**

| geometryColLhs | lhs1 | geometryColRhs | rhs1 |
| ----- | ----- | ----- | ----- |
| {"coordinates": \[\[\[0.0, 0.0, 0.0], \[10.0, 0.0, 0.0], \[10.0, 10.0, 0.0], \[10.0, 10.0, 10.0], \[0.0, 10.0, 10.0], \[0.0, 0.0, 10.0], \[0.0, 0.0, 0.0]]], "type": "Polygon"} | 42.0 | {"coordinates": \[\[\[2.0, 2.0, 2.0], \[7.0, 2.0, 2.0], \[7.0, 7.0, 2.0], \[7.0, 7.0, 7.0], \[2.0, 7.0, 7.0], \[2.0, 2.0, 7.0], \[2.0, 2.0, 2.0]]], "type": "Polygon"} | rhsVal1 |

***
