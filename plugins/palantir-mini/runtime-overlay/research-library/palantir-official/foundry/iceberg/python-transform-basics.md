---
sourceUrl: "https://www.palantir.com/docs/foundry/iceberg/python-transform-basics/"
canonicalUrl: "https://palantir.com/docs/foundry/iceberg/python-transform-basics/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "74ad6fbbe7149b667374219cb1c3e6fa7652e5b2fdd33ae2f35de22416f5e059"
product: "foundry"
docsArea: "iceberg"
locale: "en"
upstreamTitle: "Documentation | Iceberg tables > Python transform basics"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Python transform basics

Iceberg tables can be used as inputs and outputs in Python transforms using the `transforms.tables` API, which can be imported in the `transforms-tables` package.

This page provides code examples for the fundamentals of working with Iceberg table inputs and outputs in Python transforms.

## Example: Generate a simple Iceberg table

```python tab="Polars"
import polars as pl
from transforms.api import transform
from transforms.tables import TableLightweightOutput, TableOutput


@transform.using(
    output=TableOutput("/.../Output")
)
def compute(output: TableLightweightOutput):
    df_custom = pl.DataFrame({"phrase": ["Hello", "World"]})
    tbl_arrow = df_custom.to_arrow()
    output.iceberg().write(tbl_arrow)
```

```python tab="DuckDB"
from transforms.api import LightweightContext, transform
from transforms.tables import TableLightweightOutput, TableOutput


@transform.using(
    output=TableOutput("/.../Output")
)
def compute(ctx: LightweightContext, output: TableLightweightOutput):
    conn = ctx.duckdb().conn
    query = conn.sql("SELECT * FROM (VALUES ('Hello'), ('World')) AS t(phrase);")
    query_arrow = query.to_arrow_table()
    output.iceberg().write(query_arrow)
```

```python tab="pandas"
import pandas as pd
import pyarrow as pa
from transforms.api import transform
from transforms.tables import TableLightweightOutput, TableOutput


@transform.using(
    output=TableOutput("/.../Output")
)
def compute(output: TableLightweightOutput):
    df_custom = pd.DataFrame({"phrase": ["Hello", "World"]})
    tbl_arrow = pa.Table.from_pandas(df_custom)
    output.iceberg().write(tbl_arrow)

```

```python tab="PySpark"
from transforms.api import transform, TransformContext
from transforms.tables import TableOutput, TableTransformOutput


@transform(
    output=TableOutput("/.../Output")
)
def compute(ctx: TransformContext, output: TableTransformOutput):
    df_custom = ctx.spark_session.createDataFrame([["Hello"], ["World"]], schema=["phrase"])
    output.write_dataframe(df_custom)
```

## Example: Iceberg table output, Iceberg table input

```python tab="Polars"
import polars as pl
from transforms.api import transform
from transforms.tables import TableLightweightOutput, TableOutput, TableInput, TableLightweightInput


@transform.using(
    source_table=TableInput("/.../Input"),
    output_table=TableOutput("/.../Output")
)
def compute(source_table: TableLightweightInput, output_table: TableLightweightOutput):
    polars_df = source_table.iceberg().table().scan().to_polars()
    table_arrow = polars_df.to_arrow()
    output_table.iceberg().write(table_arrow)
```

```python tab="DuckDB"
from transforms.api import LightweightContext, transform
from transforms.tables import TableLightweightOutput, TableOutput, TableInput, TableLightweightInput


@transform.using(
    source_table=TableInput("/.../Input"),
    output_table=TableOutput("/.../Output")
)
def compute(ctx: LightweightContext, source_table: TableLightweightInput, output_table: TableLightweightOutput):
    conn = ctx.duckdb().conn
    reader = source_table.iceberg().table().scan().to_arrow_batch_reader()
    conn.register("source_tbl", reader)
    query = conn.sql("SELECT * FROM source_tbl")
    query_arrow = query.to_arrow_table()
    output_table.iceberg().write(query_arrow)
```

```python tab="pandas"
import pandas as pd
import pyarrow as pa
from transforms.api import transform
from transforms.tables import TableLightweightOutput, TableOutput, TableInput, TableLightweightInput


@transform.using(
    source_table=TableInput("/.../Input"),
    output_table=TableOutput("/.../Output")
)
def compute(source_table: TableLightweightInput, output_table: TableLightweightOutput):
    pandas_df = source_table.iceberg().table().scan().to_pandas()
    table_arrow = pa.Table.from_pandas(pandas_df)
    output_table.iceberg().write(table_arrow)
```

```python tab="PySpark"
from transforms.api import transform
from transforms.tables import TableInput, TableOutput, TableTransformInput, TableTransformOutput


@transform(
    source_table=TableInput("/.../Input"),
    output_table=TableOutput("/.../Output")
)
def compute(source_table: TableTransformInput, output_table: TableTransformOutput):
    output_table.write_dataframe(source_table.dataframe())
```

## Example: Iceberg table output, dataset input

```python tab="Polars"
import polars as pl
from transforms.api import transform, Input, LightweightInput
from transforms.tables import TableLightweightOutput, TableOutput


@transform.using(
    source_dataset=Input("/.../Input"),
    output_table=TableOutput("/.../Output")
)
def compute(source_dataset: LightweightInput, output_table: TableLightweightOutput):
    polars_df = source_dataset.polars()
    table_arrow = polars_df.to_arrow()
    output_table.iceberg().write(table_arrow)
```

```python tab="DuckDB"
from transforms.api import LightweightContext, transform, Input, LightweightInput
from transforms.tables import TableLightweightOutput, TableOutput


@transform.using(
    source_dataset=Input("/.../Input"),
    output_table=TableOutput("/.../Output")
)
def compute(ctx: LightweightContext, source_dataset: LightweightInput, output_table: TableLightweightOutput):
    conn = ctx.duckdb().conn
    query = conn.sql("SELECT * FROM source_dataset")
    query_arrow = query.to_arrow_table()
    output_table.iceberg().write(query_arrow)
```

```python tab="pandas"
import pandas as pd
import pyarrow as pa
from transforms.api import transform, Input, LightweightInput
from transforms.tables import TableLightweightOutput, TableOutput


@transform.using(
    source_dataset=Input("/.../Input"),
    output_table=TableOutput("/.../Output")
)
def compute(source_dataset: LightweightInput, output_table: TableLightweightOutput):
    pandas_df = source_dataset.pandas()
    table_arrow = pa.Table.from_pandas(pandas_df)
    output_table.iceberg().write(table_arrow)
```

```python tab="PySpark"
from transforms.api import transform, Input, TransformInput
from transforms.tables import TableOutput, TableTransformOutput


@transform(
    source_dataset=Input("/.../Input"),
    output_table=TableOutput("/.../Output")
)
def compute(source_dataset: TransformInput, output_table: TableTransformOutput):
    output_table.write_dataframe(source_dataset.dataframe())
```

## Example: Dataset output, Iceberg table input

```python tab="Polars"
import polars as pl
from transforms.api import transform, Output, LightweightOutput
from transforms.tables import TableLightweightInput, TableInput


@transform.using(
    source_table=TableInput("/.../Input"),
    output_dataset=Output("/.../Output")
)
def compute(source_table: TableLightweightInput, output_dataset: LightweightOutput):
    polars_df = source_table.iceberg().table().scan().to_polars()
    output_dataset.write_table(polars_df)
```

```python tab="DuckDB"
from transforms.api import LightweightContext, transform, Output, LightweightOutput
from transforms.tables import TableLightweightInput, TableInput


@transform.using(
    source_table=TableInput("/.../Input"),
    output_dataset=Output("/.../Output")
)
def compute(ctx: LightweightContext, source_table: TableLightweightInput, output_dataset: LightweightOutput):
    conn = ctx.duckdb().conn
    reader = source_table.iceberg().table().scan().to_arrow_batch_reader()
    conn.register("source_tbl", reader)
    query = conn.sql("SELECT * FROM source_tbl")
    output_dataset.write_table(query)
```

```python tab="pandas"
import pandas as pd
from transforms.api import transform, Output, LightweightOutput
from transforms.tables import TableLightweightInput, TableInput


@transform.using(
    source_table=TableInput("/.../Input"),
    output_dataset=Output("/.../Output")
)
def compute(source_table: TableLightweightInput, output_dataset: LightweightOutput):
    pandas_df = source_table.iceberg().table().scan().to_pandas()
    output_dataset.write_table(pandas_df)
```

```python tab="PySpark"
from transforms.api import transform, Output, TransformOutput
from transforms.tables import TableInput, TableTransformInput


@transform(
    source_table=TableInput("/.../Input"),
    output=Output("/.../Output")
)
def compute(source_table: TableTransformInput, output: TransformOutput):
    output.write_dataframe(source_table.dataframe())
```
