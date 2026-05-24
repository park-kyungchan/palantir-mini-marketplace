---
sourceUrl: "https://www.palantir.com/docs/foundry/foundryts/functions-distribution/"
canonicalUrl: "https://palantir.com/docs/foundry/foundryts/functions-distribution/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "a3b3430a6b98923b37775ef6a0fea7b6d1adc80ec1bb1043a7107acf6b3f6898"
product: "foundry"
docsArea: "foundryts"
locale: "en"
upstreamTitle: "Documentation | API Reference > functions.distribution"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# foundryts.functions.distribution

## foundryts.functions.distribution(start=None, end=None, start\_value=None, end\_value=None, bins=None)

Returns a function that will evaluate the distribution of one or more time-series.

A distribution is a breakdown of points into bins of values that partition the requested range of values.
Evaluating the distribution returns a list of the bins which describe the number of points in their range,
as well as the start and end of the range.

The distribution can be applied to a single series or multiple series, in which case the distribution function
considers a union of values from all series for each bin in the final dataframe.

The delta for the value range for each bin is constant and is calculated using
(max value - min value) / (number of bins)

* **Parameters:**
  * **start** (*Union* *\[*[*int*](https://docs.python.org/3/library/functions.html#int) *,* *datetime* *,* [*str*](https://docs.python.org/3/library/stdtypes.html#str) *]* *,* *optional*) – Timestamp (inclusive) to start evaluating a distribution over the provided series (default is the earliest
    timestamp in any of the input time series)
  * **end** (*Union* *\[*[*int*](https://docs.python.org/3/library/functions.html#int) *,* *datetime* *,* [*str*](https://docs.python.org/3/library/stdtypes.html#str) *]* *,* *optional*) – Timestamp (exclusive) to end evaluating a distribution over the provided series (default is the latest timestamp
    in any of the input time series)
  * **start\_value** ([*float*](https://docs.python.org/3/library/functions.html#float) *,* *optional*) – Lower bound (inclusive) of the value range to evaluate the distribution over (default is the minimum value
    of any of the input time series)
  * **end\_value** ([*float*](https://docs.python.org/3/library/functions.html#float) *,* *optional*) – Upper bound (exclusive) of the value range to evaluate the distribution over (default is the maximum value
    of any of the input time series)
  * **bins** ([*int*](https://docs.python.org/3/library/functions.html#int) *,* *optional*) – Number of value-bins to distribute points over (default is 10).
* **Returns:**
  A function that accepts one or more series as inputs and generates the distribution over all points in the
  specified or default number of bins.
* **Return type:**
  (Union\[[FunctionNode](/docs/foundry/foundryts/nodes-function-node/#foundryts.nodes.FunctionNode), [NodeCollection](/docs/foundry/foundryts/node-collection/#foundryts.NodeCollection)]) -> SummarizerNode

## Dataframe schema

| Column name               | Type     | Description                                                                                                                    |
|---------------------------|----------|--------------------------------------------------------------------------------------------------------------------------------|
| start\_timestamp           | datetime | Start time of the distribution (inclusive)                                                                                     |
| end\_timestamp             | datetime | End time of the distribution (exclusive)                                                                                       |
| start                     | float    | Lower bound of values (inclusive)                                                                                              |
| end                       | float    | Upper bound of values (exclusive)                                                                                              |
| delta                     | float    | The difference between the min and max values of<br/>each bin. Given how bins are calculated, delta is<br/>fixed for all bins. |
| distribution\_values.start | float    | Start value of a distribution bin                                                                                              |
| distribution\_values.end   | float    | End value of a distribution bin                                                                                                |
| distribution\_values.count | int      | Number of instances in a distribution bin                                                                                      |

:::callout{theme="success" title="See Also"}
[`statistics()`](/docs/foundry/foundryts/functions-statistics/#foundryts.functions.statistics), [`scatter()`](/docs/foundry/foundryts/functions-scatter/#foundryts.functions.scatter)
:::

:::callout{theme="warning" title="Note"}
This function is only applicable to numeric series.
:::

## Examples

```pycon
>>> series_1 = F.points(
...     (1, 0.0),
...     (101, 10.2),
...     (200, 11.3),
...     (201, 11.1),
...     (299, 11.2),
...     (300, 12.0),
...     (400, 11.7),
...     (500, 16.0),
...     (123450, 11.8),
...     name="series-1",
... )
>>> series_2 = F.points(
...     (1, 0.5),
...     (101, 0.2),
...     (200, 1.3),
...     (201, 0.1),
...     (299, 1.2),
...     (300, 1.4),
...     (400, 1.0),
...     (500, 2.0),
...     (123450, 1.0),
...     name="series-2",
... )
>>> series_1.to_pandas()
                      timestamp  value
0 1970-01-01 00:00:00.000000001    0.0
1 1970-01-01 00:00:00.000000101   10.2
2 1970-01-01 00:00:00.000000200   11.3
3 1970-01-01 00:00:00.000000201   11.1
4 1970-01-01 00:00:00.000000299   11.2
5 1970-01-01 00:00:00.000000300   12.0
6 1970-01-01 00:00:00.000000400   11.7
7 1970-01-01 00:00:00.000000500   16.0
8 1970-01-01 00:00:00.000123450   11.8
>>> series_2.to_pandas()
                      timestamp  value
0 1970-01-01 00:00:00.000000001    0.5
1 1970-01-01 00:00:00.000000101    0.2
2 1970-01-01 00:00:00.000000200    1.3
3 1970-01-01 00:00:00.000000201    0.1
4 1970-01-01 00:00:00.000000299    1.2
5 1970-01-01 00:00:00.000000300    1.4
6 1970-01-01 00:00:00.000000400    1.0
7 1970-01-01 00:00:00.000000500    2.0
8 1970-01-01 00:00:00.000123450    1.0
>>> nc = NodeCollection(series_1, series_2)
```

```pycon
>>> single_dist = F.distribution(bins=3)(series_1) # single series distribution
>>> single_dist.to_pandas()
      delta  distribution_values.count  distribution_values.end  distribution_values.start   end end_timestamp  start               start_timestamp
0  5.333333                          1                 5.333333                   0.000000  16.0    2262-01-01    0.0 1677-09-21 00:12:43.145225216
1  5.333333                          1                10.666667                   5.333333  16.0    2262-01-01    0.0 1677-09-21 00:12:43.145225216
2  5.333333                          7                16.000000                  10.666667  16.0    2262-01-01    0.0 1677-09-21 00:12:43.145225216
```

```pycon
>>> multiple_dist = F.distribution(bins=3)(nc) # multiple series distribution
>>> multiple_dist.to_pandas()
      delta  distribution_values.count  distribution_values.end  distribution_values.start   end end_timestamp  start               start_timestamp
0  5.333333                         10                 5.333333                   0.000000  16.0    2262-01-01    0.0 1677-09-21 00:12:43.145225216
1  5.333333                          1                10.666667                   5.333333  16.0    2262-01-01    0.0 1677-09-21 00:12:43.145225216
2  5.333333                          7                16.000000                  10.666667  16.0    2262-01-01    0.0 1677-09-21 00:12:43.145225216
```
