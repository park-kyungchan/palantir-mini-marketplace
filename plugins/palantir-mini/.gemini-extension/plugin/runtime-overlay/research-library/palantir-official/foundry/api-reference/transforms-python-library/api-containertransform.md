---
sourceUrl: "https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-containertransform/"
canonicalUrl: "https://palantir.com/docs/foundry/api-reference/transforms-python-library/api-containertransform/"
sourceLastmod: "2026-05-12T17:06:26.167Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d970c7f0f37863fff353c35d37566cf60c41277ebd6506e9f1e731ab359e7236"
product: "foundry"
docsArea: "api-reference"
locale: "en"
upstreamTitle: "Documentation | transforms.api > ContainerTransform"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# transforms.api.ContainerTransform

## *class* transforms.api.ContainerTransform(transform, \*, cpu\_cores=None, memory\_mb=None, memory\_gb=None, gpu\_type=None, container\_image=None, container\_tag=None, container\_shell\_command=None, incremental\_override=None, identifier\_override=None) {#transforms.api.ContainerTransform}

A callable object that describes a single step of a lightweight, single-node computation.

A [`ContainerTransform`](#transforms.api.ContainerTransform) consists of a number of parameters that subclass the [`Param`](/docs/foundry/api-reference/transforms-python-library/api-param/#transforms.api.Param) class and a compute function.

It is idiomatic to construct a [`Transform`](/docs/foundry/api-reference/transforms-python-library/api-transform/#transforms.api.Transform) object using the provided decorator: [`transform.using()`](/docs/foundry/api-reference/transforms-python-library/api-transform/#transforms.api.transform.using).

Note that the original compute function is exposed via the `ContainerTransform`’s `__call__()` method.

### *property* reference {#transforms.api.ContainerTransform.reference}

A reference to this transform, unique in the pipeline. This field is recomputed at each call to account for compute function renaming.
