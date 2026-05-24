---
sourceUrl: "https://www.palantir.com/docs/foundry/aip-evals/intermediate-parameters/"
canonicalUrl: "https://palantir.com/docs/foundry/aip-evals/intermediate-parameters/"
sourceLastmod: "2026-05-12T17:06:26.146Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "4d5cabcf9183377538cc2711bbd9465d4300cd7825ac5d7cb2290ad5bdb809e4"
product: "foundry"
docsArea: "aip-evals"
locale: "en"
upstreamTitle: "Documentation | AIP Evals > Use intermediate parameters to evaluate block output"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Use intermediate parameters to evaluate block output

LLM-backed functionality often includes multiple complex operations, and only evaluating the end result may be insufficient to determine prompt performance.

With AIP Logic and AIP Evals you can set up intermediate parameters for evaluation. Similar to final function outputs, intermediate outputs can be used for setting up automated [evaluators](/docs/foundry/aip-evals/create-suite/#evaluators), or to simply look at the results. Intermediate parameter output values will be included in the evaluation suite [results dataset](/docs/foundry/aip-evals/results-dataset/) should one be set up.

## Set up intermediate parameters

To set up intermediate parameters for evaluation, follow these steps:

1. Select the flask icon on an AIP Logic block to expose the output as intermediate parameter.
2. Select the new intermediate parameter in the evaluator configuration panel to evaluate the output.

![Set up intermediate parameters for evaluation.](/docs/resources/foundry/aip-evals/aip-evals-set-up-intermediate-parameters.png)
