---
source: https://www.palantir.com/docs/foundry/architecture-center/multimodal-data-plane/
fetched: 2026-04-20
section: architecture-overviews
doc_title: Multimodal Data Plane (MMDP)
---

## Multimodal Data Plane (MMDP)

The Multimodal Data Plane (MMDP) is Palantir's open data and compute architecture. MMDP reflects the learnings of two decades of forging battle-tested solutions on the frontline of customer missions, and wrestling with the design tradeoffs that often create tension between analytical and operational system designs.

Most platform architectures are built around particular compute runtimes or data storage modalities. While this can function for narrow use cases, these dependencies can quickly become a hindrance when scaling to interconnected use cases which require complex interplays of, for example, structured, unstructured, time series, geospatial, or geometric data, which must each be transformed and manipulated through different forms of compute.

MMDP's philosophy: **"Any data, any compute, any model, anywhere."**

### Any data: MMDP's open data architecture

The bedrock of MMDP is an open data architecture. This starts with a commitment to Apache Iceberg as the primary table format for Foundry and AIP.

Iceberg is being embraced as an open standard across key Palantir partners, including AWS, Google Cloud, Microsoft Azure, Databricks, and Snowflake.

MMDP allows Iceberg catalogs to be managed within Palantir, or as virtual catalogs and virtual tables that are registered from these (or other) providers. This means that leveraging data in the Ontology for operational applications and AI-driven automations never requires data to be duplicated.

Adopting Iceberg also means that standard tools such as SQL applications and analytical notebooks can securely interact with and manipulate data in Foundry and AIP as in any other environment.

Beyond tabular data, MMDP extends the same open guarantees to media, documents, streaming data, geospatial data, and the vast expanse of multimodal data types.

- Media data can be synchronized with minimal assumptions about the underlying format.
- Streaming and geo-temporal data, which might have associative metadata (e.g., sensor tags) that require processing in a data pipeline that flows parallel to the primary ingress pipeline.
- Export jobs and Ontology-based webhooks provide simple and secure methods of synchronizing any data (regardless of modality) to external systems.
- Source-based Transforms paradigm enables developers to use the full power of the Foundry toolchain to customize data egress as needed, at the granularity of individual workflow steps.

### Any compute: MMDP's open compute architecture

MMDP's open compute architecture unlocks the value of the open data architecture. Foundry and AIP come with an array of out-of-the-box runtimes, which all use a hardened, autoscaling Kubernetes-based compute mesh (Palantir Rubix).

Rubix operates on zero-trust principles and enforces a rigorous security posture across every runtime and service it manages; for instance, to defend against advanced persistent threats, every container is destroyed and cycled within 72 hours.

Users across roles and functions can leverage batch, streaming, and interactive compute engines within the platform (and through APIs and SDKs):

- **Autoscaling Spark** for batch compute
- **Autoscaling Flink** for streaming compute
- Range of open and high-performance single-node engines: Apache DataFusion, Polars, and DuckDB

Data transformations "South of the Ontology" (from raw data to Ontology data) as well as interactive functions "North of the Ontology" (from Ontology data to end users) can leverage these runtimes and others in a resilient and governed manner.

The **Compute Modules** framework enables "Bring your own compute" (BYO Compute), where any containerized resource can be imported and securely surfaced through batch, streaming, and interactive functions.

MMDP also enables native and seamless pushdown of compute to cloud-native runtimes (such as Databricks or Snowflake), allowing developers to use tools like Pipeline Builder and Code Workspaces with their existing compute resources.

### Any model: Palantir's commitment to model access

MMDP's "any model" philosophy reflects the ongoing commitment to offer the latest generative AI models through AIP's Model Catalog (including those from OpenAI, Anthropic, Google, Meta, and xAI), and providing a level playing field for enterprises to register and use their own models in equal measure.

LLMs and multimodal models, whether Palantir-provided or custom-registered, can be seamlessly used throughout Foundry and AIP applications, including Pipeline Builder, Workshop, AIP Logic, and the developer toolchain.

Access to models can be governed with precision, with token limits can be set across all use-cases and lines of effort. Resource management capabilities extend cohesively across all data, compute, and AI models connected through MMDP.

### Anywhere: MMDP's commitment to openness

- Open data architecture leverages open standards like Apache Iceberg, while providing parity for media, documents, streams, and multimodal data types.
- Open compute architecture bundles in common runtimes, allows teams to bring their own compute resources, and provides rich interfaces for orchestrating with existing compute infrastructure throughout the enterprise.
- Wide variety of LLMs available through the Model Catalog and the ability to register custom, fine-tuned, and existing enterprise models.
- With Palantir Apollo, all of this flexibility is agnostic to the underlying infrastructure provider and continuously evolving.
