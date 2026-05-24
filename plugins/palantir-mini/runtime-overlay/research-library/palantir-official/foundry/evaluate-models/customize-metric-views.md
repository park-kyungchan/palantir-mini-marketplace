---
sourceUrl: "https://www.palantir.com/docs/foundry/evaluate-models/customize-metric-views/"
canonicalUrl: "https://palantir.com/docs/foundry/evaluate-models/customize-metric-views/"
sourceLastmod: "2026-05-12T17:06:26.152Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "fa8f99fe8c0959cea72cc864c0cb7c1da648ff5ea1f4751ffe8613358a8a492e"
product: "foundry"
docsArea: "evaluate-models"
locale: "en"
upstreamTitle: "Documentation | Evaluate models > Customize modeling objective metric views"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Custom modeling objective metric views

One key functionality of a modeling objective is the ability to inspect an individual model's performance on a particular dataset, while also being able to compare those same performance metrics on that same data across different models. It is able to do this by leveraging the **metric set** and input dataset relationship across model submissions.

This tutorial assumes you already know how to create **metric sets** with `subsets` and have already configured [automatic model evaluation](/docs/foundry/evaluate-models/model-evaluation-automatic/).

Once you have followed the steps on this page to customize metric views, you can use them in the [evaluation dashboard](/docs/foundry/evaluate-models/review-model-metrics/) to compare the performance of multiple models. Note that these tabs will not be displayed on the evaluation dashboard unless the advanced setting [show pinned tabs in evaluation dashboard](/docs/foundry/manage-models/modeling-objective-settings/#show-pinned-tabs-in-evaluation-dashboard) is enabled.

## Getting started

Click on a model submission name to navigate to its individual page. This view is highly customizable depending on the metrics, charts, or images attached to the individual model submissions in the evaluation configuration or in code.

The configuration options available are: pinning metrics, creating tabs, and building charts. The goal of these options is to communicate and categorize information to share across all model submissions and highlight important performance metrics to be compared.

:::callout{theme="neutral"}
Information configured on one submission's view (i.e custom tabs created or metrics pinned) will also appear as configured for every other submission. Configuration is done on the *modeling objective* level, not the individual submission level, to create a global dialog for all model submissions.
:::

To edit metric views, select the **Actions** tab on the top right of the page. You will see a number of options depending on your level of access to the objective. Select **Pin metrics to objective**. Pin icons will appear on all the metrics and charts, and a blue bar at the top of the interface will indicate that you are in edit mode.

![empty metric state](/docs/resources/foundry/evaluate-models/howto_howto-empty-metric-state.png)

As a reminder, the metrics that appear in the **Explore all metrics and charts** section are dependent on the `evaluation dataset` and transaction that is selected in the top right.

## Creating tabs and pinning metrics

Tabs help organize metrics and charts into meaningful views, which may pertain to different evaluation facets or stakeholders. For example, as in the notional example shown below, a financial modeling group may want to surface metrics broken out by sensitive features.

Under the section **Key objective metrics and charts** select the **+ Create new tab** option. A dialog will appear giving you the option to name the tab.

![create tab](/docs/resources/foundry/evaluate-models/howto_howto-create-tabs.png)

Once you have created a tab, scroll through the metric explorer and charts below and pin statistics, charts, or images by clicking on the pin icon. Any `subsets` will also be available in the metric explorer automatically.

![explore metrics and chart](/docs/resources/foundry/evaluate-models/howto_howto-pin-explorer.png)

![pin line chart](/docs/resources/foundry/evaluate-models/howto_howto-pin-bar-chart.png)

You can create interactive bar charts based on the metrics that are available in the metric explorer, and pin them to the tab as well.

![build bar chart](/docs/resources/foundry/evaluate-models/howto_howto-build-chart.png)

The metrics that are pinned and the tabs that are created are not meant to be static. Configurations should evolve as new data comes in, new feedback is received, and new theories are tested.

Common patterns for tab categories are "Key Metrics/Theories", "Sensitive Features", and "Outlier Information".

When you're satisfied with your configuration across your Input Datasets, select the **Done** button at the top of the page.

![complete pinning](/docs/resources/foundry/evaluate-models/howto_howto-final-pinning.png)
