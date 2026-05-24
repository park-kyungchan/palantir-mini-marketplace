---
sourceUrl: "https://www.palantir.com/docs/foundry/foundryts/nodes-function-node/"
canonicalUrl: "https://palantir.com/docs/foundry/foundryts/nodes-function-node/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "b2eaf5577a74ccbee4d78ba5b0b3b654586251cae3652d3e70e4829e74df7196"
product: "foundry"
docsArea: "foundryts"
locale: "en"
upstreamTitle: "Documentation | API Reference > nodes.FunctionNode"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# foundryts.nodes.FunctionNode

## *class* foundryts.nodes.FunctionNode(children)

Lazy query container for transforming one or more timeseries to a new timeseries which is the output of the
supplied transformation function.

Each FunctionNode can be transformed to another FunctionNode or computed to a final
[`SummarizerNode`](/docs/foundry/foundryts/nodes-summarizer-node/#foundryts.nodes.SummarizerNode).

You can also resolve a lazy FunctionNode to a dataframe with [`FunctionNode.to_pandas()`](#foundryts.nodes.FunctionNode.to_pandas) or
[`FunctionNode.to_dataframe()`](#foundryts.nodes.FunctionNode.to_dataframe) which will yield the transformed time series in the form of a dataframe.

## Examples

```pycon
>>> series = F.points(
...     (100, 0.0),
...     (200, float("inf")),
...     (300, 3.14159),
...     (2147483647, 1.0),
...     name="series"
... )
>>> series.to_pandas()
                      timestamp    value
0 1970-01-01 00:00:00.000000100  0.00000
1 1970-01-01 00:00:00.000000200      inf
2 1970-01-01 00:00:00.000000300  3.14159
3 1970-01-01 00:00:02.147483647  1.00000
```

```pycon
>>> scaled = series.scale(1.5) # scaled is a FunctionNode that is not evaluated yet
# scaled can be chained to another FunctionNode operation resulting in another unevaluated FunctionNode
>>> time_shifted = scaled.time_shift(1000)
# converting time_shifted to a Pandas dataframe evaluates the lazy query with the output of the scaled and
# time_shifted functions
>>> time_shifted.to_pandas()
                      timestamp     value
0 1970-01-01 00:00:00.000001100  0.000000
1 1970-01-01 00:00:00.000001200       inf
2 1970-01-01 00:00:00.000001300  4.712385
3 1970-01-01 00:00:02.147484647  1.500000
```

#### columns()

Returns a tuple of strings representing the column names of the [`pandas.DataFrame`](https://pandas.pydata.org/pandas-docs/stable/reference/api/pandas.DataFrame.html#pandas.DataFrame)
that would be produced by evaluating this node to a pandas dataframe.

:::callout{theme="warning" title="Note"}
Keys of nested objects will be flattened into a tuple with nested keys joined with `.`.
:::

* **Returns:**
  Tuple containing names of the columns in the resulting dataframe which the current node gets evaluated to.
* **Return type:**
  Tuple\[[str](https://docs.python.org/3/library/stdtypes.html#str)]

## Examples

```pycon
>>> series_node = foundryts.functions.points(((100, 0.0), (200, 1.0))
>>> series_node.columns()
("timestamp", "value")
>>> stats_node = series_node.statistics(start=0, end=100, window_size=None)
>>> stats_node.columns()
("count", "smallest_point.timestamp", "start_timestamp", "latest_point.timestamp", "mean",
"earliest_point.timestamp", "largest_point.timestamp", "end_timestamp")
```

#### cumulative\_aggregate(\*args, \*\*kwargs)

See [`foundryts.functions.cumulative_aggregate()`](/docs/foundry/foundryts/functions-cumulative-aggregate/#foundryts.functions.cumulative_aggregate)

#### derivative()

See [`foundryts.functions.derivative()`](/docs/foundry/foundryts/functions-derivative/#foundryts.functions.derivative)

#### distribution(start=None, end=None, bins=None, start\_value=None, end\_value=None)

See [`foundryts.functions.distribution()`](/docs/foundry/foundryts/functions-distribution/#foundryts.functions.distribution)

#### dsl(program, return\_type, labels=None, before='nearest', internal='linear', after='nearest')

See [`foundryts.functions.dsl()`](/docs/foundry/foundryts/functions-dsl/#foundryts.functions.dsl)

#### first\_point()

See [`foundryts.functions.first_point()`](/docs/foundry/foundryts/functions-first-point/#foundryts.functions.first_point)

#### integral(method='LINEAR')

See [`foundryts.functions.integral()`](/docs/foundry/foundryts/functions-integral/#foundryts.functions.integral)

#### interpolate(before=None, internal=None, after=None, frequency=None, rename\_columns\_by=None, static\_column\_name=None)

See [`foundryts.functions.interpolate()`](/docs/foundry/foundryts/functions-interpolate/#foundryts.functions.interpolate)

#### last\_point()

See [`foundryts.functions.last_point()`](/docs/foundry/foundryts/functions-last-point/#foundryts.functions.last_point)

#### mean(children)

See [`foundryts.functions.mean()`](/docs/foundry/foundryts/functions-mean/#foundryts.functions.mean)

#### periodic\_aggregate(\*args, \*\*kwargs)

See [`foundryts.functions.periodic_aggregate()`](/docs/foundry/foundryts/functions-periodic-aggregate/#foundryts.functions.periodic_aggregate)

#### rolling\_aggregate(\*args, \*\*kwargs)

See [`foundryts.functions.rolling_aggregate()`](/docs/foundry/foundryts/functions-rolling-aggregate/#foundryts.functions.rolling_aggregate)

#### scale(factor)

See [`foundryts.functions.scale()`](/docs/foundry/foundryts/functions-scale/#foundryts.functions.scale)

#### scatter(start\_timestamp, end\_timestamp, first\_interpolation, second\_interpolation, regression\_fit)

See [`foundryts.functions.scatter()`](/docs/foundry/foundryts/functions-scatter/#foundryts.functions.scatter)

#### *property* series\_ids

All series identifiers used by this node and its child nodes.

#### skip\_nonfinite()

See [`foundryts.functions.skip_nonfinite()`](/docs/foundry/foundryts/functions-skip-nonfinite/#foundryts.functions.skip_nonfinite)

#### statistics(start=None, end=None, window=None, \*\*kwargs)

See [`foundryts.functions.statistics()`](/docs/foundry/foundryts/functions-statistics/#foundryts.functions.statistics)

#### sum(children)

See [`foundryts.functions.sum()`](/docs/foundry/foundryts/functions-sum/#foundryts.functions.sum)

#### time\_extent()

See [`foundryts.functions.time_extent()`](/docs/foundry/foundryts/functions-time-extent/#foundryts.functions.time_extent)

#### time\_range(start=None, end=None)

See [`foundryts.functions.time_range()`](/docs/foundry/foundryts/functions-time-range/#foundryts.functions.time_range)

#### time\_shift(duration)

See [`foundryts.functions.time_shift()`](/docs/foundry/foundryts/functions-time-shift/#foundryts.functions.time_shift)

#### to\_dataframe(fts=None)

Evaluates this node to a [`pyspark.sql.DataFrame`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.html#pyspark.sql.DataFrame).

PySpark DataFrames enable distributed data processing and parallelized transformations. They can be useful when
working with dataframes with a large number of rows, for example loading all the points in a raw series or the
result of a [`FunctionNode`](#foundryts.nodes.FunctionNode), or evaluating the results of multiple [`SummarizerNode`](/docs/foundry/foundryts/nodes-summarizer-node/#foundryts.nodes.SummarizerNode) or
[`FunctionNode`](#foundryts.nodes.FunctionNode) together.

* **Parameters:**
  **fts** ([*foundryts.FoundryTS*](/docs/foundry/foundryts/foundryts/#foundryts.FoundryTS) *,* *optional*) – FoundryTS session used to execute the query (a new session will be created if not provided).
* **Returns:**
  Output of the node evaluated to a PySpark dataframe.
* **Return type:**
  [pyspark.sql.DataFrame](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.html#pyspark.sql.DataFrame)

## Examples

```pycon
>>> series_node = F.points(
...     (100, 0.0), (200, float("inf")), (300, 3.14159), (2147483647, 1.0), name="series"
... )
>>> series_node.to_dataframe().show()
+-------------------------------+---------+
| timestamp                     | value   |
+-------------------------------+---------+
| 1970-01-01 00:00:00.000000100 | 0.0     |
| 1970-01-01 00:00:00.000000200 | Infinity|
| 1970-01-01 00:00:00.000000300 | 3.14159 |
| 1970-01-01 00:00:02.147483647 | 1.0     |
+-------------------------------+---------+
```

#### to\_pandas(fts=None)

Evaluates this node to a [`pandas.DataFrame`](https://pandas.pydata.org/pandas-docs/stable/reference/api/pandas.DataFrame.html#pandas.DataFrame).

This is useful for loading raw or transformed time series data into a [`pandas.DataFrame`](https://pandas.pydata.org/pandas-docs/stable/reference/api/pandas.DataFrame.html#pandas.DataFrame)
and performing transformations using operations provided by [`pandas.DataFrame`](https://pandas.pydata.org/pandas-docs/stable/reference/api/pandas.DataFrame.html#pandas.DataFrame).

* **Parameters:**
  **fts** ([*foundryts.FoundryTS*](/docs/foundry/foundryts/foundryts/#foundryts.FoundryTS) *,* *optional*) – FoundryTS session used to execute the query (a new session will be created if not provided).
* **Returns:**
  Output of the node evaluated to a Pandas dataframe.
* **Return type:**
  pd.DataFrame

## Examples

```pycon
>>> series = F.points(
...     (100, 0.0), (200, float("inf")), (300, 3.14159), (2147483647, 1.0), name="series"
... )
>>> series.to_pandas()
                    timestamp    value
0 1970-01-01 00:00:00.000000100  0.00000
1 1970-01-01 00:00:00.000000200      inf
2 1970-01-01 00:00:00.000000300  3.14159
3 1970-01-01 00:00:02.147483647  1.00000
```

#### types()

Returns a tuple of types for the column of the [`pandas.DataFrame`](https://pandas.pydata.org/pandas-docs/stable/reference/api/pandas.DataFrame.html#pandas.DataFrame)
that would be produced by evaluating this node to a pandas dataframe.

* **Returns:**
  Tuple containing types of the columns in the resulting dataframe which the current node gets evaluated to.
* **Return type:**
  Tuple\[Type]

## Examples

```pycon
>>> node = foundryts.functions.points()
>>> node.types()
(<class 'int'>, <class 'float'>)
>>> stats_node = node.statistics(start=0, end=100, window_size=None)
>>> stats_node.types()
(<class 'int'>, <class 'pandas._libs.tslibs.timestamps.Timestamp'>, <class 'float'>,
<class 'pandas._libs.tslibs.timestamps.Timestamp'>, <class 'pandas._libs.tslibs.timestamps.Timestamp'>,
<class 'float'>, <class 'pandas._libs.tslibs.timestamps.Timestamp'>, <class 'float'>, <class 'float'>,
<class 'pandas._libs.tslibs.timestamps.Timestamp'>, <class 'float'>,
<class 'pandas._libs.tslibs.timestamps.Timestamp'>)
```

#### udf(func, columns=None, types=None)

See [`foundryts.functions.udf()`](/docs/foundry/foundryts/functions-udf/#foundryts.functions.udf)

#### unit\_conversion(from\_unit, to\_unit)

See [`foundryts.functions.unit_conversion()`](/docs/foundry/foundryts/functions-unit-conversion/#foundryts.functions.unit_conversion)

#### value\_shift(delta)

See [`foundryts.functions.value_shift()`](/docs/foundry/foundryts/functions-value-shift/#foundryts.functions.value_shift)

#### where(true=None, false=None)

See [`foundryts.functions.where()`](/docs/foundry/foundryts/functions-where/#foundryts.functions.where)
