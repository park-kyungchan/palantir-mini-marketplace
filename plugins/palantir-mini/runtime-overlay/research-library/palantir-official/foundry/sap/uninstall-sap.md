---
sourceUrl: "https://www.palantir.com/docs/foundry/sap/uninstall-sap/"
canonicalUrl: "https://palantir.com/docs/foundry/sap/uninstall-sap/"
sourceLastmod: "2026-05-12T17:06:26.148Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "76a87861142db1a948c99bc2afbaa3c8db564bc414eb0f567b2bb5709996a5d8"
product: "foundry"
docsArea: "sap"
locale: "en"
upstreamTitle: "Documentation | SAP Add-on > Uninstall the Connector or Remote Agent"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Uninstall the Palantir Foundry Connector 2.0 for SAP Applications or Remote Agent

:::callout{theme="neutral"}
Before uninstallation, run `SA38` and then the `/PALANTIR/UNINSTALL_CORR` program to correct the directory entries of the Palantir Foundry Connector 2.0 for SAP Applications ("Connector") components (**PALANTIR**, **PALCONN**, **PALAGENT**, **PALODATA**).
:::

Use `SAINT` (SAP Add-On Installation Tool) to uninstall the Connector. Note that depending on your circumstances, **PALAGENT** may not be available for the Connector installation.

Uninstall **PALCONN**, **PALAGENT**, and **PALODATA** first or uninstall all components together. If you try to uninstall the **PALANTIR** (Palantir Foundry Foundation) component alone, `SAINT` will raise an error since **PALCONN**, **PALAGENT** and **PALODATA** depend on **PALANTIR**.
