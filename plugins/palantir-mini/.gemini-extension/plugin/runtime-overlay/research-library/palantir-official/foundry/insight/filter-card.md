---
sourceUrl: "https://www.palantir.com/docs/foundry/insight/filter-card/"
canonicalUrl: "https://palantir.com/docs/foundry/insight/filter-card/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "6dbb6cd8b81fd48b610459b5db89b486ec12984003a2d2b870edd94cfbac8837"
product: "foundry"
docsArea: "insight"
locale: "en"
upstreamTitle: "Documentation | Analyze data > Filter card"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Filter card

With the **Filter** card, you can perform a keyword search across all properties of the object types in the analysis path.

The available search and filter types are described below:

![The filter card displays keyword search and property filter options.](/docs/resources/foundry/insight/filter-card.png)

**Keyword search:** Type directly into the search bar and press `Enter` to search for a particular value across all data in the analysis.

**Property search:** Enter or choose a property from the dropdown menu to further define in the filter card. The default for each property is an exact match search type (`is`), but you can change this to a different parameter depending on the property type. For example, you could change a filter from `Project Start Date is May 15, 2023` to `Project Start Date is between Jan 1, 2023 and Dec 31, 2024`.

**Filter on linked property:** Filter on the properties of a linked object type without traversing to those object types. Select the **On a link** option at the bottom of the filter property dropdown menu to choose an object type linked to one or all object types in your analysis. Then choose whether to search for properties of an object type in your analysis that `is linked to` or `is not linked to` the selected linked object type.

**Special property types:** Additional property types, such as vector, leading wildcard, and regex properties, appear at the bottom of the filter card when present in your analysis. For more information about regex searchable properties and syntax, review the [search syntax](/docs/foundry/ontology/search-syntax/) documentation.

## Search matching

When a search query is entered, it is broken into individual units called tokens. For example, `The Quick Brown Fox` produces four tokens: `the`, `quick`, `brown`, and `fox`. Note that tokenization is case-insensitive.

### Search types

* **`is`:** Signals an exact match against non-analyzed text. For example, `The Quick Brown Fox` will only match `The Quick Brown Fox`.

* **`starts with`:** Appends `*` to the lowercase search term and matches against non-analyzed, raw field values.

* **`contains`:** Uses partial matching on the final token. All tokens in the query are matched exactly against the target field, except for the final token, which is matched as a prefix. This allows results to appear before the final word is fully entered. <br><br>
  **Example:**

  The search term `The Quick Brown F` searches for records containing `the`, `quick`, and `brown` as exact matches, and any word beginning with `f` as a prefix match. This would return a record containing `the brown fox reached the quick rabbit`, as all tokens are present and `fox` satisfies the prefix match on `f`. It would not, however, match `the fox quickly jumped over the brown fence`. While `fence` satisfies the prefix match on `f`, the token `quick` is not present, as `quickly` is not considered an exact match for `quick`. <br><br>
  The order of tokens is not considered when evaluating matches. All tokens must be present in the target field but may appear in any position. This search behavior applies to text-based properties only. <br><br>

* **`contains any word from`:** Uses the multi-match filter. An object matches if the search tokens exactly match any token from values in the given property. <br><br>
  **Example:**

  For the search term `The Quick Brown Fox`, queries for `the` OR `quick` OR `brown` OR `fox`. <br><br>
  **This search will match:** `brown vehicle`, `fox hole`, `the quick fox ran through the forest` <br>
  **This search will not match:** `brownie`, `foxtrot`, `Many foxes move quickly` <br><br>

* **`contains phrase`:** Uses a phrase filter that requires tokens to appear consecutively in the exact order entered. <br><br>
  **Example:**

  A query of `The Quick Brown Fox` would match `The quick brown fox is climbing the tree`, as the four tokens appear consecutively in the correct order. <br><br>
  **This search will not match:**

  * **`The Quick brown foxy bear`:** The token `fox` is not present as a standalone word.
  * **`the brown rabbit met the quick fox near the river`:** The tokens are present, but not in the correct order.
  * **`the quick smart and fast brown fox`:** Additional words appear between the tokens.
