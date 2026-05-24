---
sourceUrl: "https://www.palantir.com/docs/apollo/managing-entities/stopping-and-starting-entities/"
canonicalUrl: "https://palantir.com/docs/apollo/managing-entities/stopping-and-starting-entities/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "552e8b6134d447e6c93d137fe1b115fe44d9411c709982dce3641d294429bcc8"
product: "apollo"
docsArea: "managing-entities"
locale: "en"
upstreamTitle: "Documentation | Managing Entities > Stopping and Starting Entities"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Stopping and Starting Entities

In Kubernetes, a live pod cannot be paused and restarted in the traditional sense. However, the number of replicas can be set to 0 to stop all instances. Increasing the number of replicas to a non-zero value will then "restart" the service.

You can stop and restart Entities within a given Environment in Apollo by setting the replicas to 0 in the configuration overrides. To restart a stopped service, remove the configuration that sets replicas to 0 to set the replicas back to the Product's default.

An example override to set replicas to 0 is provided below. This example override sets the desired replicas of this Entity to be 0 (specifically, all 2.x.x versions greater than or equal to 2.2.0).

```yaml
"2.2.0":
  live-reloaded-config:
    replication:
      desired: 0
```

Learn more about [setting config overrides](/docs/apollo/managing-entities/set-config-overrides/).
