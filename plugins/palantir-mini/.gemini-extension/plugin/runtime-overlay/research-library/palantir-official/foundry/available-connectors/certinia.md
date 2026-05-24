---
sourceUrl: "https://www.palantir.com/docs/foundry/available-connectors/certinia/"
canonicalUrl: "https://palantir.com/docs/foundry/available-connectors/certinia/"
sourceLastmod: "2026-05-12T17:06:26.147Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "7ed6066febc1c5ee22d1134e0d5b2d1c1b1ac53ccc987df6c275b5d5cdcadd88"
product: "foundry"
docsArea: "available-connectors"
locale: "en"
upstreamTitle: "Documentation | Available connectors > Certinia"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Certinia

<!-- BEGIN GENERATED -->

The Certinia connector is a [Palantir-provided driver](/docs/foundry/data-integration/foundry-provided-drivers/) connector. The official documentation for this driver can be found [here ↗](https://cdn.cdata.com/help/HFK/jdbc/pg_connectionj.htm).

## Networking

The table below lists the domains that the source needs to be able to access in order to successfully run.

If running the connection on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker), be sure to add corresponding egress policies for each of those domains.

If those domains are in a different network from Foundry's network, and you are using [agent proxy egress policies](/docs/foundry/administration/configure-egress/#agent-proxy-egress-policies) (preferred) or an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker) (not recommended), the agent must be able to reach the domain addresses. Additionally, the systems on those domains must be configured to allow connections from the agent. [Learn more about agent networking.](/docs/foundry/data-connection/set-up-agent/#configure-agent-network-access)

| Domain  | Required |
|--- |--- |
| test.salesforce.com  | If `UseSandbox=TRUE` |
| \<Site>.my.salesforce.com | Returned by Salesforce when authenticating |
| login.salesforce.com | Default LoginURL, overriden by LoginURL property. LoginURL used when `AuthScheme=Basic,` OAuth, OAuthPassword, OAuthJWT, OAuthPKCE |
| \<LoginURL> | Used in place of login.salesforce.com |
| \<SSOLoginURL> | If `AuthScheme=Okta,` PingFederate, ADFS |
| \<Subdomain>.onelogin.com | If `AuthScheme=OneLogin.` \<Subdomain> is set in SSOProperties |
| \<SSOExchangeURL> | If `AuthScheme=Okta,` PingFederate, ADFS, OneLogin, AzureAD |
| \<Resource> | If `AuthScheme=AzureAD.` \<Resource> is set in SSOProperties |
| \<RelyingParty> | If `AuthScheme=ADFS.` \<RelyingParty> set in SSOProperties |

<!-- END GENERATED -->
