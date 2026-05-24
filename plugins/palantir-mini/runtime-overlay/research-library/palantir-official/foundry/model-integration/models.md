---
sourceUrl: "https://www.palantir.com/docs/foundry/model-integration/models/"
canonicalUrl: "https://palantir.com/docs/foundry/model-integration/models/"
sourceLastmod: "2026-05-12T17:06:26.152Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "ec19ead3813a66d2b4bef0ee57d495cf98ceed9743001582b3326a8234ece4a8"
product: "foundry"
docsArea: "model-integration"
locale: "en"
upstreamTitle: "Documentation | Core concepts > Models"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Models

In Foundry, a **model** is an artifact for inference that contains machine learning, forecasting, optimization, physical models, or business rules. Within a use case, models encode knowledge about your data to create predictions and empower decisions.

Models developed inside or integrated into Palantir provide:

* Full version history, granular model permissioning, automatic dependency management, model lineage, and API management
* No-code hosting for live inference through [model deployments](/docs/foundry/manage-models/create-a-model-deployment/)
* No-code batch inference in data pipelines through the [Pipeline Builder trained model node](/docs/foundry/pipeline-builder/transforms-trained-model/)
* Model management, evaluation, and deployment via the [Modeling Objectives](/docs/foundry/model-integration/objectives/) application
* Binding to the Foundry Ontology, allowing for operationalization via [Foundry applications](/docs/foundry/app-building/overview/), [Functions on models](/docs/foundry/functions/functions-on-models/), and [Scenarios](/docs/foundry/workshop/scenarios-overview/) infrastructure.

### Architecture

A Model resource in Palantir comprises of two related but distinct components:

1. **Model artifacts:** The model weights *or* container where the trained model is saved.
2. **[Model adapter](/docs/foundry/integrate-models/model-adapter-overview/):** The logic that describes how the platform can interact with the **model artifacts** to load, initialize, and perform inference with the model.

![Foundry model asset](/docs/resources/foundry/model-integration/concept_foundry-model.png)

An adapter is published as part of a Python library to enable communication with the stored model artifacts. It enables the platform to load, initialize, and run inference on any kind of model. Adapters are designed to be flexible and can be used to wrap the different model types that are supported in Foundry:

* Models trained in Foundry in [Code Repositories](/docs/foundry/integrate-models/model-asset-code-repositories/), [Jupyter code workspaces](/docs/foundry/integrate-models/model-asset-code-workspaces/), or [Model Studio](/docs/foundry/model-integration/models/)
* Manually uploaded [model files or checkpoints](/docs/foundry/integrate-models/integrate-overview/)
* Models [uploaded as containers](/docs/foundry/integrate-models/container-overview/)
