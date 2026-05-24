---
sourceUrl: "https://www.palantir.com/docs/foundry/available-connectors/aws-redshift/"
canonicalUrl: "https://palantir.com/docs/foundry/available-connectors/aws-redshift/"
sourceLastmod: "2026-05-12T17:06:26.147Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "ad8f3522aa048c3fef789add17195855bdda82bb98f2c2083190dbf939166297"
product: "foundry"
docsArea: "available-connectors"
locale: "en"
upstreamTitle: "Documentation | Available connectors > AWS Redshift"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# AWS Redshift

Connect Foundry to Amazon Redshift to read and write data between Redshift databases and Foundry datasets.

## Supported capabilities

| Capability  | Status |
|--- |--- |
| Exploration | 🟢 Generally available|
| Batch syncs | 🟢 Generally available |
| Incremental | 🟢 Generally available |
| [Table exports](/docs/foundry/data-connection/export-overview/#table-exports) | 🟢 Generally available |

## Data model

The connector transfers relational data from Redshift tables into Foundry datasets. Schemas and data types are preserved during transfer. You can also export Foundry datasets to Redshift tables.

## Performance and limitations

Performance depends on the size of your Redshift cluster and network conditions. Foundry uses Redshift's efficient data transfer mechanisms to optimize performance.

:::callout{theme="warning"}
Network connectivity between your Foundry instance and AWS Redshift cluster is required. This may require VPC peering, AWS PrivateLink, or public Internet access with proper security configurations.
:::

## Setup

1. Open the [Data Connection](/docs/foundry/data-connection/overview/) application and select **+ New Source** in the upper right corner of the screen.
2. Select **AWS Redshift** from the available connector types.
3. Choose to run the source capabilities on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker) or on an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker).
4. Follow the additional configuration prompts to continue the setup of your connector using the information in the sections below.

Learn more about [setting up a connector](/docs/foundry/data-connection/set-up-source/) in Foundry.

## Configuration options

The following configuration options are available for the AWS Redshift connector:

| Option  | Required?  | Description |
|--- |--- |---  |
| `Endpoint` | Yes | The endpoint to use to access Redshift (for example, redshift.us-east-1.amazonaws.com) |
| `Port` |  Yes  |  The port to connect to Redshift (default: 5439)  |
| `Database` |  Yes  |  The name of the Redshift database  |
| `Username` |  Yes  |  Username for authentication  |
| `Password` |  Yes  |  Password for authentication  |
| `JDBC properties` | No | Add property names and values to configure connection behavior. Learn more about [JDBC properties](#jdbc-properties) below. |

### JDBC properties

You can optionally add [properties ↗](https://docs.aws.amazon.com/redshift/latest/mgmt/jdbc20-configuration-options.html) to your JDBC connection to configure behavior. Refer to the AWS documentation for additional available JDBC properties to add to your connection configuration.

## Cloud identity configuration

Cloud identity authentication allows Foundry to access resources in your AWS instance. Cloud identities are configured and managed at the [enrollment](/docs/foundry/administration/enrollments-and-organizations/) level in Control Panel. Learn how to [configure cloud identities](/docs/foundry/administration/configure-cloud-identities/).

When using cloud identity authentication, the Role ARN will be displayed in the credentials section. After selecting the **Cloud identity** credential option, you must also configure the following:

1. Configure an Identity and Access Management (IAM) role in the target Amazon AWS account.
2. Grant the IAM role access to the Redshift cluster to which you wish to connect. You can generally do this with a [bucket policy ↗](https://docs.aws.amazon.com/redshift/latest/mgmt/redshift-iam-authentication-access-control.html).
3. In the Redshift source configuration details, add the IAM role under the [Security Token Service (STS) role ↗](https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html) configuration. The cloud identity IAM role in Foundry will attempt to assume the [AWS Account IAM role ↗](https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html) when accessing Redshift.
4. [Configure a corresponding trust policy ↗](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_manage.html) to allow the cloud identity IAM role to assume the target AWS account IAM role.

## Table export configuration options

When exporting data to Redshift tables, records are inserted in batches for better performance. The default batch size is 1,000 records, but this can be configured up to 100,000 records per batch depending on your performance needs and data characteristics. For more information about table export configuration options, review our [documentation](/docs/foundry/data-connection/export-overview/#table-exports).
