---
sourceUrl: "https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-tabletransforminput/"
canonicalUrl: "https://palantir.com/docs/foundry/api-reference/transforms-python-library/api-tabletransforminput/"
sourceLastmod: "2026-05-12T17:06:26.167Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "fb16f72a78ac6966d913979fb460bbd4cd6e8fcf127a8ee1192ce83e4ac9cc78"
product: "foundry"
docsArea: "api-reference"
locale: "en"
upstreamTitle: "Documentation | transforms.api > TableTransformInput"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# transforms.api.TableTransformInput

## *class* transforms.api.TableTransformInput(rid, branch, table\_dfreader) {#transforms.api.TableTransformInput}

The input object passed into transform objects at runtime for virtual table inputs. Mimics the [`TransformInput`](/docs/foundry/api-reference/transforms-python-library/api-transforminput/#transforms.api.TransformInput) API.

### *property* batch\_incremental\_configuration {#transforms.api.TableTransformInput.batch\_incremental\_configuration}

The configuration for an incremental input that will be read in batches.

* **Type:**
  `BatchIncrementalConfiguration`

### *property* branch {#transforms.api.TableTransformInput.branch}

The branch of the dataset.

* **Type:**
  [str ↗](https://docs.python.org/3/library/stdtypes.html#str)

### *property* catalog {#transforms.api.TableTransformInput.catalog}

Returns the name of the table’s Spark catalog, intended for use in Spark procedures, if supported by the underlying table type.

* **Returns:**
  The name of the table’s catalog.
* **Return type:**
  [str ↗](https://docs.python.org/3/library/stdtypes.html#str)
* **Raises:**
  [**ValueError** ↗](https://docs.python.org/3/library/exceptions.html#ValueError) – If the underlying table type does not expose a Spark catalog.

### *property* column\_descriptions {#transforms.api.TableTransformInput.column\_descriptions}

The column descriptions of the dataset.

* **Type:**
  `Dict[str, str]`

### *property* column\_typeclasses {#transforms.api.TableTransformInput.column\_typeclasses}

The column typeclasses of the dataset.

* **Type:**
  `Dict[str, str]`

### dataframe(options=None) {#transforms.api.TableTransformInput.dataframe}

Return a [`pyspark.sql.DataFrame` ↗](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.html#pyspark.sql.DataFrame) containing the full view of the table.

* **Parameters:**
  **options** ([*dict* ↗](https://docs.python.org/3/library/stdtypes.html#dict) *,* *option*) – Additional Spark read options to pass when reading the table.
* **Returns:**
  The DataFrame for the table.
* **Return type:**
  [pyspark.sql.DataFrame ↗](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.html#pyspark.sql.DataFrame)

### *property* end\_transaction\_rid {#transforms.api.TableTransformInput.end\_transaction\_rid}

The ending transaction of the input dataset.

* **Type:**
  [str ↗](https://docs.python.org/3/library/stdtypes.html#str)

### filesystem() {#transforms.api.TableTransformInput.filesystem}

Construct a FileSystem object for reading from FoundryFS.

* **Returns:**
  A FileSystem object for reading from Foundry.
* **Return type:**
  [transforms.api.FileSystem](/docs/foundry/api-reference/transforms-python-library/api-filesystem/#transforms.api.FileSystem)

### *property* identifier {#transforms.api.TableTransformInput.identifier}

Returns the fully-qualified, catalog-prefixed, Spark V2 identifier of the table, if supported by the underlying table type.

* **Returns:**
  The fully-qualified identifier of the table.
* **Return type:**
  [str ↗](https://docs.python.org/3/library/stdtypes.html#str)
* **Raises:**
  [**ValueError** ↗](https://docs.python.org/3/library/exceptions.html#ValueError) – If the underlying table type does not expose a Spark V2 identifier.

### pandas() {#transforms.api.TableTransformInput.pandas}

[`pandas.DataFrame` ↗](https://pandas.pydata.org/pandas-docs/stable/reference/api/pandas.DataFrame.html#pandas.DataFrame): A Pandas dataframe containing the full view of the dataset.

### *property* path {#transforms.api.TableTransformInput.path}

The Compass path of the dataset.

* **Type:**
  [str ↗](https://docs.python.org/3/library/stdtypes.html#str)

### *property* rid {#transforms.api.TableTransformInput.rid}

The resource identifier of the dataset.

* **Type:**
  [str ↗](https://docs.python.org/3/library/stdtypes.html#str)

### *property* start\_transaction\_rid {#transforms.api.TableTransformInput.start\_transaction\_rid}

The starting transaction of the input dataset.

* **Type:**
  [str ↗](https://docs.python.org/3/library/stdtypes.html#str)
