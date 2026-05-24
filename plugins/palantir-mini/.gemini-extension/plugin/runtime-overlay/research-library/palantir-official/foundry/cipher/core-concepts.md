---
sourceUrl: "https://www.palantir.com/docs/foundry/cipher/core-concepts/"
canonicalUrl: "https://palantir.com/docs/foundry/cipher/core-concepts/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "4617037ef2bcf59f102de7f02b63035df1ffefaebb148d678f4724c50efd41a5"
product: "foundry"
docsArea: "cipher"
locale: "en"
upstreamTitle: "Documentation | Cipher > Core concepts"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Core concepts

This page provides an introduction to the core concepts of Cipher.

## Channels

A **Cipher Channel** is a Foundry resource that is visible in the filesystem workspace. A Channel serves as the starting point to create your encryption or hashing framework. Channels describe a specific protocol for obfuscating or de-obfuscating values, including either an encryption algorithm, parameters and values for the encryption keys, or a hashing algorithm and secret.

[Learn how to create a Cipher channel.](/docs/foundry/cipher/getting-started/#create-a-cipher-channel)

![Cipher Channel](/docs/resources/foundry/cipher/channel_view.png)

## Licenses

A **Cipher License** is a Foundry resource accessible in the filesystem workspace that controls permissions to use cryptographic operations defined in a given Cipher Channel. Each License corresponds to exactly one parent Channel. Users with access privileges which allow them to view a License can use all the Channel operations the License allows. Like other Foundry resources, a License can be moved around and shared; however, note that any changes will affect user accessibility for the Channel associated with the License.

[Learn how to issue a Cipher license.](/docs/foundry/cipher/getting-started/#issue-a-license)

![Cipher License](/docs/resources/foundry/cipher/cipher_license_view.png)

## Cipher-encrypted values

Values encrypted with Cipher follow a format known as a *Cipher-encrypted value* which has the following syntax: `CIPHER::<channel-rid>::<encrypted-value>::CIPHER`. This format allows the Cipher service to gather the metadata needed to decrypt the value, providing the user has the right permissions.
