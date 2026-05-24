---
sourceUrl: "https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-transform/"
canonicalUrl: "https://palantir.com/docs/foundry/api-reference/transforms-python-library/api-transform/"
sourceLastmod: "2026-05-12T17:06:26.167Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "92f6e773eb80f1b02208ea57c7096bcea7c70c76ccc92bbe74762e40d30a8a2a"
product: "foundry"
docsArea: "api-reference"
locale: "en"
upstreamTitle: "Documentation | transforms.api > transform"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# transforms.api.transform

## *class* transforms.api.transform(\*\*kwargs) {#transforms.api.transform}

Wrap a compute function as a [`Transform`](./#transforms.api.Transform) object.

The `transform` decorator is used to construct a [`Transform`](./#transforms.api.Transform) object from a compute function. The names used for inputs, outputs or other parameters should be the function arguments of the wrapped compute function. At compute-time, parameters are instantiated to specific objects defined by each parameter type.

```python
>>> @transform(
...     first_input=Input('/path/to/first/input/dataset'),
...     second_input=Input('/path/to/second/input/dataset'),
...     first_output=Output('/path/to/first/output/dataset'),
...     second_output=Output('/path/to/second/output/dataset'),
... )
... def my_compute_function(first_input, second_input, first_output, second_output):
...     # type: (TransformInput, TransformInput, TransformOutput, TransformOutput) -> None
...     first_output.write_dataframe(first_input.dataframe())
...     second_output.write_dataframe(second_input.dataframe())
```

* **Parameters:**
  **\*\*kwargs** ([*Param*](/docs/foundry/api-reference/transforms-python-library/api-param/#transforms.api.Param)) – `kwargs` comprised of named [`Param`](/docs/foundry/api-reference/transforms-python-library/api-param/#transforms.api.Param) or subclasses.

:::callout{theme="neutral"}
The compute function is responsible for writing data to its outputs.
:::

### *classmethod* using(\*\*kwargs) {#transforms.api.transform.using}

Construct a lightweight transform via the transform class.

A lightweight transform is a transform that runs without Spark, on a single node. Lightweight transforms are faster and more cost-effective for small to medium-sized datasets. Lightweight transforms also provide more methods for accessing datasets; however, they only support a subset of the API of a regular transform, including pandas and the filesystem API.

This method accepts only input/output parameters. Resource requirements and container settings can be configured by chaining additional method calls.

For more information, see: [https://www.palantir.com/docs/foundry/transforms-python/overview ↗](/docs/foundry/transforms-python/overview/)

* **Parameters:**
  **\*\*kwargs** – Named [`LightweightInput`](/docs/foundry/api-reference/transforms-python-library/api-lightweightinput/#transforms.api.LightweightInput) or [`LightweightOutput`](/docs/foundry/api-reference/transforms-python-library/api-lightweightoutput/#transforms.api.LightweightOutput) objects for the transform’s inputs and outputs.
* **Returns:**
  A builder object that can be configured with additional method calls.

#### Examples

```python
>>> # Basic usage with default resources
>>> @transform.using(
...     my_input=Input('/input'),
...     my_output=Output('/output')
... )
... def compute_func(my_input, my_output):
...     my_output.write_pandas(my_input.pandas())
```

```python
>>> # Configure resources
>>> @transform.using(
...     my_input=Input('/input'),
...     my_output=Output('/output')
... ).with_resources(
...     cpu_cores=4,
...     memory_gb=8
... )
... def compute_func(my_input, my_output):
...     my_output.write_pandas(my_input.pandas())
```

```python
>>> # Configure container
>>> @transform.using(
...     my_output=Output('/output')
... ).with_container(
...     container_image='my-image',
...     container_tag='0.0.1'
... )
... def run_data_generator_executable(my_output):
...     os.system('$USER_WORKING_DIR/data_generator')
...     my_output.write_table(pd.read_csv('data.csv'))
```
