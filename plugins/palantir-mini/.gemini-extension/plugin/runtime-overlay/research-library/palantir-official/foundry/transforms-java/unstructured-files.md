---
sourceUrl: "https://www.palantir.com/docs/foundry/transforms-java/unstructured-files/"
canonicalUrl: "https://palantir.com/docs/foundry/transforms-java/unstructured-files/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "cf140be3697cac88f313be13f295c745a2aeedfceadad924a406d14b20136f05"
product: "foundry"
docsArea: "transforms-java"
locale: "en"
upstreamTitle: "Documentation | Basic transforms > Read and write unstructured files"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Read and write unstructured files

:::callout{theme="neutral"}
The examples here contain more advanced content. Make sure to go through the [section on defining Transforms](/docs/foundry/transforms-java/transforms-pipelines/) before going through this section.
:::

This page contains various example data transformations using Transforms Java:

* [Parallel processing with Spark](#parallel-processing-with-spark)
  * [Uncompressing dataset files & writing to an output fileSystem](#uncompressing-dataset-files--writing-to-an-output-filesystem)
  * [Uncompressing dataset files & writing to an output dataFrame](#uncompressing-dataset-files--writing-to-an-output-dataframe)
* [Combining dataset files](#combining-dataset-files)

The examples here are data transformations expressed in terms of files. If you want to have access to files in your transformation, you must define a low-level `Transform`. This is because underlying dataset files are exposed by `FoundryInput` and `FoundryOutput` objects. Low-level Transforms, unlike high-level ones, expect the input(s) and output(s) to the compute function to be of type `FoundryInput` and `FoundryOutput`, respectively. The included examples are also low-level Transforms intended for manual registration.

## Parallel processing with Spark

### Uncompressing dataset files & writing to an output filesystem

This example takes in `.zip` files as input. It unzips the files and then writes the files to the output FileSystem — because `.zip` is not splittable, this work is done in parallel per `.zip` file using Spark. If you want to parallelize decompression within a single compressed file, use a splittable file format like `.bz2`.

```java
/*
 * (c) Copyright 2018 Palantir Technologies Inc. All rights reserved.
 */
package com.palantir.transforms.java.examples;

import com.google.common.io.ByteStreams;
import com.palantir.transforms.lang.java.api.Compute;
import com.palantir.transforms.lang.java.api.FoundryInput;
import com.palantir.transforms.lang.java.api.FoundryOutput;
import com.palantir.transforms.lang.java.api.ReadOnlyLogicalFileSystem;
import com.palantir.transforms.lang.java.api.WriteOnlyLogicalFileSystem;
import com.palantir.util.syntacticpath.Paths;
import java.io.IOException;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * This is an example of unzipping files in parallel using Spark.
 * <p>
 * The work is distributed to executors.
 */
public final class UnzipWithSpark {

    @Compute
    public void compute(FoundryInput zipFiles, FoundryOutput output) throws IOException {
        ReadOnlyLogicalFileSystem inputFileSystem = zipFiles.asFiles().getFileSystem();
        WriteOnlyLogicalFileSystem outputFileSystem = output.getFileSystem();

        inputFileSystem.filesAsDataset().foreach(portableFile -> {
            // "processWith" gives you the InputStream for the given input file.
            portableFile.processWithThenClose(stream -> {
                try (ZipInputStream zis = new ZipInputStream(stream)) {
                    ZipEntry entry;
                    // For each file in the .zip file, write it to the output file system.
                    while ((entry = zis.getNextEntry()) != null) {
                        outputFileSystem.writeTo(
                                Paths.get(entry.getName()),
                                outputStream -> ByteStreams.copy(zis, outputStream));
                    }
                    return null;
                } catch (IOException e) {
                    throw new RuntimeException(e);
                }
            });
        });
    }
}
```

### Uncompressing dataset files & writing to an output DataFrame

This example takes in `.csv`, `.gz`, and `.zip` files as input. It uncompresses the files and then writes the files to the output DataFrame—this work is done in parallel using Spark.

```java
/*
 * (c) Copyright 2018 Palantir Technologies Inc. All rights reserved.
 */

package com.palantir.transforms.java.examples;

import com.google.common.collect.AbstractIterator;
import com.google.common.io.CharSource;
import com.google.common.io.Closeables;
import com.palantir.spark.binarystream.data.PortableFile;
import com.palantir.transforms.lang.java.api.Compute;
import com.palantir.transforms.lang.java.api.FoundryInput;
import com.palantir.transforms.lang.java.api.FoundryOutput;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import java.util.zip.GZIPInputStream;
import java.util.zip.ZipInputStream;
import org.apache.spark.TaskContext;
import org.apache.spark.api.java.function.FlatMapFunction;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Encoders;
import org.apache.spark.sql.Row;
import org.apache.spark.util.TaskCompletionListener;

/**
 * This is an example expects .csv/.gz/.zip files as input.
 * <p>
 * It does the following operations in parallel over Spark:
 * <ol>
 *     <li>Detects the type of the file.</li>
 *     <li>If the file type is .gz or .zip, it uncompressed the files.</li>
 *     <li>Infers the schema of the uncompressed .csv files.</li>
 *     <li>Converts the dataset of .csv lines into a dataset of that schema.</li>
 * </ol>
*/
public final class UnzipWithSparkToDataset {

    @Compute
    public void compute(FoundryInput input, FoundryOutput output) {
        // Get a Spark dataset of input files.
        Dataset<PortableFile> files = input.asFiles().getFileSystem().filesAsDataset();

        // Convert the dataset of input files to a dataset of .csv lines.
        Dataset<String> csvDataset = files.flatMap((FlatMapFunction<PortableFile, String>) portableFile ->
                // Get an InputStream from the current input file.
                portableFile.convertToIterator(inputStream -> {
                    String fileName = portableFile.getLogicalPath().getFileName().toString();
                    // Detect .gz and .zip files and get a line iterator from each.
                    if (fileName.endsWith(".gz")) {
                        return new InputStreamCharSource(new GZIPInputStream(inputStream)).getLineIterator();
                    } else if (fileName.endsWith(".zip")) {
                        return new ZipIterator(new ZipInputStream(inputStream));
                    } else {
                        return new InputStreamCharSource(inputStream).getLineIterator();
                    }
                }), Encoders.STRING());

        // Infers the schema and converts the dataset of .csv lines into a dataset of that schema.
        Dataset<Row> dataset = files
                .sparkSession()
                .read()
                .option("inferSchema", "true")
                .csv(csvDataset);
        output.getDataFrameWriter(dataset).write();
    }

    /*
     * This ZipIterator assumes that all files within the archive are .csvs with the
     * same schema and belong to the same dataset.
     */
    private static final class ZipIterator extends AbstractIterator<String> {
        private Iterator<String> lineIterator;
        private ZipInputStream zis;

        ZipIterator(ZipInputStream zis) throws IOException {
            this.zis = zis;
            lineIterator = new InputStreamCharSource(zis).getLineIterator();
        }

        @Override
        protected String computeNext() {
            if (!lineIterator.hasNext()) {
                // If the line iterator does not have a next element, check if there is a next file.
                try {
                    // Find the next file that is non empty.
                    while (zis.getNextEntry() != null) {
                        lineIterator = new InputStreamCharSource(zis).getLineIterator();
                        if (lineIterator.hasNext()) {
                            break;
                        }
                    }
                    return lineIterator.hasNext() ? lineIterator.next() : endOfData();
                } catch (IOException e) {
                    throw new RuntimeException(e);
                }
            } else {
                return lineIterator.next();
            }
        }
    }

    private static final class InputStreamCharSource extends CharSource {
        private final Reader inputStream;

        private InputStreamCharSource(InputStream inputStream) {
            this.inputStream = new InputStreamReader(inputStream, StandardCharsets.UTF_8);
        }

        @Override
        public Reader openStream() throws IOException {
            return inputStream;
        }

        @SuppressWarnings("MustBeClosedChecker")
        Iterator<String> getLineIterator() {
            try {
                return super.lines().iterator();
            } catch (IOException e) {
                throw new RuntimeException(e);
            } finally {
                if (TaskContext.get() != null) {
                    // If running in Spark, close the stream when the task is finished.
                    TaskContext.get().addTaskCompletionListener((TaskCompletionListener) context -> close());
                } else {
                    close();
                }
            }
        }

        private void close() {
            Closeables.closeQuietly(inputStream);
        }
    }
}
```

## Combining dataset files

This example takes in `.zip` files as input, and it combines all of the input dataset files into a single `.zip` file. Note that the computation in this Transform is not parallelized.

```java
/*
 * (c) Copyright 2018 Palantir Technologies Inc. All rights reserved.
 */
package com.palantir.transforms.java.examples;

import com.google.common.io.ByteStreams;
import com.palantir.transforms.lang.java.api.Compute;
import com.palantir.transforms.lang.java.api.FoundryInput;
import com.palantir.transforms.lang.java.api.FoundryOutput;
import com.palantir.transforms.lang.java.api.ReadOnlyLogicalFileSystem;
import com.palantir.transforms.lang.java.api.WriteOnlyLogicalFileSystem;
import com.palantir.util.syntacticpath.Paths;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * This is an example of combining all files in a dataset into one big .zip file.
 * <p>
 * The work is done on a single thread, because it is difficult to run in parallel.
 * <p>
 * WARNING: In general, it's preferred to use the APIs in {@link UnzipWithSpark} and {@link UnzipWithSparkToDataset}
 * to take advantage of Spark. This is an example of a computation that is difficult to meaningfully parallelize,
 * which is why it is done using file system operations only on the driver.
 */
public final class ZipOnDriver {

    @Compute
    public void compute(FoundryInput zipFiles, FoundryOutput output) {
        ReadOnlyLogicalFileSystem inputFileSystem = zipFiles.asFiles().getFileSystem();
        WriteOnlyLogicalFileSystem outputFileSystem = output.getFileSystem();

        // Write to a file called "bigzip.zip" in the output dataset's file system.
        outputFileSystem.writeTo(Paths.get("bigzip.zip"), outputStream -> {
            // Wrap the OutputStream in a ZipOutputStream in order to write each file into the same .zip file.
            try (ZipOutputStream zipOutputStream = new ZipOutputStream(outputStream)) {
                // For each file in the input dataset's FileSystem, read it, mark a new entry in the
                // "bigzip.zip", then copy the bytes over.
                inputFileSystem.listAllFiles().forEach(inputPath -> {
                    inputFileSystem.readFrom(inputPath, inputStream -> {
                        zipOutputStream.putNextEntry(new ZipEntry(inputPath.toString()));
                        ByteStreams.copy(inputStream, zipOutputStream);
                        return null;
                    });
                });
            }
        });
    }
}
```
