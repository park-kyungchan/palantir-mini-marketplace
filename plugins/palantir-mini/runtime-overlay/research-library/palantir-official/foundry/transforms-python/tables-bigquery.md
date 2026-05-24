---
sourceUrl: "https://www.palantir.com/docs/foundry/transforms-python/tables-bigquery/"
canonicalUrl: "https://palantir.com/docs/foundry/transforms-python/tables-bigquery/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "5815d5aece6973d35851486607237b21290a5981f2211dd013ad8b62b3b74fb1"
product: "foundry"
docsArea: "transforms-python"
locale: "en"
upstreamTitle: "Documentation | Virtual tables and compute pushdown > BigQuery compute pushdown"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# BigQuery compute pushdown

To use compute pushdown with BigQuery, create a [Python repository](/docs/foundry/transforms-python/overview/) and install the most recent version of the `transforms-tables` library.

An [Ibis ↗](https://ibis-project.org/) connection to BigQuery will be established based on the connection details of the BigQuery tables configured as inputs and/or outputs. Data can be transformed using the Ibis DataFrame API. For complete guidance on the Ibis API, consult the [Ibis documentation ↗](https://ibis-project.org/backends/bigquery).

:::callout{theme="neutral"}
Note the use of Foundry lightweight API syntax rather than Foundry Spark syntax.
:::

An example of a BigQuery-backed Ibis transform is shown below:

```python
from transforms.api import transform
from transforms.tables import (
    IbisInput,
    IbisOutput,
    TableInput,
    TableOutput,
    BigQueryTable
)


@transform.bigquery.using(
    source_table=TableInput("ri.tables.main.table.1234"),
    output_table=TableOutput(
        "ri.tables.main.table.5678",
        "ri.magritte..source.1234",
        BigQueryTable("PROJECT", "DATASET", "TABLE"),
    ),
)
def compute(source_table: IbisInput, output_table: IbisOutput):
    # Data transformation with Ibis
    table = source_table.table()
    output_table.write(table)
```

:::callout{theme="neutral"}
Incremental computation using the `@incremental` decorator is not currently supported when using compute pushdown to BigQuery.
:::
