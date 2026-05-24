---
sourceUrl: "https://www.palantir.com/docs/foundry/available-connectors/filesystem/"
canonicalUrl: "https://palantir.com/docs/foundry/available-connectors/filesystem/"
sourceLastmod: "2026-05-12T17:06:26.147Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "c1b42a9d8df7d889312f241d82f8d9ee56e286f5ad8071f2f3624e91a3cc93db"
product: "foundry"
docsArea: "available-connectors"
locale: "en"
upstreamTitle: "Documentation | Available connectors > Agent-level filesystem"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Agent-level filesystem

Files stored on disk on an [agent](/docs/foundry/data-connection/core-concepts/#agents) can be synced into Foundry using the filesystem source type.

This source type can be used to sync data from a [Network File System ↗](https://en.wikipedia.org/wiki/Network_File_System) (NFS) or [Network-attached storage ↗](https://en.wikipedia.org/wiki/Network-attached_storage) (NAS) to Foundry, by mounting the NFS or NAS on the agent host and configuring the root directory appropriately.

## Supported capabilities

| Capability  | Status |
|--- |--- |
| Exploration | 🟢 Generally available |
| Bulk import | 🟢 Generally available |
| Incremental | 🟢 Generally available |
| [File exports](/docs/foundry/data-connection/export-overview/#file-exports) | 🟢 Generally available |

## Configuration

| Parameter  | Required? | Default | Description |
|--- |--- |--- |--- |
| `rootDirectory` | Y | | Root directory containing data. |
| `fileMustNotChangeDuration` | N | `PT2.0S` | Amount of time (in [ISO-8601 ↗](https://docs.oracle.com/javase/8/docs/api/java/time/Duration.html#parse-java.lang.CharSequence)) a file must remain constant before being considered for upload. <br>Note: If possible, use the more efficient `lastModifiedBefore` processor. |

**Example:**

```yaml
myDirectorySource:
    type:           directory
    rootDirectory:  /foo/bar
```

:::callout{theme="neutral"}
Data Connection excludes all symbolic links, regardless of whether the links are to files or to folders.
:::
