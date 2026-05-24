---
sourceUrl: "https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-incrementallightweightinput/"
canonicalUrl: "https://palantir.com/docs/foundry/api-reference/transforms-python-library/api-incrementallightweightinput/"
sourceLastmod: "2026-05-12T17:06:26.167Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "01a1044a2a18f2a7fbdc26cf904a7e086f177918b124150bb13ba4c94a9d31ea"
product: "foundry"
docsArea: "api-reference"
locale: "en"
upstreamTitle: "Documentation | transforms.api > IncrementalLightweightInput"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# transforms.api.IncrementalLightweightInput

## *class* transforms.api.IncrementalLightweightInput(alias, rid, branch=None) {#transforms.api.IncrementalLightweightInput}

The input object passed into incremental [`ContainerTransform`](/docs/foundry/api-reference/transforms-python-library/api-containertransform/#transforms.api.ContainerTransform) objects at runtime.

Its aim is to mimic a subset of the [`transforms.api.IncrementalTransformInput`](/docs/foundry/api-reference/transforms-python-library/api-incrementaltransforminput/#transforms.api.IncrementalTransformInput) API, while providing access to the underlying `foundry.transforms.Dataset`.

### *property* alias {#transforms.api.IncrementalLightweightInput.alias}

The alias of the dataset this parameter is associated with.

### arrow(mode='added') {#transforms.api.IncrementalLightweightInput.arrow}

A PyArrow table containing the full view of the dataset.

* **Parameters:**
  **mode** ([*str* ↗](https://docs.python.org/3/library/stdtypes.html#str)) – The read mode, one of `current`, `previous`, or `added`.  Defaults to `added`.

### *property* branch {#transforms.api.IncrementalLightweightInput.branch}

The branch of the dataset this parameter is associated with.

### dataframe(mode='added') {#transforms.api.IncrementalLightweightInput.dataframe}

A pandas DataFrame containing the full view of the dataset.

* **Parameters:**
  **mode** ([*str* ↗](https://docs.python.org/3/library/stdtypes.html#str)) – The read mode, one of `current`, `previous`, or `added`.  Defaults to `added`.

### *property* end\_transaction\_rid {#transforms.api.IncrementalLightweightInput.end\_transaction\_rid}

The ending transaction of the input dataset.

* **Type:**
  [str ↗](https://docs.python.org/3/library/stdtypes.html#str)

### filesystem(mode='added') {#transforms.api.IncrementalLightweightInput.filesystem}

Access the filesystem in read-only mode.

Construct a [`FoundryDataSidecarFileSystem`](/docs/foundry/api-reference/transforms-python-library/api-foundrydatasidecarfilesystem/#transforms.api.FoundryDataSidecarFileSystem) object for accessing the dataset’s files directly.

* **Parameters:**
  **mode** ([*str* ↗](https://docs.python.org/3/library/stdtypes.html#str)) – The read mode, one of `current`, `previous`, or `added`.  Defaults to `added`.

### pandas(mode='added') {#transforms.api.IncrementalLightweightInput.pandas}

A pandas DataFrame containing the full view of the dataset.

* **Parameters:**
  **mode** ([*str* ↗](https://docs.python.org/3/library/stdtypes.html#str)) – The read mode, one of `current`, `previous`, or `added`.  Defaults to `added`.

### path(mode='added') {#transforms.api.IncrementalLightweightInput.path}

Download the dataset’s underlying files and return a path to them.

* **Parameters:**
  **mode** ([*str* ↗](https://docs.python.org/3/library/stdtypes.html#str)) – The read mode, one of `current`, `previous`, or `added`.  Defaults to `added`. This argument is only applicable when `@incremental` is added and `v2_semantics` is `True`.

### polars(lazy=False, mode='added') {#transforms.api.IncrementalLightweightInput.polars}

A Polars DataFrame or LazyFrame containing the full view of the dataset.

* **Parameters:**
  * **lazy** ([*bool* ↗](https://docs.python.org/3/library/functions.html#bool) *,* *optional*) – Whether to return a LazyFrame or a DataFrame. Defaults to `False`.
  * **mode** ([*str* ↗](https://docs.python.org/3/library/stdtypes.html#str)) – The read mode, one of `current`, `previous`, or `added`.  Defaults to `added`.

### *property* rid {#transforms.api.IncrementalLightweightInput.rid}

The unique resource identifier of the dataset this parameter is associated with.

### *property* start\_transaction\_rid {#transforms.api.IncrementalLightweightInput.start\_transaction\_rid}

The starting transaction of the input dataset.

* **Type:**
  [str ↗](https://docs.python.org/3/library/stdtypes.html#str)
