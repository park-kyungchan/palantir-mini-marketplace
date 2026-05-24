---
sourceUrl: "https://www.palantir.com/docs/foundry/cipher/overview/"
canonicalUrl: "https://palantir.com/docs/foundry/cipher/overview/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d8844c0100eda99ec7b9135a33e875f41fffdccf35d7ae5add5b145d97a5a0ff"
product: "foundry"
docsArea: "cipher"
locale: "en"
upstreamTitle: "Documentation | Cipher > Overview"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Cipher

Cipher is a service that allows users to obfuscate data using cryptographic operations (encryption, decryption, or hashing). Cipher manages algorithms and cryptography keys through **Channels** and **Licenses**. These concepts allow for secure management and enable new users (including users who do not code or those without specialized knowledge) to deploy privacy-enhancing tools in legible and reliable ways.

* [Cipher Channels](/docs/foundry/cipher/core-concepts/#channels) reliably manage cryptographic algorithms and keys.
* [Cipher Licenses](/docs/foundry/cipher/core-concepts/#licenses) allow users to control permissions and apply cryptographic operations to workflows (e.g. bulk encrypt columns of a dataset, decrypt individual values in [Object Explorer](/docs/foundry/object-explorer/overview/), and so on).

:::callout{theme="neutral"}
Foundry uses sophisticated encryption at the storage and network levels to secure data in transit and at rest. Cipher provides an additional layer on top of those protections, giving users the tools to configure privacy and governance protections in operational workflows.
:::

![Workflow of a decryption request with Cipher](/docs/resources/foundry/cipher/decryption_request.gif)
