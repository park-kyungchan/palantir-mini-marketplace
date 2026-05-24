---
sourceUrl: "https://www.palantir.com/docs/foundry/foundryts/functions-sum/"
canonicalUrl: "https://palantir.com/docs/foundry/foundryts/functions-sum/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "483fdff23a2926e6dfde101f0001e64545143dc93c55c17ca2528fb35ac58752"
product: "foundry"
docsArea: "foundryts"
locale: "en"
upstreamTitle: "Documentation | API Reference > functions.sum"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# foundryts.functions.sum

## foundryts.functions.sum()

Returns a function that computes the sum of all points sharing a timestamp for multiple input time series.

The resulting time series is a union of all timestamps for all the input series, where each timestamp contains
the sum of values that exist across the input set for that timestamp.

* **Returns:**
  A function that accepts multiple time series as inputs and generates a single time series contains a union of
  all timestamps with the values as the sum of all points in the input time series that share a timestamp.
* **Return type:**
  ([NodeCollection](/docs/foundry/foundryts/node-collection/#foundryts.NodeCollection)) -> FunctionNode

## Dataframe schema

| Column name   | Type             | Description            |
|---------------|------------------|------------------------|
| timestamp     | pandas.Timestamp | Timestamp of the point |
| value         | float            | Value of the point     |

:::callout{theme="success" title="See Also"}
[`mean()`](/docs/foundry/foundryts/functions-mean/#foundryts.functions.mean)
:::

:::callout{theme="warning" title="Note"}
This function is only applicable to numeric series.
:::

## Examples

```pycon
>>> series_1 = F.points(
...     (0, 0.0),
...     (100, 100.0),
...     (140, 140.0),
...     (200, 200.0),
...     name="series-1"
... )
>>> series_2 = F.points(
...     (100, 200.0),
...     (120, 220.0),
...     (130, 330.0),
...     (150, 350.0),
...     (160, 460.0),
...     name="series-2"
... )
>>> series_1.to_pandas()
                      timestamp  value
0 1970-01-01 00:00:00.000000000    0.0
1 1970-01-01 00:00:00.000000100  100.0
2 1970-01-01 00:00:00.000000140  140.0
3 1970-01-01 00:00:00.000000200  200.0
>>> series_2.to_pandas()
                      timestamp  value
0 1970-01-01 00:00:00.000000100  200.0
1 1970-01-01 00:00:00.000000120  220.0
2 1970-01-01 00:00:00.000000130  330.0
3 1970-01-01 00:00:00.000000150  350.0
4 1970-01-01 00:00:00.000000160  460.0
```

```pycon
>>> sum_series = F.sum()([series_1, series_2])
>>> sum_series.to_pandas()
                      timestamp  value
0 1970-01-01 00:00:00.000000000    0.0
1 1970-01-01 00:00:00.000000100  300.0
2 1970-01-01 00:00:00.000000120  220.0
3 1970-01-01 00:00:00.000000130  330.0
4 1970-01-01 00:00:00.000000140  140.0
5 1970-01-01 00:00:00.000000150  350.0
6 1970-01-01 00:00:00.000000160  460.0
7 1970-01-01 00:00:00.000000200  200.0
```
