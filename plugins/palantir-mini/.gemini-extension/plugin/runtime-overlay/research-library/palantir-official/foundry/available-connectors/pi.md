---
sourceUrl: "https://www.palantir.com/docs/foundry/available-connectors/pi/"
canonicalUrl: "https://palantir.com/docs/foundry/available-connectors/pi/"
sourceLastmod: "2026-05-12T17:06:26.148Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "b3ae81d72079bbe73f5fa506d240a522dee84bfa62c65c4642485eae4898b8f3"
product: "foundry"
docsArea: "available-connectors"
locale: "en"
upstreamTitle: "Documentation | Available connectors > PI System"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# AVEVA PI System (formerly OSIsoft PI)

Connect Foundry to Aveva PI System (formerly known as OSIsoft PI Server) to read data.

## Supported capabilities

| Capability | Status |
| --- | --- |
| Exploration | 🟡 Beta |
| Bulk import | 🟡 Beta |
| Incremental | 🟡 Beta |
| Streaming | 🟡 Beta |
| Export tasks | 🟡 Beta |

## Interfacing

This connector leverages the [PI Web API ↗](https://docs.aveva.com/bundle/pi-web-api-reference/page/help/getting-started.html).

## Setup

1. Open the [Data Connection](/docs/foundry/data-connection/overview/) application and select **+ New Source** in the upper right corner of the screen.
2. Select **AVEVA PI** from the available connector types.
3. Choose to run the source capabilities on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker) or on an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker).
4. Follow the additional configuration prompts to continue the setup of your connector using the information in the sections below.

Learn more about [setting up a connector](/docs/foundry/data-connection/set-up-source/) in Foundry.

## Authentication

You can authenticate to PI System in the following ways:

1. **Username and password:** Provide a username and password. We recommend the use of service credentials rather than individual user credentials.
2. **Kerberos:** Provide the Kerberos configuration. (Only available if connecting [through an intermediary agent](/docs/foundry/data-connection/set-up-agent/))

## Networking

The connector (for instance, the agent when connecting through an agent) needs to have access to the Web API of the PI server. This is usually a connection over HTTPS (default port 443) to the provided URL.

## Data model

The PI System connector works through the [web API ↗](https://docs.aveva.com/bundle/pi-web-api-reference/page/help.html) and follows the concepts of [streams and values ↗](https://docs.aveva.com/bundle/pi-web-api-reference/page/help/getting-started.html#d472e893), unifying the data retrieval from [attributes ↗](https://docs.aveva.com/bundle/pi-web-api-reference/page/help/controllers/attribute.html) with a data reference and [PI points ↗](https://docs.aveva.com/bundle/pi-server-s-da-admin/page/1020357.html). Each row in the target dataset will be a value with metadata (name, path, webID, and so on) from the associated stream.

Additionally, the PI System connector's use of the web API means that the value of an attribute backed by static input (as opposed to backed by tag data) cannot be retrieve through streaming or bulk retrieval with temporal value target, but can be retrieved via a latest value bulk sync.

You can choose from four different target location types to specify which stream should be synced:

* **Attribute filter:** A dynamic filter crawling through the [Asset Framework ↗](https://www.aveva.com/en/perspectives/blog/easy-as-pi-asset-framework/) hierarchy from a provided path and filtering on additional patterns.
* **Tag name filter:** A dynamic filter on [PI Point ↗](https://docs.aveva.com/bundle/pi-server-s-da-admin/page/1020357.html) names on a specific [Data Server ↗](https://docs.aveva.com/bundle/pi-web-api-reference/page/help/controllers/dataserver.html).
* **Tag names list:** A static list of [PI Point ↗](https://docs.aveva.com/bundle/pi-server-s-da-admin/page/1020357.html) identified by their names on a specific [Data Server ↗](https://docs.aveva.com/bundle/pi-web-api-reference/page/help/controllers/dataserver.html).
* **WebIDs list:** A static list of [WebIDs ↗](https://docs.aveva.com/bundle/pi-web-api-reference/page/help/topics/webid.html) that can reference either [attributes ↗](https://docs.aveva.com/bundle/pi-web-api-reference/page/help/controllers/attribute.html) or [PI Points ↗](https://docs.aveva.com/bundle/pi-server-s-da-admin/page/1020357.html).

## Batch functionalities

### Incremental behavior

Incremental configuration is available when retrieving values over an absolute or relative time window. When enabled, the system saves the latest timestamp for each unique WebID after each run. In future runs, the system uses this saved timestamp as a starting point. Data with timestamps between the saved timestamp and the start time of the current run are considered overlapping and will be excluded from processing.

![Batch incremental configuration options.](/docs/resources/foundry/available-connectors/pi-batch-incremental.png)

### File partitioning

You can set a partition configuration when retrieving values from an absolute or relative time window. When **Set partition configuration** is enabled, the PI System retrieves data within the configured window and sequentially writes the data to disk to avoid eclipsing runtime memory.

![Batch partition configuration options.](/docs/resources/foundry/available-connectors/pi-batch-partition.png)

### Web ID caching

As described in the [data model](#data-model) above, the first step is to resolve [WebIDs ↗](https://docs.aveva.com/bundle/pi-web-api-reference/page/help/topics/webid.html). This operation can be time consuming and repetitive if there were no changes on the PI server side. To speed up recurrent syncs, users can enable WebID caching to store resolved WebIDs and potentially re-use this cache on their next run.

There are two mechanisms to keep the cache up-to-date:

* Invalidate the cache on any sync configuration.
* An optional expiration delay, after which the cache should be considered outdated.

![Batch WebIDs cache configuration options.](/docs/resources/foundry/available-connectors/pi-batch-cache.png)

## Streaming functionalities

Streaming syncs use [channels ↗](https://docs.aveva.com/bundle/pi-web-api/page/1023111.html) to get timely updates from the server.

### Liveness check

In order to confirm that the connection with the server is still active, the connector performs a liveness check on a regular basis to verify that an actual message or an empty message sent by the server (a "heartbeat") has been received recently. This allows the stream to be restarted, otherwise a new connection must be established if the previous one was silently closed.

### Web ID cache and target re-evaluation

On initial start, the connector will resolve WebIDs and store them in a cache. This cache will be used at restart in order to quickly restore the connection to the server. This cache is also re-evaluated periodically to get an up-to-date list of WebIDs. Users can disable this periodic re-evaluation or change its frequency.

![Streaming WebIDs cache re-evaluation configuration options.](/docs/resources/foundry/available-connectors/pi-streaming-cache-recompute.png)

### Backlog configuration

Streams can stop and restart for multiple reasons, such as agent restart, lost connections, and manual cancellation. In these cases, there may be a small period of time before the connection is re-established. To avoid data gaps, users can enable a backlog to capture any data that was missed during this gap.

![Streaming backlog configuration options.](/docs/resources/foundry/available-connectors/pi-streaming-backlog.png)

## PI connector vs. REST API connector

While the REST API connector may offer more flexibility in some cases, below are some advantages of using the PI connector.

* **User-friendly interface:** The PI connector offers a point-and-click interface that only requires knowledge of PI concepts. In contrast, the REST API connector requires knowledge of the web API, different endpoints, and query formats to retrieve data for external transforms or regular syncs.

* **Ready-to-use data:** PI connector syncs output tabular data that is already parsed and ready to use. The REST API outputs a JSON object that needs to be to parsed before use in downstream transforms. This requires additional knowledge of the response format.

* **Streaming syncs:** The PI connector allows users to set up streaming syncs, which is not possible with the REST API.

* **"Smart" out-of-the-box functionality:** As described in the [batch functionalities](#batch-functionalities) section, the functionalities included in the PI connector allow users to perform operations that would otherwise require complex orchestration.
  The PI connector implicitly provides functionalities that can help users avoid common pitfalls, allowing for several levels of pagination and bucketing to efficiently and dynamically retrieve data. This is valuable for retrieving high volumes of data without hitting API rate limits, and is especially useful considering that the REST API's batch endpoint is likely to hit rate limits and silently fail.
