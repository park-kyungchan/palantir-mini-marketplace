---
sourceUrl: "https://www.palantir.com/docs/foundry/private-link/azure-private-link/"
canonicalUrl: "https://palantir.com/docs/foundry/private-link/azure-private-link/"
sourceLastmod: "2026-05-12T17:06:26.147Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "1471b481fc840c13fefb110a0cd556069805fae9194d6dc322e367d2242c579e"
product: "foundry"
docsArea: "private-link"
locale: "en"
upstreamTitle: "Documentation | Supported private link providers > Azure Private link"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Azure Private Link

[Azure Private Link ↗](https://learn.microsoft.com/en-us/azure/private-link/) provides private connectivity to Foundry by ensuring that access to Foundry is through a private IP address. Azure Private Link supports connections between different virtual network (VNet) regions. Note that Azure Private Link is a Microsoft service.

## Choosing between ingress, egress, or both

Before setting up Azure Private Link, you need to determine which type of private connectivity your use case requires.

Ingress refers to traffic flowing into Foundry from your network. For example, a Data Connection agent in your VNet connecting back to Foundry, or users accessing the Foundry UI from a private network.

Egress refers to traffic flowing out of Foundry to resources in your environment. For example, Foundry syncing data from an Azure SQL Database or other VNet-hosted service. The two directions serve different purposes and each requires a separate setup.

If your data source is Azure Blob Storage or Azure Data Lake Storage Gen2, you may not need a Private Link at all. Azure Storage network policies are self-serve and can be configured directly in Control Panel. Only set up an egress Private Link for Azure Storage if your organization specifically requires it and cannot allowlist VNet subnets via storage policies.

Your environment may involve multiple use cases, each requiring either ingress or egress connectivity. [Ingress](#ingress-to-foundry-for-azure-private-link) and [egress](#egress-from-foundry-for-azure-private-link) are independent setups and can be configured separately or together. Refer to the relevant sections below for setup steps for each.

## Ingress to Foundry for Azure Private Link

Traffic can occur from your non-Foundry virtual network (VNet) to the Foundry VNet using the Microsoft backbone network. Private Link traffic and open Internet traffic to Foundry are supported at the same time by configuring additional IP whitelists using the [Ingress Configuration in Control Panel](/docs/foundry/administration/configure-ingress/).

## Set up ingress to Foundry for Azure Private Link

1. Share your Azure Subscription ID with your Palantir representative. You can find the Azure Subscription ID in your [Azure Portal ↗](https://portal.azure.com), as described in [the Azure documentation for obtaining the Subscription ID ↗](https://learn.microsoft.com/en-us/azure/azure-portal/get-subscription-tenant-id).
2. Palantir will provide you with your Foundry enrollment's [Private Link Alias ↗](https://learn.microsoft.com/en-us/azure/private-link/private-link-service-overview#alias). The alias is usually in the following form: `ingress-privatelink.<GUID>.<REGION>.azure.privatelinkservice`.
3. Create a new Private Endpoint in your [Azure Portal ↗](https://portal.azure.com). The steps below follow the [Azure guide for creating a Private Endpoint ↗](https://learn.microsoft.com/en-us/azure/private-link/create-private-endpoint-portal?tabs=dynamic-ip).
4. Choose **Create new service**, then select **Private Endpoint**, then select **Create**.
5. Fill in the details of your resource group and name your private link, then select **Next**.
6. Select **Connect to an Azure resource by resource ID or alias.** and fill in the Foundry instance's Private Link Alias that you received from Palantir previously, then choose **Next**.
7. Choose your virtual network and subnet. In most cases, the **Network policy for private endpoints** setting should be disabled; see the [Azure documentation ↗](https://learn.microsoft.com/en-us/azure/private-link/disable-private-endpoint-network-policy?tabs=network-policy-portal) for more information about this setting. The **Application security group** can be left empty.
8. In the DNS section, private DNS integration can be kept as "disabled", unless a private DNS Zone to be used with the endpoint has already been set up. Private DNS integration can also be setup later, after the private endpoint has been created.
9. Tags can be optionally added if you use them in your Azure environment. After optionally adding tags, select **Review + create**.
10. You should see a **Validation passed** message at the top of the screen. If so, review the configuration and select **Create** to begin the deployment process.
11. You should see a "Deployment complete" message when the deployment is finished; after deployment is complete, select **Go to resource**.
12. In the private link overview, select **Settings** > **Properties**, then copy the "Resource ID" field and send it back to your Palantir representative. For example, the resource ID may look like: `/subscriptions/<SUBSCRIPTION_UUID>/resourceGroups/<RESOURCE_GROUP_NAME>/providers/Microsoft.Network/privateEndpoints/<PRIVATE_ENDPOINT_NAME>`
13. Create a DNS record to point the Foundry domain to the private link IP address. If needed, first create a Private DNS Zone connected to your resource group which contains the Private Link. Upon creation, it will be shown in the DNS Zone view. More information can be found in the [Azure documentation for private endpoints DNS integration ↗](https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns-integration).
14. In the DNS zone, create an A-record pointing to the Private Link private IP (found in the Private Link **DNS configuration** section). Note that you can leave the **Name** field empty if your DNS zone already contains the full Foundry domain (such as `<your-enrollment>.palantirfoundry.com`). Otherwise, add a subdomain prefix to match the full Foundry domain.
15. (Conditional) If the Foundry domain is **owned by you** (meaning that the domain is not a Palantir-owned domain such as `*.palantirfoundry.com`), there is additional configuration needed to funnel internal Foundry services through the endpoint as well, for which the steps are defined in the documentation on [customer-owned domain private links](/docs/foundry/private-link/customer-owned-domain-private-link/).
16. Refresh and clear your browser cache, and all traffic from your Azure VNet to Foundry will be routed through the private link instead of the public Internet.

## Egress from Foundry for Azure Private Link

Traffic that occurs from Foundry to other Azure VNets can be configured to be routed through the Azure backbone instead of the public Internet, regardless of whether the Foundry instance's VNet and the target VNet are in the same or different Azure regions.

### Set up egress from Foundry for Azure Private Link

For instructions on setting up egress from Foundry for Azure Private Link, see the [documentation on configuring Private Link egress for Azure](/docs/foundry/administration/configure-private-link-egress-azure/).

Some Azure services support sending all traffic via the Azure backbone *without extra Azure costs of using a custom Private Link*, by using Azure gateways. The Azure services currently supported are:

* **Azure Storage:** This is self-serve in Palantir Foundry by creating an Azure Storage policy, as described in the [documentation on Azure storage policies](/docs/foundry/administration/configure-egress/#microsoft-azure-storage-policies).

For private connectivity to all other Azure services or Azure VNets that require an egress Private Link setup, refer to the [documentation on configuring Private Link egress for Azure](/docs/foundry/administration/configure-private-link-egress-azure/).
