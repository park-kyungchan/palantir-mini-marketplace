---
sourceUrl: "https://www.palantir.com/docs/foundry/available-connectors/pubsub/"
canonicalUrl: "https://palantir.com/docs/foundry/available-connectors/pubsub/"
sourceLastmod: "2026-05-12T17:06:26.147Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "c18b62ad11ecc1fbeda2df4aff0855ed9a9ac68d378dfae153623c5dece1cc4f"
product: "foundry"
docsArea: "available-connectors"
locale: "en"
upstreamTitle: "Documentation | Available connectors > Google Pub/Sub"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Google Pub/Sub

Connect Foundry to Google Pub/Sub to read data from a topic into a Foundry stream in realtime.

## Supported capabilities

|Capability |Status |
|--- |--- |
| Exploration | 🟢 Generally available |
| Streaming syncs | 🟢 Generally available |
| [Streaming exports](/docs/foundry/data-connection/export-overview/#streaming-exports) | 🟢 Generally available |

## Data model

The connector does not parse message contents, and data of any type can be synced into Foundry. All content is uploaded, unparsed, under the `data` column. Use a downstream streaming transform (for example, `parse_json` in [Pipeline Builder](/docs/foundry/pipeline-builder/transforms-overview/)) to parse the data. The `id` column will display the message ID received from Pub/Sub.

| id (string) | data (string) |
|---    |--- |
| 5986331692832221    | {"firstName": "John", "lastName": "Doe"} |
| 5986326266478130    | test-payload |

When setting up a sync, the schema of the dataset in Foundry **must match** the above schema.

## Performance and limitations

The connector uses a single-consumer thread to sync messages from Pub/Sub. When exporting data to Pub/Sub from Foundry, one thread is used per partition of the Foundry data stream.

:::callout{theme="neutral"}
Streaming syncs create a subscription based on the output dataset in Foundry. The credentials must have permissions to create subscriptions. If multiple imports are configured to read from the same topic, they will each create their own subscription and read all the messages on the topic.
:::

Streaming syncs are meant to be consistent, long-running jobs. Any interruption to a streaming sync is a potential outage, depending on expected outcomes.

Consider the following before setting up streaming syncs in Foundry:

* Jobs running on an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker) will restart during maintenance windows (typically once a week) to pick up upgrades. Expected downtime during these restarts is less than five minutes.
* Jobs running on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker) restart at least once every 48 hours. Expected downtime is less than ten minutes, assuming resource availability allows jobs to immediately restart.

## Setup

1. Open the [Data Connection](/docs/foundry/data-connection/overview/) application and select **+ New Source** in the upper right corner of the screen.
2. Select **Pub/Sub** from the available connector types.
3. Choose to run the source capabilities on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker) or on an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker).
4. Follow the additional configuration prompts to continue the setup of your connector using the information in the sections below.

Learn more about [setting up a connector](/docs/foundry/data-connection/set-up-source/) in Foundry.

### Authentication

Choose between two available authentication methods:

* **GCP instance account:** Refer to the [Google Cloud documentation ↗](https://cloud.google.com/compute/docs/access/create-enable-service-accounts-for-instances#using) to learn how to set up instance-based authentication.
  * Note that GCP instance authentication only works for connections operating through agents that run on appropriately configured instances in GCP.

* **Service account key file:** Refer to the [Google Cloud documentation ↗](https://cloud.google.com/bigquery/docs/authentication/service-account-file) to learn how to set up service account key file authentication. The key file can be provided as **JSON** or **PKCS8** credentials.

Configured credentials must have access to the following:

* For syncs:
  * `roles/pubsub.viewer`
  * `roles/pubsub.subscriber`
  * `projects.subscriptions.create`
* For exports:
  * `roles/pubsub.publisher`

## Connection details

The following configuration options are available for the Pub/Sub connector:

| Option  | Required?  | Description |
|--- |--- |---  |
| `Project ID` | Yes |   The ID of the Project in GCP. |
| `Credentials settings` | Yes |  Configure using the [Authentication](#authentication) guidance shown above. |
| `Proxy settings` | No | Enable to allow a proxy connection to Pub/Sub.|
| `GRPC Settings` | No\* |  Advanced settings used to configure GRPC channels. |

## Sync data from Pub/Sub

Learn how to set up a sync with Pub/Sub in the [Set up a streaming sync](/docs/foundry/data-connection/set-up-streaming-sync/) tutorial.

When setting up a sync, the schema of the dataset **must match** the schema described in the [data model section](#data-model) above.

## Export data to Pub/Sub

The connector supports exporting streams to Pub/Sub through Data Connection.

To export to Pub/Sub, first [enable exports](/docs/foundry/data-connection/export-overview/#enable-exports-for-source) for your Pub/Sub connector. Then, [create a new export](/docs/foundry/data-connection/export-overview/#create-a-new-export).

### Export configuration options

| Option  | Required? | Default | Description |
|--- |--- |--- |--- |
| `Topic` | Yes | N/A  | The Pub/Sub topic to which you want to export. |
| `Value Column` | No | N/A | If no value is specified here, the entire contents of the record on the Foundry stream will be written as a string to Pub/Sub. If specified, only the contents of the `Value Column` will be exported to Pub/Sub. |
