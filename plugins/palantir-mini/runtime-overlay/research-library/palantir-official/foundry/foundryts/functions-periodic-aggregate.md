---
sourceUrl: "https://www.palantir.com/docs/foundry/foundryts/functions-periodic-aggregate/"
canonicalUrl: "https://palantir.com/docs/foundry/foundryts/functions-periodic-aggregate/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "45a76ff441f5afab82391312bea1d2473fa453bd0088a2017f6097ea8f754010"
product: "foundry"
docsArea: "foundryts"
locale: "en"
upstreamTitle: "Documentation | API Reference > functions.periodic_aggregate"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# foundryts.functions.periodic\_aggregate

## foundryts.functions.periodic\_aggregate(aggregate, window, window\_type='end', alignment\_timestamp=0)

Returns a function that aggregates values over discrete, periodic windows for a single time series.

A periodic window divides the time series into windows of fixed durations.
For each window, an aggregate function is applied to the points within that window. The result is a time series
with values representing the aggregate for each window. Windows with no data points are not included
in the output.

This method is useful for summarizing data over regular periods, such as generating hourly, daily,
or weekly summaries from a continuous stream of data.

Aggregation functions supported:

| Aggregation function   | Description                                                                                                                                                                   |
|------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| min                    | Smallest value within each periodic window.                                                                                                                                   |
| max                    | Largest value within each periodic window.                                                                                                                                    |
| count                  | Count of points within each periodic window.                                                                                                                                  |
| sum                    | Sum of values within each periodic window.                                                                                                                                    |
| product                | Product of values within each periodic window.                                                                                                                                |
| mean                   | Average of values within each periodic window.                                                                                                                                |
| standard\_deviation     | Standard deviation of values within each periodic window.                                                                                                                     |
| difference             | Difference between current first point’s value and the last<br/>point’s value in each periodic window, providing the<br/>relative change over the fixed window.               |
| percent\_change         | Percent change from the first point’s value to the<br/>last point’s value within each periodic window,<br/>providing the relative rate of change within the fixed<br/>window. |
| first                  | First value within each periodic window.                                                                                                                                      |
| last                   | Last value within each periodic window.                                                                                                                                       |

* **Parameters:**
  * **aggregate** ([*str*](https://docs.python.org/3/library/stdtypes.html#str)) – Aggregation function to apply, use a valid option from the **Aggregation Function** table above.
  * **window** ([*int*](https://docs.python.org/3/library/functions.html#int) *,* [*datetime.timedelta*](https://docs.python.org/3/library/datetime.html#datetime.timedelta) *,* [*str*](https://docs.python.org/3/library/stdtypes.html#str)) – Duration of each periodic window, e.g., `5ms`, or `5e6`.
  * **window\_type** ([*str*](https://docs.python.org/3/library/stdtypes.html#str) *,* *optional*) –

    Type of window to apply (default is “end”):

    **start:** Window is inclusive at the start and exclusive at the end. The timestamp of the aggregation is
    the start of the window.
    **end:** Window is exclusive at the start and inclusive at the end. The timestamp of the aggregation is the
    end of the window.
  * **alignment\_timestamp** ([*str*](https://docs.python.org/3/library/stdtypes.html#str) *|* [*float*](https://docs.python.org/3/library/functions.html#float) *|* [*datetime.datetime*](https://docs.python.org/3/library/datetime.html#datetime.datetime) *,* *optional*) – The timestamp used to align the result, such that ticks in the result time series will lie at integer multiples
    of the window duration from the alignment timestamp (default is 0).
* **Returns:**
  A function that takes a single time series as input and computes the specified aggregate
  for each periodic window.
* **Return type:**
  ([FunctionNode](/docs/foundry/foundryts/nodes-function-node/#foundryts.nodes.FunctionNode)) -> FunctionNode

## Dataframe schema

| Column name   | Type              | Description            |
|---------------|-------------------|------------------------|
| timestamp     | pandas.Timestamp  | Timestamp of the point |
| value         | Union\[float, str] | Value of the point     |

:::callout{theme="success" title="See Also"}
[`cumulative_aggregate()`](/docs/foundry/foundryts/functions-cumulative-aggregate/#foundryts.functions.cumulative_aggregate), [`rolling_aggregate()`](/docs/foundry/foundryts/functions-rolling-aggregate/#foundryts.functions.rolling_aggregate)
:::

:::callout{theme="warning" title="Note"}
This function is only applicable to numeric series.
:::

## Examples

```pycon
>>> series = F.points(
...     (1, 1.0),
...     (101, 2.0),
...     (200, 4.0),
...     (201, 8.0),
...     (299, 16.0),
...     (300, 32.0),
...     (1000, 64.0),
...     (12345, 128.0),
...     name="series",
... )
>>> series.to_pandas()
                      timestamp  value
0 1970-01-01 00:00:00.000000001    1.0
1 1970-01-01 00:00:00.000000101    2.0
2 1970-01-01 00:00:00.000000200    4.0
3 1970-01-01 00:00:00.000000201    8.0
4 1970-01-01 00:00:00.000000299   16.0
5 1970-01-01 00:00:00.000000300   32.0
6 1970-01-01 00:00:00.000001000   64.0
7 1970-01-01 00:00:00.000012345  128.0
```

```pycon
>>> periodic_difference = F.periodic_aggregate("difference", "100ns")(series) # window_type defaults to end
# 5 windows with (1,2,3,1,1) points:
# window 1: [(1, 1.0)]
# window 2: [
# (101, 2.0),
# (200, 4.0)
# ]
# window 3: [
# (201, 8.0),
# (200, 16.0),
# (300. 32.0)
# ]
# window 4: [(1000, 64.0)]
# window 5: [(12345, 128.0)]
>>> periodic_difference.to_pandas()
                      timestamp  value
0 1970-01-01 00:00:00.000000100    0.0
1 1970-01-01 00:00:00.000000200    2.0
2 1970-01-01 00:00:00.000000300   24.0
3 1970-01-01 00:00:00.000001000    0.0
4 1970-01-01 00:00:00.000012400    0.0
```

```pycon
>>> periodic_percentage_change = F.periodic_aggregate("percent_change", "100ns")(series) # window_type defaults to end
# 5 windows with (1,2,3,1,1) points:
# window 1: [(1, 1.0)]
# window 2: [
# (101, 2.0),
# (200, 4.0)
# ]
# window 3: [
# (201, 8.0),
# (200, 16.0),
# (300. 32.0)
# ]
# window 4: [(1000, 64.0)]
# window 5: [(12345, 128.0)]
>>> periodic_percentage_change.to_pandas()
                      timestamp  value
0 1970-01-01 00:00:00.000000100    0.0
1 1970-01-01 00:00:00.000000200    1.0
2 1970-01-01 00:00:00.000000300    3.0
3 1970-01-01 00:00:00.000001000    0.0
4 1970-01-01 00:00:00.000012400    0.0
```

```pycon
>>> periodic_percentage_change_window_start = F.periodic_aggregate(
...     "percent_change", "100ns", "start"
... )(series)
# 6 windows with (1,1,3,1,1,1) points:
# window 0: [(1, 1.0)]
# window 1: [(101, 2.0)]
# window 2: [
# (200, 4.0),
# (201, 8.0),
# (299, 16.0)
# ]
# window 3: [(300, 32.0)]
# window 4: [(1000, 64.0)]
# window 5: [(12345, 128.0)]
>>> periodic_percentage_change_window_start.to_pandas()
                      timestamp  value
0 1970-01-01 00:00:00.000000000    0.0
1 1970-01-01 00:00:00.000000100    0.0
2 1970-01-01 00:00:00.000000200    3.0
3 1970-01-01 00:00:00.000000300    0.0
4 1970-01-01 00:00:00.000001000    0.0
5 1970-01-01 00:00:00.000012300    0.0
```

```pycon
>>> periodic_percentage_change_with_alignment = F.periodic_aggregate(
...     "percent_change", "100ns", alignment_timestamp=50
... )(series)
# 6 windows with (1,1,2,2,1,1) points:
# window 0: [(1, 1.0)]
# window 1: [(101, 2.0)]
# window 2: [
# (200, 4.0),
# (201, 8.0)
# ]
# window 3: [
# (299, 16.0),
# (300, 32.0),
# ]
# window 5: [(1000, 64.0)]
# window 4: [(12345, 128.0)]
>>> periodic_percentage_change_with_alignment.to_pandas()
                      timestamp  value
0 1970-01-01 00:00:00.000000050    0.0
1 1970-01-01 00:00:00.000000150    0.0
2 1970-01-01 00:00:00.000000250    1.0
3 1970-01-01 00:00:00.000000350    1.0
4 1970-01-01 00:00:00.000001050    0.0
5 1970-01-01 00:00:00.000012350    0.0
```
