---
sourceUrl: "https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-transform-pandas/"
canonicalUrl: "https://palantir.com/docs/foundry/api-reference/transforms-python-library/api-transform-pandas/"
sourceLastmod: "2026-05-12T17:06:26.167Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "32b0cfa465b56e34f16e1f378a60664be3120354cdd602a6bd96352d65da8340"
product: "foundry"
docsArea: "api-reference"
locale: "en"
upstreamTitle: "Documentation | transforms.api > transform_pandas"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# transforms.api.transform\_pandas

## transforms.api.transform\_pandas(output, \*\*inputs) {#transforms.api.transform\_pandas}

Register the wrapped compute function as a pandas transform.

:::callout{theme="neutral"}
To use the pandas library, you must add `pandas` as a **run** dependency in your `meta.yml` file. For more information, refer to the [documentation ↗](/docs/foundry/transforms-python/project-structure/#metayaml).
:::

The `transform_pandas` decorator is used to construct a [`Transform`](/docs/foundry/api-reference/transforms-python-library/api-transform/#transforms.api.Transform) object from a compute function that accepts and returns [`pandas.DataFrame` ↗](https://pandas.pydata.org/pandas-docs/stable/reference/api/pandas.DataFrame.html#pandas.DataFrame) objects. This decorator is similar to the [`transform_df()`](/docs/foundry/api-reference/transforms-python-library/api-transform-df/#transforms.api.transform_df) decorator, however the [`pyspark.sql.DataFrame` ↗](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.html#pyspark.sql.DataFrame) objects are converted to [`pandas.DataFrame` ↗](https://pandas.pydata.org/pandas-docs/stable/reference/api/pandas.DataFrame.html#pandas.DataFrame) object before the computation, and converted back afterwards.

```python
>>> @transform_pandas(
...     Output('/path/to/output/dataset'),  # An unnamed Output spec
...     first_input=Input('/path/to/first/input/dataset'),
...     second_input=Input('/path/to/second/input/dataset'),
... )
... def my_compute_function(first_input, second_input):
...     # type: (pandas.DataFrame, pandas.DataFrame) -> pandas.DataFrame
...     return first_input.concat(second_input)
```

Note that `transform_pandas` should only be used on datasets that can fit into memory. If you have larger datasets that you wish to filter down before converting to pandas you should write your transformation using the [`transform_df()`](/docs/foundry/api-reference/transforms-python-library/api-transform-df/#transforms.api.transform_df) decorator and the [`pyspark.sql.SparkSession.createDataFrame()` ↗](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.SparkSession.createDataFrame.html#pyspark.sql.SparkSession.createDataFrame) method.

```python
>>> @transform_df(
...     Output('/path/to/output/dataset'),  # An unnamed Output spec
...     first_input=Input('/path/to/first/input/dataset'),
...     second_input=Input('/path/to/second/input/dataset'),
... )
... def my_compute_function(ctx, first_input, second_input):
...     # type: (pyspark.sql.DataFrame, pyspark.sql.DataFrame) -> pyspark.sql.DataFrame
...     pd = first_input.filter(first_input.county == 'UK').toPandas()
...     # Perform pandas operations on a subset of the data before converting back to a PySpark DataFrame
...     return ctx.spark_session.createDataFrame(pd)
```

* **Parameters:**
  * **output** ([*Output*](/docs/foundry/api-reference/transforms-python-library/api-output/#transforms.api.Output)) – The single [`Output`](/docs/foundry/api-reference/transforms-python-library/api-output/#transforms.api.Output) spec for the transform.
  * **\*\*inputs** ([*Input*](/docs/foundry/api-reference/transforms-python-library/api-input/#transforms.api.Input)) – `kwargs` comprised of named [`Input`](/docs/foundry/api-reference/transforms-python-library/api-input/#transforms.api.Input) specs.
