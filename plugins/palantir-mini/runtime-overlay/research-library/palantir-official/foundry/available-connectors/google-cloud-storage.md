---
sourceUrl: "https://www.palantir.com/docs/foundry/available-connectors/google-cloud-storage/"
canonicalUrl: "https://palantir.com/docs/foundry/available-connectors/google-cloud-storage/"
sourceLastmod: "2026-05-12T17:06:26.147Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "5da5f6598c321d1ff805f69a5cbeda8e9e4460755adfdc076f3ca186165d57ca"
product: "foundry"
docsArea: "available-connectors"
locale: "en"
upstreamTitle: "Documentation | Available connectors > Google Cloud Storage"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Google Cloud Storage

Connect Foundry to Google Cloud Storage to sync files between Foundry datasets and storage buckets.

## Supported capabilities

| Capability  | Status |
|--- |--- |
| Exploration | 🟢 Generally available |
| Bulk import | 🟢 Generally available |
| Incremental | 🟢 Generally available |
| [Virtual tables](/docs/foundry/data-integration/virtual-tables/) | 🟢 Generally available |
| Export tasks | 🟡 Sunset |
| [File exports](/docs/foundry/data-connection/export-overview/#file-exports) | 🟢 Generally available |

## Data model

The connector can transfer files of any type into Foundry datasets. File formats are preserved, and no schemas are applied during or after the transfer. Apply any necessary schema to the output dataset, or [write a downstream transformation](/docs/foundry/pipeline-builder/transforms-overview/) to access the data.

## Performance and limitations

There is no limit to the size of transferable files. However, network issues can result in failures of large-scale transfers. In particular, direct cloud syncs that take more than two days to run will be interrupted. To avoid network issues, we recommend using smaller file sizes and limiting the number of files that are ingested in every execution of the sync. Syncs can be [scheduled](/docs/foundry/data-connection/set-up-sync/#build-or-schedule-your-batch-sync) to run frequently.

## Setup

1. Open the [Data Connection](/docs/foundry/data-connection/overview/) app and select **+ New Source** in the upper right corner of the screen.
2. Select **Google Cloud Storage** from the available connector types.
3. Choose to run the source capabilities on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker) or on an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker).
4. Follow the additional configuration prompts to continue the set up of your connector using the information in the sections below.

Learn more about [setting up a connector](/docs/foundry/data-connection/set-up-source/) in Foundry.

:::callout{theme="warning"}
You must have a [Google Cloud IAM service account ↗](https://cloud.google.com/iam/docs/overview#service_account0) to proceed with Google Cloud Storage authentication and set up.
:::

### Authentication

The following roles are required on the bucket being accessed:

* `Storage Object Viewer`: Read data.
* `Storage Object Creator`: Export data to Google Cloud Storage.
* `Storage Object Admin`: Required for deleting files from Google Cloud Storage after importing them into Foundry, and also for exports with incremental datasets that use UPDATE transactions and overwrite files.

Learn more about required roles in the [Google Cloud documentation on access control ↗](https://cloud.google.com/storage/docs/access-control/iam-roles).

Choose from one of the available authentication methods:

* **GCP instance:** Refer to the [Google Cloud documentation ↗](https://cloud.google.com/compute/docs/access/create-enable-service-accounts-for-instances#using) for information on how to set up instance-based authentication.
  * Note that GCP instance authentication only works for connectors operating through agents that run on appropriately configured instances in GCP.

* **JSON credentials:** Refer to the [Google Cloud documentation ↗](https://cloud.google.com/iam/docs/creating-managing-service-account-keys#creating) for information on how to create and download a JSON service account key file.

* **PKCS8 auth:** Requires entering specific credential information from the JSON service account key file. Refer to the [Google Cloud documentation ↗](https://cloud.google.com/iam/docs/creating-managing-service-account-keys#creating) for information on creating the key file.

* **Workload Identity Federation (OIDC):** Follow the displayed source system configuration instructions to set up OIDC. Refer to the [Google Cloud Documentation ↗](https://cloud.google.com/iam/docs/workload-identity-federation-with-other-providers) for details on Workload Identity Federation and [our documentation](/docs/foundry/data-connection/oidc/) for details on how OIDC works with Foundry.

### Networking

The Google Cloud Storage connector requires network access to the following domains on port 443:

* `storage.googleapis.com`
* `oauth2.googleapis.com` (only required when using JSON credentials or PKCS8 auth)
* `sts.googleapis.com` (only required when using Workload Identity Federation)
* `iamcredentials.googleapis.com` (only required when using Workload Identity Federation)

## Configuration options

The following configuration options are available for the Google Cloud Storage connector:

| Option  | Required?  | Description |
|--- |--- |---  |
| `Project Id` | Yes |   The ID of the Project containing the Cloud Storage bucket. |
| `Bucket name` | Yes |  The name of the bucket to read/write data to and from.|
| `Credentials settings` | Yes |  Configure using the [Authentication](#authentication) guidance shown above. |
| `Proxy settings` | No | Enable to use a proxy while connecting to Google Cloud Storage.|

## Sync data from Google Cloud Storage

The Google Cloud Storage connector uses the file-based sync interface. See documentation on [configuring file-based syncs](/docs/foundry/data-connection/file-based-syncs/).

## Virtual tables

This section provides additional details around using [virtual tables](/docs/foundry/data-integration/virtual-tables/) from Google Cloud Storage source. This section is not applicable when syncing to Foundry datasets.

The table below highlights the virtual table capabilities that are supported for Google Cloud Storage.

| Capability | Status |
| --- | --- |
| Bulk registration | 🔴 Not available |
| Automatic registration | 🔴 Not available |
| Table inputs | 🟢 Generally available: [Avro ↗](https://avro.apache.org/), [Delta ↗](https://docs.delta.io/latest/), [Iceberg ↗](https://iceberg.apache.org/), [Parquet ↗](https://parquet.apache.org/) in [Code Repositories](/docs/foundry/code-repositories/overview/), [Pipeline Builder](/docs/foundry/pipeline-builder/overview/) |
| Table outputs | 🟢 Generally available: [Avro ↗](https://avro.apache.org/), [Delta ↗](https://docs.delta.io/latest/), [Iceberg ↗](https://iceberg.apache.org/), [Parquet ↗](https://parquet.apache.org/) in [Code Repositories](/docs/foundry/code-repositories/overview/), [Pipeline Builder](/docs/foundry/pipeline-builder/overview/) |
| Incremental pipelines | 🟢 Generally available for Delta tables: `APPEND` only ([details](#delta))<br /> 🟢 Generally available for Iceberg tables: `APPEND` only ([details](#iceberg))<br /> 🔴 Not available for Parquet tables |
| Compute pushdown | 🔴 Not available |

Consult the [virtual tables documentation](/docs/foundry/data-integration/virtual-tables/#supported-foundry-workflows) for details on the supported Foundry workflows where tables stored in Google Cloud Storage can be used as inputs or outputs.

### Source configuration requirements

When using [virtual tables](/docs/foundry/data-integration/virtual-tables/), remember the following source configuration requirements:

* You must use a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker) source. Virtual tables do not support use of [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker) connections.
* Ensure that bi-directional connectivity and allowlisting is established as described in the [Networking section of this documentation](#networking).
* If using virtual tables in Code Repositories, refer to the [virtual tables documentation](/docs/foundry/data-integration/virtual-tables/#virtual-tables-in-code-repositories) for details of additional source configuration required.
* When setting up the source credentials, you must use one of `JSON credentials`, `PKCS8 auth` or `Workload Identity Federation (OIDC)`. Other credential options are not supported when using virtual tables.

### Delta

To enable incremental support for pipelines backed by virtual tables, ensure that [Change Data Feed ↗](https://docs.databricks.com/delta/delta-change-data-feed.html#enable-change-data-feed) is enabled on the source Delta table. The `current` and `added` read modes in [Python Transforms](/docs/foundry/transforms-python/incremental-usage/#incrementaltransforminput) are supported. The `_change_type`, `_commit_version` and `_commit_timestamp` columns will be made available in Python Transforms.

### Iceberg

An Iceberg catalog is required to load virtual tables backed by an Apache Iceberg table. To learn more about Iceberg catalogs, see the [Apache Iceberg documentation ↗](https://iceberg.apache.org/terms/). All Iceberg tables registered on a source must use the same Iceberg catalog.

Tables will be created using Iceberg metadata files in GCS. A `warehousePath` indicating the location of these metadata files must be provided when registering a table.

Incremental support relies on Iceberg [Incremental Reads ↗](https://iceberg.apache.org/docs/1.5.1/spark-queries/#incremental-read) and is currently append-only. The `current` and `added` read modes in [Python Transforms](/docs/foundry/transforms-python/incremental-usage/#incrementaltransforminput) are supported.

### Parquet

Virtual tables using Parquet rely on schema inference. At most 100 files will be used to determine the schema.

## Export data to Google Cloud Storage

The connector can copy files from a Foundry dataset to any location on the Google Cloud Storage bucket.

To begin exporting data, you must configure an export task. Navigate to the Project folder that contains the Google Cloud Storage connector to which you want to export. Right select on the connector name, then select `Create Data Connection Task`.

In the left panel of the Data Connection view:

1. Verify the `Source` name matches the connector you want to use.
2. Add an `Input` named `inputDataset`. The **input dataset** is the Foundry dataset being exported.
3. Add an `Output` named `outputDataset`. The **output dataset** is used to run, schedule, and monitor the task.
4. Finally, add a YAML block in the text field to define the task configuration.

:::callout{theme="neutral"}
The labels for the connector and input dataset that appear in the left side panel do not reflect the names defined in the YAML.
:::

Use the following options when creating the export task YAML:

| Option  | Required? | Description |
|---  |---  | --- |
| `directoryPath` | Yes | The directory in Cloud Storage where files will be written.|
| `excludePaths` | No | A list of regular expressions; files with names matching these expressions will not be exported. |
| `uploadConfirmation` | No | When the value is `exportedFiles`, the output dataset will contain a list of files that were exported.  |
| `retriesPerFile` | No | If experiencing network failures, increase this number to allow the export job to retry uploads to Cloud Storage before failing the entire job. |
| `createTransactionFolders` | No | When enabled, data will be written to a subfolder within the specified `directoryPath`. Every subfolder is based on the time the transaction was committed in Foundry and has a unique name for every exported transaction.|
| `threads` | No | Set the number of threads used to upload files in parallel. Increase the number to use more resources. Ensure that exports running on agents have enough resources on the agent to handle increased parallelization.|
| `incrementalType` | No | For datasets that are built incrementally, set to `incremental` to only export transactions that occurred since the previous export.|

Example task configuration:

```yaml
type: export-google-cloud-storage
directoryPath: directory/to/export/to
excludePaths:
  -  ^_.*
  - ^spark/_.*
uploadConfirmation: exportedFiles
incrementalType: incremental
retriesPerFile: 0
createTransactionFolders: true
threads: 0
```

After you configure the export task, select **Save** in the upper right corner.
