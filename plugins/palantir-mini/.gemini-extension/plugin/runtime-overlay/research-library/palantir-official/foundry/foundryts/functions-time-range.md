---
sourceUrl: "https://www.palantir.com/docs/foundry/foundryts/functions-time-range/"
canonicalUrl: "https://palantir.com/docs/foundry/foundryts/functions-time-range/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "a831af5fdc403605c952c57d26a6cf14ca1d69239a66e1bc104ef4c970c326bb"
product: "foundry"
docsArea: "foundryts"
locale: "en"
upstreamTitle: "Documentation | API Reference > functions.time_range"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# foundryts.functions.time\_range

## foundryts.functions.time\_range(start=None, end=None)

Returns a function that filters a single time series to the specified time-range.

Each time-range acts as an individual series. Setting a time-range for your query makes them more efficient as your
query will only read the points in the time-range, instead of all the points in the time series.
This is also useful for doing operations on intervals of time series.

* **Parameters:**
  * **start** ([*int*](https://docs.python.org/3/library/functions.html#int) *,* [*str*](https://docs.python.org/3/library/stdtypes.html#str) *,* [*datetime.datetime*](https://docs.python.org/3/library/datetime.html#datetime.datetime) *,* *optional*) – Inclusive starting point of the time-range. Integers are interpreted as the number of nanoseconds. For more
    human-readable durations, you can provide a datetime.timedelta object or a string that will be parsed as a
    pandas.Timedelta. String inputs should follow the format recognized by pandas.to\_timedelta, such as ‘1 day’,
    ‘1 hour’, ‘10 minutes’, or ’42s’. (default is the first point of the time series)
  * **end** ([*int*](https://docs.python.org/3/library/functions.html#int) *,* [*str*](https://docs.python.org/3/library/stdtypes.html#str) *,* [*datetime.datetime*](https://docs.python.org/3/library/datetime.html#datetime.datetime) *,* *optional*) – Exclusive end point of the time-range. Integers are interpreted as the number of nanoseconds. For more
    human-readable durations, you can provide a datetime.timedelta object or a string that will be parsed as a
    pandas.Timedelta. String inputs should follow the format recognized by pandas.to\_timedelta, such as
    ‘1 day’, ‘1 hour’, ‘10 minutes’, or ’42s’. (default is the last point of the time series)
* **Returns:**
  A function that accepts a single time series as input and returns the filtered time-range.
* **Return type:**
  (`FunctionNode`) -> `FunctionNode`

## Dataframe schema

| Column name   | Type             | Description            |
|---------------|------------------|------------------------|
| timestamp     | pandas.Timestamp | Timestamp of the point |
| value         | float | str      | Value of the point     |

## Examples

```pycon
>>> series = F.points((1, 1.0), (101, 2.0), (200, 4.0), (201, 8.0), name="series")
>>> series.to_pandas()
                    timestamp  value
0 1970-01-01 00:00:00.000000001    1.0
1 1970-01-01 00:00:00.000000101    2.0
2 1970-01-01 00:00:00.000000200    4.0
3 1970-01-01 00:00:00.000000201    8.0
```

```pycon
>>> time_range = F.time_range(start=200, end=202)(series)
>>> time_range.to_pandas()
                      timestamp  value
0 1970-01-01 00:00:00.000000200    4.0
1 1970-01-01 00:00:00.000000201    8.0
```

```pycon
>>> smaller_time_range = F.time_range(start=200, end=201)(series)
>>> smaller_time_range.to_pandas()
                    timestamp  value
0 1970-01-01 00:00:00.000000200    4.0
```

```pycon
>>> unbounded_start_range = F.time_range(end=201)(series)
>>> unbounded_start_range.to_pandas()
                      timestamp  value
0 1970-01-01 00:00:00.000000001    1.0
1 1970-01-01 00:00:00.000000101    2.0
2 1970-01-01 00:00:00.000000200    4.0
```

```pycon
>>> unbounded_end_range = F.time_range(start=101)(series)
>>> unbounded_end_range.to_pandas()
                      timestamp  value
0 1970-01-01 00:00:00.000000101    2.0
1 1970-01-01 00:00:00.000000200    4.0
2 1970-01-01 00:00:00.000000201    8.0
```
