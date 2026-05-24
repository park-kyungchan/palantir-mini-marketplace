---
sourceUrl: "https://www.palantir.com/docs/foundry/available-connectors/microsoft-sql-server/"
canonicalUrl: "https://palantir.com/docs/foundry/available-connectors/microsoft-sql-server/"
sourceLastmod: "2026-05-12T17:06:26.147Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d54e0dfcd4ef286b81193c94cb5775e5d04e26f572a93b24038dcf012d66ed7c"
product: "foundry"
docsArea: "available-connectors"
locale: "en"
upstreamTitle: "Documentation | Available connectors > Microsoft SQL Server"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Microsoft SQL Server

Connect Foundry to Microsoft SQL Server to read and sync data between SQL Server databases and Foundry.

## Supported capabilities

| Capability | Status |
| --- |--- |
| Exploration | 🟢 Generally available |
| Batch syncs | 🟢 Generally available |
| Incremental | 🟢 Generally available |
| Change data capture syncs | 🟢 Generally available |
| [Table Exports](/docs/foundry/data-connection/export-overview/#table-exports) | 🟢 Generally available |

## Setup

1. Open the [Data Connection](/docs/foundry/data-connection/overview/) application and select **+ New Source** in the upper right corner of the screen.
2. Select **MS SQL Server** from the available connector types.
3. Choose to run the source capabilities on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker) or on an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker).
4. Follow the additional configuration prompts to continue the setup of your connector using the information in the sections below.

Learn more about [setting up a connector](/docs/foundry/data-connection/set-up-source/) in Foundry.

## Authentication

You can authenticate with SQL Server in the following ways:

1. **Username and password:** Provide a username and password. We recommend the use of service credentials rather than individual user credentials.
2. **Active Directory Msi**\*: This option will use the `authentication=ActiveDirectoryMSI` JDBC setting. An `msiClientId` may optionally be provided.
3. **Active Directory Password**\*: This option will use the `authentication=ActiveDirectoryPassword` JDBC setting. A username and password for an Active Directory user must be provided to use this setting.
4. **Active Directory Service Principal**\*: This option will use the `authentication=ActiveDirectoryServicePrincipal` JDBC setting. A principal ID (sometimes referred to as an application or client ID) must be specified, along with a secret for that principal ID.

For more information on these authentication modes, see the [official documentation ↗](https://learn.microsoft.com/sql/connect/jdbc/connecting-using-azure-active-directory-authentication). For all authentication options, ensure that the provided user and role has the necessary privileges on the target database, as well as permission to read from or write to the target table(s).

\* Note that Azure Active Directory is now called [Microsoft Entra ID ↗](https://www.microsoft.com/security/business/identity-access/microsoft-entra-id); however, the JDBC options on the SQL Server driver published by Microsoft retain the original names referring to Active Directory.

## Networking

The Microsoft SQL Server connector requires network access to the SQL Server instance that you wish to connect to. SQL Server connections will normally use a hostname to connect on port 1433.

For connections to SQL Server running on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker), the appropriate [egress policies](/docs/foundry/administration/configure-egress/) must be added when setting up the source in the [Data Connection application](/docs/foundry/data-connection/overview/).

For SQL Server instances hosted on a cloud service like Azure SQL or AWS RDS, you must add an egress policy for the hostname retrieved from your cloud provider’s console.

:::callout{theme="warning"}
If Azure redirect mode is used, then egress policies for all resolved IP addresses must also be added. The resolved IP may occasionally change, and you must update the egress policies to allow the new IP. If your instance of SQL Server is hosted on Azure, for example, then you can find more information on public IP addresses for Azure SQL instances in the [Azure SQL documentation ↗](https://learn.microsoft.com/azure/azure-sql/managed-instance/connectivity-architecture-overview?view=azuresql\&tabs=current#public-endpoint).
:::

* To find the hostname for your Azure SQL instance, navigate to the **Settings > Properties** page in the Azure portal, and look for the **Server Name** field. An example hostname-based egress policy for Azure SQL: `<your-database-name>.database.windows.net (port 1433)`
* To find the resolved IP, you can run `nslookup <your-database-name>.database.windows.net` from the command line. The final result will be the IP address that this hostname resolves to in Azure. The following is an example IPv4-based egress policy for Azure SQL: `x.x.x.x (port 1433)`. Azure SQL does load balancing across multiple hosts, so you may need to run the `nslookup` command several times and add all of the resolved IP addresses.

:::callout{theme="neutral"}
If you are connecting to an Azure SQL instance from a Foundry instance also hosted in Azure, you will need to use the **Proxy** connection policy option. For traffic originating within Azure, the connection policy defaults to **Redirect**. Using the redirect option to connection for Azure-Azure connections would require configuring egress policies for all Azure SQL IP addresses on all ports in the range of 11000 to 11999. This is possible but not recommended as it is overly permissive. For details on Azure SQL connection policies, see the official [Azure SQL documentation ↗](https://learn.microsoft.com/azure/azure-sql/database/connectivity-architecture?view=azuresql#connection-policy).
:::

If you are connecting using an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker), you must ensure that the agent host has firewalls open to the host names, IP addresses, and ports required to connect to your MS SQL Server database.

## Connection details

| Option | Required? | Description |
| --- | --- | --- |
| `Host type` | Yes | Specify how Foundry should connect with your SQL Server database. <br /><br /> **Option 1: Hostname** <br />Provide a hostname. This is the recommended option for all SQL Server connections, and should always be used when connecting to an [Azure SQL ↗](https://azure.microsoft.com/products/azure-sql) instance. <br /><br /> **Option 2: IPv4** <br />Provide an IPv4 address. If you normally connect using an IPv4 address, either within a corporate network or over the Internet, you can use this option. <br /><br /> **Option 3: IPv6** <br />Provide an IPv6 address. Use this option if you normally connect using an IPv6 address. |
| `Port` | Yes | Specify a port to use when connecting. The default port for most SQL Server instances will be `1433`. For more information on ports, see the official documentation for the version of SQL Server you are connecting to. |
| `Database name` | Yes | The name of the database you're connecting to within your instance of MS SQL Server. |
| `Authentication` | Yes | Configure using the [Authentication](#authentication) guidance shown above. |
| `Require encryption` | Yes | Defaults to enabled. For more details, see Microsoft's documentation for the `encrypt` setting on the SQL Server JDBC driver: <br /><br /> [Connection properties reference ↗](https://learn.microsoft.com/sql/connect/jdbc/setting-the-connection-properties?view=sql-server-ver16)<br /> [Encryption support examples ↗](https://learn.microsoft.com/sql/connect/jdbc/understanding-ssl-support?view=sql-server-ver16) |
| `Trust server certificate` | Yes | Defaults to disabled. For more details, see Microsoft's documentation for the `trustServerCertificate` setting on the SQL Server JDBC driver: <br /><br /> [Connection properties reference ↗](https://learn.microsoft.com/sql/connect/jdbc/setting-the-connection-properties?view=sql-server-ver16) |
| `Network Connectivity` | Yes - for Foundry worker only | You must provide egress policies to allow connections to your MS SQL Server instance. Refer to the [Networking](#networking) section for more details. |

## Change data capture

The Microsoft SQL Server source supports [change data capture](/docs/foundry/data-integration/change-data-capture/) syncs.

To enable change data capture for Microsoft SQL Server, you must run a command like the one below to enable CDC on the database.

```
USE <database>
GO
EXEC sys.sp_cdc_enable_db
GO
```

Then, run another command on each table that should be recording changelogs:

```
EXEC sys.sp_cdc_enable_table
    @source_schema = N'<schema>'
  , @source_name = N'<table_name>'
  , @role_name = NULL
  , @capture_instance = NULL
  , @supports_net_changes = 0
  , @filegroup_name = N'PRIMARY';
GO
```

Once change data capture is enabled for the table(s) you wish to sync to Foundry, you can navigate to the **Overview** page and select **+ Create CDC sync** to start creating a new change data capture sync.

:::callout{theme="neutral"}
The exploration runtime must be working in order to create a change data capture sync. If the runtime is still initializing, you may need to wait a few seconds and refresh the page to proceed with creating a change data capture sync.
:::

For more information on these commands and using change data capture (CDC) with Microsoft SQL Server, see the [official documentation ↗](https://learn.microsoft.com/azure/azure-sql/database/change-data-capture-overview) for the version of SQL Server in use.

### Change Data Capture permissioning

To successfully read CDC data, you will need to ensure you have provided sufficient permissions to the database user.

* You can verify your permissions with the following query: `SELECT HAS_PERMS_BY_NAME('cdc', 'SCHEMA', 'EXECUTE') AS HasExecutePermission;`. The result will return 1 if `True` and 0 if `False`.
* You can grant missing permissions by running the following query within the source system itself: `GRANT EXECUTE ON SCHEMA::cdc TO <USER>;`

## Use Microsoft SQL Server sources in code

These examples demonstrate how to connect to a [Microsoft SQL Server](/docs/foundry/available-connectors/microsoft-sql-server/) source using the [`pymssql` ↗](https://www.pymssql.org/pymssql_examples.html) Python package in an [external transform](/docs/foundry/data-connection/external-transforms/).

The examples are based on a `Fruits` table created with the following schema:

```sql
CREATE TABLE Fruits (
    FruitName VARCHAR(50) PRIMARY KEY,
    Inventory INT NOT NULL,
    PricePerKg DECIMAL(10, 2) NOT NULL
);
```

### Read from MSSQL with an external transform

This example reads data from the `Fruits` table, filtered to `Inventory` values below `60`.

```python
import logging
from pandas import DataFrame
from transforms.external.systems import ResolvedSource
from transforms.api import lightweight, Output, transform_pandas
from transforms.external.systems import external_systems, Source
import pymssql
import pandas as pd

logger = logging.getLogger(__name__)

@lightweight
@external_systems(
    mssql_source=Source("<source_rid>")
)
@transform_pandas(
    Output("<dataset_rid>")
)
def compute(mssql_source: ResolvedSource) -> DataFrame:
    # Inventory threshold parameter (this could also be read from an input DataFrame)
    INVENTORY_THRESHOLD = 60

    connection_parameters = {
        "server": "<your_server_name>",
        "database": "<your_database_name>",
        "port": "1433",
        "user": "<your_user_name>",
        "password": mssql_source.get_secret("MSSQL_BASIC_AUTH_PASSWORD"),
        "encryption": "require",
        "timeout": 30
    }
    try:
        with pymssql.connect(**connection_parameters) as connection:
            df = pd.read_sql(
                'SELECT * FROM Fruits WHERE Inventory < %s',
                connection,
                params=(INVENTORY_THRESHOLD,)
            )
    except Exception as e:
        logger.error(f"Error querying MSSQL Fruits table: {e}")
        raise RuntimeError(f"Failed to fetch Fruits data from MSSQL: {e}") from e
    return df
```

### Write to MSSQL with an external transform

This example uses an input dataset to update the `Fruits` table. It returns a dataset summarizing the actions (update or insert) taken per `FruitName`.

```python
import logging
from transforms.api import lightweight, Output, transform_pandas, Input
from transforms.external.systems import external_systems, Source
import pymssql
import pandas as pd

logger = logging.getLogger(__name__)

@lightweight
@external_systems(
    mssql_source=Source("<source_rid>")
)
@transform_pandas(
    Output("<dataset_rid>"),
    fruits_df=Input("<dataset_rid>") # DataFrame with schema [FruitName: String, Inventory: Integer, PricePerKg: Double]
)
def compute(mssql_source, fruits_df):
    # Connection parameters
    connection_parameters = {
        "server": "<your_server_name>",
        "database": "<your_database_name>",
        "port": "1433",
        "user": "<your_user_name>",
        "password": mssql_source.get_secret("MSSQL_BASIC_AUTH_PASSWORD"),
        "encryption": "require",
        "timeout": 30
    }
    results = []
    try:
        with pymssql.connect(**connection_parameters) as connection:
            with connection.cursor() as cursor:
                for _, row in fruits_df.iterrows():
                    fruit_name = row["FruitName"]
                    inventory = row["Inventory"]
                    price_per_kg = row["PricePerKg"]

                    # Try to update; if no row updated, then insert
                    update_sql = """
                        UPDATE Fruits
                        SET Inventory = %s, PricePerKg = %s
                        WHERE FruitName = %s
                    """
                    cursor.execute(update_sql, (inventory, price_per_kg, fruit_name))
                    if cursor.rowcount == 0:
                        insert_sql = """
                            INSERT INTO Fruits (FruitName, Inventory, PricePerKg)
                            VALUES (%s, %s, %s)
                        """
                        cursor.execute(insert_sql, (fruit_name, inventory, price_per_kg))
                        results.append({"FruitName": fruit_name, "action": "inserted"})
                    else:
                        results.append({"FruitName": fruit_name, "action": "updated"})
                connection.commit()
    except Exception as e:
        logger.error(f"Error updating MSSQL Fruits table: {e}")
        raise RuntimeError(f"Failed to update Fruits data in MSSQL: {e}") from e
    # Return a DataFrame summarizing the actions
    return pd.DataFrame(results, columns=["FruitName", "action"])
```
