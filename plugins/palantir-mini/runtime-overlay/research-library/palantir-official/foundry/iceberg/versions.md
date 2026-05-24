---
sourceUrl: "https://www.palantir.com/docs/foundry/iceberg/versions/"
canonicalUrl: "https://palantir.com/docs/foundry/iceberg/versions/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "c321cf6373ee3d366780253cd3de1190efaefa74b2f44c0426522e0aef6477c6"
product: "foundry"
docsArea: "iceberg"
locale: "en"
upstreamTitle: "Documentation | Iceberg storage architecture & settings > Format versions"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Iceberg format version support

The [Apache Iceberg table format specification ↗](https://iceberg.apache.org/spec/) is versioned, with each version extending the previous, though not all tools and clients may support the latest versions.

Foundry supports reading and writing Iceberg tables in format versions 2 and 3.

## Format version defaults

The format version used by default depends on whether [client-side Iceberg table encryption](/docs/foundry/iceberg/storage/#encryption-settings) is enabled.

Foundry defaults to v2 for tables where client-side encryption is disabled, due to limited client support for the v3 specification.

Foundry defaults to v3 for tables where client-side encryption is enabled, as [Iceberg table encryption ↗](https://iceberg.apache.org/docs/nightly/encryption/) is a v3 feature.

## Override format versions

You can optionally override the default format version by specifying the version explicitly using the `format-version` table property.

For example, you can run:

```python tab="PySpark transforms"
@transform.spark.using(
    output=TableOutput("/path/table_name"),
)
def compute(ctx: TransformContext, output: TableTransformOutput) -> None:

    df_custom = ctx.spark_session.createDataFrame([["Hello"], ["World"]], schema=["phrase"])

    df_custom.writeTo(output.identifier)\
    .using("iceberg") \
    .tableProperty("format-version", "3") \
    .createOrReplace()
```

```sql tab="SQL maintenance"
ALTER TABLE `ri.tables.main.table.00000002...`
SET TBLPROPERTIES ('format-version' = '3');
```

```python tab="External client (PyIceberg)" 
catalog.create_table(
    "path.table",
    schema=schema,
    properties={"format-version": "3"}
)
```

:::callout{theme="neutral"}
While you can upgrade tables from v2 to v3, you cannot downgrade v3 tables to v2.
:::
