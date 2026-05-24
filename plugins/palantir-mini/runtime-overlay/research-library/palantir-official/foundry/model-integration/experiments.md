---
sourceUrl: "https://www.palantir.com/docs/foundry/model-integration/experiments/"
canonicalUrl: "https://palantir.com/docs/foundry/model-integration/experiments/"
sourceLastmod: "2026-05-12T17:06:26.152Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "04fb8cf273c60efc6bd406b0d72110a64bf5a5d6ac53285fb3d1e3b430a05a23"
product: "foundry"
docsArea: "model-integration"
locale: "en"
upstreamTitle: "Documentation | Core concepts > Modeling experiments"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Experiments

An [experiment](/docs/foundry/integrate-models/experiments-overview/) is an artifact representing a collection of metrics produced during a model training job.

![A sample view showing three selected experiments.](/docs/resources/foundry/model-integration/experiment-view.png)

## Integrate experiments into model training code

Experiments can be created from any environment used to create models in Foundry. The `ModelOutput` class in [Jupyter® Code Workspaces](/docs/foundry/integrate-models/model-asset-code-workspaces/) and [Code Repositories](/docs/foundry/integrate-models/model-asset-code-repositories/) provides hooks for creating and writing to experiments. These experiments can then be published alongside the model and are instantly viewable in the model page.

Users can also take advantage of [MLflow](/docs/foundry/integrate-models/experiments-overview/#mlflow) to streamline the integration of experiments into their existing code.

### Code Workspaces

The below code snippet demonstrates experiment usage in Jupyter® Code Workspaces:

```python
from palantir_models.code_workspaces import ModelOutput
# `my-alias` is an alias to a model in the current workspace
model_output = ModelOutput("my-alias")

experiment = model_output.create_experiment(name="my-experiment")

# log parameters
experiment.log_param("learning_rate", 1e-4)

# log metrics
experiment.log_metric("train/loss", loss)
experiment.log_metric("train/loss", loss, step=step)

# publish alongside model to persist in the models page
model_output.publish(ModelAdapter(model), experiment=experiment)
```

### Code Repositories

The below code snippet demonstrates experiment usage in Code Repositories:

```python
from transforms.api import configure, transform, Input
from palantir_models.transforms import ModelOutput

@transform(
    input_data=Input("..."),
    model_output=ModelOutput("..."),
)
def compute(input_data, model_output):
    experiment = model_output.create_experiment(name="my-experiment")

    # log parameters
    experiment.log_param("learning_rate", 1e-4)

    # log metrics
    experiment.log_metric("train/loss", loss)
    # can also provide optional step value
    experiment.log_metric("train/loss", loss, step=step)

    # publish alongside model to persist in the models page
    model_output.publish(ModelAdapter(model), experiment=experiment)
```

[Learn more about creating and visualizing experiments.](/docs/foundry/integrate-models/experiments-overview/)
