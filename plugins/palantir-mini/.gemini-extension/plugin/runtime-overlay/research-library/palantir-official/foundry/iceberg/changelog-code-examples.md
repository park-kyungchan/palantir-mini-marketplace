---
sourceUrl: "https://www.palantir.com/docs/foundry/iceberg/changelog-code-examples/"
canonicalUrl: "https://palantir.com/docs/foundry/iceberg/changelog-code-examples/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "063c79e2e5848e8c08d37c78af0893c1b358416dfae721b59308616d2e43eec0"
product: "foundry"
docsArea: "iceberg"
locale: "en"
upstreamTitle: "Documentation | Changelogs and CDC > Code examples"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Example: Changelog views in Python transforms

This page provides code examples for working with CDC (Change Data Capture) and Iceberg changelogs in Python transforms.

In particular, note the following patterns and best practices:

* Always use `@incremental(v2_semantics=True)` when working with Iceberg tables.
* Use `source.changelog([identifier_columns])` to get changes for each unique row (as defined by the identifier columns) since the last run.
* Apply logic (such as cleaning, deduplication, or enrichment) to the changelog before merging.
* Use `output.apply_changelog(changelog_view_df, [identifier_columns])` to merge changes (including upserts and deletes).
* Fall back to a full snapshot overwrite only if incremental context is unavailable (for example, on the first run).

## Example: Incremental replication

This example is a simple CDC workflow that replicates changes from a source Iceberg table to a target, using the changelog API after applying any necessary filtering.

```python
from transforms.api import (
    IncrementalTableTransformInput,
    IncrementalTransformContext,
    incremental,
    transform,
)
from transforms.tables import TableInput, TableOutput, TableTransformOutput

@incremental(v2_semantics=True)
@transform(
    source=TableInput("<PATH>/input"),
    output=TableOutput("<PATH>/output"),
)
def incremental_cleanup(
    ctx: IncrementalTransformContext,
    source: IncrementalTableTransformInput,
    output: TableTransformOutput,
):
    # Create a changelog view from the last seen Iceberg snapshot ID.
    changelog_view_df = source.changelog(["id"])

    # Read the changelog view, then merge into the target Iceberg table.
    output.apply_changelog(
        changelog_view_df.filter(...),  # Changelog view with any transformation logic applied
        ["id"]  # Identifier column(s)
    )
```

**Key Points:**

* `source.changelog([identifier_cols])` yields only the new, changed, or deleted rows since the last run.
* The changelog dataframe can be modified, but the `_change_type` column must be preserved if you intend to use `apply_changelog`.
* `output.apply_changelog(df, identifier_columns)` merges changes into the target. Each row is processed according to its `_change_type` value and its identifier-based match in the output table:
  * `INSERT`/`UPDATE_AFTER`: Updates any existing row with matching identifier columns or inserts a new row if there is no match. `UPDATE_BEFORE` is ignored.
  * `DELETE`: Deletes any existing row in the output table with the matching identifier columns.

### Changelog performance optimization

* Changelog reads and updates perform best with incremental changes. Reading and applying an entire input table as a changelog can be slow because row changes need to be correlated across a large snapshot range. For improved performance, branch your code using `ctx.is_incremental` and fall back to a full snapshot overwrite when the transform is not running incrementally (such as on the first run).

  ```python
  def changelog_with_fallback(ctx, source, output):
      if ctx.is_incremental:
          changelog_df = source.changelog(["id"])
          output.apply_changelog(changelog_df.filter(...), ["id"])
      else:
          # Full snapshot overwrite
          output.write_dataframe(source.dataframe().filter(...))
  ```

* Changelog view creation is more performant when identifier columns are provided, as this allows for simpler internal partitioning. If identifier columns are not passed, the system generates a net changes changelog, which can be less efficient. See the [changelog technical primer](/docs/foundry/iceberg/changelog-primer/) for more details on working with net changes changelogs.
