---
sourceUrl: "https://www.palantir.com/docs/foundry/ontology-sdk/generate-osdk-for-other-languages/"
canonicalUrl: "https://palantir.com/docs/foundry/ontology-sdk/generate-osdk-for-other-languages/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "886713419bc27097c8722fb22fb22abad4de9c85610bac7f720b5a7c03bddd2f"
product: "foundry"
docsArea: "ontology-sdk"
locale: "en"
upstreamTitle: "Documentation | Ontology SDK > Generate OSDK for other languages"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Generate OSDK for other languages

The Developer Console has built-in Java, Python, and TypeScript support for code generation using both pip and Conda but is not limited to these languages. Developer Console also supports exporting APIs in the industry-standard [OpenAPI format ↗](https://www.openapis.org/). You can use open source code generators to generate a client based on the downloaded OpenAPI spec in almost any language.

## Export an OpenAPI spec

Navigate to the **Application API** page in the Developer Console application and open the **SDK generation** tab. Then, choose **Other languages** and select **Export as OpenAPI**.

![export OpenAPI spec](/docs/resources/foundry/ontology-sdk/osdk-generate-other-language.png)

:::callout{theme="warning"}
As the exported file will include the name and the description of the resources included in the Developer Console application, ensure these fields do not contain sensitive information.
:::

## Generate clients and server in other languages

Once the OpenAPI file has been exported, you can generate a client and server using an open source generator. A list of OpenAPI generators can be found on the [OpenAPI generator web site ↗](https://openapi-generator.tech/docs/generators).
