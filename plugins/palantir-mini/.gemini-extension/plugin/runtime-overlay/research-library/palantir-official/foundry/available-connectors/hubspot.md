---
sourceUrl: "https://www.palantir.com/docs/foundry/available-connectors/hubspot/"
canonicalUrl: "https://palantir.com/docs/foundry/available-connectors/hubspot/"
sourceLastmod: "2026-05-12T17:06:26.147Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "95f47a54a854f39a1b05fc5f2a1901ee4b6ca0395d811590d57db9fdea3e32cc"
product: "foundry"
docsArea: "available-connectors"
locale: "en"
upstreamTitle: "Documentation | Available connectors > Hubspot"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Hubspot

Connect Foundry to HubSpot to import data and create, modify, and delete records in HubSpot.

## Source configuration

Before you configure the HubSpot connection, generate a HubSpot API key. You can get an existing API key or generate a new HubSpot API key by following the steps below.

1. In your Hubspot account, select the settings icon in the main navigation bar.
2. In the left sidebar menu, navigate to **Integrations > API Key**.
3. If a key has never been generated for your account, select **Generate API Key**. If an API key already exists, select **Show** to view it.

You can now set the retrieved key in the `api-key` connection property.

The following is the most basic structure for a Hubspot connection:

```yaml
type: hubspot
config:
  apiKey: '{{api-key}}'
```
