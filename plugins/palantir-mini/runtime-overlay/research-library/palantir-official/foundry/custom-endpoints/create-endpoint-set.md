---
sourceUrl: "https://www.palantir.com/docs/foundry/custom-endpoints/create-endpoint-set/"
canonicalUrl: "https://palantir.com/docs/foundry/custom-endpoints/create-endpoint-set/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "10a71f46d200a8b2604c241298f0017eb45caf2816cb7064fd652d4c2409ecfe"
product: "foundry"
docsArea: "custom-endpoints"
locale: "en"
upstreamTitle: "Documentation | Custom Endpoints > Create an endpoint set"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Create an endpoint set

Follow the instructions below to create a new endpoint set:

1. Select **Files** from the workspace navigation bar and find your desired project or folder.
2. Select **New > Endpoint set** in the top right to create a new endpoint set in the current project or folder. The new endpoint set will inherit permissions from its parent project or folder. <br><br> <img src="./media/create-from-compass.png" alt="The 'Endpoint set' option in the new resource creation menu." width=500 /> <br><br>
3. In the **Save new endpoint set** dialog, input a name for your endpoint set and save it. This creates a new empty endpoint set resource. <br><br>
   ![The 'Save new endpoint set' dialog with the option to name your endpoint set.](/docs/resources/foundry/custom-endpoints/creation-wizard.png)

## Register a subdomain to host your endpoints

In production workflows, all custom endpoints are served from a user-specified subdomain. This subdomain acts as the host for your endpoint set release, enabling access to deployed endpoints that execute foundry logic.

To request a new endpoint hosting subdomain, follow the instructions below:

1. Navigate to **Overview > Endpoint domain** in your selected endpoint set, and specify a subdomain name.
2. Select **Request endpoint hosting domain** in the top right and acknowledge the instructions to create a subdomain registration request. <br><br>
   ![Request an endpoint hosting subdomain.](/docs/resources/foundry/custom-endpoints/request-subdomain.png) <br><br>
3. Await approval for your subdomain registration request from your enrollment administrator.

After registering and recieving approval for your subdomain, you should see a **Domain ready** tag next to your deployed subdomain. While waiting for approval, you can continue to configure and test your endpoint definitions. Review the [custom endpoint definition](/docs/foundry/custom-endpoints/define-endpoints/) documentation for more details.

![Registered endpoint hosting subdomain.](/docs/resources/foundry/custom-endpoints/registered-subdomain.png)
