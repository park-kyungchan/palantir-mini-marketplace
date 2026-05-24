---
sourceUrl: "https://www.palantir.com/docs/apollo/apollo-product-specification/hidden_volumes/"
canonicalUrl: "https://palantir.com/docs/apollo/apollo-product-specification/hidden_volumes/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "ac4f4168d1ba71f40663c9197a488f708882c8b984a026c09bbdc518af87b94a"
product: "apollo"
docsArea: "apollo-product-specification"
locale: "en"
upstreamTitle: "Documentation | Apollo Product Specification > Volumes"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Volumes \[Beta]

:::callout{theme="neutral"}
Volumes are in a beta state and may not be available on your Apollo Hub. Contact your Palantir representative to learn more.
:::

This extension of the specification defines how a product requests extra storage volumes.

## Volume Manifest Definition

Desired volumes must be defined in a product's manifest according to the following [Conjure ↗](https://github.com/palantir/conjure) definition:

```yaml
Volumes:
  alias: Map<string, VolumeDefinition> # where string is the name of the volume

VolumeDefinition:
  fields:
    volume-type: VolumeType # VolumeType is a union type of the underlying volumes available

# Only one field in VolumeType can be specified
VolumeType:
  fields:
    durable-volume: Optional<DurableVolume> # DurableVolume is currently the only supported underlying volume type

# DurableVolume is a durable volume that is preserved across service restarts / upgrades / machine restarts
DurableVolume:
  fields: {}
```

The following exemplifies a valid volumes declaration:

```yaml
extensions:
  volumes-v2:
    volume-name1:
      volume-type:
        durable-volume: {}
    volume-name2:
      volume-type:
        durable-volume: {}
```

Note that if you use `manifestExtensions` from the [sls-packaging ↗](https://github.com/palantir/sls-packaging) gradle build tooling, the way to specify this is:

```gradle
manifestExtensions 'volumes-v2': [
  'volume-name1': [
    'volume-type': [
      'durable-volume': [:]
    ]
  ],
  'volume-name2': [
    'volume-type': [
      'durable-volume': [:]
    ]
  ]
]
```

Volumes defined in the manifest must have corresponding configuration defined in default product configuration.
The underlying volume types must match; for example, a product must define both `DurableVolume` and `DurableStorageConfiguration`.

All volume names must be limited to alphanumerics and hyphens.

## Volume Configuration Definition

Volume configuration is defined under a top level key in a product's `configuration.yml` called `volumes`.
Volume configurations must adhere to the following [Conjure ↗](https://github.com/palantir/conjure) specification:

```yaml
Volumes:
  alias: Map<string, VolumeConfiguration> # where string is the name of the volume. This must match the manifest volume name


# VolumeConfiguration is a union type of the underlying volumes available and their various configurations
# Only one field in VolumeConfiguration can be specified
VolumeConfiguration:
  fields:
    durable-storage-configuration: Optional<DurableStorageConfiguration>

# DurableStorageConfiguration is the configuration exposed for the durable storage
DurableStorageConfiguration:
  fields:
    desired-size: string
```

### Example

```yaml
volumes:
  volume-name1:
    durable-storage-configuration:
      desired-size: 5G
  volume-name2:
    durable-storage-configuration:
      desired-size: 20G

```

The DurableStorageConfiguration has 1 required key, `desired-size`, which accepts a positive integer value followed by a size unit.
Supported size units are as follows:

* M (Megabyte)
* G (Gigabyte)
* T (Terabyte)

The Service Management Plane’s maximum allowed requested volume size is currently 10T.
Given the desired size of a volume is defined in `configuration.yml`, it may be overridden for specific installations of a product.
When overriding a volume’s desired size, *only upsizing is permitted*.

## Volume Substitution Definition

It is up to the deploying infrastructure to provide access to the volume mount paths. Volumes can accessed using the notation `{{ volumes }}` which exposes:

```yaml
Volumes:
  alias: Map<string, VolumeSubstitution> # where string is the name of the volume. This must match the manifest volume name


# VolumeSubstitution hold the fields exposed in substitution
VolumeSubstitution:
  fields:
    PathOnDisk: string # This is the path on disk for the volume. This is provided by the infrastructure

# Example

conf:
  rootDataDir: "{{volumes.volume-name1.PathOnDisk}}"

```
