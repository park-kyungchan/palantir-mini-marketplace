---
sourceUrl: "https://www.palantir.com/docs/foundry/getting-help/supported-browsers-network-requirements/"
canonicalUrl: "https://palantir.com/docs/foundry/getting-help/supported-browsers-network-requirements/"
sourceLastmod: "2026-05-12T17:06:26.146Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "e647454c54a6d78cd4085145f1be27ce28e1de34b6a141232963eed894085b11"
product: "foundry"
docsArea: "getting-help"
locale: "en"
upstreamTitle: "Documentation | Getting help > Supported browsers and endpoint requirements"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Supported browsers and endpoint requirements

The following page lists the browsers supported by the Palantir platform and the platform's endpoint network requirements.

## Supported browsers

The Palantir platform is fully supported on the following desktop browsers:

* Google Chrome
* Microsoft Edge

Palantir will also provide critical bug fixes for users of Mozilla Firefox versions released within the last six months. For best results, use Google Chrome or Microsoft Edge if possible.

Not all Palantir applications are designed to work on mobile devices. Those that are mobile-friendly require one of the following mobile browsers:

* Google Chrome
* Microsoft Edge
* Apple Safari

We fully support any version of the above desktop and mobile browsers released within the past year. Older browser versions are partially supported up to the past two years, and browser versions released over two years ago are unsupported.

## Client endpoint network requirements

As the primary Palantir platform frontend is a web application, users are recommended to use [supported browsers](#supported-browsers) for optimal operation.

However, in rare cases, users with unusual networking set-ups may experience issues, despite using a supported browser.

In order to aid debugging, this page documents some of the assumptions that Foundry makes about the client endpoint's network set-up.

### WebSocket support

Many in-platform applications use [WebSockets ↗](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) for communication between the client and the server, and the Palantir platform assumes that WebSocket connections are possible.

Some proxy servers require special configuration or a software upgrade in order to support WebSocket connections. If users connect to Palantir platform via a proxy that does not support WebSockets, large parts of the platform may become unusable.

### HTTP/2 support

HTTP/2 support is vital for the seamless performance of the Palantir platform, as it helps facilitate the handling of a significant number of concurrent requests from Foundry applications to the backend.

Note that proxy servers can downgrade HTTP/2 connections to HTTP/1.1, which can make Foundry applications slow to the point of obstructing usability.

If you are encountering slowness when using the Palantir platform and your connection to the platform goes through a proxy, you should investigate the possibility that your proxy is downgrading the connection.
