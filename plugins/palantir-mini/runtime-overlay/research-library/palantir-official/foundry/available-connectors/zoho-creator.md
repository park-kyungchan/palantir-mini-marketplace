---
sourceUrl: "https://www.palantir.com/docs/foundry/available-connectors/zoho-creator/"
canonicalUrl: "https://palantir.com/docs/foundry/available-connectors/zoho-creator/"
sourceLastmod: "2026-05-12T17:06:26.148Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "c401eb99743aeca6fc805f7c3fd93f0548b55477851ac86853b68c2782f42215"
product: "foundry"
docsArea: "available-connectors"
locale: "en"
upstreamTitle: "Documentation | Available connectors > Zoho Creator"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Zoho Creator

<!-- BEGIN GENERATED -->

The Zoho Creator connector is a [Palantir-provided driver](/docs/foundry/data-integration/foundry-provided-drivers/) connector. The official documentation for this driver can be found [here ↗](https://cdn.cdata.com/help/KCK/jdbc/pg_connectionj.htm).

## Networking

The table below lists the domains that the source needs to be able to access in order to successfully run.

If running the connection on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker), be sure to add corresponding egress policies for each of those domains.

If those domains are in a different network from Foundry's network, and you are using [agent proxy egress policies](/docs/foundry/administration/configure-egress/#agent-proxy-egress-policies) (preferred) or an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker) (not recommended), the agent must be able to reach the domain addresses. Additionally, the systems on those domains must be configured to allow connections from the agent. [Learn more about agent networking.](/docs/foundry/data-connection/set-up-agent/#configure-agent-network-access)

| Domain  | Required |
|--- |--- |
| \<APIDomain> - default: creatorapp.zoho.\<Region> | Always. Region connection property maps to TLD (default `Region=US` --> .com); APIDomain can be used when manually setting OAuthAccessToken |
| \<AccountsServer> - default: accounts.zoho.\<Region> | Always. Retrieved automatically with OAuth flow; set in AccountsServer connection property when manually providing OAuthAccessToken |

### Region Mappings

Use the following region mapping to complete the domain url:

| Region  | Endpoint |
|--- |--- |
| US | .com |
| Europe | .eu |
| India | .in |
| Australia | .com.au |
| Japan | .jp |
| China | .com.cn |

<!-- END GENERATED -->
