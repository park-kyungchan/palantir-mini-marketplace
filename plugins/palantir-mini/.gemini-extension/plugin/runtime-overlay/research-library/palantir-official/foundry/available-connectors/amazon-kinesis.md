---
sourceUrl: "https://www.palantir.com/docs/foundry/available-connectors/amazon-kinesis/"
canonicalUrl: "https://palantir.com/docs/foundry/available-connectors/amazon-kinesis/"
sourceLastmod: "2026-05-12T17:06:26.147Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d395e7becbbbc9cd0ea0c8f3a607b5c6dde8174e48258eb3138b6cba0fc90cde"
product: "foundry"
docsArea: "available-connectors"
locale: "en"
upstreamTitle: "Documentation | Available connectors > Amazon Kinesis"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Amazon Kinesis

Connect Foundry to Amazon Kinesis to read data from a Kinesis stream into a Foundry stream in realtime.

## Supported capabilities

|Capability	|Status	|
|---	|---	|
| Exploration | 🟢 Generally available |
| Streaming syncs | 🟢 Generally available |
| [Streaming exports](/docs/foundry/data-connection/export-overview/#streaming-exports) | 🟢 Generally available |

## Data model

| partition\_key (string) | data (string)                              | kinesis\_ingestion\_timestamp (timestamp) | foundry\_ingestion\_timestamp (timestamp)
|---                     |---                                          |---                          |---
| London                 | {"firstName": "John", "lastName": "Doe"}    | 2023-07-12T15:12:42.371Z    | 2023-07-12T15:12:42.512Z
| Paris                  | {"firstName": "Jean", "lastName": "DuPont"} | 2023-07-12T15:12:42.418Z    | 2023-07-12T15:12:42.512Z

The Kinesis connector parses message contents into unicode strings. Use a downstream streaming transform (for example, `parse_json` in [Pipeline Builder](/docs/foundry/pipeline-builder/transforms-overview/)) to parse structured data.

* The `partition_key` column will contain the partition key that was used to post the message to Kinesis.
* The `kinesis_ingestion_timestamp` column will contain the timestamp when the message was posted to Kinesis.
* The `foundry_ingestion_timestamp` column will contain the timestamp when the message was ingested by Foundry.

## Performance and limitations

The connector always uses a single consumer thread per active shard on the source Kinesis stream.

Streaming syncs are meant to be consistent, long-running jobs. Any interruption to a streaming sync is a potential outage, depending on the expected outcomes.

Currently, streaming syncs have the following limitations:

* Jobs on [agent worker](/docs/foundry/data-connection/core-concepts/#foundry-worker) sources restart during maintenance windows (typically once a week) to pick up upgrades. Expected downtime is less than five minutes.
* Jobs on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker) sources restart at least once every 48 hours. Expected downtime is single-digit minutes (assuming resource availability allows jobs to restart immediately).

We recommend connecting through two agents per source to minimize downtime. Be sure the agents do not have overlapping maintenance windows.

## Message ordering

The Kinesis connector guarantees message delivery order for messages with the same `partition_key`. Messages with different `partition_key` values may be processed in any order.

## Setup

1. Open the [Data Connection](/docs/foundry/data-connection/overview/) application and select **+ New Source** in the upper right corner of the screen.
2. Select **Kinesis** from the available connector types.
3. Choose to run the source capabilities on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker) or on an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker).
   * If choosing agent worker, we recommend connecting through two agents per source to minimize downtime. Be sure the agents do not have overlapping maintenance windows.
4. Follow the additional configuration prompts to continue the set up of your connector using the information in the sections below.

Learn more about [setting up a connector](/docs/foundry/data-connection/set-up-source/) in Foundry.

### Connection settings

|Parameter	|Required?	|Default	|Description	|
|---	    |---	    |---	    |---	        |
|AWS Region	|Yes	    | us-east-1	| The AWS region your Kinesis stream is in.

### Authentication

Select an authentication method for your Kinesis connection: [AWS Instance](#aws-instance) or [Static Credentials](#static-credentials).

Below is a sample IAM policy with examples of the permissions required to read from and write to specified kinesis streams.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadKinesisStream",
      "Effect": "Allow",
      "Action": [
        "kinesis:ListShards",
        "kinesis:GetShardIterator",
        "kinesis:GetRecords",
        "kinesis:DescribeStream"
      ],
      "Resource": "arn:aws:kinesis:us-east-1:123456789012:stream/read-stream-name"
    },
    {
        "Sid": "WriteKinesisStream",
        "Effect": "Allow",
        "Action": [
            "kinesis:PutRecords"
        ],
        "Resource": "arn:aws:kinesis:us-east-1:123456789012:stream/write-stream-name"
    }
  ]
}
```

#### AWS Instance

:::callout{theme="neutral"}
AWS instance authentication is only available when running the connection on an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker), not when running on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker).
:::

When your Foundry agent is running on an AWS resource with a provisioned IAM role (e.g. an EC2 instance), the Kinesis connector will use the provisioned IAM role to connect to Kinesis streams. No additional configuration is required.

#### Static Credentials

Static Credentials refers to standard AWS authentication with an Access Key ID and Secret Access Key tied to an IAM user.

|Parameter              |Required?  |Default
|-----                  |----       |----
|Access Key ID	        |Yes	    | No	    |
|Secret Access Key	    |Yes	    | No	    |

### STS Role

The Kinesis connector can optionally assume an STS role before connecting to a Kinesis stream. Refer to the [AWS documentation ↗](https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html) for details about these parameters.

|Parameter              |Required?  |Default
|-----                  |----       |----
|Role ARN	            |Yes	    | No	    |
|Role session name	    |Yes	    | No	    |
|Role session duration  |Yes        | 900       |
|External ID            |No         | No        |

### Networking

The connector must have access to the AWS Kinesis API and optionally the AWS STS API if using an STS role.

* **Kinesis API:** `https://kinesis.<region>.amazonaws.com`
* **STS API:** `https://sts.<region>.amazonaws.com`

## Sync data from Kinesis

Learn how to set up a sync with Kinesis in the [Set up a streaming sync](/docs/foundry/data-connection/set-up-streaming-sync/) tutorial.

## Export data to Kinesis

The connector supports exporting to external Kinesis streams in Data Connection.

To export to Kinesis, first [enable exports](/docs/foundry/data-connection/export-overview/#enable-exports-for-source) for your Kinesis connector. Then, [create a new export](/docs/foundry/data-connection/export-overview/#create-a-new-export).

### Export configuration options

| Option  | Required? | Default | Description |
|--- |--- |--- |--- |
| `Output stream ARN` | Yes | N/A  | The ARN of the Kinesis stream to which you want to export.
| `Partition column` | Yes | First String Column | The column that will be used to determine which shard a data record will belong to within the stream. This must be a string value, usually the primary key. Review the [AWS documentation ↗](https://docs.aws.amazon.com/streams/latest/dev/key-concepts.html) for more information.|
