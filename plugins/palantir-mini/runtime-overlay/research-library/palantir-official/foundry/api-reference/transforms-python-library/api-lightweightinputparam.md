---
sourceUrl: "https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-lightweightinputparam/"
canonicalUrl: "https://palantir.com/docs/foundry/api-reference/transforms-python-library/api-lightweightinputparam/"
sourceLastmod: "2026-05-12T17:06:26.167Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "7576bcc800910826730c1df3256446ea25df6e549c1c0e27f92f8eb1e9ccf712"
product: "foundry"
docsArea: "api-reference"
locale: "en"
upstreamTitle: "Documentation | transforms.api > LightweightInputParam"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# transforms.api.LightweightInputParam

## *class* transforms.api.LightweightInputParam {#transforms.api.LightweightInputParam}

Base type for input parameters compatible with lightweight, single node transforms. Inheritors must also inherit [`FoundryInputParam`](/docs/foundry/api-reference/transforms-python-library/api-foundryinputparam/#transforms.api.FoundryInputParam).

See [`transforms.api.Input`](/docs/foundry/api-reference/transforms-python-library/api-input/#transforms.api.Input) for an example of concrete usage.

### *abstractmethod static* lightweight\_instance(context, json\_value) {#transforms.api.LightweightInputParam.lightweight\_instance}

Instantiate an input type from the resolved JSON value.
