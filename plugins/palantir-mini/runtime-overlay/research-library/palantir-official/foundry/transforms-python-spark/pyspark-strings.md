---
sourceUrl: "https://www.palantir.com/docs/foundry/transforms-python-spark/pyspark-strings/"
canonicalUrl: "https://palantir.com/docs/foundry/transforms-python-spark/pyspark-strings/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "fa9411a0279ed8cd5548ab82237be0fabdc9544479a5f1e0a50fca7cf8a302cc"
product: "foundry"
docsArea: "transforms-python-spark"
locale: "en"
upstreamTitle: "Documentation | PySpark reference > Strings"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Strings

Strings refer to text data.

```python
from pyspark.sql import functions as F
```

## Converting between cases

* `F.initcap(col)`
* `F.lower(col)`
* `F.upper(col)`

## Concatenating, splitting

* `F.concat(*cols)`
* `F.concat_ws(sep, *cols)`
* `F.split(str, pattern)`

## Substrings

* `F.instr(str, substr)`
* `F.locate(substr, str, pos=1)`
* `F.substring(str, pos, len)`
* `F.substring_index(str, delim, count)`

## Trimming, padding

* `F.lpad(col, len, pad)`
* `F.ltrim(col)`
* `F.rpad(col, len, pad)`
* `F.rtrim(col)`
* `F.trim(col)`

## Regex

* `F.regexp_extract(str, pattern, idx)`
* `F.regexp_replace(str, pattern, replacement)`

## Misc

* `F.ascii(col)`
* `F.base64(col)`
* `F.bin(col)`
* `F.conv(col, fromBase, toBase)`
* `F.decode(col, charset)`
* `F.encode(col, charset)`
* `F.format_number(col, d)`
* `F.format_string(format, *cols)`
* `F.hex(col)`
* `F.length(col)`
* `F.levenshtein(left, right)`
* `F.repeat(col, n)`
* `F.reverse(col)`
* `F.translate(srcCol, matching, replace)`
* `F.unbase64(col)`
* `F.unhex(col)`
