---
sourceUrl: "https://www.palantir.com/docs/foundry/foundryts/nodes-summarizer-node/"
canonicalUrl: "https://palantir.com/docs/foundry/foundryts/nodes-summarizer-node/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "987e88638fb26aabe411cb0a53b49b70806ad91a97f33d18127eae90270584d9"
product: "foundry"
docsArea: "foundryts"
locale: "en"
upstreamTitle: "Documentation | API Reference > nodes.SummarizerNode"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# foundryts.nodes.SummarizerNode

## *class* foundryts.nodes.SummarizerNode(children)

Lazy query container for summarizing one or more [`FunctionNode`](/docs/foundry/foundryts/nodes-function-node/#foundryts.nodes.FunctionNode) to a final result.

A SummarizerNode is the final evaluated form of a raw or transformed time series and cannot be
transformed by FoundryTS any further. It is typical to evaluate a SummarizerNode to a dataframe
using either [`SummarizerNode.to_pandas()`](#foundryts.nodes.SummarizerNode.to_pandas) or [`SummarizerNode.to_dataframe()`](#foundryts.nodes.SummarizerNode.to_dataframe) and performing
transformations and analysis using the respective dataframe libraries.

## Examples

```pycon
>>> series = F.points(
...     (100, 0.0), (200, float("inf")), (300, 3.14159), (2147483647, 1.0), name="series"
... ) # FunctionNode
>>> series.to_pandas()
                    timestamp    value
0 1970-01-01 00:00:00.000000100  0.00000
1 1970-01-01 00:00:00.000000200      inf
2 1970-01-01 00:00:00.000000300  3.14159
3 1970-01-01 00:00:02.147483647  1.00000
```

```pycon
>>> dist_node = series.distribution() # SummarizerNode
>>> dist_node.to_pandas()
        delta  distribution_values.count  distribution_values.end  distribution_values.start      end end_timestamp  start               start_timestamp
0  0.314159                          1                 0.314159                   0.000000  3.14159    2262-01-01    0.0 1677-09-21 00:12:43.145225216
1  0.314159                          1                 1.256636                   0.942477  3.14159    2262-01-01    0.0 1677-09-21 00:12:43.145225216
2  0.314159                          1                 3.141590                   2.827431  3.14159    2262-01-01    0.0 1677-09-21 00:12:43.145225216
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
>>> node = foundryts.functions.series("series1")
>>> node.columns()
("timestamp", "value")
>>> stats_node = series.statistics(start=0, end=100, window_size=None)
>>> stats_node.columns()
("count", "smallest_point.timestamp", "start_timestamp", "latest_point.timestamp", "mean",
"earliest_point.timestamp", "largest_point.timestamp", "end_timestamp")
```

#### *property* series\_ids

All series identifiers used by this node and its child nodes.

#### to\_dataframe(fts=None)

Evaluates this node to a [`pyspark.sql.DataFrame`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.html#pyspark.sql.DataFrame).

PySpark DataFrames enable distributed data processing and parallelized transformations. They can be useful when
working with dataframes with a large number of rows, for example loading all the points in a raw series or the
result of a [`FunctionNode`](/docs/foundry/foundryts/nodes-function-node/#foundryts.nodes.FunctionNode), or evaluating the results of multiple [`SummarizerNode`](#foundryts.nodes.SummarizerNode) or
[`FunctionNode`](/docs/foundry/foundryts/nodes-function-node/#foundryts.nodes.FunctionNode) together.

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

#### to\_dict(fts=None)

Evaluates this node to a nested dictionary with the results of this node.

If the SummarizerNode returns multiple results, this method returns a list of dictionaries, with
each list item corresponding to a result.

* **Parameters:**
  **fts** ([*foundryts.FoundryTS*](/docs/foundry/foundryts/foundryts/#foundryts.FoundryTS) *,* *optional*) – FoundryTS session used to execute the query (a new session will be created if not provided).
* **Returns:**
  Output of the node evaluated to a dictionary or a list of dictionaries.
* **Return type:**
  Union\[Dict\[[str](https://docs.python.org/3/library/stdtypes.html#str), Any], List\[Dict\[[str](https://docs.python.org/3/library/stdtypes.html#str), Any]]]

## Examples

```pycon
>>> series = F.points(
...     (100, 0.0), (200, float("inf")), (300, 3.14159), (2147483647, 1.0), name="series"
... ) # FunctionNode
>>> series.to_pandas()
                    timestamp    value
0 1970-01-01 00:00:00.000000100  0.00000
1 1970-01-01 00:00:00.000000200      inf
2 1970-01-01 00:00:00.000000300  3.14159
3 1970-01-01 00:00:02.147483647  1.00000
```

```pycon
>>> dist_node = series.distribution() # SummarizerNode
>>> dist_node.to_pandas()
{
    'start_timestamp': Timestamp('1677-09-21 00:12:43.145225216'),
    'end_timestamp': Timestamp('2262-01-01 00:00:00'),
    'start': 0.0,
    'end': 3.1415900000000003,
    'delta': 0.314159,
    'distribution_values': [
        {
            'start': 0.0,
            'end': 0.314159,
            'count': 1
        },
        {
            'start': 0.942477,
            'end': 1.256636,
            'count': 1
        },
        {
            'start': 2.8274310000000002,
            'end': 3.1415900000000003,
            'count': 1
        }
    ]
}
```

#### to\_object(fts=None)

Evaluates this node to a Python object with the results of this node.

If the SummarizerNode returns multiple results, this method returns a list of objects, with
each list item corresponding to a result.

* **Parameters:**
  **fts** ([*foundryts.FoundryTS*](/docs/foundry/foundryts/foundryts/#foundryts.FoundryTS) *,* *optional*) – FoundryTS sessions used to execute the query (a new session will be created if not provided).
* **Returns:**
  Output of the node evaluated to a Python object or list of objects.
* **Return type:**
  Union\[Any, List\[Any]]

## Examples

```pycon
>>> series = F.points(
...     (100, 0.0), (200, float("inf")), (300, 3.14159), (2147483647, 1.0), name="series"
... ) # FunctionNode
>>> series.to_pandas()
                    timestamp    value
0 1970-01-01 00:00:00.000000100  0.00000
1 1970-01-01 00:00:00.000000200      inf
2 1970-01-01 00:00:00.000000300  3.14159
3 1970-01-01 00:00:02.147483647  1.00000
```

```pycon
>>> dist_node = series.distribution() # SummarizerNode
>>> dist_node.to_object()
_CuratedDistribution(start_timestamp=Timestamp(epoch_seconds=-9223372037, offset_nanos=145224193),
    end_timestamp=Timestamp(epoch_seconds=9214646400, offset_nanos=0), start=0.0, end=3.1415900000000003,
    delta=0.314159, distribution_values=[
        DistributionDataPoint(start=0.0, end=0.314159, count=1),
        DistributionDataPoint(start=0.942477, end=1.256636, count=1),
        DistributionDataPoint(start=2.8274310000000002, end=3.1415900000000003, count=1)
    ]
)
```

#### to\_pandas(fts=None)

Evaluates this node to a [`pandas.DataFrame`](https://pandas.pydata.org/pandas-docs/stable/reference/api/pandas.DataFrame.html#pandas.DataFrame).

The DataFrame result of a SummarizerNode will be the flattened into a
[`pandas.DataFrame`](https://pandas.pydata.org/pandas-docs/stable/reference/api/pandas.DataFrame.html#pandas.DataFrame) with a single row (or one row per element if the summarizer returns multiple
results) and one column per leaf level value in the resulting object. Nested keys will be dot-separated.

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
... ) # FunctionNode
>>> series.to_pandas()
                    timestamp    value
0 1970-01-01 00:00:00.000000100  0.00000
1 1970-01-01 00:00:00.000000200      inf
2 1970-01-01 00:00:00.000000300  3.14159
3 1970-01-01 00:00:02.147483647  1.00000
```

```pycon
>>> dist_node = series.distribution() # SummarizerNode
>>> dist_node.to_pandas()
      delta  distribution_values.count  distribution_values.end  distribution_values.start      end end_timestamp  start               start_timestamp
0  0.314159                          1                 0.314159                   0.000000  3.14159    2262-01-01    0.0 1677-09-21 00:12:43.145225216
1  0.314159                          1                 1.256636                   0.942477  3.14159    2262-01-01    0.0 1677-09-21 00:12:43.145225216
2  0.314159                          1                 3.141590                   2.827431  3.14159    2262-01-01    0.0 1677-09-21 00:12:43.145225216
```

#### types()

Returns a tuple of types for the columns of the [`pandas.DataFrame`](https://pandas.pydata.org/pandas-docs/stable/reference/api/pandas.DataFrame.html#pandas.DataFrame)
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
>>> stats_node = foundryts.functions.series("series1").statistics(start=0, end=100, window_size=None)
>>> stats_node.types()
(<class 'int'>, <class 'pandas._libs.tslibs.timestamps.Timestamp'>, <class 'float'>, <class 'pandas._libs.tslibs.timestamps.Timestamp'>, <class 'pandas._libs.tslibs.timestamps.Timestamp'>, <class 'float'>, <class 'pandas._libs.tslibs.timestamps.Timestamp'>, <class 'float'>, <class 'float'>, <class 'pandas._libs.tslibs.timestamps.Timestamp'>, <class 'float'>, <class 'pandas._libs.tslibs.timestamps.Timestamp'>)
```
