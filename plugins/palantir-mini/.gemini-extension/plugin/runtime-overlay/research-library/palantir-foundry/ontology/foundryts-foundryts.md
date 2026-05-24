---
source: https://www.palantir.com/docs/foundry/foundryts/foundryts/
fetched: 2026-04-20
section: ontology-deep
doc_title: foundryts.FoundryTS
---

# foundryts.FoundryTS

```python
class foundryts.FoundryTS(*args, **kwargs)
```

The singleton that sends queries to the FoundryTS backend. Automatically initialized from environment variables — no manual initialization required.

## Example

```python
>>> fts = FoundryTS()
```

## Properties

### search

Property for searching the Ontology using `foundryts.search.Search`. Recommended over direct search for enforcing Foundry ecosystem safeguards.

```python
>>> fts = FoundryTS()
>>> objects = fts.search.series(metadata.property == 'value')
NodeCollection(...)
```
