---
sourceUrl: "https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-transformoutput/"
canonicalUrl: "https://palantir.com/docs/foundry/api-reference/transforms-python-library/api-transformoutput/"
sourceLastmod: "2026-05-12T17:06:26.167Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "e1ac0d17e5fdda80f32ed8e0c68b0ee054ecdc9ad10aa94bbaf03fd402237bd5"
product: "foundry"
docsArea: "api-reference"
locale: "en"
upstreamTitle: "Documentation | transforms.api > TransformOutput"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# transforms.api.TransformOutput

## *class* transforms.api.TransformOutput(rid, branch, txrid, dfreader, dfwriter, fsbuilder, mode='replace') {#transforms.api.TransformOutput}

The output object passed into [`Transform`](/docs/foundry/api-reference/transforms-python-library/api-transform/#transforms.api.Transform) objects at runtime.

### abort() {#transforms.api.TransformOutput.abort}

Aborts all work on this output. Any work done on writers from this output before or after calling this method will be ignored.

### *property* batch\_incremental\_configuration {#transforms.api.TransformOutput.batch\_incremental\_configuration}

The configuration for an incremental input that will be read in batches.

* **Type:**
  `BatchIncrementalConfiguration`

### *property* branch {#transforms.api.TransformOutput.branch}

The branch of the dataset.

* **Type:**
  [str ↗](https://docs.python.org/3/library/stdtypes.html#str)

### *property* column\_descriptions {#transforms.api.TransformOutput.column\_descriptions}

The column descriptions of the dataset.

* **Type:**
  `Dict[str, str]`

### *property* column\_typeclasses {#transforms.api.TransformOutput.column\_typeclasses}

The column typeclasses of the dataset.

* **Type:**
  `Dict[str, str]`

### dataframe() {#transforms.api.TransformOutput.dataframe}

Return a [`pyspark.sql.DataFrame` ↗](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.html#pyspark.sql.DataFrame) containing the full view of the dataset.

* **Returns:**
  The DataFrame for the dataset.
* **Return type:**
  [`pyspark.sql.DataFrame` ↗](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.html#pyspark.sql.DataFrame)

### *property* end\_transaction\_rid {#transforms.api.TransformOutput.end\_transaction\_rid}

The ending transaction of the input dataset.

* **Type:**
  [str ↗](https://docs.python.org/3/library/stdtypes.html#str)

### filesystem() {#transforms.api.TransformOutput.filesystem}

Construct a FileSystem object for writing to FoundryFS.

* **Returns:**
  A FileSystem object for writing to Foundry.
* **Return type:**
  [FileSystem](/docs/foundry/api-reference/transforms-python-library/api-filesystem/#transforms.api.FileSystem)

### *classmethod* from\_transform\_output(instance, delegate) {#transforms.api.TransformOutput.from\_transform\_output}

Sets fields in a TransformOutput instance to the values from the delegate TransformOutput.

### pandas() {#transforms.api.TransformOutput.pandas}

[`pandas.DataFrame` ↗](https://pandas.pydata.org/pandas-docs/stable/reference/api/pandas.DataFrame.html#pandas.DataFrame): A Pandas dataframe containing the full view of the dataset.

### *property* path {#transforms.api.TransformOutput.path}

The Compass path of the dataset.

* **Type:**
  [str ↗](https://docs.python.org/3/library/stdtypes.html#str)

### *property* rid {#transforms.api.TransformOutput.rid}

The resource identifier of the dataset.

* **Type:**
  [str ↗](https://docs.python.org/3/library/stdtypes.html#str)

### set\_mode(mode) {#transforms.api.TransformOutput.set\_mode}

Change the write mode of the dataset.

* **Parameters:**
  **mode** ([*str* ↗](https://docs.python.org/3/library/stdtypes.html#str)) – The write mode, one of replace, modify, or append. In modify mode, anything written is appended to the dataset. In replace mode, anything written replaces the dataset. In append mode, anything written is appended to the dataset and will not override existing files.

:::callout{theme="neutral"}
The write mode cannot be changed after data has been written.
:::

#### History

* Added in version 1.61.0.

### *property* start\_transaction\_rid {#transforms.api.TransformOutput.start\_transaction\_rid}

The starting transaction of the input dataset.

* **Type:**
  [str ↗](https://docs.python.org/3/library/stdtypes.html#str)

### write\_dataframe(df, partition\_cols=None, bucket\_cols=None, bucket\_count=None, sort\_by=None, output\_format=None, options=None, column\_descriptions=None, column\_typeclasses=None) {#transforms.api.TransformOutput.write\_dataframe}

Write the given [`DataFrame` ↗](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.html#pyspark.sql.DataFrame) to the dataset.

* **Parameters:**
  * **df** ([*pyspark.sql.DataFrame* ↗](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.html#pyspark.sql.DataFrame)) – The PySpark DataFrame to write.
  * **partition\_cols** (*List* *\[*[*str* ↗](https://docs.python.org/3/library/stdtypes.html#str) *]* *,* *optional*) – Column partitioning to use when writing data.
  * **bucket\_cols** (*List* *\[*[*str* ↗](https://docs.python.org/3/library/stdtypes.html#str) *]* *,* *optional*) – The columns by which to bucket the data. Must be specified if `bucket_count` is given.
  * **bucket\_count** ([*int* ↗](https://docs.python.org/3/library/functions.html#int) *,* *optional*) – The number of buckets. Must be specified if `bucket_cols` is given.
  * **sort\_by** (*List* *\[*[*str* ↗](https://docs.python.org/3/library/stdtypes.html#str) *]* *,* *optional*) – The columns by which to sort the bucketed data.
  * **output\_format** ([*str* ↗](https://docs.python.org/3/library/stdtypes.html#str) *,* *optional*) – The output file format, defaults to `parquet`.
  * **options** ([*dict* ↗](https://docs.python.org/3/library/stdtypes.html#dict) *,* *optional*) – Extra options to pass through to `org.apache.spark.sql.DataFrameWriter#option(String, String)`.
  * **column\_descriptions** (*Dict* *\[*[*str* ↗](https://docs.python.org/3/library/stdtypes.html#str) *,* [*str* ↗](https://docs.python.org/3/library/stdtypes.html#str) *]* *,* *optional*) – Map of column names to their string descriptions. This map is intersected with the columns of the DataFrame, and must include descriptions no longer than 800 characters.
  * **column\_typeclasses** (*Dict* *\[*[*str* ↗](https://docs.python.org/3/library/stdtypes.html#str) *,* *List* \*\[\**Dict* *\[*[*str* ↗](https://docs.python.org/3/library/stdtypes.html#str) *,* [*str* ↗](https://docs.python.org/3/library/stdtypes.html#str) *]* *]* *]* *,* *optional*) – Map of column names to their column typeclasses. Each typeclass in the List is a `Dict[str, str]`, where only two keys are valid; `name` and `kind`. Each maps to the corresponding string the user wants, up to a maximum of 100 characters. An example `column_typeclasses` value would be `{"my_column": [{"name": "my_typeclass_name", "kind": "my_typeclass_kind"}]}`.

### write\_pandas(pandas\_df) {#transforms.api.TransformOutput.write\_pandas}

Write the given [`pandas.DataFrame` ↗](https://pandas.pydata.org/pandas-docs/stable/reference/api/pandas.DataFrame.html#pandas.DataFrame) to the dataset.

* **Parameters:**
  **pandas\_df** ([*pandas.DataFrame* ↗](https://pandas.pydata.org/pandas-docs/stable/reference/api/pandas.DataFrame.html#pandas.DataFrame)) – The DataFrame to write.
