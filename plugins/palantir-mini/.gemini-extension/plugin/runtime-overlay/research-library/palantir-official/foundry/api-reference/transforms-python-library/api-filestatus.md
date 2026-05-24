---
sourceUrl: "https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-filestatus/"
canonicalUrl: "https://palantir.com/docs/foundry/api-reference/transforms-python-library/api-filestatus/"
sourceLastmod: "2026-05-12T17:06:26.167Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "b7607e36ca46001cb5bba8e378349dd3e4588a9b39fb1e04d7b581d7016acc80"
product: "foundry"
docsArea: "api-reference"
locale: "en"
upstreamTitle: "Documentation | transforms.api > FileStatus"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# transforms.api.FileStatus

## *class* transforms.api.FileStatus(path, size, modified) {#transforms.api.FileStatus}

A `collections.namedtuple` capturing details about a `FoundryFS` file in Spark transforms.

:::callout{theme="neutral"}
For lightweight, single-node transforms, see [`transforms.api.FoundryDataSidecarFile`](/docs/foundry/api-reference/transforms-python-library/api-foundrydatasidecarfile/#transforms.api.FoundryDataSidecarFile).
:::

Create new instance of FileStatus(path, size, modified)

### count(value, /) {#transforms.api.FileStatus.count}

Return number of occurrences of value.

### index(value, start=0, stop=9223372036854775807, /) {#transforms.api.FileStatus.index}

Return first index of value.

Raises ValueError if the value is not present.

### modified {#transforms.api.FileStatus.modified}

Alias for field number 2

### path {#transforms.api.FileStatus.path}

Alias for field number 0

### size {#transforms.api.FileStatus.size}

Alias for field number 1
