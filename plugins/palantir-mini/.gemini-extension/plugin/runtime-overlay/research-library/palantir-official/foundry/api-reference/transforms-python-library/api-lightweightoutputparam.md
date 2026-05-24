---
sourceUrl: "https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-lightweightoutputparam/"
canonicalUrl: "https://palantir.com/docs/foundry/api-reference/transforms-python-library/api-lightweightoutputparam/"
sourceLastmod: "2026-05-12T17:06:26.167Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "710e221e39c1c4b9175fea88c2c06a13f70f7a4c74c1ce7e89680dc3e603037e"
product: "foundry"
docsArea: "api-reference"
locale: "en"
upstreamTitle: "Documentation | transforms.api > LightweightOutputParam"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# transforms.api.LightweightOutputParam

## *class* transforms.api.LightweightOutputParam {#transforms.api.LightweightOutputParam}

Base type for output parameters compatible with lightweight, single node transforms. Inheritors must also inherit [`FoundryOutputParam`](/docs/foundry/api-reference/transforms-python-library/api-foundryoutputparam/#transforms.api.FoundryOutputParam).

See [`transforms.api.Output`](/docs/foundry/api-reference/transforms-python-library/api-output/#transforms.api.Output) for an example of concrete usage.

### *abstractmethod static* lightweight\_instance(context, json\_value) {#transforms.api.LightweightOutputParam.lightweight\_instance}

Instantiate an output type from the resolved JSON value.
