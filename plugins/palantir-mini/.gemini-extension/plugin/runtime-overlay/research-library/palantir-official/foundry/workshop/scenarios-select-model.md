---
sourceUrl: "https://www.palantir.com/docs/foundry/workshop/scenarios-select-model/"
canonicalUrl: "https://palantir.com/docs/foundry/workshop/scenarios-select-model/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "490dad031ebd716e1e72d3f7d903e064241336ccd364e91d48e7766c2ec96e79"
product: "foundry"
docsArea: "workshop"
locale: "en"
upstreamTitle: "Documentation | Scenarios > Select a model"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Select a model

:::callout{theme="neutral"}
The functionality described below is deprecated and its use is no longer recommended. To use a model as part of a Scenario, wrap the model [in a Function](/docs/foundry/functions/functions-on-models/) and use it in a [Function-backed Action](/docs/foundry/action-types/function-actions-overview/) instead.
:::

This page explains how to select an objective-backed model to power your Scenario.

Before you begin, you must ensure that your model is correctly being managed by a [modeling objective](/docs/foundry/model-integration/objectives/). See below for specific requirements for powering your Scenario with a model from an objective:

1. Ensure you have created an objective and successfully submitted your model to the objective. There are many ways a model can be authored or imported into the platform. Learn more about what a Model is in the platform and how to author one by visiting the [Model](/docs/foundry/model-integration/models/) concept page.
2. Ensure your objective has an [objective API](/docs/foundry/manage-models/define-modeling-objective-api/) configured and properly mapped to the Ontology.
3. Ensure you have successfully deployed your model to a [Live deployment](/docs/foundry/model-integration/objectives/#live-deployments) configured to deploy the `PRODUCTION` release tag. For more information on tags and deployment environments, see the [Deployment Environment](/docs/foundry/model-integration/objectives/#deployments) concept page.

:::callout{theme="neutral"}
Only objectives that are bound to the Ontology and that have a healthy Live production deployment will appear in the model selector for a Scenario.
:::

In the configuration for the Scenario Creator widget, click **Select a model** and choose the modeling objective you just configured.

Notice that you are not selecting a specific version but rather the objective. This means that as new models and versions are released to production deployments, they will automatically be picked up by applications like this module.

![select-model-scenario-1-annotated](/docs/resources/foundry/workshop/select-model-scenario-1-annotated.png)

At this point, model configuration has been completed.

The model will now be run in the context of the Scenario after all Actions have been applied. Any widget configured to display values from the Scenario will reflect model results via the bound output properties.

Below you can see the newly calculated probability of acquiring the offer calculated for every client in the table.

![compare-model-results](/docs/resources/foundry/workshop/compare-model-results.png)
