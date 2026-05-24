---
sourceUrl: "https://www.palantir.com/docs/foundry/integrate-models/integrate-overview/"
canonicalUrl: "https://palantir.com/docs/foundry/integrate-models/integrate-overview/"
sourceLastmod: "2026-05-12T17:06:26.152Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "ef51f6c256841a450a72c7f49fef97203c36026ea770ec6fc0d9c5bedfc98b21"
product: "foundry"
docsArea: "integrate-models"
locale: "en"
upstreamTitle: "Documentation | Models > Overview"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Models

Palantir provides a common interface to integrate models from a range of different sources. Models can be integrated from:

1. [Models trained in Palantir](/docs/foundry/integrate-models/model-asset-code-repositories/).
2. [Model files trained outside of Palantir and uploaded as an unstructured dataset](/docs/foundry/integrate-models/model-asset-files/).
3. [Models containerized outside of Palantir and pushed into the Foundry Docker registry](/docs/foundry/integrate-models/container-overview/).
4. [Models trained and hosted outside of Palantir](/docs/foundry/integrate-models/external-model-connection/).

All models can be productionized and connected to operational applications through the [Modeling Objectives](/docs/foundry/model-integration/objectives/) application.

![Model Adapter and Modeling Objective architecture diagram](/docs/resources/foundry/integrate-models/model-architecture-foundry.png)

## Model adapters

Models in Palantir comprise of two components:

* **Model artifacts:** The model files, parameters, weights, container, or credentials where a trained model is saved.
* **[Model adapter](/docs/foundry/integrate-models/model-adapter-overview/):** The logic and the environment dependencies that describes how Foundry should interact with the **model artifacts** to load, initialize, and perform inference with the model.

<img src="./media/model-adapter.png" alt="Model in Palantir" width=600px/>
