---
sourceUrl: "https://www.palantir.com/docs/foundry/available-connectors/snowflake/"
canonicalUrl: "https://palantir.com/docs/foundry/available-connectors/snowflake/"
sourceLastmod: "2026-05-12T17:06:26.148Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "2dd0950c0fbc70c3ef161d00b21371a1e3312a31366f48c0de62944b5b02c090"
product: "foundry"
docsArea: "available-connectors"
locale: "en"
upstreamTitle: "Documentation | Available connectors > Snowflake"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Snowflake

Connect Foundry to Snowflake to read and sync data between Snowflake and Foundry.

## Supported capabilities

| Capability | Status |
| --- |--- |
| Exploration | 🟢 Generally available |
| Bulk import | 🟢 Generally available |
| Incremental | 🟢 Generally available |
| Virtual tables | 🟢 Generally available |
| Compute pushdown | 🟢 Generally available |
| Export tasks | 🟡 Sunset |
| [Table Exports](/docs/foundry/data-connection/export-overview/#table-exports) | 🟢 Generally available |

## Setup

1. Open the [Data Connection](/docs/foundry/data-connection/overview/) application and select **+ New Source** in the upper right corner of the screen.
2. Select **Snowflake** from the available connector types.
3. Choose to run the source capabilities on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker) or on an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker).
4. Follow the additional configuration prompts to continue the setup of your connector using the information in the sections below.

Learn more about [setting up a connector](/docs/foundry/data-connection/set-up-source/) in Foundry.

## Connection details

:::callout{theme="warning"}
Snowflake accounts with underscores (`_`) **must** replace underscores with dashes (`-`).  For example, `my_account_prod` needs to become `my-account-prod`. Failure to do so will cause networking issues.
:::

| Option | Required? | Description |
| --- | --- | --- |
| `Account identifier` | Yes | This is the identifier that precedes ".snowflakecomputing.com". See Snowflake's [official documentation ↗](https://docs.snowflake.com/user-guide/admin-account-identifier) for more details. |
| `Roles` | No | This is the default role to be used by the connection in case the credentials provided have access to multiple roles. |
| `Database` | Yes | Specify a default database to use once connected. |
| `Schema` | No | Option to specify a default schema to use once connected. If not specified, all schemas will be available that are in-scope of the credentials. |
| `Warehouse` | No\* | The virtual warehouse to use once connected. In the case of registered [virtual tables](/docs/foundry/data-integration/virtual-tables/), this will be used for any source-side compute. |
| `Credentials` | Yes | Refer to the [authentication](#authentication) section below for more details. |
| `Network Connectivity` | Yes\*\* | Refer to the [networking](#networking) section below for more details.  |

*\* Warehouse details are optional for syncing [Foundry datasets](/docs/foundry/data-integration/datasets/), but required for registering [virtual tables](/docs/foundry/data-integration/virtual-tables/).<br />*
*\*\* Network egress policies are required for [Foundry worker connections](/docs/foundry/data-connection/core-concepts/#foundry-worker), but not for [agent worker connections](/docs/foundry/data-connection/core-concepts/#agent-worker).*

### Authentication

You can authenticate with Snowflake in the following ways:

| Method  | Description  | Documentation |
|--- |--- |---  |
| Username and password \[Legacy] | Authenticate with a user account using a username and password. Basic authentication is legacy and not recommended in production. | [Working with passwords ↗](https://docs.snowflake.com/en/user-guide/password-authentication) |
| Key-pair authentication | Provide a username and private key. Note that only unencrypted private keys are supported. Foundry will encrypt and store the private key securely. | [Key-pair authentication and key-pair rotation ↗](https://docs.snowflake.com/user-guide/key-pair-auth#configuring-key-pair-authentication) |
| External OAuth (OIDC) \[Recommended]| Authenticate as a user using workload identity federation. Workload identity federation allows workloads running in Foundry to access Snowflake without the need for Snowflake secrets. Follow the displayed source system configuration instructions to set up external OAuth. | [Workload identity federation ↗](https://docs.snowflake.com/en/user-guide/workload-identity-federation)<br></br>Refer to our [OIDC documentation](/docs/foundry/data-connection/oidc/) for an overview of how OpenID Connect (OIDC) is supported in Foundry. |
| Programmatic access token | Authenticate as a user using a programmatic access token (PAT). | [Programmatic access tokens ↗](https://docs.snowflake.com/en/user-guide/programmatic-access-tokens) |

For all authentication options, ensure that the provided user and role has usage privileges on the target database(s) and schema(s), as well as select privileges on the target table(s).

When registering [virtual tables](/docs/foundry/data-integration/virtual-tables/), the user and their role should also have usage privileges on the warehouse.

:::callout{theme="warning"}
Snowflake is rolling out changes to require multi-factor authentication (MFA) for human users that use passwords, and to disallow passwords for all service users. As such, **Username and password** will no longer be a suitable authentication mechanism. Refer to the [official Snowflake documentation ↗](https://docs.snowflake.com/en/user-guide/security-mfa-rollout) for additional information and guidance on migrating.
:::

## Networking

For connections [running on a Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker), the appropriate [egress policies](/docs/foundry/administration/configure-egress/) must be added when setting up the source in the [Data Connection application](/docs/foundry/data-connection/overview/).

To identify the hostnames and port numbers of your Snowflake account to be allowlisted, you can run the following command in your Snowflake console. Ensure that at least the entries for `SNOWFLAKE_DEPLOYMENT` and `STAGE` are added as egress policies in Foundry.

```sql
SELECT t.VALUE:type::VARCHAR as type,
       t.VALUE:host::VARCHAR as host,
       t.VALUE:port as port
FROM TABLE(FLATTEN(input => PARSE_JSON(SYSTEM$ALLOWLIST()))) AS t;
```

See Snowflake's [official documentation ↗](https://docs.snowflake.com/sql-reference/functions/system_allowlist) for additional information on identifying hostnames and port numbers to allowlist.

:::callout{theme="neutral"}
Connections from Foundry to Snowflake normally come from the default public gateway IPs for your environment. However, traffic *within the same cloud provider* (for example, AWS-AWS or Azure-Azure) may use different routing, and require establishing a connection via PrivateLink. See below for the additional setup required per cloud provider, or contact your Palantir representative for additional guidance.
:::

### Snowflake instance hosted on S3

If your Snowflake instance is configured to route internal S3 stage traffic through a [VPCE ↗](https://docs.snowflake.com/en/user-guide/private-internal-stages-aws#aws-configuration), the Snowflake JDBC driver must be manually configured to **not** use the custom VPCE domain. Otherwise, the driver will be routed to the custom VPCE domain (which is inaccessible from Foundry's VPC) and will fail connections to URLs with the format of `<bucketname>.bucket.vpce-<vpceid>.s3.<region>.vpce.amazonaws.com`.

You can manually configure this by adding a JDBC connection property in the **Connection details** of your instance, with a key of `S3_STAGE_VPCE_DNS_NAME` and an empty value field (the equivalent of setting it to `null`).
The S3 stage traffic will then be routed through the AWS S3 Gateway Endpoint (`<bucketname>.bucket.s3.<region>.vpce.amazonaws.com`) which maintains private connectivity so traffic will not be routed through the public internet.

Review our [PrivateLink egress documentation ↗](/docs/foundry/administration/configure-private-link-egress/) for more information.

:::callout{theme="neutral"}
For egress policies that depend on an S3 bucket in the same region as your Foundry instance, ensure you have completed the additional configuration steps detailed in our [Amazon S3 bucket policy documentation](/docs/foundry/administration/configure-egress/#amazon-s3-bucket-policies) for the affected bucket(s).
:::

### Snowflake instance hosted on Azure

The Snowflake JDBC driver used for the Foundry Snowflake connector may attempt to connect directly to an underlying “internal stage” storage bucket when fetching data. For Snowflake hosted on Azure, because [Azure-hosted Foundry enrollments route traffic over Azure service endpoints](/docs/foundry/administration/configure-egress/#microsoft-azure-storage-policies), network connectivity from Foundry to the underlying stage buckets must be explicitly allow-listed by following the instructions below.

#### Gather the required information about your Snowflake warehouse

You will need the following information about your Azure-hosted Snowflake warehouse to establish network connectivity to Foundry:

* Full list of [system allowlist domains](#system-allowlist-domains).
* Your [Azure storage account identifier](#azure-storage-account-identifier), obtained from Snowflake.

##### System allowlist domains

Use the `SYSTEM$ALLOWLIST` command to get the full list of domains that may be required to successfully connect.

* *Note: This is the same command than used above to define egress policies, and is explained in the network panel callout in Data Connection.*
* This list will include the domain of an Azure storage bucket used as the stage for your Snowflake warehouse.

##### Azure storage account identifier

For the Azure storage bucket returned from the `SYSTEM$ALLOWLIST` command, you will also need to retrieve the storage account identifier.

* If you are using Snowflake Standard Edition or Enterprise Edition, you will need to file a ticket with Snowflake support to request the storage account identifier.
* If you are using Snowflake [Business Critical Edition ↗](https://docs.snowflake.com/en/user-guide/intro-editions#business-critical-edition), you can retrieve the storage account identifier with the following steps:
  * Set the [`ENABLE_INTERNAL_STAGES_PRIVATELINK` ↗](https://docs.snowflake.com/en/sql-reference/parameters#label-enable-internal-stages-privatelink) parameter to `TRUE` for the account.
  * Then, call the [`SYSTEM$GET_PRIVATELINK_CONFIG()` ↗](https://docs.snowflake.com/en/sql-reference/functions/system_get_privatelink_config) function, which returns a field called `privatelink-internal-stage` containing the Azure storage account resource identifier.
    * *Note that even if you are not connecting over a PrivateLink, you still need to retrieve and provide the storage account resource identifier.*

A full Azure Storage account resource identifier will be in the following format:

`/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Storage/storageAccounts/{storageAccountName}`

More information on how to find an Azure Storage account resource ID directly in the Azure console can be found in the [Azure documentation ↗](https://learn.microsoft.com/en-us/azure/storage/common/storage-account-get-info?tabs=portal#get-the-resource-id-for-a-storage-account). Restricting cross-account network traffic using VNET rules and the storage account identifier is in line with [Microsoft’s published best practices ↗](https://learn.microsoft.com/en-us/azure/well-architected/service-guides/network-connectivity/operational-excellence#design-considerations), and should be used for all connections to Azure-hosted Snowflake warehouses from within Azure compute instances.

#### Allow outbound traffic from Foundry to the Azure storage account associated with your Snowflake warehouse

Now that you have gathered the required information about your Snowflake warehouse, you can create the required policies needed to enable Foundry access to your Snowflake data.

1. Create a [standard egress policy](#networking) for the Azure storage internal stage, and attach it to your Snowflake source.
   * Note that you should add policies for everything returned from the `SYSTEM$ALLOWLIST` command, and not just the storage bucket domain.

2. Create an [Azure storage policy](/docs/foundry/administration/configure-egress/#add-an-azure-storage-policy), pasting in the storage account resource identifier.

Navigate back to your Snowflake source in Data Connection and confirm you can explore the source and run syncs.

### Iceberg tables (virtual tables only)

The [Virtual tables](#iceberg-tables) section of this documentation provides details on integrating Iceberg tables registered in Snowflake Horizon Catalog. This functionality requires network connectivity to the external volume where the Iceberg table is stored. You must create [network egress policies](/docs/foundry/administration/configure-egress/) for each external volume, as Foundry reads and writes to the storage location directly rather than querying the table using a Snowflake compute warehouse.

Refer to the [official Snowflake documentation ↗](https://docs.snowflake.com/en/user-guide/tables-iceberg-configure-external-volume/) for more information on external volumes and how to determine table storage locations.

:::callout{theme="neutral"}
Configuring egress policies for an external volume enables network traffic to egress from Foundry to that storage location. Network controls may vary between cloud providers, so you should ensure that any network controls on the storage location permit network traffic from Foundry. [Learn more about identifying the IP addresses where Foundry traffic originates.](/docs/foundry/administration/configure-egress/#which-ips-do-connections-from-foundry-come-from). <br><br>
Additionally, refer to the other sections of this [Networking](#networking) documentation to ensure you correctly set up connections to external volumes hosted in the same cloud region as your Foundry instance.
:::

## Virtual tables

This section provides additional details around using [virtual tables](/docs/foundry/data-integration/virtual-tables/) with a Snowflake source. This section is not applicable when syncing to Foundry datasets.

<a id="iceberg-tables"></a>

:::callout{theme="neutral"}
The Snowflake connector now offers enhanced functionality when using virtual tables to access Iceberg tables registered in Horizon Catalog. Foundry uses the Iceberg REST APIs exposed in Horizon Catalog to access tables as well as read and write data in the underlying storage locations, which are configured as external volumes in Snowflake. Additionally, Foundry uses Horizon Catalog credential vending to ensure secure access to cloud object storage. This can also improve the performance of reads and writes against these tables. <br><br>

The connector exposes Iceberg functionality automatically if you:

1. Configure network egress policies that allow connectivity from Foundry to the external volume that stores the table.
2. Configure credentials on the source that have permission to obtain vended credentials from Horizon Catalog.

<br><br>
Foundry uses Iceberg clients to establish connections to read or write tables to the storage location directly *without* using Snowflake compute. However, Foundry still uses the warehouse configured on the source for certain metadata queries, such as determining the type of table being accessed. <br><br>

Refer to the [official Snowflake documentation ↗](https://docs.snowflake.com/en/user-guide/tables-iceberg-query-using-external-query-engine-snowflake-horizon) for more information on querying Iceberg tables with an external engine through Snowflake Horizon Catalog. Writes to Horizon Catalog are currently a *private preview* Snowflake feature. Refer to the [Networking](#networking) section of this documentation for details on enabling network access to external volumes.

Foundry treats Iceberg tables like regular Snowflake tables if any of the above requirements are not met. Connections to Snowflake are made using the same mechanism as for other Snowflake data (such as tables, views, or materialized views) and rely on a Snowflake compute warehouse to read and write from the table.
:::

The table below highlights the virtual table capabilities that are supported for Snowflake.

| Capability | Status |
| --- | --- |
| Bulk registration | 🟢 Generally available |
| Automatic registration | 🟢 Generally available |
| Table inputs | 🟢 Generally available: tables, views, materialized views in [Code Repositories](/docs/foundry/code-repositories/overview/), [Pipeline Builder](/docs/foundry/pipeline-builder/overview/) |
| Table outputs | 🟢 Generally available: tables in [Code Repositories](/docs/foundry/code-repositories/overview/), [Pipeline Builder](/docs/foundry/pipeline-builder/overview/) |
| Incremental pipelines  | 🟢 Generally available: `APPEND` only, tables only [<sup>\[1\]</sup>](#snowflake-incremental)|
| Compute pushdown | 🟢 Generally available <br>🟡 Beta: [Pipeline Builder](/docs/foundry/building-pipelines/create-external-pipeline-pb/) |

Consult the [virtual tables documentation](/docs/foundry/data-integration/virtual-tables/#supported-foundry-workflows) for details on the supported Foundry workflows where Snowflake tables can be used as inputs or outputs.

<span id="snowflake-incremental">\[1]</span> Incremental pipelines are supported for tables only. Views are not supported for incremental pipelines because they are not versioned. To enable incremental support for pipelines backed by Snowflake virtual tables, ensure that [Change Tracking ↗](https://docs.snowflake.com/user-guide/streams-manage#enabling-change-tracking-on-views-and-underlying-tables) and [Time Travel ↗](https://docs.snowflake.com/en/user-guide/data-time-travel#enabling-and-disabling-time-travel) are enabled for the appropriate retention period. This functionality relies on [CHANGES ↗](https://docs.snowflake.com/en/sql-reference/constructs/changes)  The `current` and `added` read modes in [Python Transforms](/docs/foundry/transforms-python/incremental-usage/#incrementaltransforminput) are supported. These will expose the relevant rows of the change feed based on the `METADATA$ACTION` column. The `METADATA$ACTION`, `METADATA$ISUPDATE`, `METADATA$ROW_ID` columns will be made available in Python Transforms.

### Privileges on source credentials

For full feature support, you should provide the following privileges to the [credentials](#authentication) configured for the source connection. You should apply these on either the database, schema, or table depending on the desired inheritance model.

| Category | Privilege | Notes |
| --- | --- | --- |
| Prerequisite | `USAGE` | Must be granted on the Snowflake databases and schemas that will be used in Foundry. |
| Read | `SELECT` | Required to read Snowflake tables when using syncs or virtual table inputs. |
| Edit | `DELETE`, `INSERT`, `TRUNCATE`, `UPDATE` | Required to modify Snowflake tables when using virtual table outputs. |
| Create | `CREATE SCHEMA`, `CREATE TABLE` | Required to create Snowflake tables when using virtual table outputs. |

When using Iceberg tables, `USAGE` privilege is required on the external volume where the table is stored.

Additionally, the credentials provided must have usage privileges on the warehouse provided in the source configuration.

Refer to the [official Snowflake documentation ↗](https://docs.snowflake.com/en/user-guide/security-access-control-privileges) for more information on access control privileges in Snowflake.

### Source configuration requirements

When using [virtual tables](/docs/foundry/data-integration/virtual-tables/), remember the following source configuration requirements:

* You must use a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker) source. Virtual tables do not support use of [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker) connections.
* Ensure that bi-directional connectivity and allowlisting is established as described in the [Networking section of this documentation](#networking).
* If using virtual tables in Code Repositories, refer to the [Virtual Tables documentation](/docs/foundry/data-integration/virtual-tables/#virtual-tables-in-code-repositories) for details of additional source configuration required.
* You must specify a warehouse in the connection details.
* The credentials provided must have usage privileges on the warehouse.

See the [Connection Details](#connection-details) section above for more details.

## Compute pushdown

Foundry offers the ability to push down compute to Snowflake when using virtual tables. Virtual table inputs leverage the [Snowflake Spark connector ↗](https://docs.snowflake.com/en/user-guide/spark-connector) which has built-in support for predicate pushdown.

When using Snowflake virtual tables registered to the same source as inputs and outputs to a pipeline, it is possible to fully federate compute to Snowflake. To push down compute to Snowflake, review the [Python documentation](/docs/foundry/transforms-python/tables-snowflake/) for details. To push down compute to Snowflake in Pipeline Builder, review the [External pipelines documentation](/docs/foundry/building-pipelines/create-external-pipeline-pb/).

## Use Snowflake sources in code

You can use [pro-code alternatives](/docs/foundry/data-connection/core-concepts/#use-in-code) to connect to Snowflake sources for more complex scenarios.

The examples below demonstrate how to connect to a Snowflake source using the [Snowflake Connector for Python ↗](https://docs.snowflake.com/developer-guide/python-connector/python-connector) (`snowflake-connector-python`) in an [external transform](/docs/foundry/data-connection/external-transforms/). Authentication is handled via [OIDC](/docs/foundry/data-connection/oidc/), which provides short-lived OAuth tokens without the need for static Snowflake credentials.

### Read from Snowflake with an external transform

This example reads data from a Snowflake table using OIDC-based OAuth credentials.

```python
import polars as pl
from transforms.api import transform, Output, LightweightOutput
from transforms.external.systems import ResolvedSource, external_systems, Source
import snowflake.connector


@external_systems(
    snowflake_source=Source("<source_rid>")
)
@transform.using(
    output=Output("<output_dataset_rid>")
)
def read_from_snowflake(output: LightweightOutput, snowflake_source: ResolvedSource):
    conn = snowflake.connector.connect(
        authenticator="oauth",
        token=snowflake_source.get_session_credentials().get().access_token,
        account="<account_identifier>",
        warehouse="<warehouse_name>",
        database="<database_name>",
    )

    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM my_table LIMIT 100")
        columns = [col[0] for col in cursor.description]
        rows = cursor.fetchall()
    finally:
        cursor.close()
        conn.close()

    df = pl.DataFrame(rows, schema=columns)
    output.write_table(df)
```

### Write to Snowflake with an external transform

This example exports data from a Foundry dataset to a Snowflake table.

```python
import polars as pl
from transforms.api import transform, Input, Output, LightweightOutput
from transforms.external.systems import ResolvedSource, external_systems, Source
import snowflake.connector


@external_systems(
    snowflake_source=Source("<source_rid>")
)
@transform.using(
    output=Output("<output_dataset_rid>"),
    source_data=Input("<input_dataset_rid>"),
)
def write_to_snowflake(output: LightweightOutput, snowflake_source: ResolvedSource, source_data):
    conn = snowflake.connector.connect(
        authenticator="oauth",
        token=snowflake_source.get_session_credentials().get().access_token,
        account="<account_identifier>",
        warehouse="<warehouse_name>",
        database="<database_name>",
    )

    cursor = conn.cursor()
    try:
        df = source_data.dataframe()
        for row in df.iter_rows(named=True):
            cursor.execute(
                "INSERT INTO my_table (col1, col2) VALUES (%s, %s)",
                (row["col1"], row["col2"]),
            )
    finally:
        cursor.close()
        conn.close()

    output.write_table(df)
```

:::callout{theme="neutral"}
For more details on using session credentials with OIDC-enabled sources, review the [Sources in Python](/docs/foundry/data-connection/sources-in-python/#session-credentials) documentation.
:::

## Data model

Note that columns of type [`array` ↗](https://docs.snowflake.com/en/sql-reference/data-types-semistructured#array), [`object` ↗](https://docs.snowflake.com/sql-reference/data-types-semistructured#object), and [`variant` ↗](https://docs.snowflake.com/sql-reference/data-types-semistructured#variant) will be parsed by Foundry as type `string`. This is due to the source's variable typing.

For example, the Snowflake array `[ 1, 2, 3 ]` would be interpreted by Foundry as the string `"[1,2,3]"`.

See Snowflake's [official documentation ↗](https://docs.snowflake.com/user-guide/spark-connector-use#from-snowflake-to-spark-sql)for more details.
