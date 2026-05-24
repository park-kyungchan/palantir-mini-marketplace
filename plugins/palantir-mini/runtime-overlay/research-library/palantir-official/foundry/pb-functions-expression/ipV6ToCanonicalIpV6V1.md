---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/ipV6ToCanonicalIpV6V1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/ipV6ToCanonicalIpV6V1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "2a8575495a72dcac553ac8250d9081ae75db2ff81539a368265f75590eec2e42"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > IPv6 to canonical format"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# IPv6 to canonical format

> Supported in: Batch

Converts an IPv6 address into a canonical IPv6 address. RFC 5952 describes canonical representations for IPv6.

**Expression categories:** Cyber

## Declared arguments

* **Expression:** IPv6 to convert.<br>*Expression\<IPv6>*

**Output type:** *IPv6*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `ip`

| ip | **Output** |
| ----- | ----- |
| 001:0db8:85a3:0000:0000:8a2e:0370:7334 | 1\:db8:85a3::8a2e:370:7334 |
| ::1 | ::1 |
| 2001\:db8:0:1:1:1:1:1 | 2001\:db8:0:1:1:1:1:1 |
| 2001:1:0:0:10:0:10:10 | 2001:1::10:0:10:10 |
| 2001:0:0:1:0:0:0:1 | 2001:0:0:1::1 |
| 2001\:db8:0:0:1:0:0:1 | 2001\:db8::1:0:0:1 |
| 2001\:DB8\:AAAA\:BBBB\:CCCC\:DDDD\:EEEE:FFFF | 2001\:db8\:aaaa\:bbbb\:cccc\:dddd\:eeee:ffff |
| 0:0:0:0:0:0:0:0 | :: |
| :: | :: |
| 0:0:0:1:2:3:4:5 | ::1:2:3:4:5 |
| 1:2:3:4:5:0:0:0 | 1:2:3:4:5:: |
| 1:2:3:4:5:6:7:8 | 1:2:3:4:5:6:7:8 |
| *null* | *null* |

***
