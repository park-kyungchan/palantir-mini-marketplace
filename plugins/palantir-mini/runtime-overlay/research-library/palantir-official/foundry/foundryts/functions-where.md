---
sourceUrl: "https://www.palantir.com/docs/foundry/foundryts/functions-where/"
canonicalUrl: "https://palantir.com/docs/foundry/foundryts/functions-where/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "1fe6d73ac1d01714959eec475136de862ecbece9dfe9794487edbe404e3a7316"
product: "foundry"
docsArea: "foundryts"
locale: "en"
upstreamTitle: "Documentation | API Reference > functions.where"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# foundryts.functions.where

## foundryts.functions.where(true=None, false=None)

(DEPRECATED) Returns a function that transforms non-zero and zero values with the specified functions for truthy
and falsey values, respectively.

* **Parameters:**
  * **true** (`FunctionNode` | int | float, optional) – Function or value to transform the non-zero values using (default is `None` leaving non-zero values
    unchanged).
  * **false** (`FunctionNode` | int | float, optional) – Function or value to transform the zero values using (default is `None` leaving zero values unchanged).
* **Returns:**
  A function that accepts a single time series and transforms non-zero and zero values with the specified
  functions for truthy and falsey values, respectively.
* **Return type:**
  (`FunctionNode`) -> `FunctionNode`

## Dataframe schema

| Column name   | Type             | Description            |
|---------------|------------------|------------------------|
| timestamp     | pandas.Timestamp | Timestamp of the point |
| value         | float            | Value of the point     |

:::callout{theme="warning" title="Note"}
This function is Deprecated and will be removed in a future release.
:::

## Examples

```pycon
>>> series = F.points(
...     (1, 1.0),
...     (2, 0.0),
...     (3, 0.0),
...     name="series",
... )
>>> series.to_pandas()
                      timestamp  value
0 1970-01-01 00:00:00.000000001    1.0
1 1970-01-01 00:00:00.000000002    0.0
2 1970-01-01 00:00:00.000000003    0.0
```

```pycon
>>> transformed_series = F.where(true=series * 2, false=-1)(series)
>>> transformed_series.to_pandas()
                      timestamp  value
0 1970-01-01 00:00:00.000000001    2.0
1 1970-01-01 00:00:00.000000002   -1.0
2 1970-01-01 00:00:00.000000003   -1.0
```
