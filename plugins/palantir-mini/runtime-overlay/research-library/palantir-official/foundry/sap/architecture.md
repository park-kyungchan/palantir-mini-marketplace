---
sourceUrl: "https://www.palantir.com/docs/foundry/sap/architecture/"
canonicalUrl: "https://palantir.com/docs/foundry/sap/architecture/"
sourceLastmod: "2026-05-12T17:06:26.148Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "76f5838c8c9f0584e80ceda2c0ca4ca27ffdc4d789d972a9fc61d5b0b3430f5e"
product: "foundry"
docsArea: "sap"
locale: "en"
upstreamTitle: "Documentation | SAP > Architecture"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Architecture

There are three main architectural patterns for connecting Foundry to an SAP system. All three follow the standard [Data Connection architecture](/docs/foundry/data-connection/architecture/) and make use of [Data Connection agents](/docs/foundry/data-connection/core-concepts/#agents).

## Connecting directly to an SAP ERP or BW system

In this scenario, the Palantir Foundry Connector 2.0 for SAP Applications ("Connector") is installed directly on the SAP ERP or Business Warehouse (BW) system containing the data to be read or hosting the functions / queries to be executed.

![Direct connection](/docs/resources/foundry/sap/sap-architecture-direct-connection.png)

## Connecting to an SAP ERP system via an SAP SLT Replication Server

In this scenario, the Connector is installed on the SAP SLT Replication Server, and a Remote Function Call (RFC) connection is established between that server and the source ERP systems. Data is replicated from each source ERP table to a corresponding Operational Delta Queue (ODQ) in the SLT system based on database triggers.

![SLT connection](/docs/resources/foundry/sap/sap-architecture-slt-connection.png)

## Connecting to a remote SAP ERP system via a gateway

This scenario is applicable when the source ERP system does not fulfill the minimum requirements for installing the Connector (SAP\_BASIS, the technical component version applicable to both SAP NetWeaver and SAP S/4HANA systems, version 7.4 SP5 or above). Here, the main component of the Connector is installed on a "gateway" application server that meets the minimum requirements, and an RFC connection is established between that server and the source ERP system(s). A remote agent component of the Connector is installed on the source ERP system(s), which facilitates the reading of data or the execution of functions / queries.

![Remote connection](/docs/resources/foundry/sap/sap-architecture-remote-connection.png)
