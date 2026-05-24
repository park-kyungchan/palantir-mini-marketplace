---
sourceUrl: "https://www.palantir.com/docs/foundry/interfaces/extend-interface/"
canonicalUrl: "https://palantir.com/docs/foundry/interfaces/extend-interface/"
sourceLastmod: "2026-05-12T17:06:26.152Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "60b4e275bf50a18b3907afe0114417311dede33879788a4d60a219335eda3ac2"
product: "foundry"
docsArea: "interfaces"
locale: "en"
upstreamTitle: "Documentation | Interfaces > Extend an interface"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Extend an interface

Extending an interface allows you to compose interfaces together, creating a new, more specific interface. This is particularly useful for constructing [abstract object interfaces](/docs/foundry/interfaces/interface-overview/) that implement multiple [capability interfaces](/docs/foundry/interfaces/interface-overview/). An interface inherits the shared properties and links of the interface it extends. An interface can extend any number of other interfaces.

To extend an interface, follow the steps below.

1. From Ontology Manager, select the interface you wish to extend to open the interface overview page.

2. From the overview page, select **Extension** from the left side panel.

3. From the interface extensions page, select **Add extension**.

<img src="./media/extend-interface.png" alt="Add an extension to an interface." width="800" />

4. From the dropdown menu, select the interface to extend from your current interface.

<img src="./media/confirm-extension.png" alt="Confirm interface extension." width="500" />

5. In the confirmation dialog, review the shared properties and links that will be added to the interface extension and select **Confirm**.

6. Select **Save** in the upper right corner to add the interface extension to the Ontology.

You can also remove an extension to decouple one interface from another. This action will remove all inherited shared properties from the interface, remove all inherited link type constraints, and disassociate the extending interface from the base interface.

<img src="./media/remove-interface-extension.png" alt="Remove an existing interface extension." width="800" />
