---
sourceUrl: "https://www.palantir.com/docs/foundry/private-link/customer-owned-domain-private-link/"
canonicalUrl: "https://palantir.com/docs/foundry/private-link/customer-owned-domain-private-link/"
sourceLastmod: "2026-05-12T17:06:26.147Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "0aa1a460661e46d3f6db1153592cc3af401f40dbec12196e15bce5ee0e141653"
product: "foundry"
docsArea: "private-link"
locale: "en"
upstreamTitle: "Documentation | Private links (VPC connectivity) > Customer-owned domain with Private Link"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Customer-owned domain with private link

If you have set up a private link to your Foundry environment, and if the Foundry domain is **owned by you** (meaning that the domain is not a Palantir-owned domain, such as `*.palantirfoundry.com`), there is additional configuration needed to funnel internal Foundry services through the endpoint.

Follow these steps to complete configuration of a private link for a customer-owned domain:

1. Provision a separate secondary domain that will be used for internal Foundry container services. This can also be a subdomain of the main Foundry domain, such as `containers.foundry.<customer>.com`.
2. Set up a DNS C-Name to point this secondary domain to the VPC Endpoint Universal DNS name, the same as for the main Foundry domain.
3. Sign and return the Certificate Signing Request (CSR) for the secondary domain provided by a Palantir representative.
4. Palantir will configure the Foundry instance to serve the new certificate for the secondary domain.

After this is done, all traffic to Foundry will be routed through the private link that was set up.
