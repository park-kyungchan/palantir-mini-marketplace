---
sourceUrl: "https://www.palantir.com/docs/apollo/core/agents/"
canonicalUrl: "https://palantir.com/docs/apollo/core/agents/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "a5dacac4cbec3b2abc40080844a733c86424415f4db0f501c8eaee4ed80a3a9f"
product: "apollo"
docsArea: "core"
locale: "en"
upstreamTitle: "Documentation | Core concepts > Apollo Agents"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Apollo Agents

![agent architecture](/docs/resources/apollo/core/agent_architecture.png)

An Apollo Agent is any agent running within a [managed Spoke Environment](/docs/apollo/core/environments/) that is responsible for executing Plans provided by the Apollo Hub and reporting back the Reported State back to the Hub. An example of an agent running in the [Spoke Control Plane](/docs/apollo/core/spoke-control-plane/) is the [Helm Chart Operator](/docs/apollo/core/spoke-control-plane/#helm-chart-operator).

Apollo Agents are responsible for communicating with key services to manage an Environment:

* The **Apollo Hub**, which provides the latest information for Plans that the Apollo Agent needs to execute. The Apollo Agent interacts with the Apollo Hub to understand what Plans the Agent needs to execute and provide updates on the status of those Plans.
* Declared **Artifact Repositories** for the Environment which are responsible for serving and storing Helm Charts and container images. The Apollo Agent must be able to pull charts and images from the configured artifact repository to implement Plans within the Environment.

The Apollo Agent only communicates with these services via encrypted, unidirectional outbound requests from the Environment. This provides Environment operators with ultimate control over all allowlisted network traffic.

### Encryption in transit

During the Environment registration process, a cryptographic key is generated that is unique to that specific Environment. This certificate is signed by the Apollo Hub and is leveraged by the Apollo Agent for all communications back to the Hub, uniquely identifying the traffic as originating with that Agent and preventing impersonation.

### HTTP proxy support

If your managed Spoke Environment sits behind a HTTP proxy service, you must configure your Apollo Agent with the appropriate `HTTPS_PROXY` and `NO_PROXY` values to ensure that the Agent is able to communicate with the Hub.
