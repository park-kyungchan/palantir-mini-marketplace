---
source: https://www.palantir.com/docs/foundry/action-types/scale-property-limits/
fetched: 2026-04-20
section: ontology-deep
doc_title: Scale and property limits for action types
---

# Scale and property limits for action types

## Configuration limits

| Limit | Value |
|-------|-------|
| Max primitive list property size | 10,000 items |
| Max object reference list property size | 1,000 items |

## Edit limits (per action submission)

| Limit | Value |
|-------|-------|
| Max object types modified | 50 |
| Max objects modified | 10,000 |
| Max edit payload per object (OSv1) | 32 KB |
| Max edit payload per object (OSv2) | 3 MB |

## Batch call limits

| Scenario | Max batch size |
|----------|----------------|
| Standard action type | 10,000 |
| Non-batched function-backed action | 20 |

## Supported property types

### Single-value properties
Supported for action type rules: string, integer, long, double, boolean, timestamp, date, attachment, media reference, object reference, struct, GeoPoint, GeoShape, marking.

### Array/list properties
Supported for action type rules: string[], integer[], long[], double[], boolean[], timestamp[], date[], attachment[], media reference[], object reference[], struct[], GeoPoint[], GeoShape[], marking[].

Note: OSv1 and OSv2 differ in payload size limits. Use OSv2 object types when large edit payloads are expected.
