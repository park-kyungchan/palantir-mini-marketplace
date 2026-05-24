---
sourceUrl: "https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-transform-df/"
canonicalUrl: "https://palantir.com/docs/foundry/api-reference/transforms-python-library/api-transform-df/"
sourceLastmod: "2026-05-12T17:06:26.167Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "59d054eaa10a0238c165c92541e29f1b867d1dc5f507de4edc266c2d003009af"
product: "foundry"
docsArea: "api-reference"
locale: "en"
upstreamTitle: "Documentation | transforms.api > transform_df"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# transforms.api.transform\_df

## transforms.api.transform\_df(output, \*\*inputs) {#transforms.api.transform\_df}

Register the wrapped compute function as a DataFrame transform.

The `transform_df` decorator is used to construct a [`Transform`](/docs/foundry/api-reference/transforms-python-library/api-transform/#transforms.api.Transform) object from a compute function that accepts and returns [`pyspark.sql.DataFrame` ↗](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.html#pyspark.sql.DataFrame) objects. Similar to the [`transform()`](/docs/foundry/api-reference/transforms-python-library/api-transform/#transforms.api.transform) decorator, the input names become the compute function’s parameter names. However, a `transform_df` accepts only a single [`Output`](/docs/foundry/api-reference/transforms-python-library/api-output/#transforms.api.Output) spec as a positional argument. The return value of the compute function is also a [`DataFrame` ↗](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.html#pyspark.sql.DataFrame) that is automatically written out to the single output dataset.

```python
>>> @transform_df(
...     Output('/path/to/output/dataset'),  # An unnamed Output spec
...     first_input=Input('/path/to/first/input/dataset'),
...     second_input=Input('/path/to/second/input/dataset'),
... )
... def my_compute_function(first_input, second_input):
...     # type: (pyspark.sql.DataFrame, pyspark.sql.DataFrame) -> pyspark.sql.DataFrame
...     return first_input.union(second_input)
```

* **Parameters:**
  * **output** ([*Output*](/docs/foundry/api-reference/transforms-python-library/api-output/#transforms.api.Output)) – The single [`Output`](/docs/foundry/api-reference/transforms-python-library/api-output/#transforms.api.Output) spec for the transform.
  * **\*\*inputs** ([*Input*](/docs/foundry/api-reference/transforms-python-library/api-input/#transforms.api.Input)) – `kwargs` comprised of named [`Input`](/docs/foundry/api-reference/transforms-python-library/api-input/#transforms.api.Input) specs.
