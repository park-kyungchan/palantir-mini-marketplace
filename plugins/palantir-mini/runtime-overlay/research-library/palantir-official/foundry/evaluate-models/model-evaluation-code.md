---
sourceUrl: "https://www.palantir.com/docs/foundry/evaluate-models/model-evaluation-code/"
canonicalUrl: "https://palantir.com/docs/foundry/evaluate-models/model-evaluation-code/"
sourceLastmod: "2026-05-12T17:06:26.152Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "bb5a009c9e7915981bb8df975d72ea293d052da742ac2dd0f6cb4a10f1df937c"
product: "foundry"
docsArea: "evaluate-models"
locale: "en"
upstreamTitle: "Documentation | Evaluate models > Evaluate model performance in code"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Evaluate a model in code

:::callout{theme="warning"}
Metric sets were built for dataset-backed models using `foundry_ml`, a library which has been formally deprecated since October 31, 2025. For new implementations, we recommend using [experiments](/docs/foundry/model-integration/experiments/) instead. Metric sets will not appear on the model page for a model built with `palantir_models`, although they [can be shown in a modeling objective](/docs/foundry/migrate-models/how-to/#migrating-a-model-using-metricsets).
:::

In Foundry, the performance of an individual model can be evaluated in code by creating one or more `metric sets` for that model. This page assumes knowledge of the [MetricSet](/docs/foundry/evaluate-models/metric-sets-reference/) class.

The metrics produced by a metric set are associated with a specific transaction of the evaluation dataset and are available for review in the [Modeling Objectives](/docs/foundry/model-integration/objectives/) application. Note that you'll need to enable these metrics by toggling `Only show metrics produced by evaluation configuration`  in the [Modeling Objectives settings page](/docs/foundry/manage-models/modeling-objective-settings/#only-show-metrics-produced-by-evaluation-configuration).

:::callout{theme="neutral"}
Metrics are associated with a specific transaction of an input dataset; you may need to rerun the code that produces a metric set each time you update the model or input dataset.
:::

![Metrics in Model Preview Application](/docs/resources/foundry/evaluate-models/model-preview-metrics.png)

## Evaluate a model in Code Workbook

To evaluate a model in the [Code Workbook](/docs/foundry/code-workbook/overview/) application:

1. Create a code workbook or open an existing workbook.
2. Import the `foundry_ml` package into the [environment for your code workbook](/docs/foundry/code-workbook/environment-overview/). The `foundry_ml_metrics` package will be available as part of `foundry_ml`.
3. Import the model and evaluation dataset into the code workbook.
4. Create a [transform](/docs/foundry/code-workbook/transforms-overview/) that produces a `MetricSet` object in Python and associate your model and evaluation dataset as inputs of that `MetricSet`.
   * Be sure to [save the results as a dataset](/docs/foundry/code-workbook/optional-data-persistence/#choose-whether-to-save-as-a-dataset).
   * The [input types](/docs/foundry/code-workbook/transforms-overview/#inputs) of the model will need to be an `Object` and the evaluation dataset a `TransformsInput`.
5. Add the metrics to the `MetricSet` in your transform.
6. Return the `MetricSet` as the result of the transform.

An example for a regression model named `lr_model` and testing dataset named `testing_data` is below. Note that this code snippet uses a model and testing dataset based on the housing dataset featured in the [Getting Started](/docs/foundry/model-integration/tutorial-intro/) tutorial.

```python
def lr_evaluation_testing(lr_model, testing_data_input):
    from foundry_ml_metrics import MetricSet  # Make sure foundry_ml has been added to your environment

    model = lr_model  # Rename model
    metric_set = MetricSet(  # Create a MetricSet to add individual metrics to
        model = lr_model,  # The Foundry ML Model you are evaluating
        input_data=testing_data_input  # The TransformInput of the dataset you are evaluating performance against
    )

    testing_data_df = testing_data_input.dataframe().toPandas()  # Get a pandas dataframe from the TransformInput

    y_true_column = 'median_house_value'  # This is the column in the evaluation dataset the model is predicting
    y_prediction_column = 'prediction'  # This is the column the model produces when it transforms a dataset

    scored_df = get_model_scores(model, testing_data_df)

    # Add metrics on the entire input dataset
    add_numeric_metrics_to_metric_set(metric_set, scored_df, y_true_column, y_prediction_column)
    add_residuals_scatter_plot_to_metric_set(metric_set, scored_df, y_true_column, y_prediction_column)

    # Add metrics where the housing_median_age column is greater than 30
    old_homes_subset = {'median_house_value': 'Old (>30)'}
    old_houses_scored_df = scored_df[scored_df['housing_median_age'] > 30]
    add_numeric_metrics_to_metric_set(metric_set, old_houses_scored_df, y_true_column, y_prediction_column, old_homes_subset)
    add_residuals_scatter_plot_to_metric_set(metric_set, old_houses_scored_df, y_true_column, y_prediction_column, old_homes_subset)

    # Add metrics where the housing_median_age column is less than or equal to 5
    new_homes_subset = {'median_house_value': 'New (<=5)'}
    new_houses_scored_df = scored_df[scored_df['housing_median_age'] <= 5]
    add_numeric_metrics_to_metric_set(metric_set, new_houses_scored_df, y_true_column, y_prediction_column, new_homes_subset)
    add_residuals_scatter_plot_to_metric_set(metric_set, new_houses_scored_df, y_true_column, y_prediction_column, new_homes_subset)

    return metric_set  # Code Workbooks will save this as a MetricSet in Foundry


def get_model_scores(model, df):
    return model.transform(df)  # Create predictions based on the model


def add_numeric_metrics_to_metric_set(
            metric_set,
            scored_df,
            y_true_column,
            y_prediction_column,
            subset=None
        ):
    import numpy as np
    from sklearn.metrics import mean_squared_error, r2_score

    y_true = scored_df[y_true_column]
    y_pred = scored_df[y_prediction_column]

    # Compute metrics
    mse = mean_squared_error(y_true, y_pred)
    rmse = np.sqrt(mse)
    r2 = r2_score(y_true, y_pred)

    metric_set.add(name='rmse', value=rmse, subset=subset)  # rmse is a float
    metric_set.add(name='r2', value=r2, subset=subset)  # r2 is a float


def add_residuals_scatter_plot_to_metric_set(
            metric_set,
            scored_df,
            y_true_column,
            y_prediction_column,
            subset=None
        ):
    import matplotlib.pyplot as plt

    y_true = scored_df[y_true_column]
    y_pred = scored_df[y_prediction_column]

    scatter_plot = plt.scatter((y_true - y_pred), y_pred)  # Create a scatter plot
    figure = plt.gcf()  # Gets the current pyplot figure
    metric_set.add(name='scatter_plot', value=figure, subset=subset)  # figure is a pyplot image
    plt.close()  # Close the pyplot figure
```

## Evaluate a model in Code Repositories

To evaluate a model in the [Code Repositories](/docs/foundry/code-repositories/overview/) application:

1. Create a code repository or open an existing repository.
2. Import `foundry_ml` package into the [environment for your code repository](/docs/foundry/transforms-python/environment-overview/). The `foundry_ml_metrics` package will be available as part of `foundry_ml`.
3. Create a [transform](/docs/foundry/transforms-python/transforms/) that produces a `MetricSet` object in Python and associate your model and evaluation dataset as inputs of that `MetricSet`.
   * Rather than return your MetricSet, save the metric\_set with `metric_set.save(metrics_output)`.
   * The [transform input types](/docs/foundry/api-reference/transforms-python-library/api-transforminput/#transforms.api.TransformInput) of both your model and evaluation dataset will be `TransformInput`.
4. Add the metrics to the `MetricSet` in your transform.
5. Return the `MetricSet` as the result of the transform.

An example for a regression model named `lr_model` and testing dataset named `testing_data` is below. Note that this code snippet uses a model and testing dataset based on the housing dataset featured in the [Getting Started](/docs/foundry/model-integration/tutorial-intro/) tutorial.

```python
from transforms.api import transform, Input, Output

# Make sure foundry_ml has been added to your run requirements in transforms-python/conda_recipe/meta.yaml
from foundry_ml import Model
from foundry_ml_metrics import MetricSet


@transform(  # As this uses @transform, the inputs will be TransformInput's
    # You will need to update the Output Path to the output location you want your metrics saved to
    metrics_output=Output("/Path/to/metrics_dataset/sklearn_linear_regression_metrics"),
    # You will need to update the Input Path to the path of your model and evaluation dataset
    model_input=Input("/Path/to/model/sklearn_linear_regression"),
    testing_data_input=Input("/Path/to/evaluation_dataset/house_prices_in_america_test")
)
def compute(metrics_output, model_input, testing_data_input):
    model = Model.load(model_input)  # Load the Foundry ML Model from the TransformInput
    metric_set = MetricSet(  # Create a MetricSet to add individual metrics to
        model=model,  # The Foundry ML Model you are evaluating
        input_data=testing_data_input  # The TransformInput of the dataset you are evaluating performance against
    )

    testing_data_df = testing_data_input.dataframe().toPandas()  # Get a pandas dataframe from the TransformInput

    y_true_column = 'median_house_value'  # This is the column in the evaluation dataset the model is predicting
    y_prediction_column = 'prediction'  # This is the column the model produces when it transforms a dataset

    scored_df = get_model_scores(model, testing_data_df)

    # Add metrics on the entire input dataset
    add_numeric_metrics_to_metric_set(metric_set, scored_df, y_true_column, y_prediction_column)
    add_residuals_scatter_plot_to_metric_set(metric_set, scored_df, y_true_column, y_prediction_column)

    # Add metrics where the housing_median_age column is greater than 30
    old_homes_subset = {'median_house_value': 'Old (>30)'}
    old_houses_scored_df = scored_df[scored_df['housing_median_age'] > 30]
    add_numeric_metrics_to_metric_set(metric_set, old_houses_scored_df, y_true_column, y_prediction_column, old_homes_subset)
    add_residuals_scatter_plot_to_metric_set(metric_set, old_houses_scored_df, y_true_column, y_prediction_column, old_homes_subset)

    # Add metrics where the housing_median_age column is less than or equal to 5
    new_homes_subset = {'median_house_value': 'New (<=5)'}
    new_houses_scored_df = scored_df[scored_df['housing_median_age'] <= 5]
    add_numeric_metrics_to_metric_set(metric_set, new_houses_scored_df, y_true_column, y_prediction_column, new_homes_subset)
    add_residuals_scatter_plot_to_metric_set(metric_set, new_houses_scored_df, y_true_column, y_prediction_column, new_homes_subset)

    metric_set.save(metrics_output)  # Save this MetricSet in to the TransformsOutput


def get_model_scores(model, df):
    return model.transform(df)  # Create predictions based on the model


def add_numeric_metrics_to_metric_set(
            metric_set,
            scored_df,
            y_true_column,
            y_prediction_column,
            subset=None
        ):
    import numpy as np
    from sklearn.metrics import mean_squared_error, r2_score

    y_true = scored_df[y_true_column]
    y_pred = scored_df[y_prediction_column]

    # Compute metrics
    mse = mean_squared_error(y_true, y_pred)
    rmse = np.sqrt(mse)
    r2 = r2_score(y_true, y_pred)

    metric_set.add(name='rmse', value=rmse, subset=subset)  # rmse is a float
    metric_set.add(name='r2', value=r2, subset=subset)  # r2 is a float


def add_residuals_scatter_plot_to_metric_set(
            metric_set,
            scored_df,
            y_true_column,
            y_prediction_column,
            subset=None
        ):
    import matplotlib.pyplot as plt

    y_true = scored_df[y_true_column]
    y_pred = scored_df[y_prediction_column]

    scatter_plot = plt.scatter((y_true - y_pred), y_pred)  # Create a scatter plot
    figure = plt.gcf()  # Gets the current pyplot figure
    metric_set.add(name='scatter_plot', value=figure, subset=subset)  # figure is a pyplot image
    plt.close()  # Close the pyplot figure
```

## Updating metrics

As the above code snippets create transforms, the metric sets are created and [computed via Foundry Builds](/docs/foundry/data-integration/builds/). When a model is updated, or a new input data version becomes available, it is important to rebuild the metric set to update the metrics that are associated with that model.
