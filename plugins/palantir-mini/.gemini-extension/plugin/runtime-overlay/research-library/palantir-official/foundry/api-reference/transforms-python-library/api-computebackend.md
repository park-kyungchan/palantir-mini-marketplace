---
sourceUrl: "https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-computebackend/"
canonicalUrl: "https://palantir.com/docs/foundry/api-reference/transforms-python-library/api-computebackend/"
sourceLastmod: "2026-05-12T17:06:26.167Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "94d7678f7fc441a90a93799e03bef75d602e41617d0ad11e8aecd4d908554e82"
product: "foundry"
docsArea: "api-reference"
locale: "en"
upstreamTitle: "Documentation | transforms.api > ComputeBackend"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# transforms.api.ComputeBackend

## *class* transforms.api.ComputeBackend(\*values) {#transforms.api.ComputeBackend}

Enum class for representing the different compute backends for use in [`configure()`](/docs/foundry/api-reference/transforms-python-library/api-configure/#transforms.api.configure).

The following are available backends:

* `SPARK`
* `VELOX`

VELOX will run Spark with native acceleration. See [Native Acceleration ↗](/docs/foundry/optimizing-pipelines/native-acceleration/) for more information.

#### Example

```python
>>> @configure(backend=ComputeBackend.SPARK)
... @transform(...)
... def my_compute_function(...):
...     pass
```
