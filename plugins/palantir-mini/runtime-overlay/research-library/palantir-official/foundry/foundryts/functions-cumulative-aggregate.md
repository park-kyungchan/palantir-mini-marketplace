---
sourceUrl: "https://www.palantir.com/docs/foundry/foundryts/functions-cumulative-aggregate/"
canonicalUrl: "https://palantir.com/docs/foundry/foundryts/functions-cumulative-aggregate/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "04114c30f130b38c31aace4f32b2a6b3285991df02477d02227b790ab0c1f7fe"
product: "foundry"
docsArea: "foundryts"
locale: "en"
upstreamTitle: "Documentation | API Reference > functions.cumulative_aggregate"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# foundryts.functions.cumulative\_aggregate

## foundryts.functions.cumulative\_aggregate(aggregate)

Returns a function that computes the cumulative aggregate of all values in a single time series.

The cumulative aggregate is calculated progressively for each point in the input time series,
considering all preceding points up to and including the current point.

Aggregation functions supported:

| Aggregation function   | Description                                                                                                                                                       |
|------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| min                    | Smallest value up to the current point in the time series.                                                                                                        |
| max                    | Largest value up to the current point in the time series.                                                                                                         |
| count                  | Count of all points up to the current point in the<br/>time series.                                                                                               |
| sum                    | Sum of all point values up to the current point.                                                                                                                  |
| product                | Product of point values up to the current point.                                                                                                                  |
| mean                   | Average of all point values up to the current point.                                                                                                              |
| standard\_deviation     | Standard deviation of all point values up to the current<br/>point.                                                                                               |
| difference             | Difference between the current point’s value and the<br/>first point’s value in the time series, providing the<br/>relative change within the series.             |
| percent\_change         | Percent change between the current point’s value and the<br/>first point’s value in the time series, providing the<br/>relative rate of change within the series. |
| first                  | Value of the first point in the time series.                                                                                                                      |
| last                   | Value of the current (last) point in the time series.                                                                                                             |

* **Parameters:**
  **aggregate** ([*str*](https://docs.python.org/3/library/stdtypes.html#str)) – Aggregation function to apply on each point, use one of the values from **Aggregation Function** above.
* **Returns:**
  A function that takes a single time series as input and computes the specified aggregate for each point,
  considering all preceding points up to the point being evaluated.
* **Return type:**
  ([FunctionNode](/docs/foundry/foundryts/nodes-function-node/#foundryts.nodes.FunctionNode)) -> FunctionNode

## Dataframe schema

| Column name   | Type              | Description            |
|---------------|-------------------|------------------------|
| timestamp     | pandas.Timestamp  | Timestamp of the point |
| value         | Union\[float, str] | Value of the point     |

:::callout{theme="success" title="See Also"}
[`rolling_aggregate()`](/docs/foundry/foundryts/functions-rolling-aggregate/#foundryts.functions.rolling_aggregate), [`periodic_aggregate()`](/docs/foundry/foundryts/functions-periodic-aggregate/#foundryts.functions.periodic_aggregate)
:::

:::callout{theme="warning" title="Note"}
This function is only applicable to numeric series.
:::

## Examples

```pycon
>>> series = F.points(
...     (2, 10.0), (5, 20.0), (6, 30.0), (7, 40.0), (8, 50.0), (12, 60.0), name="series-1"
... )
>>> series.to_pandas()
                      timestamp  value
0 1970-01-01 00:00:00.000000002   10.0
1 1970-01-01 00:00:00.000000005   20.0
2 1970-01-01 00:00:00.000000006   30.0
3 1970-01-01 00:00:00.000000007   40.0
4 1970-01-01 00:00:00.000000008   50.0
5 1970-01-01 00:00:00.000000012   60.0
```

```pycon
>>> cumulative_agg = F.cumulative_aggregate("mean")(series)
>>> cumulative_agg.to_pandas()
                      timestamp  value
0 1970-01-01 00:00:00.000000002   10.0
1 1970-01-01 00:00:00.000000005   15.0
2 1970-01-01 00:00:00.000000006   20.0
3 1970-01-01 00:00:00.000000007   25.0
4 1970-01-01 00:00:00.000000008   30.0
5 1970-01-01 00:00:00.000000012   35.0
```
