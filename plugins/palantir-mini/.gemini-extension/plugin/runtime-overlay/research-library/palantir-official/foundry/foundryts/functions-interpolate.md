---
sourceUrl: "https://www.palantir.com/docs/foundry/foundryts/functions-interpolate/"
canonicalUrl: "https://palantir.com/docs/foundry/foundryts/functions-interpolate/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "dc2c93964402a67b8bd58f4c635dd25a109c9568ea4ff9e63e9093b5351793a4"
product: "foundry"
docsArea: "foundryts"
locale: "en"
upstreamTitle: "Documentation | API Reference > functions.interpolate"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# foundryts.functions.interpolate

## foundryts.functions.interpolate(before=None, internal=None, after=None, frequency=None, rename\_columns\_by=None, static\_column\_name=None)

Returns a function that joins one or more time series into a single time series with a column per input series.

[↗ Interpolation](https://en.wikipedia.org/wiki/Interpolation) estimates the value of missing points in a series
for timestamps where the point exists in other series. The function uses the configured interpolation strategies to
resample and align the input series data where it misses points.

Interpolation of time series can be divided into three distinct time-ranges: before, internal, and after.

Each time-range handles interpolating missing values in different parts of the time series:

* before: Interpolates all points before the first point of the series being interpolated. For example see how
  : in the external\_interpolated\_series example below, the interpolation creates a new point for series 2 before
  its first point, filling it with the nearest value.
* internal: Interpolates values between existing data points within the time series being interpolated. For
  : example see how in the linear\_interpolated\_series example below, the interpolation estimates the value for
  points in the [`time_extent()`](/docs/foundry/foundryts/functions-time-extent/#foundryts.functions.time_extent) of both series.
* after: Interpolates all points after the last data point of the series being interpolated. For example see how
  : in the external\_interpolated\_series example below, the interpolation creates a new point for series 1 after
  its last point, filling it with the nearest value.

For applying varying strategies to each series, each strategy for the above time-ranges can be passed as a list.
Each list element corresponds to the strategy used for the respective input series. The same strategy is
applied to all input series if a single strategy is passed.

Interpolation strategies supported for internal interpolation:

| Strategy   | Description                                                                                                                              |
|------------|------------------------------------------------------------------------------------------------------------------------------------------|
| LINEAR     | Linearly interpolates points using the best fit line for the 2 points<br/>immediately before and after the timestamp being interpolated. |
| NEAREST    | Use the value of the nearest point by timestamp in one of the input series.                                                              |
| PREVIOUS   | Use the value of the previous defined point in the input time series.                                                                    |
| NEXT       | Use the value of the next occuring point in the input time series.                                                                       |
| NONE       | Skip interpolation. For timestamps where points don’t exist for any of the<br/>input series, null values will be used in the output df.  |

Interpolation strategies supported for external interpolation (before, after):

| Strategy           | Description                                                                                |
|--------------------|--------------------------------------------------------------------------------------------|
| NEAREST            | Take the value of the nearest defined point (this will be either the first or last point). |
| NONE<br/>(default) | Never interpolate before the first point and beyond the last point.                        |

An optional frequency can be configured for only interpolating timestamps at the specified frequency. Providing
a frequency completely resamples the input series, only creating and interpolating points at the specified
frequency. See the interpolated\_every\_10ns\_series and multiple\_interpolated\_every\_10ns\_series examples below
for an idea of the resampled output.

* **Parameters:**
  * **before** (*Union* *\[*[*str*](https://docs.python.org/3/library/stdtypes.html#str) *,* *List* *\[*[*str*](https://docs.python.org/3/library/stdtypes.html#str) *]* *]* *,* *optional*) – Strategy for interpolating points before the first in the series, which can be a list per series,
    use a valid strategy from the external interpolation table above (default is `NONE`).
  * **internal** (*Union* *\[*[*str*](https://docs.python.org/3/library/stdtypes.html#str) *,* *List* *\[*[*str*](https://docs.python.org/3/library/stdtypes.html#str) *]* *]* *,* *optional*) – Strategy for interpolating points between existing points, which can be a list per series, use a
    valid value from the strategy from the internal interpolation table above (default is `NONE`).
    (default is `NONE`).
  * **after** (*Union* *\[*[*str*](https://docs.python.org/3/library/stdtypes.html#str) *,* *List* *\[*[*str*](https://docs.python.org/3/library/stdtypes.html#str) *]* *]* *,* *optional*) – Strategy for interpolating points after the first in the series, which can be a list per series,
    use a valid strategy from the external interpolation table above (default is `NONE`).
  * **frequency** (*Union* *\[*[*str*](https://docs.python.org/3/library/stdtypes.html#str) *,* [*pandas.Timedelta*](https://pandas.pydata.org/pandas-docs/stable/reference/api/pandas.Timedelta.html#pandas.Timedelta) *]* *,* *optional*) – Output frequency for interpolated points, value will be processed as respective Hertz
    e.g. ‘5ms’, ‘1s’ (default is no fixed frequency and only timestamps present in other series
    will be interpolated)
  * **rename\_columns\_by** ([*str*](https://docs.python.org/3/library/stdtypes.html#str) *|* *Callable* *\[* \*\[\**N.FunctionNode* *]* *,* [*str*](https://docs.python.org/3/library/stdtypes.html#str) *]* *,* *optional*) – Either metadata key to identify series columns in the result or a callable that returns the name for each
    series (default is series identifiers).
  * **static\_column\_name** ([*str*](https://docs.python.org/3/library/stdtypes.html#str) *,* *optional*) – Static name for the value column, which overrides rename\_columns\_by.
* **Returns:**
  A function that returns the interpolated series using the configured strategies.
* **Return type:**
  (Union\[[FunctionNode](/docs/foundry/foundryts/nodes-function-node/#foundryts.nodes.FunctionNode), NodeCollections]) -> Union\[[FunctionNode](/docs/foundry/foundryts/nodes-function-node/#foundryts.nodes.FunctionNode), [NodeCollection](/docs/foundry/foundryts/node-collection/#foundryts.NodeCollection)]

## Dataframe schema

| Column name   | Type              | Description            |
|---------------|-------------------|------------------------|
| timestamp     | pandas.Timestamp  | Timestamp of the point |
| value         | Union\[float, str] | Value of the point     |

:::callout{theme="warning" title="Note"}
Do not use LINEAR interpolation for enum series, or this operation will fail.

The output of this function can be a single-series or a multi-series dataframe which will only work with
other functions expecting the respective input.
:::

:::callout{theme="success" title="See Also"}
[`scatter()`](/docs/foundry/foundryts/functions-scatter/#foundryts.functions.scatter)
:::

## Examples

```pycon
>>> series_1 = F.points((1, 1.0), (101, 2.0), (200, 4.0), (201, 8.0), name="series-1")
>>> series_2 = F.points((2, 11.0), (102, 12.0), (201, 14.0), (202, 18.0), name="series-2")
>>> series_1.to_pandas()
                    timestamp  value
0 1970-01-01 00:00:00.000000001    1.0
1 1970-01-01 00:00:00.000000101    2.0
2 1970-01-01 00:00:00.000000200    4.0
3 1970-01-01 00:00:00.000000201    8.0
>>> series_2.to_pandas()
                    timestamp  value
0 1970-01-01 00:00:00.000000002   11.0
1 1970-01-01 00:00:00.000000102   12.0
2 1970-01-01 00:00:00.000000201   14.0
3 1970-01-01 00:00:00.000000202   18.0
>>> nc = NodeCollection([series_1, series_2])
```

```pycon
>>> linear_interpolated_series = F.interpolate(internal="LINEAR")(nc)
>>> linear_interpolated_series.to_pandas()
                    timestamp  series-1   series-2
0 1970-01-01 00:00:00.000000001  1.000000        NaN
1 1970-01-01 00:00:00.000000002  1.010000  11.000000
2 1970-01-01 00:00:00.000000101  2.000000  11.990000
3 1970-01-01 00:00:00.000000102  2.020202  12.000000
4 1970-01-01 00:00:00.000000200  4.000000  13.979798
5 1970-01-01 00:00:00.000000201  8.000000  14.000000
6 1970-01-01 00:00:00.000000202       NaN  18.000000
```

```pycon
>>> nearest_interpolated_series = F.interpolate(internal="NEAREST")(nc)
>>> nearest_interpolated_series.to_pandas()
                    timestamp  series-1  series-2
0 1970-01-01 00:00:00.000000001       1.0       NaN
1 1970-01-01 00:00:00.000000002       1.0      11.0
2 1970-01-01 00:00:00.000000101       2.0      12.0
3 1970-01-01 00:00:00.000000102       2.0      12.0
4 1970-01-01 00:00:00.000000200       4.0      14.0
5 1970-01-01 00:00:00.000000201       8.0      14.0
6 1970-01-01 00:00:00.000000202       NaN      18.0
```

```pycon
>>> previous_interpolated_series = F.interpolate(internal="PREVIOUS")(nc)
>>> previous_interpolated_series.to_pandas()
                    timestamp  series-1  series-2
0 1970-01-01 00:00:00.000000001       1.0       NaN
1 1970-01-01 00:00:00.000000002       1.0      11.0
2 1970-01-01 00:00:00.000000101       2.0      11.0
3 1970-01-01 00:00:00.000000102       2.0      12.0
4 1970-01-01 00:00:00.000000200       4.0      12.0
5 1970-01-01 00:00:00.000000201       8.0      14.0
6 1970-01-01 00:00:00.000000202       NaN      18.0
```

```pycon
>>> next_interpolated_series = F.interpolate(internal="NEXT")(nc)
>>> next_interpolated_series.to_pandas()
                    timestamp  series-1  series-2
0 1970-01-01 00:00:00.000000001       1.0       NaN
1 1970-01-01 00:00:00.000000002       2.0      11.0
2 1970-01-01 00:00:00.000000101       2.0      12.0
3 1970-01-01 00:00:00.000000102       4.0      12.0
4 1970-01-01 00:00:00.000000200       4.0      14.0
5 1970-01-01 00:00:00.000000201       8.0      14.0
6 1970-01-01 00:00:00.000000202       NaN      18.0
```

```pycon
>>> none_interpolated_series = F.interpolate(internal="NONE")(nc) # skip any missing points
>>> none_interpolated_series.to_pandas()
                    timestamp  series-1  series-2
0 1970-01-01 00:00:00.000000001       1.0       NaN
1 1970-01-01 00:00:00.000000002       NaN      11.0
2 1970-01-01 00:00:00.000000101       2.0       NaN
3 1970-01-01 00:00:00.000000102       NaN      12.0
4 1970-01-01 00:00:00.000000200       4.0       NaN
5 1970-01-01 00:00:00.000000201       8.0      14.0
6 1970-01-01 00:00:00.000000202       NaN      18.0
```

```pycon
>>> external_interpolated_series = F.interpolate(before="NEAREST", after="NEAREST")(nc)
>>> external_interpolated_series.to_dataframe()
                    timestamp  series-1  series-2
0 1970-01-01 00:00:00.000000001       1.0      11.0
1 1970-01-01 00:00:00.000000002       NaN      11.0
2 1970-01-01 00:00:00.000000101       2.0       NaN
3 1970-01-01 00:00:00.000000102            12.0
4 1970-01-01 00:00:00.000000200       4.0       NaN
5 1970-01-01 00:00:00.000000201       8.0      14.0
6 1970-01-01 00:00:00.000000202       8.0      18.0
```

```pycon
>>> interpolated_series = F.interpolate(internal=["LINEAR", "NONE"])(nc) # different strategies for each series
>>> interpolated_series.to_pandas()
                    timestamp  series-1  series-2
0 1970-01-01 00:00:00.000000001  1.000000       NaN
1 1970-01-01 00:00:00.000000002  1.010000      11.0
2 1970-01-01 00:00:00.000000101  2.000000       NaN
3 1970-01-01 00:00:00.000000102  2.020202      12.0
4 1970-01-01 00:00:00.000000200  4.000000       NaN
5 1970-01-01 00:00:00.000000201  8.000000      14.0
6 1970-01-01 00:00:00.000000202       NaN      18.0
```

```pycon
>>> interpolated_every_10ns_series = F.interpolate(internal="NEAREST", frequency="10ns")(series_1)
>>> interpolated_every_10ns_series.to_pandas()
                        timestamp  series-1
0  1970-01-01 00:00:00.000000010       1.0
1  1970-01-01 00:00:00.000000020       1.0
2  1970-01-01 00:00:00.000000030       1.0
3  1970-01-01 00:00:00.000000040       1.0
4  1970-01-01 00:00:00.000000050       1.0
5  1970-01-01 00:00:00.000000060       2.0
6  1970-01-01 00:00:00.000000070       2.0
7  1970-01-01 00:00:00.000000080       2.0
8  1970-01-01 00:00:00.000000090       2.0
9  1970-01-01 00:00:00.000000100       2.0
10 1970-01-01 00:00:00.000000110       2.0
11 1970-01-01 00:00:00.000000120       2.0
12 1970-01-01 00:00:00.000000130       2.0
13 1970-01-01 00:00:00.000000140       2.0
14 1970-01-01 00:00:00.000000150       2.0
15 1970-01-01 00:00:00.000000160       4.0
16 1970-01-01 00:00:00.000000170       4.0
17 1970-01-01 00:00:00.000000180       4.0
18 1970-01-01 00:00:00.000000190       4.0
19 1970-01-01 00:00:00.000000200       4.0
```

```pycon
>>> multiple_interpolated_every_10ns_series = F.interpolate(
...     internal="NEAREST", frequency="10ns"
... )(nc)
>>> multiple_interpolated_every_10ns_series.to_pandas()
                       timestamp  series-1  series-2
0  1970-01-01 00:00:00.000000010       1.0      11.0
1  1970-01-01 00:00:00.000000020       1.0      11.0
2  1970-01-01 00:00:00.000000030       1.0      11.0
3  1970-01-01 00:00:00.000000040       1.0      11.0
4  1970-01-01 00:00:00.000000050       1.0      11.0
5  1970-01-01 00:00:00.000000060       2.0      12.0
6  1970-01-01 00:00:00.000000070       2.0      12.0
7  1970-01-01 00:00:00.000000080       2.0      12.0
8  1970-01-01 00:00:00.000000090       2.0      12.0
9  1970-01-01 00:00:00.000000100       2.0      12.0
10 1970-01-01 00:00:00.000000110       2.0      12.0
11 1970-01-01 00:00:00.000000120       2.0      12.0
12 1970-01-01 00:00:00.000000130       2.0      12.0
13 1970-01-01 00:00:00.000000140       2.0      12.0
14 1970-01-01 00:00:00.000000150       2.0      12.0
15 1970-01-01 00:00:00.000000160       4.0      14.0
16 1970-01-01 00:00:00.000000170       4.0      14.0
17 1970-01-01 00:00:00.000000180       4.0      14.0
18 1970-01-01 00:00:00.000000190       4.0      14.0
19 1970-01-01 00:00:00.000000200       4.0      14.0
```
