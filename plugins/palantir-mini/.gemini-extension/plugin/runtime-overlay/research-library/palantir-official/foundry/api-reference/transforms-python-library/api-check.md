---
sourceUrl: "https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-check/"
canonicalUrl: "https://palantir.com/docs/foundry/api-reference/transforms-python-library/api-check/"
sourceLastmod: "2026-05-12T17:06:26.167Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "3a9da3714b311127126be135080b65c59f475e8ac8c71fed1443371afda8d1d6"
product: "foundry"
docsArea: "api-reference"
locale: "en"
upstreamTitle: "Documentation | transforms.api > Check"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# transforms.api.Check

## *class* transforms.api.Check(expectation, name, on\_error='FAIL', description=None) {#transforms.api.Check}

Wraps up an expectation such that it can be registered with Data Health.

* **Parameters:**
  * **expectation** (`transforms.expectations.Expectation`) – The expectation to evaluate.
  * **name** ([*str* ↗](https://docs.python.org/3/library/stdtypes.html#str)) – The name of the check, used as a stable identifier over time.
  * **on\_error** ([*str* ↗](https://docs.python.org/3/library/stdtypes.html#str) *,* *optional*) – What action to take if the expectation is not met. Currently ‘WARN’, ‘FAIL’.
  * **description** ([*str* ↗](https://docs.python.org/3/library/stdtypes.html#str) *,* *optional*) – The description of the check.
