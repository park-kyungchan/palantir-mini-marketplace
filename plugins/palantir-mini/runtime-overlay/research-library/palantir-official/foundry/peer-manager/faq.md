---
sourceUrl: "https://www.palantir.com/docs/foundry/peer-manager/faq/"
canonicalUrl: "https://palantir.com/docs/foundry/peer-manager/faq/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "f765ff810d95b610c07fef480ccaf2ba07aa3a87f857f5ac3be5a12f2fae1b43"
product: "foundry"
docsArea: "peer-manager"
locale: "en"
upstreamTitle: "Documentation | Peer Manager > FAQ"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Frequently asked questions

This page details frequently asked questions about Peer Manager.

## Why am I unable to see the markings on a peer connection?

If you are unable to see the [markings](/docs/foundry/security/markings/) on a peer connection, then you may not have view access to the markings themselves. When this is the case, Peer Manager displays the `Unknown` marking icon. While data secured across Foundry with a marking you do not have access to will be hidden from your view, you can view the connection the data will travel across in Peer Manager but *not* its underlying data.

![A connection security badge displays unknown markings.](/docs/resources/foundry/peer-manager/connection-with-unknown.png)

In many cases, this is caused by markings peered from a remote enrollment. When a remote enrollment adds markings to a peer connection, peering automatically maps those markings to local markings. If no matching local marking exists, then peering creates a new local marking with the same name.

While the act of peering creates new markings, peering does *not* grant local users access to the marking. Only enrollment administrators may govern who has access to markings on a given enrollment. To resolve this, contact an enrollment administrator who can view all markings and request that they provide you view access to the new markings.
