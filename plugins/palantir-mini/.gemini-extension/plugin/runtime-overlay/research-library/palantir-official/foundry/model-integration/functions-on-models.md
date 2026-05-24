---
sourceUrl: "https://www.palantir.com/docs/foundry/model-integration/functions-on-models/"
canonicalUrl: "https://palantir.com/docs/foundry/model-integration/functions-on-models/"
sourceLastmod: "2026-05-12T17:06:26.152Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "a53a33a18810d2a168696ce56855a10a37889a0142020abeaca529fce71bab0e"
product: "foundry"
docsArea: "model-integration"
locale: "en"
upstreamTitle: "Documentation | Core concepts > Functions on models"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Functions on models

You can deploy models as functions to enable live usage of models in end-user applications like [Workshop](/docs/foundry/workshop/functions-use/), [Slate](/docs/foundry/slate/concepts-foundry-functions/), [Actions](/docs/foundry/action-types/function-actions-overview/), and [more](/docs/foundry/functions/use-functions/). Model functions can also be used in other functions to write custom business logic involving the model in code.

## Publish a function for your model

Functions can be published for models with [a live deployment configured](/docs/foundry/manage-models/create-a-model-deployment/), or for [Modeling Objectives live deployments](/docs/foundry/manage-models/set-up-live/).

[Learn more about how to configure and manage model functions](/docs/foundry/model-integration/model-functions-guide/).

## Call a model function in code

Below is a simplified example of a function that calls a live deployment that takes an input `Double[]` and returns a `Double[]` output called `output_df` in the model API:

```typescript
import { Function, Double } from "@foundry/functions-api";
import { ModelDeployment } from "@foundry/models-api/deployments";

@Function()
public async predictValues(inputs: Double[]): Promise<Double[]> {
    const modelOutput = await ModelDeployment(inputs);
    return modelOutput.output_df;
}
```

[Learn more about how to use model functions in other functions](/docs/foundry/functions/functions-on-models/).
