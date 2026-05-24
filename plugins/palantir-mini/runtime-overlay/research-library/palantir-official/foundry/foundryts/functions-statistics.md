---
sourceUrl: "https://www.palantir.com/docs/foundry/foundryts/functions-statistics/"
canonicalUrl: "https://palantir.com/docs/foundry/foundryts/functions-statistics/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "da5c9c901b99e766e8888364461a50221272d1518aaad4477db7e8dd1ef75d9e"
product: "foundry"
docsArea: "foundryts"
locale: "en"
upstreamTitle: "Documentation | API Reference > functions.statistics"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# foundryts.functions.statistics

## foundryts.functions.statistics(start=None, end=None, window=None, \*\*kwargs)

Returns a function that will partition a single series into windows and compute statistics over each window.

The series is partitioned into windows using the window arg. Each window contains statistics listed in the
[Dataframe schema](#dataframe-schema). The statistics are calculated over rolling windows created either based on the periodicity
(width of each window) or a fixed number of windows where width is calculated using
round(total number of points / number of buckets). The option used for the rolling window is decided by the
window or window\_count argument is passed.

* **Parameters:**
  * **start** (*Union* *\[*[*int*](https://docs.python.org/3/library/functions.html#int) *,* *datetime* *,* [*str*](https://docs.python.org/3/library/stdtypes.html#str) *]* *,* *optional*) – Timestamp (inclusive) to start partitioning windows from the provided series. (default is the entire series)
  * **end** (*Union* *\[*[*int*](https://docs.python.org/3/library/functions.html#int) *,* *datetime* *,* [*str*](https://docs.python.org/3/library/stdtypes.html#str) *]* *,* *optional*) – Timestamp (inclusive) to end partitioning windows from the provided series. (default is the entire series)
  * **window** (*Union* *\[*[*int*](https://docs.python.org/3/library/functions.html#int) *,* *datetime* *,* [*str*](https://docs.python.org/3/library/stdtypes.html#str) *]* *,* *optional*) –

    The timedelta which is the width of each window, and the size of each window is used to divide the series into a
    : number of windows. (default is the entire series)
  * **\*\*kwargs** – Flags for determining the window behavior and the output type.
* **Keyword Arguments:**
  * **include\_std\_dev** ([*bool*](https://docs.python.org/3/library/functions.html#bool) *,* [*False*](https://docs.python.org/3/library/constants.html#False)) – If set to True, the output will include the standard deviation.
  * **window\_count** ([*int*](https://docs.python.org/3/library/functions.html#int) *,* *optional*) – Number of windows to compute the statistics over (instead of the size of each window).
* **Returns:**
  Returns a function that accepts a single series as input, and partitions it into windows with
  each window providing statistics over each window.
* **Return type:**
  ([FunctionNode](/docs/foundry/foundryts/nodes-function-node/#foundryts.nodes.FunctionNode)) -> SummarizerNode

<a id="dataframe-schema"></a>

## Dataframe schema

| Column name              | Type     | Description                                                                                |
|--------------------------|----------|--------------------------------------------------------------------------------------------|
| count                    | int      | Number of data points in the window of the input<br/>series.                               |
| earliest\_point.timestamp | datetime | Timestamp of the first data point in the window of<br/>the input series.                   |
| earliest\_point.value     | float    | Value of the first data point in the window of<br/>the input series.                       |
| end\_timestamp            | datetime | Timestamp of the last data point                                                           |
| largest\_point.timestamp  | datetime | Timestamp of the data point with the largest value<br/>in the window of the input series.  |
| largest\_point.value      | float    | Largest value in the window of the input series.                                           |
| latest\_point.timestamp   | datetime | Timestamp of the most recent data point in the<br/>window of the input series.             |
| latest\_point.value       | float    | Value of the most recent data point in the window<br/>of the input series.                 |
| mean                     | float    | Average value of all data points in the window of<br/>the input series.                    |
| smallest\_point.timestamp | datetime | Timestamp of the data point with the smallest value<br/>in the window of the input series. |
| smallest\_point.value     | float    | Smallest value in the window of the input series.                                          |
| start\_timestamp          | datetime | Timestamp of the first data point                                                          |

:::callout{theme="success" title="See Also"}
[`distribution()`](/docs/foundry/foundryts/functions-distribution/#foundryts.functions.distribution), [`scatter()`](/docs/foundry/foundryts/functions-scatter/#foundryts.functions.scatter)
:::

## Notes

This function is only applicable to numeric series.

In the future, the include\_std\_dev kwarg will be deprecated as this feature will be made the default.

window\_count can only be used with include\_std\_dev, and this will
override window. If passed without include\_std\_dev, window\_count will be ignored.

## Examples

```pycon
>>> series = F.points(
...     (1, 8.0),
...     (101, 4.0),
...     (200, 2.0),
...     (201, 1.0),
...     (299, 35.0),
...     (300, 16.0),
...     (350, 32.0),
...     (1000, 64.0),
... )
                      timestamp  value
0 1970-01-01 00:00:00.000000001    8.0
1 1970-01-01 00:00:00.000000101    4.0
2 1970-01-01 00:00:00.000000200    2.0
3 1970-01-01 00:00:00.000000201    1.0
4 1970-01-01 00:00:00.000000299   35.0
5 1970-01-01 00:00:00.000000300   16.0
6 1970-01-01 00:00:00.000000350   32.0
7 1970-01-01 00:00:00.000001000   64.0
```

```pycon
>>> stats = F.statistics(window="100ns")(series) # use time-based window
>>> stats.to_pandas()
   count      earliest_point.timestamp  earliest_point.value                 end_timestamp       largest_point.timestamp  largest_point.value        latest_point.timestamp  latest_point.value       mean      smallest_point.timestamp  smallest_point.value               start_timestamp
0      1 1970-01-01 00:00:00.000000001                   8.0 1970-01-01 00:00:00.000000100 1970-01-01 00:00:00.000000001                  8.0 1970-01-01 00:00:00.000000001                 8.0   8.000000 1970-01-01 00:00:00.000000001                   8.0 1970-01-01 00:00:00.000000000
1      1 1970-01-01 00:00:00.000000101                   4.0 1970-01-01 00:00:00.000000200 1970-01-01 00:00:00.000000101                  4.0 1970-01-01 00:00:00.000000101                 4.0   4.000000 1970-01-01 00:00:00.000000101                   4.0 1970-01-01 00:00:00.000000100
2      3 1970-01-01 00:00:00.000000200                   2.0 1970-01-01 00:00:00.000000300 1970-01-01 00:00:00.000000299                 35.0 1970-01-01 00:00:00.000000299                35.0  12.666667 1970-01-01 00:00:00.000000201                   1.0 1970-01-01 00:00:00.000000200
3      2 1970-01-01 00:00:00.000000300                  16.0 1970-01-01 00:00:00.000000400 1970-01-01 00:00:00.000000350                 32.0 1970-01-01 00:00:00.000000350                32.0  24.000000 1970-01-01 00:00:00.000000300                  16.0 1970-01-01 00:00:00.000000300
4      1 1970-01-01 00:00:00.000001000                  64.0 1970-01-01 00:00:00.000001100 1970-01-01 00:00:00.000001000                 64.0 1970-01-01 00:00:00.000001000                64.0  64.000000 1970-01-01 00:00:00.000001000                  64.0 1970-01-01 00:00:00.000001000
```

```pycon
>>> stats_with_std_dev = F.statistics(window="100ns", include_std_dev=True)(series)
>>> stats_with_std_dev.to_pandas()
   count      earliest_point.timestamp  earliest_point.value                 end_timestamp       largest_point.timestamp  largest_point.value        latest_point.timestamp  latest_point.value       mean      smallest_point.timestamp  smallest_point.value  standard_deviation               start_timestamp
0      1 1970-01-01 00:00:00.000000001                   8.0 1970-01-01 00:00:00.000000100 1970-01-01 00:00:00.000000001                  8.0 1970-01-01 00:00:00.000000001                 8.0   8.000000 1970-01-01 00:00:00.000000001                   8.0            0.000000 1970-01-01 00:00:00.000000000
1      1 1970-01-01 00:00:00.000000101                   4.0 1970-01-01 00:00:00.000000200 1970-01-01 00:00:00.000000101                  4.0 1970-01-01 00:00:00.000000101                 4.0   4.000000 1970-01-01 00:00:00.000000101                   4.0            0.000000 1970-01-01 00:00:00.000000100
2      3 1970-01-01 00:00:00.000000200                   2.0 1970-01-01 00:00:00.000000300 1970-01-01 00:00:00.000000299                 35.0 1970-01-01 00:00:00.000000299                35.0  12.666667 1970-01-01 00:00:00.000000201                   1.0           15.797327 1970-01-01 00:00:00.000000200
3      2 1970-01-01 00:00:00.000000300                  16.0 1970-01-01 00:00:00.000000400 1970-01-01 00:00:00.000000350                 32.0 1970-01-01 00:00:00.000000350                32.0  24.000000 1970-01-01 00:00:00.000000300                  16.0            8.000000 1970-01-01 00:00:00.000000300
4      1 1970-01-01 00:00:00.000001000                  64.0 1970-01-01 00:00:00.000001100 1970-01-01 00:00:00.000001000                 64.0 1970-01-01 00:00:00.000001000                64.0  64.000000 1970-01-01 00:00:00.000001000                  64.0            0.000000 1970-01-01 00:00:00.000001000
```

```pycon
>>> stats_fixed_window_count = F.statistics(include_std_dev=True, window_count=3)(series)
>>> stats_fixed_window_count.to_pandas()
   count      earliest_point.timestamp  earliest_point.value                 end_timestamp       largest_point.timestamp  largest_point.value        latest_point.timestamp  latest_point.value  mean      smallest_point.timestamp  smallest_point.value  standard_deviation               start_timestamp
0      6 1970-01-01 00:00:00.000000001                   8.0 1970-01-01 00:00:00.000000335 1970-01-01 00:00:00.000000299                 35.0 1970-01-01 00:00:00.000000300                16.0  11.0 1970-01-01 00:00:00.000000201                   1.0            11.83216 1970-01-01 00:00:00.000000001
1      1 1970-01-01 00:00:00.000000350                  32.0 1970-01-01 00:00:00.000000669 1970-01-01 00:00:00.000000350                 32.0 1970-01-01 00:00:00.000000350                32.0  32.0 1970-01-01 00:00:00.000000350                  32.0             0.00000 1970-01-01 00:00:00.000000335
2      1 1970-01-01 00:00:00.000001000                  64.0 1970-01-01 00:00:00.000001003 1970-01-01 00:00:00.000001000                 64.0 1970-01-01 00:00:00.000001000                64.0  64.0 1970-01-01 00:00:00.000001000                  64.0             0.00000 1970-01-01 00:00:00.000000669
```
