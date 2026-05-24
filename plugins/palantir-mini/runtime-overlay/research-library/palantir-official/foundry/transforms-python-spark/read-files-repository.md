---
sourceUrl: "https://www.palantir.com/docs/foundry/transforms-python-spark/read-files-repository/"
canonicalUrl: "https://palantir.com/docs/foundry/transforms-python-spark/read-files-repository/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "f18506713014fef4cee85ea6b42c93d5a6329e5cded381b7b23931003d2d6fd8"
product: "foundry"
docsArea: "transforms-python-spark"
locale: "en"
upstreamTitle: "Documentation | Python (Spark) > Read files in a repository"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Read files in a repository

You can read other files from your repository into the transform context. This might be useful in setting parameters for your transform code to reference.

To start, In your python repository edit `setup.py`:

```python
setup(
    name=os.environ['PKG_NAME'],
# ...
    package_data={
        '': ['*.yaml', '*.csv']
    }
)
```

This tells python to bundle the yaml and csv files into the package.
Then place a config file (for example `config.yaml`, but can be also csv or txt) next to your python transform (e.g. `read_yml.py` see below):

```yaml
- name: tbl1
  primaryKey:
  - col1
  - col2
  update:
  - column: col3
    with: 'XXX'
```

You can read it in your transform `read_yml.py` with the code below:

```python
from transforms.api import transform_df, Input, Output
from pkg_resources import resource_stream
import yaml
import json

@transform_df(
    Output("/Demo/read_yml")
)
def my_compute_function(ctx):
    stream = resource_stream(__name__, "config.yaml")
    docs = yaml.safe_load(stream)
    return ctx.spark_session.createDataFrame([{'result': json.dumps(docs)}])
```

So your project structure would be:

* some\_folder
  * `config.yaml`
  * `read_yml.py`

This will output in your dataset a single row with one column "result" with content:

```json
[{"primaryKey": ["col1", "col2"], "update": [{"column": "col3", "with": "XXX"}], "name": "tbl1"}]
```
