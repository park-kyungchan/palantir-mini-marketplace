---
sourceUrl: "https://www.palantir.com/docs/foundry/iceberg/local-jupyter/"
canonicalUrl: "https://palantir.com/docs/foundry/iceberg/local-jupyter/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "e5e9f2f7bc2dde61f22a1a5ed0d891b9d03c3b7ca65e43502459442d1ce0a3f2"
product: "foundry"
docsArea: "iceberg"
locale: "en"
upstreamTitle: "Documentation | Iceberg tables > Jupyter® in local notebooks"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Creating Iceberg tables from a local notebook

Iceberg's open table format allows you to read and write Foundry Iceberg tables using external engines.

The below code example uses [PyIceberg ↗](https://py.iceberg.apache.org/) to create a Foundry table from a Jupyter® notebook running on your computer. You can create a Foundry table with any external engine that supports Iceberg REST catalogs.

```python
from pyiceberg.catalog import load_rest
from getpass import getpass
import pyarrow.parquet as pq

# Create catalog client to create, load, and explore Iceberg tables in Foundry
catalog = load_rest(
    'foundry',
    {
        'uri': 'https://<your_foundry_url>/iceberg',
        'token': getpass('Foundry token:')
    }
)

# Read local Parquet file into Arrow table
df = pq.read_table('/<local_filepath>/example_data.parquet')

# Create a new Iceberg table in Foundry
table = catalog.create_table(
    'Namespace.Project.Folder.example_data',
    schema = df.schema
)

# List Iceberg tables - your new empty Foundry table will appear
catalog.list_tables('Namespace.Project.Folder.')

# Use `append` to insert the local PyArrow table into the Foundry Iceberg table
table.append(df)

# Use `scan()` to load the Iceberg table from Foundry - for example to read into a Pandas dataframe
table.scan().to_pandas()
```

:::callout{theme="neutral"}
Identifiers in PyIceberg and SQL more broadly are dot-separated. Foundry honors this convention in mapping Iceberg namespaces to Compass paths. For example, an Iceberg namespace identifier `Namespace.Project.Dir.Table` maps to a Compass path `Namespace/Project/Dir/Table`.
:::

***

*Jupyter®, JupyterLab®, and the Jupyter® logos are trademarks or registered trademarks of NumFOCUS.*

All third-party trademarks (including logos and icons) referenced remain the property of their respective owners. No affiliation or endorsement is implied.
