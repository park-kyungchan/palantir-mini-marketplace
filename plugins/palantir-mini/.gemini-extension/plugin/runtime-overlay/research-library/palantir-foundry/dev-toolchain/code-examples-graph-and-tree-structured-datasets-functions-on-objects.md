---
source: https://www.palantir.com/docs/foundry/code-examples/graph-and-tree-structured-datasets-functions-on-objects
fetched: 2026-04-20
section: dev-toolchain
doc_title: Graph and Tree Structured Datasets (Functions on Objects)
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

Code examplesGraph and tree structured datasets[Functions on Objects](/docs/foundry/code-examples/graph-and-tree-structured-datasets-functions-on-objects/)

Functions on Objects
====================

Typescript
----------

### Get tree from root object for Vertex

How do I get the full tree from a root object in a tree like structure to display in Vertex?

This code performs a breadth first search from the root object of a tree-like object structure. It then returns an `IGraphSearchAroundResultV1` to display this tree in Vertex.

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
21
22
23
24
25
26
27
28
29
30
31
32
33
34
35
36
37
38
39
40
41
42
43
44
45
46
47
48
49
50
51
52
53
54
55
56
57
58
59
60
61
62
63
64
65
66
67
68
69
70
71
72
73
74
75
76
77
78
79
80
81
82
83
84
85
86
import { Function, Integer, OntologyObject } from "@foundry/functions-api"
import { ExampleObjectType } from "@foundry/ontology-api";

export interface IGraphSearchAroundResultV1 {
    directEdges?: IGraphSearchAroundResultDirectEdgeV1[];
    intermediateEdges?: IGraphSearchAroundResultIntermediateEdgeV1[];
    orphanObjectRids?: string[];
    objectRidsToGroup?: string[][];
}

export interface IGraphSearchAroundResultDirectEdgeV1 {
    sourceObjectRid: string;
    targetObjectRid: string;
    linkTypeRid?: string;
}

export interface IGraphSearchAroundResultIntermediateEdgeV1 {
    sourceObjectRid: string;
    sourceToIntermediateLinkTypeRid?: string;
    intermediateObjectRid: string;
    intermediateToTargetLinkTypeRid?: string;
    targetObjectRid: string;
}

class Queue<T> {
  private items: T[];

  constructor() {
    this.items = [];
  }

  enqueue(item: T): void {
    this.items.push(item);
  }

  dequeue(): T | undefined {
    return this.items.shift();
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }
}

export class VertexSearchArounds {

    @Function()
    public async fullBomTree(exampleObject: ExampleObjectType): Promise<IGraphSearchAroundResultV1> {
        
        var directEdges: IGraphSearchAroundResultDirectEdgeV1[] = [];

        if (exampleObject.parent.all().length == 0) {
            const visited: ExampleObjectType[] = [];
            const queue: Queue<ExampleObjectType> = new Queue<ExampleObjectType>();

            visited.push(exampleObject);
            queue.enqueue(exampleObject);

            while (!queue.isEmpty()) {
                const currentNode = queue.dequeue();

                if (currentNode !== undefined) {
                    const children = exampleObject.child.all();

                    if (children) {
                        for (const child of children) {
                            if (!visited.includes(child)) {
                                visited.push(child);
                                queue.enqueue(child);
                                directEdges.push({
                                    sourceObjectRid: currentNode.rid!,
                                    targetObjectRid: child.rid!
                                })
                            }
                        }
                    }
                }
            }
        }

        const result: IGraphSearchAroundResultV1 = {
            directEdges
        };
        return result;
    }
}
```

* Date submitted: 2024-04-30
* Tags: `graph`, `typescript`, `searcharound`, `breadth-first search`, `vertex`

### Search around for children and grandchildren

How do I get the children and grandchildren of an object structured like a tree or graph?

This code defines a function that takes a list of input nodes and returns an object set containing the children and grand children of the input nodes by searching around the parent nodes.

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
@Function()
// Get the children and grand children of one given input node.
private async getGrandChildrenAndChildrenViaList(item: ItemStructure[]): Promise<ObjectSet<ItemStructure>> {
    if(item.length === 0){
        // Return empty set
        return Objects.search().itemStructure([]);
    } else {
        // Defines an object set from the list of object as input
        var itemSet: ObjectSet<ItemStructure>;
        itemSet = Objects.search().itemStructure(item);
        // Search around those objects
        return itemSet.searchAroundItemStructureParent().union(itemSet.searchAroundItemStructureParent().searchAroundItemStructureParent());
    }
}
```

* Date submitted: 2024-03-20
* Tags: `functions on objects`, `foo`, `typescript`, `searcharound`

[←

PREVIOUSTransforms](/docs/foundry/code-examples/graph-and-tree-structured-datasets-transforms/)

[NEXTCommon operations / Code Repositories

→](/docs/foundry/code-examples/common-operations-code-repositories/)

© 2026 Palantir Technologies Inc. All rights reserved.

[Cookies Statement ↗](https://www.palantir.com/cookie-statement/)[Privacy Statement ↗](https://www.palantir.com/privacy-and-security/)

Cookie Settings

Contents
--------

* [Functions on Objects](#functions-on-objects)
  + [Typescript](#typescript)
