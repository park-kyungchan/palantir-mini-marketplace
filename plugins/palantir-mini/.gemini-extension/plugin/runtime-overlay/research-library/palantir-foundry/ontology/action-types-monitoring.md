---
source: https://www.palantir.com/docs/foundry/action-types/monitoring/
fetched: 2026-04-20
section: ontology-deep
doc_title: Action monitoring
---

# Action monitoring

Actions in Foundry can be monitored to track performance and reliability.

## Available monitoring rules

Action monitoring supports two key rule types:

1. **Action duration p95** — alerts when the 95th percentile execution time exceeds thresholds.
2. **Number of action failures in window** — alerts when failure count exceeds thresholds within a timeframe.

## Set up action monitoring

1. Create a monitoring view (see monitoring views overview).
2. Add a monitoring rule for an action or action type.
3. Configure thresholds and severity levels.
4. Set up alert notifications via the alert subscription guide.

## Dynamic scopes

Action monitors support **Workflow Lineage**, **Workshop**, and **OSDK application** as dynamic scopes. When a dynamic scope is selected, the monitor automatically tracks all actions the scoped resource uses and adjusts as actions are added or removed.
