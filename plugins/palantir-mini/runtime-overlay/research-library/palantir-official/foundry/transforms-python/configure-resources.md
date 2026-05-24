---
sourceUrl: "https://www.palantir.com/docs/foundry/transforms-python/configure-resources/"
canonicalUrl: "https://palantir.com/docs/foundry/transforms-python/configure-resources/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "e27581875eafd888ca51a9238fb4bf775d69692b64584f62c45c76f3c1b904a8"
product: "foundry"
docsArea: "transforms-python"
locale: "en"
upstreamTitle: "Documentation | Basic transforms > Configure resources"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Resource configuration

This page covers the configuration of resources for single-node transforms. Distributed Spark transforms are configured with [Spark profiles](/docs/foundry/optimizing-pipelines/apply-spark-profiles/) so that controls can be placed on large resource consumption.

Transform resources can be configured by calling `with_resources` on the transform decorator.

```python
from transforms.api import transform, Input, Output


@transform.using(
    output=Output("/path/output"),
    input=Input("/path/input"),
).with_resources(
    cpu_cores=1
)
def my_compute_function(output, input):
    ...
```

The following options can be configured:

* **`cpu_cores`:** The number of CPU cores to request for the transform's container. Can be a fraction, defaults to two.
* **`memory_gb`:** The amount of memory to request for the container, in GB.
* **`memory_mb`:** The amount of memory to request for the container, in MB.
* **`gpu_type`:** The type of GPU to allocate for the transform, provided as a string.

:::callout{theme="warning"}
Only one of `memory_gb` and `memory_mb` can be configured.
:::

By default, the maximum allowed values are 8 cores and 64 GBs of memory. To increase these limits, contact Palantir Support.

Below is an example configuration of cores, memory, and GPU type.

```python
from transforms.api import transform, Input, Output


@transform.using(
    output=Output("/path/output"),
    input=Input("/path/input"),
).with_resources(
    cpu_cores=8,
    memory_gb=32,
    gpu_type="NVIDIA_T4"
)
def my_compute_function(output, input):
    ...
```

## GPU provisioning

GPUs can only be used in Python transforms if they are [available to the project](/docs/foundry/resource-management/resource-queues/#use-gpus) that the transform is in.

:::callout{theme="neutral"}
Not all GPU types are available on all environments.
:::

The following are GPU types that can be made available for transforms:

* `"NVIDIA_T4"`
* `"NVIDIA_V100"`
* `"NVIDIA_A10G"`
* `"NVIDIA_A100"`
* `"NVIDIA_A16"`
* `"NVIDIA_H100"`
* `"NVIDIA_H200"`
* `"NVIDIA_L4"`
* `"NVIDIA_L40S"`
