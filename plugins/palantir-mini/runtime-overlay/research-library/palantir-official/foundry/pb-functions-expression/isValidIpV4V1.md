---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/isValidIpV4V1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/isValidIpV4V1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "05cac1a82c49652a98eb92952cc9acee5bb7ebc2581d0ea3e6cd80ab7178674d"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Is valid IPv4"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Is valid IPv4

> Supported in: Batch

Returns true if the input is a valid IPv4 address.

**Expression categories:** Cyber

## Declared arguments

* **Expression:** IP address to check.<br>*Expression\<String>*

**Output type:** *Boolean*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `ip`

| ip | **Output** |
| ----- | ----- |
| 192.168.1.1 | true |
| 10.0.0.1 | true |
| 172.16.0.1 | true |
| 255.255.255.255 | true |
| 0.0.0.0 | true |
| 127.0.0.1 | true |
| 1.2.3.4 | true |
| 256.1.1.1 | false |
| 192.168.1.256 | false |
| 192.168.1 | false |
| 192.168.1.1.1 | false |
| abc.def.ghi.jkl | false |
| 192.168.1.a | false |
| -1.2.3.4 | false |
| *empty string* | false |
|     | false |
| 192.168.1.0/24 | false |
| 10.0.0.0/8 | false |
| 192 | false |
| a.b.c.d/255.0.0.0 | false |
| ::1 | false |
| 2001\:db8::1 | false |
| *null* | false |

***
