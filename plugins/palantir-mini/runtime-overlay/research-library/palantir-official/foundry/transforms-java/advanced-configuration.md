---
sourceUrl: "https://www.palantir.com/docs/foundry/transforms-java/advanced-configuration/"
canonicalUrl: "https://palantir.com/docs/foundry/transforms-java/advanced-configuration/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d0606eb7881e87ba82f81dd73e13fd63d3333bb03cf3507934fc6afb9228f3f1"
product: "foundry"
docsArea: "transforms-java"
locale: "en"
upstreamTitle: "Documentation | Basic transforms > Advanced configuration"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Advanced configuration

This section describes how advanced configuration options can be used in Java transforms.

## Maximum build duration

It may be desirable to limit the run duration of a job to ensure data freshness or to limit costs. For example, if a job is interacting with an external service and becomes unresponsive, it is useful to have a limit on its run duration, as it may not complete.
In Code Repositories, you can limit job duration by using the `MaxAllowedDuration` and `Compute` decorators, as shown below:

```java
package myproject.datasets;

import com.palantir.transforms.lang.java.api.*;
import java.time.Duration;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;

public final class FilterTransform {

   @MaxAllowedDuration(value = "PT2H")
   @Compute
   public void myComputeFunction(
           @Input("/examples/students_hair_eye_color") FoundryInput myInput,
           @Output("/examples/students_hair_eye_color_filtered") FoundryOutput myOutput) {
       Dataset<Row> inputDf = myInput.asDataFrame().read();
       myOutput.getDataFrameWriter(inputDf.filter("eye = 'Brown'")).write();
   }
}
```

:::callout{theme="neutral"}
Note that despite the `MaxAllowedDuration` taking a `Duration` value, the job is polled every 5 minutes, so a value of `PT3M` (in ISO 8601 format) will cancel at 5 minutes, and a value of `PT7M` will cancel at 10 minutes, and so on.
:::
