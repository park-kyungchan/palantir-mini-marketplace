---
sourceUrl: "https://www.palantir.com/docs/foundry/available-connectors/postgresql/"
canonicalUrl: "https://palantir.com/docs/foundry/available-connectors/postgresql/"
sourceLastmod: "2026-05-12T17:06:26.148Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "0972145ed7a2ccd650a5355d52a2d4d05338e946c52cccea5d54a05502e5c681"
product: "foundry"
docsArea: "available-connectors"
locale: "en"
upstreamTitle: "Documentation | Available connectors > PostgreSQL"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# PostgreSQL

Connect Foundry to [PostgreSQL ↗](https://www.postgresql.org/) to read and sync data between PostgreSQL databases and Foundry. This connector uses the [official PostgreSQL driver ↗](https://jdbc.postgresql.org/) on major version 42, which is compatible with all versions of PostgreSQL 8.2 and above.

## Supported capabilities

| Capability | Status |
| --- |--- |
| Exploration | 🟢 Generally available |
| Batch syncs | 🟢 Generally available |
| Incremental | 🟢 Generally available |
| Change data capture syncs | 🟡 Beta |
| [Streaming exports](/docs/foundry/data-connection/export-overview/#streaming-exports) | 🟡 Beta |
| [Table Exports](/docs/foundry/data-connection/export-overview/#table-exports) | 🟢 Generally available |

## Setup

1. Open the [Data Connection](/docs/foundry/data-connection/overview/) application and select **+ New Source** in the upper right corner of the screen.
2. Select **PostgreSQL** from the available connector types.
3. Choose to run the source capabilities on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker) or on an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker).
4. Follow the additional configuration prompts to continue the setup of your connector using the information in the sections below.

Learn more about [setting up a connector](/docs/foundry/data-connection/set-up-source/) in Foundry.

## Authentication

The Foundry PostgreSQL connector requires the use of a **username and password** for authentication. We recommend the use of service credentials rather than individual user credentials.

Username and password authentication may be used in conjunction with client and/or server certificates and SSL modes requiring verification of these certificates.

You must ensure that the provided user has the necessary privileges on the target database, as well as permission to read from or write to the target table(s). For [change data capture](#change-data-capture-beta), the user may also require `CREATE` and `REPLICATION` permissions on the target database.

## Networking

The PostgreSQL connector requires network access to the database instance that you wish to connect to. PostgreSQL connections will normally use a hostname or IP to connect on port 5432.

If you are runnning the connection to PostgreSQL [in Foundry](/docs/foundry/data-connection/core-concepts/#foundry-worker), the appropriate [egress policies](/docs/foundry/administration/configure-egress/) must be added when setting up the source in the [Data Connection application](/docs/foundry/data-connection/overview/).

For cloud-hosted PostgreSQL instances accessible over the Internet, such as PostgreSQL in Amazon Relational Database Service (RDS), you must add an egress policy for the hostname of the database or the IP address if you are not using a hostname. Review the official documentation for the provider of your managed, cloud-hosted PostgreSQL instance for more details on the required networking configuration.

You will need to ensure that you have allowed inbound traffic from Foundry to your PostgreSQL instance. You can view the egress IPs where traffic from Foundry will originate in the [**Network egress**](/docs/foundry/administration/configure-egress/) page in Control Panel. Review the documentation for your hosting provider to learn how to allow traffic from these IPs to your database instance.

If you are running the connection on an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker), you must ensure that the agent host has firewalls open to the hostnames, IP addresses, and ports required to connect to your PostgreSQL database.

### PostgreSQL in Amazon RDS

If you are connecting to a managed instance of PostgreSQL hosted in Amazon RDS, you can use a [direct connection](/docs/foundry/data-connection/architecture/#foundry-worker-with-direct-connection-policies) with the necessary egress policies.

* To find the hostname for your PostgreSQL instance hosted in Amazon RDS, navigate to your instance in the AWS console. An example hostname-based egress policy for RDS PostgreSQL is `<your-database-name>.<unique-identifier>.<region>.rds.amazonaws.com (port 5432)`

When connecting to an RDS PostgreSQL instance, you may need to add the RDS root Certificate Authority (CA) as a server certificate in the source configuration panel. Download the `rds-ca-2019-root.pem` from the [Amazon S3 site ↗](https://s3.amazonaws.com/rds-downloads/rds-ca-2019-root.pem), then copy the certificate details into Foundry to trust connections to Amazon RDS. For more information on connecting to RDS database instances using SSL/TLS, review the official [AWS documentation ↗](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html).

## Connection details

| Option | Required? | Description |
| --- | --- | --- |
| `Host type` | Yes | Specify how Foundry should connect with your PostgreSQL database. <br /><br /> **Option 1: Hostname** <br />Provide a hostname. This is the recommended option for all PostgreSQL connetions and should always be used when connecting to a cloud-hosted PostgreSQL instance. For example, an instance hosted in [Amazon RDS ↗](https://aws.amazon.com/rds/postgresql/). <br /><br /> **Option 2: IPv4** <br />Provide an IPv4 address. If you normally connect using an IPv4 address, either within a corporate network or over the Internet, you can use this option. <br /><br /> **Option 3: IPv6** <br />Provide an IPv6 address. Use this option if you normally connect using an IPv6 address. |
| `Port` | Yes | Specify a port to use when connecting. The default port for most PostgreSQL instances will be `5432`. For more information on ports, see the [official documentation ↗](https://www.postgresql.org/docs/current/app-postgres.html) for PostgreSQL as well as the configuration for your database instance. |
| `Database name` | Yes | The name of the database you are connecting to within your instance of PostgreSQL. |
| `Authentication` | Yes | Configure using the [Authentication](#authentication) guidance shown above. |
| `Network Connectivity` | Yes | You must provide egress policies to allow connections to your PostgreSQL instance. Refer to the [Networking](#networking) section for more details. |
| `SSL Mode` | Yes | Defaults to `verify-full`. For more details, review the [official documentation ↗](https://jdbc.postgresql.org/documentation/ssl/) for the `ssl-mode` connection parameter on the PostgreSQL JDBC driver. |

## Change data capture \[Beta]

:::callout{theme="neutral" title="Beta"}
Change data capture syncs for PostgreSQL are in the [beta](/docs/foundry/platform-overview/development-life-cycle/) phase of development and may not be available on your enrollment. Functionality may change during active development. Contact Palantir Support to request access to this feature.
:::

The PostgreSQL source supports [change data capture](/docs/foundry/data-integration/change-data-capture/) (CDC) syncs.

Since PostgreSQL supports logical replication, change data capture can stream changes to configured tables in near realtime. According to the [PostgreSQL documentation ↗](https://www.postgresql.org/docs/current/logical-replication.html):

> Logical replication is a method of replicating data objects and their changes, based upon their replication identity (usually a primary key).

Foundry change data capture syncs from PostgreSQL function by using an existing replication slot or creating a new replication slot and publication on the target database. Only one replication slot and publication may be configured per data connection source, however any number of tables may be streamed to Foundry over a single connection. If you wish to use multiple replication slots or publications, you can create multiple data connection sources that connect to your database.

Before setting up a change data capture sync, first ensure that you have a working PostgreSQL source connection. Then, navigate to the **CDC syncs** tab and provide the additional required configuration for change data capture.

![CDC syncs tab for a new PostgreSQL source.](/docs/resources/foundry/available-connectors/postgresql-change-data-capture-config.png)

| Option | Required? | Description |
| --- | --- | --- |
| Replication slot name | Yes | The name of the replication slot to use for CDC. If the slot does not exist, it will be created. For more information, see the official [PostgreSQL documentation ↗](https://www.postgresql.org/docs/current/logicaldecoding-explanation.html#LOGICALDECODING-REPLICATION-SLOTS). |
| Publication name | Yes | The name of the publication to use for CDC. For more information, see the official [PostgreSQL documentation ↗](https://www.postgresql.org/docs/current/sql-createpublication.html). |
| Auto-create publication | Yes | If enabled, the publication will be created automatically for all selected tables. This requires the user to have the following permissions: `CREATE` and `REPLICATION` on the database, and `SELECT` on the tables. |

Once the required settings for change data capture are configured, you can navigate to the **Overview** page or stay on the **CDC syncs** page and select **+ Create CDC sync** to create a new change data capture sync.

:::callout{theme="neutral"}
The exploration runtime must be working to create a change data capture sync. If the runtime is still initializing, you may need to wait a few seconds and refresh the page to proceed with creating a change data capture sync.
:::

For more information on using CDC with PostgreSQL, review the [official documentation ↗](https://www.postgresql.org/docs/current/logical-replication.html) on logical replication for the version of PostgreSQL in use.

## Use PostgreSQL sources in code

### Read from PostgreSQL with an external transform

The following example queries the Postgres source used in the [Deep Dive: Creating Your First Data Connection ↗](https://learn.palantir.com/deep-dive-data-connection) guide.

This example uses the [`psycopg2` ↗](https://www.psycopg.org/docs/) package to query the Postgres source.

```python
from transforms.api import transform_pandas, Output
from transforms.external.systems import external_systems, Source
import psycopg2
import pandas as pd


@external_systems(
    postgres_source=Source()
)

@transform_pandas(output=Output())
def compute(postgres_source):

    conn = psycopg2.connect(
        host="host",            # Database host address
        port="5432",            # Database port
        database="postgres",    # Database name
        user="user",            # Database username
        password=postgres_source.get_secret("PASSWORD") # Database password
    )

    query = "SELECT * FROM plants;"

    return pd.read_sql_query(query, conn)
```

### Write to PostgreSQL with an external transform

This example writes rows from an input dataset to a PostgreSQL table using [`psycopg2` ↗](https://www.psycopg.org/docs/). It creates the target table if it does not already exist. A column mapping dictionary handles differences between Foundry column names and PostgreSQL column names.

```python
import logging
from transforms.api import lightweight, Output, transform_pandas, Input
from transforms.external.systems import external_systems, Source
import psycopg2
import pandas as pd

logger = logging.getLogger(__name__)

# Maps Foundry column names to PostgreSQL column names
COLUMN_MAPPING = {
    "plant_name": "name",
    "plant_height": "height_cm",
    "plant_color": "color",
}

CREATE_TABLE_SQL = """
    CREATE TABLE IF NOT EXISTS plants (
        name TEXT PRIMARY KEY,
        height_cm DOUBLE PRECISION,
        color TEXT
    )
"""


@lightweight
@external_systems(
    postgres_source=Source("<source_rid>")
)
@transform_pandas(
    Output("<output_dataset_rid>"),
    plants_df=Input("<input_dataset_rid>")
)
def compute(postgres_source, plants_df):
    conn = psycopg2.connect(
        host="<your_host>",
        port="5432",
        database="<your_database>",
        user="<your_user>",
        password=postgres_source.get_secret("PASSWORD"),
    )

    pg_columns = [COLUMN_MAPPING[c] for c in plants_df.columns]
    placeholders = ", ".join(["%s"] * len(pg_columns))
    columns_str = ", ".join(pg_columns)
    insert_sql = f"INSERT INTO plants ({columns_str}) VALUES ({placeholders})"

    try:
        with conn:
            with conn.cursor() as cursor:
                cursor.execute(CREATE_TABLE_SQL)
                for _, row in plants_df.iterrows():
                    cursor.execute(insert_sql, tuple(row))
    except Exception as e:
        logger.error(f"Error writing to PostgreSQL plants table: {e}")
        raise RuntimeError(f"Failed to write data to PostgreSQL: {e}") from e
    finally:
        conn.close()

    return pd.DataFrame({"rows_written": [len(plants_df)]})
```
