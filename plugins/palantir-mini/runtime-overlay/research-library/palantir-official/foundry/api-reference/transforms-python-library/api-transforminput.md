---
sourceUrl: "https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-transforminput/"
canonicalUrl: "https://palantir.com/docs/foundry/api-reference/transforms-python-library/api-transforminput/"
sourceLastmod: "2026-05-12T17:06:26.167Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "8ef2407bf24ddf65cf6f45c6babbcdee1009d15582168eeac5998510a243b918"
product: "foundry"
docsArea: "api-reference"
locale: "en"
upstreamTitle: "Documentation | transforms.api > TransformInput"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# transforms.api.TransformInput

## *class* transforms.api.TransformInput(rid, branch, txrange, dfreader, fsbuilder, batch\_incremental\_config=None) {#transforms.api.TransformInput}

The input object passed into [`Transform`](/docs/foundry/api-reference/transforms-python-library/api-transform/#transforms.api.Transform) objects at runtime.

### *property* batch\_incremental\_configuration {#transforms.api.TransformInput.batch\_incremental\_configuration}

The configuration for an incremental input that will be read in batches.

* **Type:**
  `BatchIncrementalConfiguration`

### *property* branch {#transforms.api.TransformInput.branch}

The branch of the dataset.

* **Type:**
  [str ↗](https://docs.python.org/3/library/stdtypes.html#str)

### *property* column\_descriptions {#transforms.api.TransformInput.column\_descriptions}

The column descriptions of the dataset.

* **Type:**
  `Dict[str, str]`

### *property* column\_typeclasses {#transforms.api.TransformInput.column\_typeclasses}

The column typeclasses of the dataset.

* **Type:**
  `Dict[str, str]`

### dataframe() {#transforms.api.TransformInput.dataframe}

Return a [`pyspark.sql.DataFrame` ↗](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.html#pyspark.sql.DataFrame) containing the full view of the dataset.

* **Returns:**
  The DataFrame for the dataset.
* **Return type:**
  [`pyspark.sql.DataFrame` ↗](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.html#pyspark.sql.DataFrame)

### *property* end\_transaction\_rid {#transforms.api.TransformInput.end\_transaction\_rid}

The ending transaction of the input dataset.

* **Type:**
  [str ↗](https://docs.python.org/3/library/stdtypes.html#str)

### filesystem() {#transforms.api.TransformInput.filesystem}

Construct a FileSystem object for reading from FoundryFS.

* **Returns:**
  A FileSystem object for reading from Foundry.
* **Return type:**
  [transforms.api.FileSystem](/docs/foundry/api-reference/transforms-python-library/api-filesystem/#transforms.api.FileSystem)

### pandas() {#transforms.api.TransformInput.pandas}

[`pandas.DataFrame` ↗](https://pandas.pydata.org/pandas-docs/stable/reference/api/pandas.DataFrame.html#pandas.DataFrame): A Pandas dataframe containing the full view of the dataset.

### *property* path {#transforms.api.TransformInput.path}

The Compass path of the dataset.

* **Type:**
  [str ↗](https://docs.python.org/3/library/stdtypes.html#str)

### *property* rid {#transforms.api.TransformInput.rid}

The resource identifier of the dataset.

* **Type:**
  [str ↗](https://docs.python.org/3/library/stdtypes.html#str)

### *property* start\_transaction\_rid {#transforms.api.TransformInput.start\_transaction\_rid}

The starting transaction of the input dataset.

* **Type:**
  [str ↗](https://docs.python.org/3/library/stdtypes.html#str)
