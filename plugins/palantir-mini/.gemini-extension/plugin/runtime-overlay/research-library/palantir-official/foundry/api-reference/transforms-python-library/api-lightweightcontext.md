---
sourceUrl: "https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-lightweightcontext/"
canonicalUrl: "https://palantir.com/docs/foundry/api-reference/transforms-python-library/api-lightweightcontext/"
sourceLastmod: "2026-05-12T17:06:26.167Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "61ae0c46803536c67932f2d836760e15026aa489b009951672ed1abbe60bb0e2"
product: "foundry"
docsArea: "api-reference"
locale: "en"
upstreamTitle: "Documentation | transforms.api > LightweightContext"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# transforms.api.LightweightContext

## *class* transforms.api.LightweightContext {#transforms.api.LightweightContext}

A context object that can optionally be injected into the compute function of a lightweight transform.

Can be accessed by adding a `ctx` argument to the compute function as shown below:

```python
>>> @transform.using(...)
... def compute(ctx, ...):
...     ...
```

Equivalent to [`transforms.api.TransformContext`](/docs/foundry/api-reference/transforms-python-library/api-transformcontext/#transforms.api.TransformContext) for single node compute.

### abort\_job() {#transforms.api.LightweightContext.abort\_job}

Aborts the job and ends execution. This will abort all output transactions.

### *property* auth\_header {#transforms.api.LightweightContext.auth\_header}

The auth header used to run the transform.

### *property* is\_incremental {#transforms.api.LightweightContext.is\_incremental}

Whether the transform is running incrementally.
