---
source: https://www.palantir.com/docs/foundry/code-examples/common-operations-functions-on-objects
fetched: 2026-04-20
section: dev-toolchain
doc_title: Common Operations (Functions on Objects)
---

- Documentation

  * [Documentation](/docs/foundry/)
  * [Apollo](/docs/apollo/)
  * [Gotham](/docs/gotham/)

Search

+

K

[API Reference ↗](/docs/foundry/api-reference/)Send feedback

en

enjpkrzh

ABXY

ABXYABXYABXYABXYABXYABXY

* Capabilities

  + [AI Platform (AIP)](/docs/foundry/aip/overview/)
  + [Data connectivity & integration](/docs/foundry/data-integration/overview/)
  + [Model connectivity & development](/docs/foundry/model-integration/overview/)
  + [Ontology building](/docs/foundry/ontology/overview/)
  + [Developer toolchain](/docs/foundry/dev-toolchain/overview/)
  + [Use case development](/docs/foundry/app-building/overview/)
  + [Observability](/docs/foundry/observability/overview/)
  + [Analytics](/docs/foundry/analytics/overview/)
  + [Product delivery](/docs/foundry/devops/overview/)
  + [Security & governance](/docs/foundry/security/overview/)
  + [Management & enablement](/docs/foundry/administration/overview/)
* [Getting started](/docs/foundry/getting-started/overview/)
* [Architecture center](/docs/foundry/architecture-center/overview/)
* Platform updates

  + [Announcements](/docs/foundry/announcements/)
  + [Release notes](/docs/foundry/announcements/release-notes/)

* Product QAs

  + [Automate](/docs/foundry/questions-answers/automate/)
  + [Builds](/docs/foundry/questions-answers/builds/)
  + [Carbon (Community)](/docs/foundry/questions-answers/carbon-community/)
  + [Code Repositories](/docs/foundry/questions-answers/code-repositories/)
  + [Code Repositories (Community)](/docs/foundry/questions-answers/code-repositories-community/)
  + [Code Workspaces](/docs/foundry/questions-answers/code-workspaces/)
  + [Code Workspaces (Community)](/docs/foundry/questions-answers/code-workspaces-community/)
  + [Contour](/docs/foundry/questions-answers/contour/)
  + [Contour (Community)](/docs/foundry/questions-answers/contour-community/)
  + [Data Connection](/docs/foundry/questions-answers/data-connection/)
  + [Foundry Metadata (Community)](/docs/foundry/questions-answers/foundry-metadata-community/)
  + [Functions](/docs/foundry/questions-answers/functions/)
  + [Functions (Community)](/docs/foundry/questions-answers/functions-community/)
  + [Linter](/docs/foundry/questions-answers/linter/)
  + [Media sets](/docs/foundry/questions-answers/media-sets/)
  + [Media sets (Community)](/docs/foundry/questions-answers/media-sets-community/)
  + [Notepad](/docs/foundry/questions-answers/notepad/)
  + [Notifications (Community)](/docs/foundry/questions-answers/notifications-community/)
  + [Object Views (Community)](/docs/foundry/questions-answers/object-views-community/)
  + [Ontology](/docs/foundry/questions-answers/ontology/)
  + [Ontology SDK](/docs/foundry/questions-answers/ontology-sdk/)
  + [Pipeline Builder](/docs/foundry/questions-answers/pipeline-builder/)
  + [Pipeline Builder (Community)](/docs/foundry/questions-answers/pipeline-builder-community/)
  + [Projects (Community)](/docs/foundry/questions-answers/projects-community/)
  + [Quiver](/docs/foundry/questions-answers/quiver/)
  + [Quiver (Community)](/docs/foundry/questions-answers/quiver-community/)
  + [Slate](/docs/foundry/questions-answers/slate/)
  + [Streaming](/docs/foundry/questions-answers/streaming/)
  + [Vertex](/docs/foundry/questions-answers/vertex/)
  + [Webhooks](/docs/foundry/questions-answers/webhooks/)
  + [Workshop](/docs/foundry/questions-answers/workshop/)
  + [Workshop (Community)](/docs/foundry/questions-answers/workshop-community/)
* Code examples

  + Notional data generation

    - [Transforms](/docs/foundry/code-examples/notional-data-generation-transforms/)
  + Raw file parsing

    - [Functions on Objects](/docs/foundry/code-examples/raw-file-parsing-functions-on-objects/)
    - [Transforms](/docs/foundry/code-examples/raw-file-parsing-transforms/)
  + Functions on objects

    - [Functions on Objects](/docs/foundry/code-examples/functions-on-objects-functions-on-objects/)
  + Dataset metadata operations

    - [Code Repositories](/docs/foundry/code-examples/dataset-metadata-operations-code-repositories/)
    - [Local environment](/docs/foundry/code-examples/dataset-metadata-operations-local-environment/)
  + Graph and tree structured datasets

    - [Transforms](/docs/foundry/code-examples/graph-and-tree-structured-datasets-transforms/)
    - [Functions on Objects](/docs/foundry/code-examples/graph-and-tree-structured-datasets-functions-on-objects/)
  + Common operations

    - [Code Repositories](/docs/foundry/code-examples/common-operations-code-repositories/)
    - [Transforms](/docs/foundry/code-examples/common-operations-transforms/)
    - [Functions on Objects](/docs/foundry/code-examples/common-operations-functions-on-objects/)
  + Geospatial computation

    - [Transforms](/docs/foundry/code-examples/geospatial-computation-transforms/)
  + Fuzzy matching

    - [Transforms](/docs/foundry/code-examples/fuzzy-matching-transforms/)
  + Incremental transforms

    - [Transforms](/docs/foundry/code-examples/incremental-transforms-transforms/)
  + Foundry APIs

    - [Local environment](/docs/foundry/code-examples/foundry-apis-local-environment/)
  + External transforms

    - [Transforms](/docs/foundry/code-examples/external-transforms-transforms/)

Code examplesCommon operations[Functions on Objects](/docs/foundry/code-examples/common-operations-functions-on-objects/)

Functions on Objects
====================

Typescript
----------

### Assign alerts to analysts in a round-robin fashion

How do I assign a list of objects to another group of objects in a round-robin fashion using Typescript?

This code defines an Ontology edit function that assigns alerts to analysts in a round-robin fashion. It iterates through the alerts and assigns them to analysts by their employee ID, looping back to the first analyst when all analysts have been assigned an alert.

```
Copied!

1
2
3
4
5
6
7
8
9
10
11
12
13
14
15
16
17
18
19
20
@OntologyEditFunction()
@Edits(Alert)
    public async alertAssignment(alerts: Alert[]>): Promise<void>{
        const analysts = Objects.search().analyst.all();
        const numAnalysts = analysts.length;
        if(numAnalysts === 0){
            return
        }
        let analystIndex = 0;
        for(const alert of alerts)
        {
            const employeeId = analysts.at(analystIndex)!.employeeId;
            alert.assignedTo = employeeId;
            analystIndex += 1;
            if (analystIndex === numAnalysts){
                analystIndex = 0;
            }
        }
        
    }
```

* Date submitted: 2024-04-29
* Tags: `functions on objects`, `typescript`, `alert`, `analyst`, `round-robin`

### Get days between timestamps

How do I calculate the number of days between two timestamps in Typescript?

This code defines a function that takes two Timestamp objects as input and returns the number of days between them as an Integer.

```
Copied!

1
2
3
4
5
6
7
import { Function, Integer, Timestamp} from "@foundry/functions-api";


@Function()
    public getDaysBetweenTimestamp(date1: Timestamp, date2: Timestamp): Integer{
            return Math.floor((Math.abs((date1.getTime()-date2.getTime())) / (1000 * 3600 * 24)));
    }
```

* Date submitted: 2024-03-26
* Tags: `typescript`, `functions on objects`

[←

PREVIOUSTransforms](/docs/foundry/code-examples/common-operations-transforms/)

[NEXTGeospatial computation / Transforms

→](/docs/foundry/code-examples/geospatial-computation-transforms/)

© 2026 Palantir Technologies Inc. All rights reserved.

[Cookies Statement ↗](https://www.palantir.com/cookie-statement/)[Privacy Statement ↗](https://www.palantir.com/privacy-and-security/)

Cookie Settings

Contents
--------

* [Functions on Objects](#functions-on-objects)
  + [Typescript](#typescript)
