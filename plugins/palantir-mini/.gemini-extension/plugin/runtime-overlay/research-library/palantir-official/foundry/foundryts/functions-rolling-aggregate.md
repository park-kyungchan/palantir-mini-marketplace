---
sourceUrl: "https://www.palantir.com/docs/foundry/foundryts/functions-rolling-aggregate/"
canonicalUrl: "https://palantir.com/docs/foundry/foundryts/functions-rolling-aggregate/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "4c45542c310811f99a5941c31e66831e0f9c7d55fa389bd7156f706e9712b231"
product: "foundry"
docsArea: "foundryts"
locale: "en"
upstreamTitle: "Documentation | API Reference > functions.rolling_aggregate"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# foundryts.functions.rolling\_aggregate

## foundryts.functions.rolling\_aggregate(aggregate, window)

Returns a function that aggregates values over a rolling window for a single time series.

A rolling window is a moving subset of data points that ends at the current timestamp (inclusive)
and spans a specified duration (window size). As new data points are added, old points fall out of the
window if they are outside the specified duration.

Rolling windows are commonly used for smoothing data, detecting trends, and reducing noise
in time series analysis.

Aggregation functions supported:

| Aggregation function   | Description                                                                                                                                       |
|------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------|
| min                    | Smallest value within the window.                                                                                                                 |
| max                    | Largest value within the window.                                                                                                                  |
| count                  | Count of points within the window.                                                                                                                |
| sum                    | Sum of values within the window.                                                                                                                  |
| product                | Product of values within the window.                                                                                                              |
| mean                   | Average of values within the window.                                                                                                              |
| standard\_deviation     | Standard deviation of values within the window.                                                                                                   |
| difference             | Difference between first point’s value and last point’s<br/>value in the window, providing the relative change within<br/>the window.             |
| percent\_change         | Percent change from first point’s value to the last<br/>point’s value in the window, providing the relative rate of<br/>change within the window. |
| first                  | First value within the window.                                                                                                                    |
| last                   | Last value within the window.                                                                                                                     |

* **Parameters:**
  * **aggregate** ([*str*](https://docs.python.org/3/library/stdtypes.html#str)) – Aggregation function to apply. See **Aggregation Function** above.
  * **window** ([*str*](https://docs.python.org/3/library/stdtypes.html#str) *|* [*int*](https://docs.python.org/3/library/functions.html#int) *|* [*datetime.timedelta*](https://docs.python.org/3/library/datetime.html#datetime.timedelta) *|* [*pandas.Timedelta*](https://pandas.pydata.org/pandas-docs/stable/reference/api/pandas.Timedelta.html#pandas.Timedelta)) – Duration of the rolling window, which determines how many points are
    evaluated at any time, e.g., `5ms`, or `5e6`.
* **Returns:**
  A function that takes a single time series as input and computes the specified aggregate
  for each point within the rolling window.
* **Return type:**
  ([FunctionNode](/docs/foundry/foundryts/nodes-function-node/#foundryts.nodes.FunctionNode)) -> FunctionNode

## Dataframe schema

| Column name   | Type              | Description            |
|---------------|-------------------|------------------------|
| timestamp     | pandas.Timestamp  | Timestamp of the point |
| value         | Union\[float, str] | Value of the point     |

:::callout{theme="success" title="See Also"}
[`cumulative_aggregate()`](/docs/foundry/foundryts/functions-cumulative-aggregate/#foundryts.functions.cumulative_aggregate), [`periodic_aggregate()`](/docs/foundry/foundryts/functions-periodic-aggregate/#foundryts.functions.periodic_aggregate)
:::

:::callout{theme="warning" title="Note"}
This function is only applicable to numeric series.
:::

## Examples

```pycon
>>> series = F.points(
...     (2, 10.0), (5, 20.0), (6, 30.0), (7, 40.0), (8, 50.0), (12, 60.0), name="series"
... )
```

```pycon
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
>>> rolling_difference = F.rolling_aggregate("difference", "3ns")(series)
>>> rolling_difference.to_pandas()
                      timestamp  value
0 1970-01-01 00:00:00.000000002    0.0
1 1970-01-01 00:00:00.000000005    0.0
2 1970-01-01 00:00:00.000000006   10.0
3 1970-01-01 00:00:00.000000007   20.0
4 1970-01-01 00:00:00.000000008   20.0
5 1970-01-01 00:00:00.000000012    0.0
```

```pycon
>>> rolling_percentage_change = F.rolling_aggregate("percent_change", "3ns")(series)
>>> rolling_percentage_change.to_pandas()
                      timestamp     value
0 1970-01-01 00:00:00.000000002  0.000000
1 1970-01-01 00:00:00.000000005  0.000000
2 1970-01-01 00:00:00.000000006  0.500000
3 1970-01-01 00:00:00.000000007  1.000000
4 1970-01-01 00:00:00.000000008  0.666667
5 1970-01-01 00:00:00.000000012  0.000000
```
