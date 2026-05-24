---
sourceUrl: "https://www.palantir.com/docs/apollo/managing-entities/set-config-overrides/"
canonicalUrl: "https://palantir.com/docs/apollo/managing-entities/set-config-overrides/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "825a21749fcb08d176c6ed4de97d49b29389e88b9c72e2154fbe6ff782898e78"
product: "apollo"
docsArea: "managing-entities"
locale: "en"
upstreamTitle: "Documentation | Managing Entities > Setting config overrides"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Setting config overrides

Entities often need some amount of per-environment customization. When the default configurations bundled with your releases, Apollo’s **Config** capabilities can be used to override parts of your default configurations.

Config overrides can be specified from the **Config** tab of an Entity. These overrides may be interpreted differently based on the Entity type. Configuration changes go through change requests and must be approved by an [Entity operator](/docs/apollo/core/authorization/). This creates a robust historical record of configuration changes, a clear audit and compliance trail for production Environments, and opportunities for validation.

![Config overrides](/docs/resources/apollo/managing-entities/config-overrides.png)

Config overrides are applied to ranges of versions for a Product. Apollo will *never* deploy a release of a Product without a config override defined for that release. That means that at minimum, an empty override block declaring support for a major version of a Product must be provided if you would like it to be deployed.

The top level keys of the config relate to the starting version in the major version range for which this config would apply. This example below declares basic support for any Product release for major version 2. Note that no releases of major version 1 or 3, or any other number would be able to deploy without an override block specifically for those major versions.

```yaml
2.0.0:
  overrides: {}
```

Different overrides can be provided for ranges of releases of the Product. When a release is deployed, the most specific override range for that release is selected. This config resolution happens at the same time as an upgrade plan is recommended, so you can ensure that the most appropriate config is deployed along with the release to avoid race conditions and edge cases with varying support for config values or feature flags.

In this example, there is declared support for any release of the Product for major version 1 that is greater than or equal to `1.2.0`. There’s also declared support for any release of major version 2. Some additional config override values will be provided to the Entity for any release within major version 2 of `2.6.0` or later.

```yaml
2.6.0:
  overrides:
    debug-logging-enabled: true
2.0.0:
  overrides: {}
1.2.0:
  overrides: {}
```

This system of declaring support for versions of software and providing config values ahead of time ensures Apollo can always safely upgrade or downgrade your releases based on new available releases or updated Product recalls. This is also how you can remove support for an Entity for older releases of your Product, or prevent installation of a new major version.

## Config for Helm charts

:::callout{theme="neutral"}
We recommend that you follow the [Helm naming conventions ↗](https://helm.sh/docs/chart_best_practices/values/#naming-conventions). Variable names should begin with a lowercase letter and words should be separated with camelcase.
:::

For Helm charts, the `overrides` for each range of versions will be provided as part of the Helm values overrides along with other Apollo Entity data. In addition, any [Environment Config](/docs/apollo/managing-environments/environment-config/) defined for the Helm chart Entity's Environment will also be provided as part of the overrides for Helm values. For example:

```yaml
# Entity overrides
0.1.0:
  overrides:
    newerFeature: enabled
```

```yaml
# Environment Config
domainName: my-domain-name.com
numConnectionsAllowed: 5
```

The `overrides` block above declares specific values for any release greater than or equal to `0.1.0`. For a release `0.1.2`, the overrides along with the Environment Config would yield the following value overrides provided during Helm install.

```yaml
apollo:
  entity:
    id: aeid:my-dev-environment:helm-chart:my-helm-chart
  product:
    group: com.palantir.apollo-test
    name: my-helm-chart
    version: 0.1.2
  environment:
    id: my-dev-environment
    domainName: my-domain-name.com
    numConnectionsAllowed: 5
  secrets:
    my-apollo-secret: name-of-secret-in-k8s
  defaultArtifactStoreURI: containers.example.com
  imagePullSecrets:
    - name-of-dockerconfigjson-secret-in-k8s
newerFeature: enabled
```

The `apollo` block is injected by the Helm agent to ensure your chart always has access to Entity and Environment data that may be critical. The top-level keys of the `overrides` block will be injected as top-level keys within the Helm values overrides. You can use any of these keys within your Helm chart templates. For example, to reference the name of your product in a chart template, you can use the syntax `{{ .Values.apollo.product.name }}`.
