---
sourceUrl: "https://www.palantir.com/docs/foundry/optimizing-pipelines/managed-profiles/"
canonicalUrl: "https://palantir.com/docs/foundry/optimizing-pipelines/managed-profiles/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "29b5b6e6f559d7dfe679d5672696346b6d350832f08335c891df35cb40748492"
product: "foundry"
docsArea: "optimizing-pipelines"
locale: "en"
upstreamTitle: "Documentation | Spark > Managed profiles"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Managed profiles

Foundry can automatically optimize Spark profiles for jobs based on historical resource usage. When enabled, Foundry analyzes the resource consumption of recent job runs and recommends a profile configuration that right-sizes driver and executor resources, reducing unnecessary resource allocation while maintaining job reliability.

## Eligibility criteria

For Foundry to apply a managed profile recommendation, the following conditions must all be met:

* The last 5 runs of the job were all successful.
* At least 4 of the last 5 runs have recorded metrics (at most 1 run may be missing metrics).
* The Spark profiles and configuration are identical across the current job and the last 5 jobs.
* The job is using the default profile, or has the `MANAGED_PROFILE` profile applied.

If any of these conditions are not met, the job will run with the original profile configuration.

## How profiles are recommended

When a job meets the eligibility criteria, Foundry calculates a recommended profile based on the resource usage patterns from the last 5 successful runs.

### Resource calculations

For each resource dimension (executor memory, executor cores, driver memory, driver cores, and number of executors), Foundry takes the maximum observed usage across the last 5 runs, capped at the original request value. This prevents scaling up a job beyond its initial resource allocation.

### Local mode optimization

For jobs with low parallelism requirements, Foundry may recommend running the job in local mode for improved efficiency. This optimization applies when:

```
numExecutors * executorCores <= 4
```

When local mode is recommended, the driver resources are adjusted to accommodate the workload that would have been distributed across executors:

* **Driver memory:** Set to the maximum of the original driver memory and the combined executor memory (`numExecutors * executorMemoryGb`).
* **Driver cores:** Set to the maximum of the original driver cores and the combined executor cores (`numExecutors * executorCores`).

This consolidation eliminates the overhead of distributed execution for small jobs while ensuring sufficient resources are available on the driver.

## Enabling managed profiles

Jobs using the default Spark profile are automatically eligible for managed profile recommendations. No additional configuration is required.

To enable managed profiles on a job that uses custom Spark profiles, add the `MANAGED_PROFILE` profile to your existing profile configuration. This signals to Foundry that the job should be considered for automatic profile optimization.

Learn how to apply Spark profiles to your transforms in the [Apply Spark profiles](/docs/foundry/optimizing-pipelines/apply-spark-profiles/) documentation.
