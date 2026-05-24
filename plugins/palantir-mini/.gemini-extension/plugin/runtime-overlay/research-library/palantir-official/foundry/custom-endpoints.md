---
sourceUrl: "https://www.palantir.com/docs/foundry/custom-endpoints/"
canonicalUrl: "https://palantir.com/docs/foundry/custom-endpoints/"
sourceLastmod: "2026-05-12T17:06:26.160Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "66d360260ad5d2aa2cb6d53235cc1185b3f3f2464bda0a805906b75144a5bec4"
product: "foundry"
docsArea: "custom-endpoints"
locale: "en"
upstreamTitle: "Documentation | Custom Endpoints > Overview"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Custom Endpoints

:::callout{theme="neutral" title="Beta"}
The Custom Endpoints application is in the [beta](/docs/foundry/platform-overview/development-life-cycle/) phase of development and may not be available on your enrollment. Functionality may change during active development. Contact Palantir Support to request access to Custom Endpoints.
:::

The **Custom Endpoints** application enables developers to configure and deploy user-defined API endpoints with their own URL patterns. Users can also configure request and response shapes and endpoint specifications, while leveraging Foundry's back-end capabilities. Custom endpoints are backed by the ontology through actions and functions.

![The Custom Endpoints application displaying deployed endpoints.](/docs/resources/foundry/custom-endpoints/custom-endpoints-overview.png)

The Custom Endpoints application provides managed infrastructure for treating Foundry as a back-end service. Developers can define endpoint metadata describing how HTTP requests map to ontology operations, eliminating the need for external middleware services. This enables organizations to expose Foundry data through APIs that conform to their existing enterprise standards and specifications.

Below is an example of a standard Foundry API call:

```http
POST https://{your enrollment}.palantirfoundry.com/api/v2/ontologies/{ontology}/queries/{queryApiName}/execute
Body: {"parameters": {"form_id": 62536, "section_id": 5}}
Response: {"code": 200, "data": {"value": ["Val1", "Val2", "Val3"]}}
```

Below is the same API call, customized to accommodate existing organizational standards and remapped to a `GET` request:

```http
GET https://subdomain.domain.com/myApi/form/{form_id}/section/{section_id}
Response: {"code": 200, "data": {"section1": "Val1", "section2": "Val2", "section3": "Val3"}}
```

Some examples of custom endpoint use cases include creating a unified API that combines Foundry data with third-party services, or a legacy-compatible endpoint that matches existing enterprise URL patterns and response formats.
