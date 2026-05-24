---
sourceUrl: "https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-pipeline/"
canonicalUrl: "https://palantir.com/docs/foundry/api-reference/transforms-python-library/api-pipeline/"
sourceLastmod: "2026-05-12T17:06:26.167Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "63314c81c6b08cfc248cb0491216c23030b1ebe5e41dd2f24b68fbb5a5d982f3"
product: "foundry"
docsArea: "api-reference"
locale: "en"
upstreamTitle: "Documentation | transforms.api > Pipeline"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# transforms.api.Pipeline

## *class* transforms.api.Pipeline {#transforms.api.Pipeline}

An object for grouping a collection of [`Transform`](/docs/foundry/api-reference/transforms-python-library/api-transform/#transforms.api.Transform) objects.

### add\_transforms(\*transforms) {#transforms.api.Pipeline.add\_transforms}

Register the given [`Transform`](/docs/foundry/api-reference/transforms-python-library/api-transform/#transforms.api.Transform) objects to the pipeline instance.

* **Parameters:**
  **\*transforms** ([*Transform*](/docs/foundry/api-reference/transforms-python-library/api-transform/#transforms.api.Transform)) – The transforms to register.
* **Raises:**
  * **ValueError** – If multiple [`Transform`](/docs/foundry/api-reference/transforms-python-library/api-transform/#transforms.api.Transform) objects write     to the same [`Output`](/docs/foundry/api-reference/transforms-python-library/api-output/#transforms.api.Output) alias.
  * **ValueError** – If multiple [`Transform`](/docs/foundry/api-reference/transforms-python-library/api-transform/#transforms.api.Transform) objects have the same compute function reference.

### discover\_transforms(\*modules) {#transforms.api.Pipeline.discover\_transforms}

Recursively find and import modules, registering every module-level transform.

This method recursively finds and imports modules starting at the given module’s `__path__`. Each module found is imported and any attribute that is an instance of [`Transform`](/docs/foundry/api-reference/transforms-python-library/api-transform/#transforms.api.Transform) as constructed by the transforms decorators will be registered to the pipeline.

```python
>>> import myproject
>>> p = Pipeline()
>>> p.discover_transforms(myproject)
```

* **Parameters:**
  **\*modules** (*module*) – The modules to start searching from.

:::callout{theme="warning"}
Each module found is imported. Try to avoid executing code at the module-level.
:::

### *property* transforms {#transforms.api.Pipeline.transforms}

The list of transforms registered to the pipeline.

* **Type:**
  List\[[Transform](/docs/foundry/api-reference/transforms-python-library/api-transform/#transforms.api.Transform)]
