---
sourceUrl: "https://www.palantir.com/docs/foundry/iceberg/iceberg-byob/"
canonicalUrl: "https://palantir.com/docs/foundry/iceberg/iceberg-byob/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "592b2d8501095dd8d790a5aeb0c8e60e1fb57a234f38989d5a6d3cb996f84586"
product: "foundry"
docsArea: "iceberg"
locale: "en"
upstreamTitle: "Documentation | Iceberg storage architecture & settings > BYOB storage setup"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Configuring bring-your-own-bucket storage for Iceberg tables

This guide describes how to configure customer-managed storage buckets for use with Foundry Iceberg tables. These steps are only required if you are using bring-your-own-bucket (BYOB) storage. If you are using Foundry-managed storage, no additional configuration is needed.

Foundry supports BYOB storage on AWS (S3), Azure (ADLS), and Google (GCS).

## Step 1: Create your storage bucket

Provision your storage bucket ideally in the same region as your Foundry instance. While not required, this is recommended for optimal performance.

Configure appropriate network access on the storage account to permit connectivity from Foundry.

### AWS S3

1. Provision an S3 bucket.

2. Create an IAM role with the following permissions on the S3 bucket and the KMS key used to encrypt it:

   | Permission | Resource |
   |------------|----------|
   | `s3:DeleteObject` | S3 bucket |
   | `s3:GetObject` | S3 bucket |
   | `s3:ListBucket` | S3 bucket |
   | `s3:PutObject` | S3 bucket |
   | `kms:Decrypt` | KMS key |
   | `kms:Encrypt` | KMS key |
   | `kms:GenerateDataKey` | KMS key |
   | `sts:GetFederationToken` | — |

3. Create an IAM user or OIDC identity provider that can assume the role you created. You will use the IAM user's credentials or the OIDC provider's tokens when configuring the Data Connection source. See the [S3 source](/docs/foundry/available-connectors/amazon-s3/) documentation for more detail on supported authentication mechanisms.

### Azure ABFS

1. Provision a storage account and container.

2. Provision client credentials for authentication. See the [ABFS source documentation](/docs/foundry/available-connectors/onelake-and-azure-blob-filesystem/) documentation for more detail on supported authentication mechanisms.

   For Iceberg BYOB, configure the source with an ADLS endpoint on `dfs.core.windows.net`. `blob.core.windows.net` endpoints are not supported.

3. Grant the service principal access to the storage location:
   * Assign the **[Storage Blob Data Contributor ↗](https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/storage#storage-blob-data-contributor)** role on the container where data will be stored.
   * Ensure the service principal has at least **Delegator** permissions at the storage account level. Container-level permissions alone are not sufficient for Foundry.

### Google GCS

1. Provision a Google Cloud Storage bucket.

2. Create a Google Cloud IAM service account.

3. Grant the service account access to the bucket:
   * Assign **[Storage Object Admin ↗](https://cloud.google.com/storage/docs/access-control/iam-roles)** on the bucket to allow Foundry Iceberg to read, write, and delete Iceberg metadata and data files.
   * Assign **[Service Account Token Creator ↗](https://cloud.google.com/iam/docs/service-account-permissions#service_account_token_creator_role)** on the service account itself so Foundry can vend short-lived, scoped credentials to Iceberg clients.

4. Create either a JSON service account key or the equivalent PKCS8 credential values for the service account. These are the supported authentication methods when using a GCS source for BYOB Iceberg storage.

## Step 2: Create a Data Connection source

:::callout{theme="warning"}
BYOB sources and credentials are highly privileged. Configure them with restrictive access settings, such as by placing them in an administrator-only project. This limits who can access the credentials and prevents unauthorized modifications that could disrupt access to your BYOB Iceberg data.
:::

:::callout{theme="warning"}
When a bucket is used as a backing store for Iceberg tables, all egress policies configured on the bucket become available to workflows that access those tables. User-written code in those workflows will be allowed to egress to the destinations permitted by those policies.
:::

Once your bucket is provisioned, create a [Data Connection](/docs/foundry/data-connection/overview/) source to connect Foundry to your storage. Configuring a source for BYOB use requires the **Owner** role on the source. If you do not have the Owner role, contact a source owner or your platform administrator to update these settings. For more information, see [Source permissions](/docs/foundry/data-connection/permissions/#sources).

1. In Data Connection, create a new source (either [S3](/docs/foundry/available-connectors/amazon-s3/), [ABFS](/docs/foundry/available-connectors/onelake-and-azure-blob-filesystem/), or [Google Cloud Storage](/docs/foundry/available-connectors/google-cloud-storage/)) using the credentials you provisioned.
2. Optional: Specify a base path prefix for your Iceberg tables by appending it to the source URL (for example, `s3://bucket-name/base-path/`). If no base path is provided in the source, Foundry will set `foundry-iceberg` as the Iceberg base path. **Do not modify the base path after configuring the source as an Iceberg storage location**, as this may disrupt access to existing tables.
3. Use an authentication method supported by the selected source:
   * **For ADLS and S3:** any authentication mechanism that Data Connection offers is supported, including `access key and secret` or `OIDC`.
   * **For GCS:** `JSON credentials` or `PKCS8 auth` are the supported options.
4. Enable the **Enable exports to this source** setting on the source.

:::callout{theme="neutral"}
Leave the **Code import configuration** settings disabled. These settings are not required to use Foundry Iceberg in those contexts.
:::

:::callout{theme="neutral" title="Security consideration"}
Do not grant credentials to the storage bucket directly to Iceberg clients or other tools. Instead, leverage credential vending through the Foundry Iceberg catalog to provide scoped, short-lived access. See [Access delegation & credential vending](/docs/foundry/iceberg/authentication/#access-delegation--credential-vending) for more information.
:::

## Step 3: Add the bucket in Control Panel

After creating your Data Connection source, add the bucket to your Iceberg storage configuration in Control Panel. See [Configuring storage locations](/docs/foundry/iceberg/iceberg-settings/#configuring-storage-locations) for instructions.
