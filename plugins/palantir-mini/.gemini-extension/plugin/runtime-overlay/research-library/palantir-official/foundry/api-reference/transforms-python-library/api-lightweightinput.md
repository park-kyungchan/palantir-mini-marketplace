---
sourceUrl: "https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-lightweightinput/"
canonicalUrl: "https://palantir.com/docs/foundry/api-reference/transforms-python-library/api-lightweightinput/"
sourceLastmod: "2026-05-12T17:06:26.167Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "2dcfb31bb4c193d753f625a3e0ace712fa5d6010eb4c3f8f43292f01810f9285"
product: "foundry"
docsArea: "api-reference"
locale: "en"
upstreamTitle: "Documentation | transforms.api > LightweightInput"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# transforms.api.LightweightInput

## *class* transforms.api.LightweightInput(alias, rid, branch=None) {#transforms.api.LightweightInput}

The input object passed into [`ContainerTransform`](/docs/foundry/api-reference/transforms-python-library/api-containertransform/#transforms.api.ContainerTransform) objects at runtime.

Its aim is to mimic a subset of the [`transforms.api.TransformInput`](/docs/foundry/api-reference/transforms-python-library/api-transforminput/#transforms.api.TransformInput) API, while providing access to the underlying `foundry.transforms.Dataset`.

### *property* alias {#transforms.api.LightweightInput.alias}

The alias of the dataset this parameter is associated with.

### arrow() {#transforms.api.LightweightInput.arrow}

A PyArrow table containing the full view of the dataset.

### *property* branch {#transforms.api.LightweightInput.branch}

The branch of the dataset this parameter is associated with.

### dataframe() {#transforms.api.LightweightInput.dataframe}

A pandas DataFrame containing the full view of the dataset.

### *property* end\_transaction\_rid {#transforms.api.LightweightInput.end\_transaction\_rid}

The ending transaction of the input dataset.

* **Type:**
  [str ↗](https://docs.python.org/3/library/stdtypes.html#str)

### filesystem() {#transforms.api.LightweightInput.filesystem}

Access the filesystem in read-only mode.

Construct a [`FoundryDataSidecarFileSystem`](/docs/foundry/api-reference/transforms-python-library/api-foundrydatasidecarfilesystem/#transforms.api.FoundryDataSidecarFileSystem) object for accessing the dataset’s files directly.

### pandas() {#transforms.api.LightweightInput.pandas}

A pandas DataFrame containing the full view of the dataset.

### path() {#transforms.api.LightweightInput.path}

Download the dataset’s underlying files and return a path to them.

### polars(lazy=False) {#transforms.api.LightweightInput.polars}

A Polars DataFrame or LazyFrame containing the full view of the dataset.

* **Parameters:**
  **lazy** ([*bool* ↗](https://docs.python.org/3/library/functions.html#bool) *,* *optional*) – Whether to return a LazyFrame or DataFrame. Defaults to `False`.

### *property* rid {#transforms.api.LightweightInput.rid}

The unique resource identifier of the dataset this parameter is associated with.

### *property* start\_transaction\_rid {#transforms.api.LightweightInput.start\_transaction\_rid}

The starting transaction of the input dataset.

* **Type:**
  [str ↗](https://docs.python.org/3/library/stdtypes.html#str)
