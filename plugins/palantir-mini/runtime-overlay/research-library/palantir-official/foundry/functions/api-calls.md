---
sourceUrl: "https://www.palantir.com/docs/foundry/functions/api-calls/"
canonicalUrl: "https://palantir.com/docs/foundry/functions/api-calls/"
sourceLastmod: "2026-05-12T17:06:26.152Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "5b6fe75170757a37e1bfe8c907bc7f926f8f6915beb25012ad1d3ef0480f515f"
product: "foundry"
docsArea: "functions"
locale: "en"
upstreamTitle: "Documentation | Language agnostic features > Make API calls from functions"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Make API calls from functions

It is possible to make API calls to external sources from TypeScript v1, TypeScript v2 and Python functions, but doing so requires additional configuration. This configuration and external source usage are detailed below.

## Configure access to external APIs

By default, functions are not allowed to call external APIs. To enable calling external systems from your function, you must [configure a source](/docs/foundry/data-connection/set-up-source/) in [Data Connection](/docs/foundry/data-connection/overview/) to allow Foundry to connect with an external system.

For functions to connect to your source's external system securely, your source must be configured to [enable exports](/docs/foundry/data-connection/export-overview/#enable-exports-for-source) and allow the [import of your source into Code Repositories](/docs/foundry/data-connection/external-transforms/#prerequisite-import-a-source-into-code). Both of these can be configured by navigating to the source in Data Connection and opening the **Connection settings** section. Here you will find the **Code import configuration** tab, where you can also configure an API name if your source does not yet have one. This API name will be used to reference your source in code.

:::callout{theme="neutral"}
Make sure to fully configure the certificate chain in your source. <br><br>
Webhook and function runtime environments are not identical. <br><br>
Sometimes, a webhook will work correctly while the API call from a function might encounter an `UNABLE_TO_GET_ISSUER_CERT` error. <br><br>
Refer to our documentation on the [`openssl` command in the source terminal](/docs/foundry/data-connection/set-up-source/#openssl) to verify certificates.
:::

## Use an external source in a function

To make API calls from a function, you must first import your source using the [resource imports sidebar](/docs/foundry/functions/resource-imports-sidebar/) in a functions repository. You must then declare that your function uses the source.

Examples of this are shown below:

```typescript tab="TypeScript v1"
import { ExternalSystems } from "@foundry/functions-api";
import { MySource } from "@foundry/external-systems/sources";

export class MyExternalFunctions {
    @ExternalSystems({ sources: [MySource] })
    @Function()
    public async myExternalFunction(): Promise<string> {
        const { url } = MySource.getHttpsConnection();
        const response = await MySource.fetch(url);

        return response.text();
    }
}
```

```typescript tab="TypeScript v2"
import { getSource, getHttpsConnection, getFetch } from "@palantir/functions-sources";

export const config = {
    sources: ["MySource"]
}

async function MyExternalFunction(): Promise<string> {
    const source = await getSource("MySource");
    const { url } = getHttpsConnection(source);
    const fetch = await getFetch(source);

    const response = await fetch(url);

    return response.text();
}
```

```python tab="Python"
from functions.api import function
from functions.sources import get_source


@function(sources=["MySource"])
def my_external_function() -> str:
    source = get_source("MySource")
    url = source.get_https_connection().url
    client = source.get_https_connection().get_client()
    response = client.get(url)
    return response.text
```

You can test your function in live preview and use it to make external calls once published.

:::callout{theme="warning"}
**Third-party clients are not yet supported for serverless execution or live preview without overriding the fetch function or HTTP agent.** To ensure your API calls function properly across all environments, you must use the relevant library methods to make requests with the correct configuration. Direct API calls to external sources or internal Foundry URLs are not guaranteed to work in all environments.
:::

## Access source attributes and credentials

You can access source attributes provided by each function type's corresponding library.

The example below shows how to obtain the base URL of the source in the example above.

```typescript tab="TypeScript v1"
const { url } = MySource.getHttpsConnection();
```

```typescript tab="TypeScript v2"
const { url } = getHttpsConnection(source);
```

```python tab="Python"
url = get_source("MySource").get_https_connection().url
```

You can also access additional secrets or credentials stored on the source by using the following syntax to access secrets:

```typescript tab="TypeScript v1"
const secret = MySource.getSecret("MySecret");
```

```typescript tab="TypeScript v2"
const secret = source.secrets["MySecret"];
```

```python tab="Python"
secret = get_source("MySource").get_secret("MySecret")
```

## Use the pre-configured clients

For sources that provide a REST API, the source object allows you to retrieve a client. This client will be pre-configured with the server and client certificates specified on the source. It will also include additional proxy configurations which allow egress from the environment functions are executed in. You should always use this client, if possible, to guarantee your function can egress to the source from all environments.

```typescript tab="TypeScript v1"
const fetch = MySource.fetch;
```

```typescript tab="TypeScript v2"
const fetch = await getFetch(source);
```

```python tab="Python"
client = source.get_https_connection().get_client()
```

Alternatively, you can use your own client or third-party libraries which make external requests, and use the source object to [retrieve attributes and credentials](#access-source-attributes-and-credentials).

TypeScript v2 functions provide a pre-configured HTTP agent as an additional integration point for usage with third party libraries which accept a custom HTTP agent.

The following example demonstrates retrieving this agent and using it with [axios ↗](https://github.com/axios/axios).

```typescript tab="TypeScript v2"
import { getHttpAgent, getHttpsConnection } from "@palantir/functions-sources";
import axios from 'axios';

const agent = await getHttpAgent(source);
const { url } = getHttpsConnection(source);

const response = await axios.get(url, {
    httpsAgent: agent,
});

```

:::callout{theme="neutral"}
Currently, it is impossible to access source attributes that are not credentials unless the source provides an HTTPS client. For example, you will not be able to access the `hostname` or other non-secret attributes on a [PostgreSQL source](/docs/foundry/available-connectors/postgresql/).
:::

## Use OAuth 2.0 with outbound applications

If your external API requires OAuth 2.0 authorization, you can configure an [outbound application](/docs/foundry/administration/configure-outbound-applications/) in Control Panel and use it as the authentication method for a REST API source. When your function runs, the source exposes OAuth tokens as session credentials.

:::callout{theme="neutral"}
When a REST API source is configured with an outbound application, the `Authorization` header is **automatically injected** into the HTTP client provided by the source (via `get_client()` in Python or `getFetch()` in TypeScript v2). You do not need to set the header manually when using the source's built-in client.

If you are not using the source-provided HTTP client (for example, using Python's `requests` library or the native `fetch` API directly), you can retrieve the OAuth token through `get_session_credentials()` (Python) or `source.sessionCredentials` (TypeScript v2) and set the `Authorization` header yourself.
:::

### Use the source's pre-configured client

The simplest approach is to use the HTTP client provided by the source. The `Authorization` header is injected automatically.

```python tab="Python"
from functions.api import function
from functions.sources import get_source

@function(sources=["MyOAuthSource"])
def call_external_api() -> str:
    source = get_source("MyOAuthSource")
    url = source.get_https_connection().url
    client = source.get_https_connection().get_client()

    response = client.get(url + "/api/v1/resource", timeout=10)
    return response.text
```

```typescript tab="TypeScript v2"
import { getSource, getHttpsConnection, getFetch } from "@palantir/functions-sources";

export const config = {
    sources: ["MyOAuthSource"]
};

export default async function callExternalApi(): Promise<string> {
    const source = await getSource("MyOAuthSource");
    const { url } = getHttpsConnection(source);
    const fetch = await getFetch(source);

    const response = await fetch(url + "/api/v1/resource");

    return response.text();
}
```

### Use a native HTTP client with manual token injection

If you need to use your own HTTP client instead of the source-provided one, retrieve the OAuth token from session credentials and set the `Authorization` header manually.

```python tab="Python"
import requests
from functions.api import function
from functions.sources import get_source
from external_systems.sources import OauthCredentials, Refreshable, SourceCredentials

@function(sources=["MyOAuthSource"])
def call_external_api() -> str:
    source = get_source("MyOAuthSource")
    url = source.get_https_connection().url

    refreshable_credentials: Refreshable[SourceCredentials] = source.get_session_credentials()
    session_credentials: SourceCredentials = refreshable_credentials.get()

    if not isinstance(session_credentials, OauthCredentials):
        raise ValueError("Expected OAuth credentials")

    access_token: str = session_credentials.access_token

    response = requests.get(
        url + "/api/v1/resource",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=10,
    )
    return response.text
```

```typescript tab="TypeScript v2"
import { getSource, getHttpsConnection } from "@palantir/functions-sources";

export const config = {
    sources: ["MyOAuthSource"]
};

export default async function callExternalApi(): Promise<string> {
    const source = await getSource("MyOAuthSource");
    const credentials = await source.sessionCredentials?.get();

    if (!credentials || credentials.type !== "oauth") {
        throw new Error("Expected OAuth credentials");
    }

    const accessToken: string = credentials.accessToken;
    const { url } = getHttpsConnection(source);

    const response = await fetch(url + "/api/v1/resource", {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    return response.text();
}
```
