---
sourceUrl: "https://www.palantir.com/docs/foundry/available-connectors/netsuite-overview/"
canonicalUrl: "https://palantir.com/docs/foundry/available-connectors/netsuite-overview/"
sourceLastmod: "2026-05-12T17:06:26.148Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "5ae1468aad837c67a9d3c7a2ee36b4bc2e6901f6f8b4d82135a90d5179a83614"
product: "foundry"
docsArea: "available-connectors"
locale: "en"
upstreamTitle: "Documentation | Oracle NetSuite > Overview"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Oracle NetSuite

Foundry supports connecting to Oracle NetSuite with various methods depending on your use case:

* [NetSuite SuiteAnalytics](/docs/foundry/available-connectors/netsuite-suiteanalytics/) is recommended for extraction of larger volumes of data as it provides better performance and scalability on read operations. SuiteAnalytics requires you to provide Oracle NetSuite's JDBC driver and only supports username/password authentication. [Get started with NetSuite SuiteAnalytics.](/docs/foundry/available-connectors/netsuite-suiteanalytics/)
* [NetSuite SuiteTalk (JDBC)](/docs/foundry/available-connectors/netsuite-suitetalk-jdbc/) has broad support for many NetSuite entities. However, SuiteTalk (JDCBC) leverages an older [SOAP-based ↗](https://en.wikipedia.org/wiki/SOAP) service and may face performance issues with large tables. SuiteTalk (JDBC) only supports token-based authentication (TBA). [Get started with NetSuite SuiteTalk (JDBC).](/docs/foundry/available-connectors/netsuite-suitetalk-jdbc/)
* [NetSuite SuiteQL (JDBC)](/docs/foundry/available-connectors/netsuite-suiteql-jdbc/) has support for a smaller range of NetSuite entities but provides much better read performance. SuiteQL (JDBC) only supports token-based authentication. [Get started with NetSuite SuiteQL (JDBC).](/docs/foundry/available-connectors/netsuite-suiteql-jdbc/)
