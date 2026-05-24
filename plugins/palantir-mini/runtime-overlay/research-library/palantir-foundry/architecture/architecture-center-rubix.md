---
source: https://www.palantir.com/docs/foundry/architecture-center/rubix/
fetched: 2026-04-20
section: architecture-overviews
doc_title: The Rubix substrate
---

## The Rubix substrate

AIP, Foundry, and Apollo all operate within a hardened, autoscaling, highly available implementation of Kubernetes known as Palantir Rubix.

Rubix was developed with the goal of extending the core benefits of open-source containerization with the features needed to operate in the world's most demanding environments. This includes ephemeral compute nodes with enforced cycle times, secure-by-default networking, dynamic and intelligent autoscaling, and a wide range of features that meet the most stringent accreditation standards, including FedRAMP High, DOD DISA IL-5/IL-6, and CMMC.

The Rubix architecture was initially developed to host Palantir's own software, but is now used by software companies of all sizes to deploy their products into any environment of their choosing.

Core design assumptions: mission-critical software must be **secure by design**, **highly available**, and **capable of rapid evolution**.

### Security

Rubix is designed to mitigate against both tactical and advanced persistent threat vectors.

- Every workload is securely isolated based on necessary requirements, enabling the safe execution of operational tasks that require elevated privileges.
- Encryption is rigorously enforced across every element in the environment.
- Every interaction between workloads must be authenticated, authorized, and logged in accordance with immutable configurations.

Palantir built the first versions of Rubix to pioneer this secure, autoscaling paradigm with the Spark compute runtime. Today, this now extends across every runtime and service structure within AIP, Foundry, and Apollo.

### High availability

High availability is interwoven with Rubix's approach to ephemerality: **nodes in Rubix environments cannot live longer than 48 hours**. This ensures that every service is designed for disruption and resilient failover.

Rubix also reduces the need for manual interventions from infrastructure teams, since outdated instances are automatically replaced, and the logic that drives this replacement contains encoded learnings from global performance.

From a security perspective, aggressive node cycling ensures that compromising a single node is insufficient for an attacker to gain persistent access to an environment.

### Rubix as a substrate for Palantir services

Rubix drives efficiency for infrastructure, platform, and customer teams alike. By providing a secure and consistent substrate for Palantir's core services, it enables infrastructure teams to deploy AIP, Foundry, Apollo, and dependent offerings across:
- AWS
- Azure
- Google Cloud
- Oracle Cloud
- On-premises environments

...with identical operational characteristics.

For customer developers looking to securely host custom applications, containerized models, and other Kubernetes-compliant workloads (e.g., through Compute Modules), all of Rubix's core benefits can be transparently leveraged.

### Apollo and "Day 2" operations

Rubix works in concert with Apollo to provide a powerful mission control for "Day 2" infrastructure operations.

Apollo is responsible for the computation and transmission of plans for installations, upgrades, and rollbacks for each of the hundreds of services in a given Palantir environment.

To ensure zero-downtime upgrades, Apollo requires that every software service is deployed in a multi-node configuration that is designed for "blue/green" rollout strategies. The blue/green paradigm first builds a parallel green environment and monitors its performance alongside the existing blue environment. If the green environment operates successfully for a specified period of time, traffic is gradually redirected away from blue nodes to green nodes.

### Build once, run anywhere

Rubix provides the foundation for Palantir's "write once, ship anywhere" development philosophy.

In addition to enabling Palantir's developer teams, Rubix empowers software teams looking to deploy their own end-to-end solutions into regulated environments (enabling them to achieve FedRAMP compliance through Palantir FedStart).

Rubix also enables entire government agencies to securely expedite vendor onboarding and management through the Mission Manager offering.
