---
sourceUrl: "https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-transform-polars/"
canonicalUrl: "https://palantir.com/docs/foundry/api-reference/transforms-python-library/api-transform-polars/"
sourceLastmod: "2026-05-12T17:06:26.167Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "386d235b4daeb792519edf9e6c0cc79cac20dbc1f981e0bc261bb27143b5bf88"
product: "foundry"
docsArea: "api-reference"
locale: "en"
upstreamTitle: "Documentation | transforms.api > transform_polars"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# transforms.api.transform\_polars

## transforms.api.transform\_polars(output, \*\*inputs) {#transforms.api.transform\_polars}

Register the wrapped compute function as a Polars transform.

:::callout{theme="neutral"}
To use the Polars library, you must add `polars` as a **run** dependency in your `meta.yml` file. For more information, refer to the [documentation ↗](/docs/foundry/transforms-python/project-structure/#metayaml).

The `transform_polars` decorator is a thin wrapper around the `lightweight` decorator. Using it results in the creation of a lightweight transform that lacks some features of a regular transform.

This works similarly to the [`transform_pandas()`](/docs/foundry/api-reference/transforms-python-library/api-transform-pandas/#transforms.api.transform_pandas) decorator, however, instead of pandas DataFrames, the user code is given and is expected to return Polars DataFrames.

Note that spark profiles cannot be used with lightweight transforms, meaning that they also cannot be used with `@transform_polars`.

```python
>>> @transform_polars(
...     Output('ri.main.foundry.dataset.out'),  # An unnamed Output spec
...     first_input=Input('ri.main.foundry.dataset.in1'),
...     second_input=Input('ri.main.foundry.dataset.in2'),
... )
... def my_compute_function(ctx, first_input, second_input):
...     # type: (polars.DataFrame, polars.DataFrame) -> polars.DataFrame
...     return first_input.join(second_input, on='id', how="inner")
```
:::

* **Parameters:**
  * **output** ([*Output*](/docs/foundry/api-reference/transforms-python-library/api-output/#transforms.api.Output)) – The single [`Output`](/docs/foundry/api-reference/transforms-python-library/api-output/#transforms.api.Output) spec for the transform.
  * **\*\*inputs** ([*Input*](/docs/foundry/api-reference/transforms-python-library/api-input/#transforms.api.Input)) – `kwargs` comprised of named [`Input`](/docs/foundry/api-reference/transforms-python-library/api-input/#transforms.api.Input) specs.
