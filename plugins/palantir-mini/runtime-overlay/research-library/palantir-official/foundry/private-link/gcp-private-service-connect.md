---
sourceUrl: "https://www.palantir.com/docs/foundry/private-link/gcp-private-service-connect/"
canonicalUrl: "https://palantir.com/docs/foundry/private-link/gcp-private-service-connect/"
sourceLastmod: "2026-05-12T17:06:26.147Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "7adc950cb2b56d4e0267d6baef74d9e2b89250c2e618e617879537e1768cc4e7"
product: "foundry"
docsArea: "private-link"
locale: "en"
upstreamTitle: "Documentation | Supported private link providers > GCP Private Service Connect"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Google Cloud Platform (GCP) Private Service Connect

[Google Private Service Connect ↗](https://cloud.google.com/vpc/docs/private-service-connect) provides private connectivity to Foundry by ensuring traffic occurs from the customer Virtual Private Cloud (VPC) to the Foundry VPC using the Google backbone and avoids the public Internet. Google Private Service Connect supports connections between different virtual private network (VPC) regions. Google Private Service Connect is a Google service.

## Ingress to Foundry for Google Cloud Platform (GCP) Private Service Connect

Traffic can occur from the customer Virtual Private Cloud (VPC) to the Foundry VPC using the Google backbone network. Private Link traffic and open Internet traffic to Foundry are supported at the same time by configuring additional IP whitelists using the [Ingress Configuration in Control Panel](/docs/foundry/administration/configure-ingress/).

### Set up GCP Private Service Connect ingress

To set up Google Private Service Connect ingress, contact your Palantir representative to receive further assistance.

## Egress from Foundry for GCP Private Service Connect

Traffic can also occur from the Foundry Virtual Private Cloud (VPC) to the customer VPC using the Google backbone network.

### Set up GCP Private Service Connect egress

To set up Google Private Service Connect egress, contact your Palantir representative to receive further assistance.
