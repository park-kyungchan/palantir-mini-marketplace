---
sourceUrl: "https://www.palantir.com/docs/foundry/transforms-python-spark/pyspark-other/"
canonicalUrl: "https://palantir.com/docs/foundry/transforms-python-spark/pyspark-other/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "1a653490345e4ce5c2fae0a7bded936841771d089618ebec7e2cff73ecc3553f"
product: "foundry"
docsArea: "transforms-python-spark"
locale: "en"
upstreamTitle: "Documentation | PySpark reference > Other"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Other

## Collections

* `array(*cols)`
* `array_contains(col, value)`
* `size(col)`
* `sort_array(col, asc=True)`
* `struct(*cols)`

## Sorting

* `asc(col)`
* `desc(col)`

## Binary

* `bitwiseNOT(col)`
* `shiftLeft(col, numBits)`
* `shiftRight(col, numBits)`
* `shiftRightUnsigned(col, numBits)`

## Dealing with null values

* `coalesce(*cols)`
* `isnan(col)`
* `isnull(col)`

## Columns

* `col(col) or column(col)`
* `create_map(*cols)`
* `explode(col)`
* `expr(str)`
* `hash(*cols)`
* `input_file_name()`
* `posexplode(col)`
* `sha1(col)`
* `sha2(col, numBits)`
* `soundex(col)`
* `spark_partition_id()`

## JSON

* `from_json(col, schema, options={})`
* `get_json_object(col, path)`
* `json_tuple(col, *fields)`
* `to_json(col, options={})`

## Checkpoints

* `checkpoint(eager=True)`
* `localCheckpoint(eager=True)`

:::callout{theme="neutral"}
The `checkpoint()` function is used to temporarily store a DataFrame on disk, whereas `localCheckpoint()` stores them in executor memory. Use the `eager` parameter value to set whether or not the DataFrame is checkpointed immediately (default value is `True`).
:::
