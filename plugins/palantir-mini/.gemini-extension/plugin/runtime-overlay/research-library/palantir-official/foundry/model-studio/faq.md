---
sourceUrl: "https://www.palantir.com/docs/foundry/model-studio/faq/"
canonicalUrl: "https://palantir.com/docs/foundry/model-studio/faq/"
sourceLastmod: "2026-05-12T17:06:26.152Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "ca1a23cb05c76d664f81e25b26722272b3defd6aa63825cc3a3af6ae366fc689"
product: "foundry"
docsArea: "model-studio"
locale: "en"
upstreamTitle: "Documentation | Model Studio > FAQ"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# FAQ

## Can I use objects or media sets as inputs in Model Studio?

No, the only inputs accepted in Model Studio are datasets. To achieve a similar result to using an object input, you can use the object's backing datasource as an input.

## Why are my modeling objective evaluation results showing my model as 100% accurate?

The default [binary classification](/docs/foundry/evaluate-models/evaluator-binary-classification/) and [regression](/docs/foundry/evaluate-models/evaluator-regression/) evaluators operate under the assumption that the output dataset will contain both the target and predicted column when running inference over the input dataset. However, Model Studio trainers default to setting the prediction column name to the target column name, which will overwrite the target column during the evaluation inference job and produce a dataset that does not adhere to the evaluator's assumption.

To fix this, you can override the prediction column name in the model studio configuration. Manually set a prediction column name that is different from the target column name so the model does not overwrite it.
