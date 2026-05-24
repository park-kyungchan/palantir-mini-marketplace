---
sourceUrl: "https://www.palantir.com/docs/foundry/foundryts/functions-time-series-search/"
canonicalUrl: "https://palantir.com/docs/foundry/foundryts/functions-time-series-search/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "cffcb7a71a4d5b2e9855683345a9c12b0b1066b0c8a6919517b64aa37dfeba1a"
product: "foundry"
docsArea: "foundryts"
locale: "en"
upstreamTitle: "Documentation | API Reference > functions.time_series_search"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# foundryts.functions.time\_series\_search

## foundryts.functions.time\_series\_search(predicate, labels=None, start=None, end=None, interval\_values=None, before='nearest', internal='default', after='nearest', min\_duration=None, max\_duration=None)

Returns a function that will search intervals on a time series using the provided predicate.

The function will return time intervals where the predicate is true.

Each returned interval is evaluated to the associated [`statistics()`](/docs/foundry/foundryts/functions-statistics/#foundryts.functions.statistics). The [`dsl()`](/docs/foundry/foundryts/functions-dsl/#foundryts.functions.dsl) formula in
`interval_values` will be used for evaluating the final [`statistics()`](/docs/foundry/foundryts/functions-statistics/#foundryts.functions.statistics).

The specified interpolation strategies are used for filling in missing timestamps. See [`interpolate()`](/docs/foundry/foundryts/functions-interpolate/#foundryts.functions.interpolate)
for more details on interpolation and strategies.

The intervals produced by this function are equivalent to events in Quiver. This is particularly
useful when a time series demonstrates intervaled behavior and analysis on the time series requires
access the intervals. Each time series can then be split into ranges using [`time_range()`](/docs/foundry/foundryts/functions-time-range/#foundryts.functions.time_range) such that
each interval is a new [`time_range()`](/docs/foundry/foundryts/functions-time-range/#foundryts.functions.time_range) and operations can be applied independently on each time-range.

* **Parameters:**
  * **predicate** ([*str*](https://docs.python.org/3/library/stdtypes.html#str)) – The predicate to search for intervals using a [`dsl()`](/docs/foundry/foundryts/functions-dsl/#foundryts.functions.dsl) conditional program.
  * **labels** (*Union* *\[*[*str*](https://docs.python.org/3/library/stdtypes.html#str) *,* *List* *\[*[*str*](https://docs.python.org/3/library/stdtypes.html#str) *]* *]* *,* *optional*) – Aliases for each input time series to refer to them in `predicate` and `interval_values`
    (default is \[‘a’, ‘b’, …, ‘aa’, ‘ab’, …]).
  * **start** ([*int*](https://docs.python.org/3/library/functions.html#int) *|* *datetime* *|* [*str*](https://docs.python.org/3/library/stdtypes.html#str) *,* *optional*) – Timestamp (inclusive) to start evaluating intervals in the time series. For an interval overlapping with the
    `start` timestamp, the full interval will be included in the output (default is pandas.Timestamp.min).
  * **end** ([*int*](https://docs.python.org/3/library/functions.html#int) *|* *datetime* *|* [*str*](https://docs.python.org/3/library/stdtypes.html#str) *,* *optional*) – Timestamp (exclusive) to end evaluating intervals in the time series. For an interval overlapping with the
    `end` timestamp, the full interval will be included in the output (default is pandas.Timestamp.max\`).
  * **interval\_values** ([*str*](https://docs.python.org/3/library/stdtypes.html#str) *,* *optional*) – [`dsl()`](/docs/foundry/foundryts/functions-dsl/#foundryts.functions.dsl) program to transform the values that the interval statistics are computed over. This is required
    for a non-numeric input time series since statistics cannot be computed over non-numeric data.
    (default is the first input time series).
  * **before** (*Union* *\[*[*str*](https://docs.python.org/3/library/stdtypes.html#str) *,* *List* *\[*[*str*](https://docs.python.org/3/library/stdtypes.html#str) *]* *]* *,* *optional*) – Strategy for interpolating points before the first point in the series, which can be a list per series,
    use a valid strategy from [`interpolate()`](/docs/foundry/foundryts/functions-interpolate/#foundryts.functions.interpolate) (default is `NEAREST`).
  * **internal** (*Union* *\[*[*str*](https://docs.python.org/3/library/stdtypes.html#str) *,* *List* *\[*[*str*](https://docs.python.org/3/library/stdtypes.html#str) *]* *]* *,* *optional*) – Strategy for interpolating points between existing points, which can be a list per series, use a
    valid value from [`interpolate()`](/docs/foundry/foundryts/functions-interpolate/#foundryts.functions.interpolate) (default is `LINEAR` for numeric
    and `PREVIOUS` for enum time series).
  * **after** (*Union* *\[*[*str*](https://docs.python.org/3/library/stdtypes.html#str) *,* *List* *\[*[*str*](https://docs.python.org/3/library/stdtypes.html#str) *]* *]* *,* *optional*) – Strategy for interpolating points after the last point in the series, which can be a list per series,
    use a valid strategy from [`interpolate()`](/docs/foundry/foundryts/functions-interpolate/#foundryts.functions.interpolate) (default is `NEAREST`).
  * **min\_duration** ([*int*](https://docs.python.org/3/library/functions.html#int) *|* [*str*](https://docs.python.org/3/library/stdtypes.html#str) *|* [*datetime.timedelta*](https://docs.python.org/3/library/datetime.html#datetime.timedelta) *,* *optional*) – Minimum duration for which predicate must be true for the time-range to qualify as an interval.
  * **max\_duration** ([*int*](https://docs.python.org/3/library/functions.html#int) *|* [*str*](https://docs.python.org/3/library/stdtypes.html#str) *|* [*datetime.timedelta*](https://docs.python.org/3/library/datetime.html#datetime.timedelta) *,* *optional*) – Maximum duration for which predicate must be true for the time-range to qualify as an interval.
* **Returns:**
  A function that returns the statistics over intervals satisfying the predicate for input time series.
* **Return type:**
  (Union\[[FunctionNode](/docs/foundry/foundryts/nodes-function-node/#foundryts.nodes.FunctionNode), NodeCollections]) -> SummaryNode

## Dataframe schema

| Column name              | Type     | Description                                                              |
|--------------------------|----------|--------------------------------------------------------------------------|
| count                    | int      | Number of data points in the interval.                                   |
| earliest\_point.timestamp | datetime | Timestamp of the first data point in the interval.                       |
| earliest\_point.value     | float    | Value of the first data point in the interval.                           |
| end\_timestamp            | datetime | Timestamp (exclusive) of the end of the interval.                        |
| largest\_point.timestamp  | datetime | Timestamp of the data point with the largest value<br/>in the interval.  |
| largest\_point.value      | float    | Largest value in the interval.                                           |
| latest\_point.timestamp   | datetime | Timestamp of the most recent data point in the<br/>interval.             |
| latest\_point.value       | float    | Value of the most recent data point in the interval.                     |
| mean                     | float    | Average value of all data points in the interval.                        |
| smallest\_point.timestamp | datetime | Timestamp of the data point with the smallest value<br/>in the interval. |
| smallest\_point.value     | float    | Smallest value in the interval.                                          |
| start\_timestamp          | datetime | Timestamp of the first data point in the interval.                       |
| standard\_deviation       | float    | Standard deviation of the data points in the<br/>interval.               |
| duration.seconds         | int      | Duration of the interval in seconds.                                     |
| duration.subsecond\_nanos | int      | Duration of the interval in nanoseconds.                                 |

:::callout{theme="success" title="See Also"}
[`interpolate()`](/docs/foundry/foundryts/functions-interpolate/#foundryts.functions.interpolate), [`statistics()`](/docs/foundry/foundryts/functions-statistics/#foundryts.functions.statistics)
:::

## Examples

```pycon
>>> discrete_series = F.points(
...     (0, 1.0),
...     (1, 2.0),
...     (2, 2.0),
...     (3, 3.0),
...     (4, 5.0),
...     (5, 6.0),
...     (6, 4.0),
...     (7, 2.0),
...     (8, 6.0),
...     (9, 7.0),
...     (10, 8.0),
...     (11, 10.0),
...     (12, 11.0),
...     name="discrete",
... )
>>> discrete_series.to_pandas()
                       timestamp  value
0  1970-01-01 00:00:00.000000000    1.0
1  1970-01-01 00:00:00.000000001    2.0
2  1970-01-01 00:00:00.000000002    2.0
3  1970-01-01 00:00:00.000000003    3.0
4  1970-01-01 00:00:00.000000004    5.0
5  1970-01-01 00:00:00.000000005    6.0
6  1970-01-01 00:00:00.000000006    4.0
7  1970-01-01 00:00:00.000000007    2.0
8  1970-01-01 00:00:00.000000008    6.0
9  1970-01-01 00:00:00.000000009    7.0
10 1970-01-01 00:00:00.000000010    8.0
11 1970-01-01 00:00:00.000000011   10.0
12 1970-01-01 00:00:00.000000012   11.0
```

```pycon
>>> even_search = F.time_series_search(
...     predicate="discrete % 2 == 0",
...     interval_values="discrete",
...     labels="discrete",
... )(discrete_series)
# 3 Intervals with points:
# Interval 1: [(1, 2.0), (2, 2.0)]
# Interval 2: [(5, 6.0), (6, 4.0), (7, 2.0), (8, 6.0)]
# Interval 3: [(10, 8.0), (11, 10.0)]
>>> even_search.to_pandas()
   count  duration.seconds  duration.subsecond_nanos      earliest_point.timestamp  earliest_point.value                      end_time       largest_point.timestamp  largest_point.value        latest_point.timestamp  latest_point.value  mean      smallest_point.timestamp  smallest_point.value  standard_deviation                    start_time
0      2                 0                         2 1970-01-01 00:00:00.000000001                   2.0 1970-01-01 00:00:00.000000003 1970-01-01 00:00:00.000000002                  2.0 1970-01-01 00:00:00.000000002                 2.0   2.0 1970-01-01 00:00:00.000000002                   2.0            0.000000 1970-01-01 00:00:00.000000001
1      4                 0                         4 1970-01-01 00:00:00.000000005                   6.0 1970-01-01 00:00:00.000000009 1970-01-01 00:00:00.000000008                  6.0 1970-01-01 00:00:00.000000008                 6.0   4.5 1970-01-01 00:00:00.000000007                   2.0            1.658312 1970-01-01 00:00:00.000000005
2      2                 0                         2 1970-01-01 00:00:00.000000010                   8.0 1970-01-01 00:00:00.000000012 1970-01-01 00:00:00.000000011                 10.0 1970-01-01 00:00:00.000000011                10.0   9.0 1970-01-01 00:00:00.000000010                   8.0            1.000000 1970-01-01 00:00:00.000000010
```

```pycon
>>> search_formula = F.time_series_search(
...     predicate="discrete % 2 == 0",
...     interval_values="discrete * 2",
...     labels="discrete",
... )(discrete_series)
# 3 Intervals with points (with doubled values):
# Interval 1: [(1, 4.0), (2, 4.0)]
# Interval 2: [(5, 12.0), (6, 8.0), (7, 4.0), (8, 12.0)]
# Interval 3: [(10, 16.0), (11, 20.0)]
>>> search_formula.to_pandas()
   count  duration.seconds  duration.subsecond_nanos      earliest_point.timestamp  earliest_point.value                      end_time       largest_point.timestamp  largest_point.value        latest_point.timestamp  latest_point.value  mean      smallest_point.timestamp  smallest_point.value  standard_deviation                    start_time
0      2                 0                         2 1970-01-01 00:00:00.000000001                   4.0 1970-01-01 00:00:00.000000003 1970-01-01 00:00:00.000000002                  4.0 1970-01-01 00:00:00.000000002                 4.0   4.0 1970-01-01 00:00:00.000000002                   4.0            0.000000 1970-01-01 00:00:00.000000001
1      4                 0                         4 1970-01-01 00:00:00.000000005                  12.0 1970-01-01 00:00:00.000000009 1970-01-01 00:00:00.000000008                 12.0 1970-01-01 00:00:00.000000008                12.0   9.0 1970-01-01 00:00:00.000000007                   4.0            3.316625 1970-01-01 00:00:00.000000005
2      2                 0                         2 1970-01-01 00:00:00.000000010                  16.0 1970-01-01 00:00:00.000000012 1970-01-01 00:00:00.000000011                 20.0 1970-01-01 00:00:00.000000011                20.0  18.0 1970-01-01 00:00:00.000000010                  16.0            2.000000 1970-01-01 00:00:00.000000010
```

```pycon
>>> min_duration_search = F.time_series_search(
...     predicate="discrete % 2 == 0",
...     interval_values="discrete",
...     labels="discrete",
...     min_duration="3ns",
... )(discrete_series)
# The first and last intervals are filtered due to duration < 3
# 1 Interval with points:
# [(5, 6.0), (6, 4.0), (7, 2.0), (8, 6.0)]
>>> min_duration_search.to_pandas()
   count  duration.seconds  duration.subsecond_nanos      earliest_point.timestamp  earliest_point.value                      end_time       largest_point.timestamp  largest_point.value        latest_point.timestamp  latest_point.value  mean      smallest_point.timestamp  smallest_point.value  standard_deviation                    start_time
0      4                 0                         4 1970-01-01 00:00:00.000000005                   6.0 1970-01-01 00:00:00.000000009 1970-01-01 00:00:00.000000008                  6.0 1970-01-01 00:00:00.000000008                 6.0   4.5 1970-01-01 00:00:00.000000007                   2.0            1.658312 1970-01-01 00:00:00.000000005
```

```pycon
>>> max_duration_search = F.time_series_search(
...     predicate="discrete % 2 == 0",
...     interval_values="discrete",
...     labels="discrete",
...     max_duration="3ns",
... )(discrete_series)
# Second interval is filtered due to duration > 3
# 2 Intervals with points:
# Interval 1: [(1, 2.0), (2, 2.0)]
# Interval 2: [(10, 8.0), (11, 10.0)]
>>> max_duration_search.to_pandas()
   count  duration.seconds  duration.subsecond_nanos      earliest_point.timestamp  earliest_point.value                      end_time       largest_point.timestamp  largest_point.value        latest_point.timestamp  latest_point.value  mean      smallest_point.timestamp  smallest_point.value  standard_deviation                    start_time
0      2                 0                         2 1970-01-01 00:00:00.000000001                   2.0 1970-01-01 00:00:00.000000003 1970-01-01 00:00:00.000000002                  2.0 1970-01-01 00:00:00.000000002                 2.0   2.0 1970-01-01 00:00:00.000000002                   2.0                 0.0 1970-01-01 00:00:00.000000001
1      2                 0                         2 1970-01-01 00:00:00.000000010                   8.0 1970-01-01 00:00:00.000000012 1970-01-01 00:00:00.000000011                 10.0 1970-01-01 00:00:00.000000011                10.0   9.0 1970-01-01 00:00:00.000000010                   8.0                 1.0 1970-01-01 00:00:00.000000010
```

```pycon
>>> toggle_series = F.points(
...     (0, "OFF"),
...     (1, "ON"),
...     (2, "OFF"),
...     (3, "OFF"),
...     (4, "ON"),
...     (5, "ON"),
...     (6, "ON"),
...     (7, "OFF"),
...     (8, "ON"),
...     (9, "ON"),
...     (10, "OFF"),
...     (11, "OFF"),
...     (12, "ON"),
...     name="toggle",
... )
>>> toggle_series.to_pandas()
                       timestamp value
0  1970-01-01 00:00:00.000000000   OFF
1  1970-01-01 00:00:00.000000001    ON
2  1970-01-01 00:00:00.000000002   OFF
3  1970-01-01 00:00:00.000000003   OFF
4  1970-01-01 00:00:00.000000004    ON
5  1970-01-01 00:00:00.000000005    ON
6  1970-01-01 00:00:00.000000006    ON
7  1970-01-01 00:00:00.000000007   OFF
8  1970-01-01 00:00:00.000000008    ON
9  1970-01-01 00:00:00.000000009    ON
10 1970-01-01 00:00:00.000000010   OFF
11 1970-01-01 00:00:00.000000011   OFF
12 1970-01-01 00:00:00.000000012    ON
>>> cross_series_search = F.time_series_search(
...     predicate='toggle == "ON"',
...     interval_values="discrete",
...     labels=["toggle", "discrete"],
... )([toggle_series, discrete_series])
# 4 Intervals in discrete_series created from intervals in toggle_series where predicate is true:
# Interval 1: [(1, 2.0)]
# Interval 2: [(4, 5.0), (5, 6.0), (6, 4.0)]
# Interval 3: [(8, 6.0), (9, 7.0)]
# Interval 4: [(12, 11.0)]
>>> cross_series_search.to_pandas()
   count  duration.seconds  duration.subsecond_nanos      earliest_point.timestamp  earliest_point.value                      end_time       largest_point.timestamp  largest_point.value        latest_point.timestamp  latest_point.value  mean      smallest_point.timestamp  smallest_point.value  standard_deviation                    start_time
0      1                 0                         1 1970-01-01 00:00:00.000000001                   2.0 1970-01-01 00:00:00.000000002 1970-01-01 00:00:00.000000001                  2.0 1970-01-01 00:00:00.000000001                 2.0   2.0 1970-01-01 00:00:00.000000001                   2.0            0.000000 1970-01-01 00:00:00.000000001
1      3                 0                         3 1970-01-01 00:00:00.000000004                   5.0 1970-01-01 00:00:00.000000007 1970-01-01 00:00:00.000000005                  6.0 1970-01-01 00:00:00.000000006                 4.0   5.0 1970-01-01 00:00:00.000000006                   4.0            0.816497 1970-01-01 00:00:00.000000004
2      2                 0                         2 1970-01-01 00:00:00.000000008                   6.0 1970-01-01 00:00:00.000000010 1970-01-01 00:00:00.000000009                  7.0 1970-01-01 00:00:00.000000009                 7.0   6.5 1970-01-01 00:00:00.000000008                   6.0            0.500000 1970-01-01 00:00:00.000000008
3      1                 0                         1 1970-01-01 00:00:00.000000012                  11.0 1970-01-01 00:00:00.000000013 1970-01-01 00:00:00.000000012                 11.0 1970-01-01 00:00:00.000000012                11.0  11.0 1970-01-01 00:00:00.000000012                  11.0            0.000000 1970-01-01 00:00:00.000000012
```
