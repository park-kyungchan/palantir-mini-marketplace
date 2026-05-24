---
sourceUrl: "https://www.palantir.com/docs/foundry/available-connectors/smartsheet/"
canonicalUrl: "https://palantir.com/docs/foundry/available-connectors/smartsheet/"
sourceLastmod: "2026-05-12T17:06:26.148Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "bce729709d58d1654b8b4e1cbed4ab37a737eb5cbb8f017e72f7af0e86bf328f"
product: "foundry"
docsArea: "available-connectors"
locale: "en"
upstreamTitle: "Documentation | Available connectors > Smartsheet"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Smartsheet

<!-- BEGIN GENERATED -->

The Smartsheet connector is a [Palantir-provided driver](/docs/foundry/data-integration/foundry-provided-drivers/) connector. The official documentation for this driver can be found [here ↗](https://cdn.cdata.com/help/BSK/jdbc/pg_connectionj.htm).

## Networking

The table below lists the domains that the source needs to be able to access in order to successfully run.

If running the connection on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker), be sure to add corresponding egress policies for each of those domains.

If those domains are in a different network from Foundry's network, and you are using [agent proxy egress policies](/docs/foundry/administration/configure-egress/#agent-proxy-egress-policies) (preferred) or an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker) (not recommended), the agent must be able to reach the domain addresses. Additionally, the systems on those domains must be configured to allow connections from the agent. [Learn more about agent networking.](/docs/foundry/data-connection/set-up-agent/#configure-agent-network-access)

| Domain  | Required |
|--- |--- |
| api.smartsheet.com | If `Region=GLOBAL` (default) |
| api.smartsheet.eu | If `Region=EU` |
| api.smartsheetgov.com | If `Region=GOV` |
| app.smartsheet.com | Only for Authorization URL, If `Region=GLOBAL` (default) |
| app.smartsheet.eu | Only for Authorization URL, If `Region=EU` |
| app.smartsheetgov.com | Only for Authorization URL, If `Region=GOV` |

<!-- END GENERATED -->

### Connection settings

The URL field cannot be modified and is fixed as `jdbc:smartsheet:`. The `JDBC properties` section can be used as an alternative to modifying the JDBC URL.

For example, to represent the following JDBC URL:
`jdbc:smartsheet:InitiateOAuth=GETANDREFRESH;OAuthClientId=MyOAuthClientId;OAuthClientSecret=MyOAuthClientSecret;CallbackURL=http://localhost:33333;`, you can specify the additional properties in the `JDBC properties` section as follows:

![Smartsheet connection settings.](/docs/resources/foundry/available-connectors/smartsheet-connection-settings.png)
