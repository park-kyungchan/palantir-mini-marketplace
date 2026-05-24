---
sourceUrl: "https://www.palantir.com/docs/apollo/managing-environments/environment-config/"
canonicalUrl: "https://palantir.com/docs/apollo/managing-environments/environment-config/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "1057637fdd4c4ebf56f94593c58ffa73eacf4b2debb61d7ce3259e62790674b8"
product: "apollo"
docsArea: "managing-environments"
locale: "en"
upstreamTitle: "Documentation | Managing Environments > Environment Config"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Environment Config

## Recommended uses of Environment Config

Environment Config is a useful tool for defining Environment-level properties that need to be propagated to many Entities in the Environment. Good candidates for Environment Config properties include those that are intrinsic to the Environment (such as cloud provider or region) and properties of the Environment that need to be referenced across a broad range of Entities (such as DNS name). If a property is only useful for a small subset of Entities in an Environment, consider using [config overrides](/docs/apollo/managing-entities/set-config-overrides/) instead.

## Updating Environment Config

Environment Config can be updated from the **Config** tab found on an Environment's home page. It must contain valid YAML configuration and any keys should not contain hyphens, periods, or whitespace. For example, here is a valid configuration:

```yaml
domainName: my-domain-name.com
numConnectionsAllowed: 5
enableSchedulingConstraints: true
availabilityZones:
    - availability-zone-1
    - availability-zone-2
namespaces:
    defaultNamespace:
        name: myNamespace
```

As with other settings, edits to Environment Config are added via [change requests](/docs/apollo/managing-changes/change-requests/) and are subject to the approval policies configured for the Environment. This creates a robust historical record of configuration changes, a clear audit trail for production environments, and opportunities for validation. Once changes to Environment Config have been approved, Apollo will issue a Plan to update the configuration for each Entity that utilizes Environment Config in the Environment.

## Using Environment Config

You can reference Environment Config in your Helm chart templates using [Helm's built-in `Values` object ↗](https://helm.sh/docs/chart_template_guide/builtin_objects/):

```yaml
{{ .Values.apollo.environment.<configKey> }}
```

You should substitute `<configKey>` with the key in your Environment Config YAML file.

For example, if you have an entry `myKey: myValue` in Environment Config, you can reference this entry using the following syntax:

```yaml
{{ .Values.apollo.environment.myKey }}
```

This will be rendered to `myValue` when Helm renders the template.

You can also reference Environment Config in your Entity's [config overrides](/docs/apollo/managing-entities/set-config-overrides/) with the `preprocess` directive:

```yaml
{{ preprocess .Values.apollo.environment.<configKey> }}
```

You should substitute `<configKey>` with the key in your Environment Config YAML file.

For example, if you have an entry `myKey: myValue` in Environment Config, you can reference this entry in your Entity config overrides using the following syntax:

```yaml
{{ preprocess .Values.apollo.environment.myKey }}
```

This will be rendered to `myValue` when Helm renders the `Values` object.
