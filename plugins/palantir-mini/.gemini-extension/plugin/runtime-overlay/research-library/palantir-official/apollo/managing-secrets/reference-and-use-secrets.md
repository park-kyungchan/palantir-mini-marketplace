---
sourceUrl: "https://www.palantir.com/docs/apollo/managing-secrets/reference-and-use-secrets/"
canonicalUrl: "https://palantir.com/docs/apollo/managing-secrets/reference-and-use-secrets/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "95191efe0cb8686976671217a4f94f5746fe44cea41029fe029d8710d2580b51"
product: "apollo"
docsArea: "managing-secrets"
locale: "en"
upstreamTitle: "Documentation | Managing Secrets > Reference and use secrets"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Reference and use secrets

## Reference secrets

After [creating a secret](/docs/apollo/managing-secrets/add-edit-delete-secrets/#add-user-defined-secrets), you can reference the secret in the [Entity config](/docs/apollo/managing-entities/set-config-overrides/), located in the **Config** tab of the Entity page.

You can reference the secret using the following syntax:

```
{{ preprocess .Values.apollo.secrets.<secret-name>.k8sSecretName }}
```

You should substitute `<secret-name>` with the Kubernetes secret name, which is the `Secret name` that you defined in Apollo. Here is an example invocation:

```
{{ preprocess .Values.apollo.secrets.examplesecret.k8sSecretName }}
```

In the above example, `examplesecret` is the `Secret name`.

## Use secrets

You can use secrets that you created in Apollo to create a volume mount, define an environment variable, or use it from within your application code.

For example, consider the following Helm chart `manifest.yml`, which requires a user-defined secret to be mounted as a volume:

```yaml
volumes:
  {{ if .Values.admin.existingSecretName }}
  - name: admin-secret
    secret:
      secretName: {{ .Values.admin.existingSecretName }}
      items:
        - key: {{ .Values.admin.existingSecretKey }}
          path: secret.txt
  {{ end }}
```

The Helm chart expects a Kubernetes secret defined in its `values.yml` file at `.Values.admin.existingSecretName` with a secret value located under the key `.Values.admin.existingSecretKey`.

```yaml
# values.yml:
admin:
  # existingSecretName is the name of a Kubernetes secret in the environment
  existingSecretName: '{{ preprocess .Values.apollo.secrets.examplesecret.k8sSecretName }}'
  # existingSecretKey is the key that corresponds to the secret value in the secret existingSecretName
  existingSecretKey: "token"
```
