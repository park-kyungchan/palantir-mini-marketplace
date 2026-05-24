---
sourceUrl: "https://www.palantir.com/docs/foundry/transforms-java/unit-tests/"
canonicalUrl: "https://palantir.com/docs/foundry/transforms-java/unit-tests/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "768dfa46121f38b30634aa5bb0821e22bd92cf6d0664971914ff72c713098956"
product: "foundry"
docsArea: "transforms-java"
locale: "en"
upstreamTitle: "Documentation | Basic transforms > Unit tests"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Unit tests

Java Transforms supports running unit tests as part of CI checks.

:::callout{theme="neutral"}
Java Transforms does not currently support interactive unit tests or debugging. If your use case requires this functionality, consider using [Python Transforms](/docs/foundry/transforms-python/overview/) instead.
:::

:::callout{theme="neutral"}
The Java unit tests described on this page are only applicable to batch pipelines, and are not supported for streaming pipelines.
:::

The unit testing environment is set up by default when you apply `com.palantir.transforms.lang.java-defaults` plugin to your Java transforms subproject. It adds popular Java unit testing libraries [JUnit ↗](https://junit.org/junit4/), [Mockito ↗](https://site.mockito.org/) and [AssertJ ↗](https://assertj.github.io/doc/) to the subproject’s `testCompile` configuration.
You should put your test files under `src/test/java` for Gradle to automatically pick them up. See the steps in [Python Tests](/docs/foundry/transforms-python/unit-tests/) for more details on how to add plugins to your environment.

## Testing with Spark

We provide a JUnit5 extension and a JUnit4 rule to help you easily access a managed `SparkSession`.

If you are using JUnit5, declare the extension like you would with any regular extension:

```java
import com.palantir.transforms.lang.java.testing.api.SparkSessionExtension;
import org.junit.jupiter.api.extension.RegisterExtension;

@RegisterExtension
public static SparkSessionExtension sparkSession = new SparkSessionExtension();
```

If you are on JUnit4 (now deprecated), you can declare the `SparkSession` in your test files as either a `ClassRule` or a `Rule`. For example:

```java
import com.palantir.transforms.lang.java.testing.api.SparkSessionResource;
import org.junit.ClassRule;

@ClassRule
public static SparkSessionResource sparkSession = new SparkSessionResource();
```

```java
import com.palantir.transforms.lang.java.testing.api.SparkSessionResource;
import org.junit.Rule;

@Rule
public static SparkSessionResource sparkSession = new SparkSessionResource();
```

In both cases, you can then use the extension or rule in your tests normally as shown in the following snippet:

```java
@Test
public void myUnitTest() {
    SparkSession sparkSession = sparkSession.get();
}
```

Note that in JUnit4 `ClassRule` and `Rule` are different: If you declare the `SparkSession` as a `ClassRule`, the same `SparkSession` will be shared across all the tests inside the test class. This will save you some time on the recreation of `SparkSession,` but the classpath will be inherited from previously-run tests.
By contrast, if you declare the `SparkSession` as a `Rule`, you will get a new isolated `SparkSession` for each individual test. This can cause significant performance degradation if you have many tests using `SparkSession` in one class.

:::callout{theme="warning" title="Warning"}
Declaring `SparkSession` as a `Rule` can cause significant performance degradation if you have a lot of tests using `SparkSession` in one class. We therefore strongly suggest using `ClassRule` wherever possible or using the JUnit5 `Extension` rather than the JUnit4 rule.
:::
