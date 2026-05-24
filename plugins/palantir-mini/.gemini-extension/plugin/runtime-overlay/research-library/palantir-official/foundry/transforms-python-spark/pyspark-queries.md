---
sourceUrl: "https://www.palantir.com/docs/foundry/transforms-python-spark/pyspark-queries/"
canonicalUrl: "https://palantir.com/docs/foundry/transforms-python-spark/pyspark-queries/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d2fd4f69ce3452db455a70db503ed5e76a61681176fb533a1079fae46f00f5e4"
product: "foundry"
docsArea: "transforms-python-spark"
locale: "en"
upstreamTitle: "Documentation | PySpark reference > Concept: Queries"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Concept: Queries

### Distinct, drop duplicates

#### `DataFrame.distinct()`

Returns a new `DataFrame` containing the distinct rows in the originating `DataFrame`.

```python
df = df.distinct()
```

#### `DataFrame.drop_duplicates(subset=None)`

Returns a new `DataFrame` with duplicate rows removed, optionally only considering certain columns.

```python
df = df.drop_duplicates()
df = df.drop_duplicates(["firstname", "lastname"])
```

### Drop null values

#### `DataFrame.dropna(how='any', thresh=None, subset=None)`

Alias: `DataFrame.na.dropna(how='any', thresh=None, subset=None)`

Returns a new `DataFrame` omitting rows with null values.`DataFrame.dropna()` and `DataFrameNaFunctions.drop()` are aliases of each other.

Parameters:

* **how** – `'any'` or `'all'`.
  * If  `'any'`, drop a row if it contains any nulls.
  * If `'all'`, drop a row only if all its values are null.
* **thresh** – integer, default `None`. If specified, drop rows that have less than thresh non-null values. (This overwrites the how parameter).
* **subset** – optional list of column names to consider.

### Limit rows

#### `DataFrame.limit(number)`

### Sorting

#### `DataFrame.sort(*cols, **kwargs)`

Alias: `DataFrame.orderBy(*cols, **kwargs)`

* `Column.asc()` or `F.asc(col)`
* `Column.desc()` or `F.desc(col)`
