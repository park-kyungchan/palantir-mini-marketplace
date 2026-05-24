---
sourceUrl: "https://www.palantir.com/docs/foundry/code-repositories/create-custom-checks/"
canonicalUrl: "https://palantir.com/docs/foundry/code-repositories/create-custom-checks/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "783edc277826637402ff2749f4b8b892bc472ea10c92bdc46418b623e30ad443"
product: "foundry"
docsArea: "code-repositories"
locale: "en"
upstreamTitle: "Documentation | Advanced workflows > Create custom checks"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Create custom checks

Custom checks can be created as a [Gradle ↗](https://gradle.org/) tasks. These tasks should be added to the appropriate inner `build.gradle` files, within the language subfolders. Here is an example of a Gradle task that prints `Hello World` when executed (note that the `doLast` method creates a task action that runs when the task executes, rather than at configuration time):

```gradle
// Define custom task
task customTask {
    doLast {
        println "Hello World"
    }
 }
```

In order for tasks to get executed during CI checks, there must be a CI task that depends on your custom task. This is also defined in the same `build.gradle` file. In the following example, the check task would be executed after `customTask` in CI; this is where the `Hello World` message will appear in the CI logs.

```gradle
// Add CI dependency on custom task
 project.tasks.check.dependsOn customTask
```

In order for tasks to get executed at the end of the task list, you would use the following syntax instead.

```gradle
// Execute custom task after CI checks are published
project.tasks.publish.configure { finalizedBy customTask }
```

To add dependencies, you can use the following CI tasks: `project.tasks.check`, `project.tasks.test`, and `project.tasks.publish`. We strongly recommend you do not use or rely on other CI tasks (for example, internal tasks) as these are not guaranteed and are subject to change.

More documentation of the functionality provided by Gradle build scripts is available in the [Gradle docs ↗](https://docs.gradle.org/current/userguide/tutorial_using_tasks.html).

:::callout{theme="neutral"}
Adding custom CI checks to the `ci.yml` file is not recommended as this file will be overwritten each time the repo is upgraded.
:::
