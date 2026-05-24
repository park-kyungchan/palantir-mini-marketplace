---
sourceUrl: "https://www.palantir.com/docs/foundry/available-connectors/databricks/"
canonicalUrl: "https://palantir.com/docs/foundry/available-connectors/databricks/"
sourceLastmod: "2026-05-12T17:06:26.147Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "62ac257fca6446b0b98e85400cf0f62fdfcdefdf43223963f1e2cee1e03888d9"
product: "foundry"
docsArea: "available-connectors"
locale: "en"
upstreamTitle: "Documentation | Available connectors > Databricks"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Databricks

Connect Foundry to Databricks to leverage a range of capabilities on top of data, compute, and models available within Databricks.

## Supported capabilities

| Capability | Status |
| --- |--- |
| Exploration | 🟢 Generally available |
| Bulk import | 🟢 Generally available |
| Incremental | 🟢 Generally available |
| Virtual tables | 🟢 Generally available |
| Compute pushdown | 🟢 Generally available: Python transforms, Pipeline Builder |
| External models | 🟢 Generally available |

:::callout{theme="success"}
The Databricks connector now offers enhanced functionality when using virtual tables to expose the features of Delta Lake and Apache Iceberg. Refer to the [Virtual Tables](#virtual-tables) section of this documentation for information and details on how to configure the connector to enable this functionality.
:::

## Setup

1. Open the [Data Connection](/docs/foundry/data-connection/overview/) application and select **+ New Source** in the upper right corner of the screen.
2. Select **Databricks** from the available connector types.
3. Choose to run the source capabilities on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker) or on an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker).
4. Follow the additional configuration prompts to continue the setup of your connector using the information in the sections below.

Learn more about [setting up a connector](/docs/foundry/data-connection/set-up-source/) in Foundry.

### Connection details

The following configuration options are available for the Databricks connector:

| Option  | Required?  | Default | Description |
|--- |--- |--- |--- |
| `Hostname` | Yes | | The hostname of the Databricks workspace. |
| `HTTP Path` | Yes | | The Databricks compute resource’s HTTP Path value. This can be either a: <br><ul><li> SQL warehouse (recommended) of form `/sql/<version>/warehouses/<warehouseId>` <br><li> Compute cluster of form `sql/protocolv1/o/<workspaceId>/<clusterId>`</ul> |
| `Cloud Fetch` | Yes | True | Indicates whether Cloud Fetch should be enabled. Refer to the [Networking](#cloud-fetch) documentation below to ensure suitable network connectivity to the cloud storage locations. |

Refer to the [official Databricks documentation ↗](https://docs.databricks.com/integrations/compute-details.html) for information on how to obtain these values.

### Authentication

You can authenticate with Databricks in the following ways:

| Method  | Description  | Documentation |
|--- |--- |---  |
| `Basic authentication` \[Legacy] | Authenticate with a user account using username and password. Basic authentication is legacy and not recommended in production. | [Basic authentication ↗](https://docs.databricks.com/aws/en/dev-tools/auth) |
| `OAuth machine-to-machine` | Authenticate as a service principal using OAuth. Create a service principal in Databricks and generate an OAuth secret to obtain a client ID and secret. | [OAuth for service principals (OAuth M2M) ↗](https://docs.databricks.com/dev-tools/auth/oauth-m2m.html) |
| `Personal access token` | Authenticate as a user or service principal using a personal access token. | [Personal access tokens (PAT) ↗](https://docs.databricks.com/dev-tools/auth/pat.html). |
| `Workload identity federation` \[Recommended]| Authenticate as a service principal using workload identity federation. Workload identity federation allows workloads running in Foundry to access Databricks APIs without the need for Databricks secrets. Create a service principal federation policy in Databricks and follow the displayed instructions to allow the source to securely authenticate as a service principal.  | [Databricks OAuth token federation ↗](https://docs.databricks.com/aws/en/dev-tools/auth/oauth-federation#workload-identity-federation)<br></br>Refer to our [OIDC documentation](/docs/foundry/data-connection/oidc/) for an overview of how OpenID Connect (OIDC) is supported in Foundry. |

For full feature support, ensure that the credentials provided have been granted the [relevant privileges](#privileges-on-source-credentials) on the relevant catalog and compute resources.

:::callout{theme="neutral"}
When using OAuth machine-to-machine authentication in Azure Databricks, be sure to use your Databricks service principal client ID and secret. Authentication using a Microsoft Entra service principal is not supported. [Learn more about service principals in Azure Databricks. ↗](https://learn.microsoft.com/azure/databricks/admin/users-groups/service-principals)
:::

### Networking

For Databricks connections [running on Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker), the appropriate [egress policies](/docs/foundry/administration/configure-egress/) must be added when setting up the source in the [Data Connection application](/docs/foundry/data-connection/overview/). If you are using an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker), the server running the agent must have suitable network access.

:::callout{theme="neutral"}
Databricks connections typically open a large number of connections at the same time. When using [agent proxy egress policies](/docs/foundry/administration/configure-egress/#agent-proxy-egress-policies), you may exhaust the connection pool on your agent. If you experience connection pool errors, increase the `maxConnections` and `coreConnections` settings in your [agent proxy configuration](/docs/foundry/data-connection/agent-proxy/#connection-pool-configuration).
:::

The Databricks connector requires network access to the `Hostname` provided in the [configuration options](#connection-details) on port 443. This grants access for Foundry to connect to the Databricks workspace and Unity Catalog REST APIs.

#### Cloud Fetch

Cloud Fetch is a feature of the Databricks JDBC driver. Cloud Fetch enables parallel data extraction from Databricks to Foundry through cloud storage, delivering up to 10x faster performance compared to traditional single-threaded transfers.

When enabled, additional network policies may be needed to allow outbound connections to the cloud storage service (AWS S3, Azure Data Lake Storage, or Google Cloud Storage) where Databricks temporarily stores query results. If you are using a Foundry worker connection, egress policies will need to be created for the workspace storage bucket. This is the cloud storage location used by Cloud Fetch.

[Review Databricks' official documentation ↗](https://www.databricks.com/blog/2021/08/11/how-we-achieved-high-bandwidth-connectivity-with-bi-tools.html) for details.

#### External access to storage locations (virtual tables only)

The [Virtual Tables](#external-access) section of this documentation provides details on **external access** in Unity Catalog and the functionality it enables. External access requires network connectivity to a table's storage location (managed or external). Egress policies will need to be created for each storage location to benefit from the features enabled by external access.

Refer to the [official Databricks documentation ↗](https://docs.databricks.com/aws/en/external-access/) for more information on external access and how to determine the storage locations of tables.

:::callout{theme="neutral"}
When you configure egress policies for a storage location, this allows network traffic to egress from Foundry to that storage location. Additionally, you should ensure that any network controls on the storage location permit network traffic from Foundry. These network controls will vary depending on the cloud provider. [Learn more about identifying the IPs where Foundry traffic originates.](/docs/foundry/administration/configure-egress/#which-ips-do-connections-from-foundry-come-from)
:::

#### Examples

Below we provide example egress policies that may need to be configured to ensure network connectivity to Databricks.

| Type | URL | DNS | Port |
| --- | --- | --- | --- |
| Databricks workspace | `https://adb-5555555555555555.19.azuredatabricks.net/` | `adb-5555555555555555.19.azuredatabricks.net` | `443` |
| Azure storage location [<sup>\[1\]</sup>](#azure-storage-location) | `abfss://<container-name>@<account-name>.dfs.core.windows.net/<table-directory>` |`<account-name>.dfs.core.windows.net`<br></br>`<account-name>.blob.core.windows.net` | `443` |
| Google Cloud Storage (GCS) storage location | `gs://<bucket-path>/<table-directory>` | `storage.googleapis.com` | `443` |
| S3 storage location | `s3://<bucket-path>/<table-directory>` | `<bucket-path>.s3.<region>.amazonaws.com` | `443`

<span id="azure-storage-location"></span>\[1] Be sure to include both `blob.core.<endpoint>` and `dfs.core.<endpoint>` domains when configuring access to Azure storage locations. `endpoint` may vary depending on the Azure Cloud environment.

:::callout{theme="neutral"}
In a limited number of cases (depending on your Foundry and Databricks environments) it may be necessary to establish a connection via PrivateLink. This is typically the case where both Foundry and Databricks are hosted by the same CSP (for example, AWS-AWS or Azure-Azure.) If you believe this applies to your setup, contact your Palantir representative for additional guidance.
:::

:::callout{theme="neutral"}
For egress policies that depend on an S3 bucket in the same region as your Foundry instance, ensure you have completed the additional configuration steps detailed in our [Amazon S3 bucket policy documentation](/docs/foundry/administration/configure-egress/#amazon-s3-bucket-policies) for the affected bucket(s).
:::

### More options: SSL and hostname validation

You  may additionally need to pass in a JDBC property to allow self-signed certificates.

How to identify if this property is needed:

* SSL connections validate server certificates. Normally, SSL validations happen through a certificate chain. By default, both agent and Foundry workers trust most industry-standard certificate chains.
* If the server to which you are connecting has a self-signed certificate, or if a firewall performs TLS interception on the connection, the connector must trust the certificate. Learn more about [using certificates in agent-based connections](/docs/foundry/data-connection/agent-configuration-reference/#certificates).
* If you are creating a Foundry worker connection and are using a self-signed certificate, you will need to add a JDBC property for the `AllowSelfSignedCerts=1` property.

How to add the property allowing self-signed certificates:

* At the bottom of the **Connection details** page under **Connection settings** select **More options** then **JDBC properties**.
* Under **JDBC properties** configuration, select **Add property** then **New property** then enter `AllowSelfSignedCerts` as the key and `1` as the value.

:::callout{theme="neutral"}
When the `AllowSelfSignedCerts` property is set to `1`, SSL verification is disabled. In this case, the connector does not verify the server certificate against the trust store, and does not verify if the server's host name matches the common name or subject alternative names in the server certificate.

This JDBC property and others are outlined in the [Databricks driver documentation ↗](https://docs.databricks.com/aws/en/integrations/jdbc/). The JDBC properties outlined in this documentation are specific to the Databricks driver and will differ from other source types.
:::

:::callout{theme="warning"}
The server must provide the full certificate chain in order for SSL verification to work. The certificate chain for the Databricks server can be obtained by running the command `openssl s_client -connect {hostname}:{port} -showcerts`. To verify the certificate chain, use the OpenSSL command line utility or any other available tool.
:::

## Virtual tables

[Virtual tables](/docs/foundry/data-integration/virtual-tables/) allow you to connect to data registered in Databricks Unity Catalog. This allows you to both read and write to tables in Databricks from Foundry as well as push down compute to Databricks from pipelines in Foundry. This section provides additional details around using virtual tables with Databricks. This section is not applicable when syncing to Foundry datasets.

<a id="external-access"></a>

:::callout{theme="neutral"}
The Databricks connector now offers enhanced functionality when using virtual tables to expose the features of Delta Lake and Apache Iceberg. This functionality requires **external access** to be enabled in Unity Catalog. When enabled, external access allows Foundry to access tables using the Unity REST API and Iceberg REST catalog, and read and write data in the underlying storage locations. Unity Catalog credential vending is used to ensure secure access to cloud object storage. In addition to enhanced functionality, this can also improve the performance of reads and writes against these tables.

<br><br>
The Databricks connector automatically exposes Delta Lake and Apache Iceberg functionality if you:

1. Enable external access in Unity Catalog.
2. Configure [network egress policies](/docs/foundry/administration/configure-egress/) that allow connectivity from Foundry to the table's storage location.
3. Configure credentials on the source that can obtain vended credentials from Unity Catalog.

Connections to read or write tables will be made to the storage location directly using Delta Lake or Apache Iceberg clients. Databricks compute will not be used to read or write to the tables. The Unity Catalog REST APIs will be used for certain metadata operations such as determining the type of table being accessed.

Refer to the [official Databricks documentation ↗](https://docs.databricks.com/aws/en/external-access/) for more information on external access and how to determine the storage locations of tables. Refer to the [Networking](#networking) section of this documentation for details on enabling network access to storage locations.

If any of the above requirements are not met, or if the format of the Unity Catalog object is not supported for external access (for example, views or materialized views), connections to Databricks will be made using JDBC. JDBC is the same mechanism used for [syncs](/docs/foundry/data-connection/set-up-sync/). Virtual table outputs require external access and are not supported using JDBC. Refer to the [official Databricks documentation ↗](https://docs.databricks.com/aws/en/integrations/jdbc/) for more information on JDBC connectivity to Databricks.
:::

The table below highlights the virtual table capabilities that are supported for Databricks.

| Capability | Status |
| --- | --- |
| Bulk registration | 🟢 Generally available |
| Automatic registration | 🟢 Generally available |
| Table inputs | 🟢 Generally available: [Code Repositories](/docs/foundry/code-repositories/overview/), [Pipeline Builder](/docs/foundry/pipeline-builder/overview/) |
| Table outputs | 🟢 Generally available: [Code Repositories](/docs/foundry/code-repositories/overview/), [Pipeline Builder](/docs/foundry/pipeline-builder/overview/) |
| Incremental pipelines  | 🟢 Generally available [<sup>\[2\]</sup>](#incremental-pipelines) |
| Compute pushdown | 🟢 Generally available: [Python transforms](/docs/foundry/transforms-python/tables-databricks/), [Pipeline Builder](/docs/foundry/building-pipelines/create-external-pipeline-pb/) |

Consult the [virtual tables documentation](/docs/foundry/data-integration/virtual-tables/#supported-foundry-workflows) for details on the supported Foundry workflows where Databricks tables can be used as inputs or outputs. Functionality may vary depending on whether [external access](#external-access) is enabled.

### Table format and storage locations

The following table provides a summary of the supported formats and workflows when external access is or is not enabled.

| Unity Catalog object | External access required | Format | Table inputs |Table outputs |
| --- | --- | --- | --- | --- |
| Managed table | Yes | [Avro ↗](https://avro.apache.org/), [Delta ↗](https://docs.delta.io/latest/), [Parquet ↗](https://parquet.apache.org/) | ✔️ |
| Managed table | Yes | [Iceberg ↗](https://iceberg.apache.org/) | ✔️ | ✔️ |
| External table | Yes | Delta | ✔️ | ✔️ |
| External table | Yes | Avro, Parquet | ✔️ |
| Managed table | No | [Table ↗](https://docs.databricks.com/aws/en/tables/), [View ↗](https://docs.databricks.com/aws/en/views/), Materialized view | ✔️ | |
| External table | No | Table, view, materialized view | ✔️ | |

<span id="incremental-pipelines">\[2]</span> To enable incremental support for Spark pipelines backed by Databricks virtual tables, external access must be enabled; incremental computation requires the ability to directly interact with Delta or Iceberg tables. Incremental compute on top of Delta tables relies on [Change Data Feed ↗](https://docs.databricks.com/en/delta/delta-change-data-feed.html#enable-change-data-feed). Incremental compute on top of Iceberg tables relies on [Incremental Reads ↗](https://iceberg.apache.org/docs/latest/spark-queries/#incremental-read).

### Privileges on source credentials

For full feature support, we recommend providing the following privileges to the [credentials](#authentication) provided for the source connection. These should be applied on either the catalog, schema, or table depending on the desired inheritance model.

| Category | Privilege | Notes |
| --- | --- | --- |
| Prerequisite | `USE CATALOG`, `USE SCHEMA` | Must be granted on the Databricks catalogs and schemas that will be used in Foundry. |
| Metadata | `BROWSE` | Required to explore source and register tables. |
| Read | `SELECT` | Required to read Databricks tables when using syncs or virtual table inputs. |
| Edit | `MODIFY` | Required to modify Databricks tables when using virtual table outputs. |
| Create | `CREATE SCHEMA`, `CREATE TABLE` | Required to create Databricks tables when using virtual table outputs. |
| Other | `EXTERNAL USE SCHEMA` | Enables external access to storage locations. Refer to [external access](#external-access) for more details. |

When using external tables, we recommend granting `BROWSE`, `CREATE EXTERNAL TABLE`, and `EXTERNAL USE LOCATION` privileges on the external locations being used. These are required when using virtual table outputs to create external tables.

Additionally, the credentials provided must have usage privileges on the warehouse or compute cluster provided in the source configuration.

Refer to the [official Databricks documentation ↗](https://docs.databricks.com/aws/en/data-governance/unity-catalog/manage-privileges/privileges) for more information on managing privileges in Unity Catalog.

### Source configuration requirements

When using [virtual tables](/docs/foundry/data-integration/virtual-tables/), remember the following source configuration requirements:

* You must use a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker) source. Virtual tables do not support use of [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker) connections.
* Ensure that bi-directional connectivity and allowlisting is established as described in the [Networking section of this documentation](#networking), including the recommended networking to storage locations.
* If using virtual tables in Code Repositories, refer to the [Virtual Tables documentation](/docs/foundry/data-integration/virtual-tables/#virtual-tables-in-code-repositories) for details of additional source configuration required.
* You must specify a warehouse or compute cluster in the connection details using the `HTTP path` field. Refer to the [official Databricks documentation ↗](https://docs.databricks.com/en/integrations/compute-details.html) on getting connection details for a Databricks compute resource.

See the [Connection Details](#connection-details) section above for more details.

## Compute pushdown

Foundry offers the ability to push down compute to Databricks when using virtual tables. When using Databricks virtual tables registered to the same source as inputs and outputs to a pipeline, it is possible to fully federate compute to Databricks. See the [Python documentation](/docs/foundry/transforms-python/tables-databricks/) for details on how to push down compute to Databricks in Python Transforms. To push down compute to Databricks in Pipeline Builder, review the [External pipelines documentation.](/docs/foundry/building-pipelines/create-external-pipeline-pb/).

## External models

Databricks models registered in Unity Catalog can be integrated to Foundry via:

* [Externally-hosted models](/docs/foundry/integrate-models/external-model-connection/)
* [External transforms](/docs/foundry/data-connection/external-transforms/)

Refer to the [official Databricks documentation ↗](https://docs.databricks.com/aws/en/machine-learning/manage-model-lifecycle/#train-and-register-unity-catalog-compatible-models) for more information on making models available in Unity Catalog, and to the [guide](/docs/foundry/integrate-models/external-model-connection-databricks/) on setting up Databricks external models in Foundry.
