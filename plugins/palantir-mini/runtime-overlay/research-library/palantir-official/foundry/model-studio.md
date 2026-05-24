---
sourceUrl: "https://www.palantir.com/docs/foundry/model-studio/"
canonicalUrl: "https://palantir.com/docs/foundry/model-studio/"
sourceLastmod: "2026-05-12T17:06:26.160Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "7037697f9ad3a5d0c17b66ff345c97a5b4aba5bda56c66c1eef0685ff60d55f7"
product: "foundry"
docsArea: "model-studio"
locale: "en"
upstreamTitle: "Documentation | Model Studio > Overview"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Model Studio

Model Studio is Foundry's no-code model development tool. With Model Studio, users can choose a training task, select input datasets, and optionally configure parameters to train and deploy production-grade machine learning models without writing code.

![The Model Studio home page.](/docs/resources/foundry/model-studio/model-studio-homepage.png)

## Features

* **A streamlined point-and-click interface** for configuring model training jobs; no coding required.
* **Built-in production-grade model trainers** tailored for common use cases such as time series forecasting, regression, and classification.
* **Smart defaults and guided workflows** that empower you get started quickly, even if you are new to machine learning.
* **In-depth experiment tracking** with integrated performance metrics that allow you to monitor and refine your models with confidence.
* **Full data lineage and secure access controls** built on top of the Palantir platform, ensuring transparency and security at every step.

## Workflow

Building a model using Model Studio requires the following steps:

1. **Choose your model trainer:** Built-in trainers are available for common modeling tasks like [time series forecasting](/docs/foundry/model-studio/trainers-timeseries-forecasting/), [regression](/docs/foundry/model-studio/trainers-regression/), and [classification](/docs/foundry/model-studio/trainers-classification/).
2. **Provide your data:** Choose the datasets to provide as training and optional testing data.
3. **Configure your model:** Parameters are available for each trainer. You can choose to fine-tune the parameters or stick with the defaults.
4. **Launch the build:** Launch the transform job and visualize training metrics in the [experiment](/docs/foundry/model-integration/experiments/) created at runtime.

Once model training is complete, the model can be used for inference in downstream applications like [Python transforms](/docs/foundry/integrate-models/transform-model-input/), [Pipeline Builder](/docs/foundry/pipeline-builder/transforms-trained-model/), [functions](/docs/foundry/model-integration/functions-on-models/), and more.

Model Studio training jobs can also be integrated with [build schedules](/docs/foundry/data-integration/schedules/) to automatically retrain the model whenever new data is available.

Ready to get started? See the [guided tutorial](/docs/foundry/model-integration/tutorial-train-model-studio/) or learn more about [Model Studio](/docs/foundry/model-studio/core-concepts/).
