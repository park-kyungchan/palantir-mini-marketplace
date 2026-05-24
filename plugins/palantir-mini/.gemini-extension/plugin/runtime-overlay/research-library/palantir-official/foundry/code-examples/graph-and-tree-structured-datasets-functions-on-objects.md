---
sourceUrl: "https://www.palantir.com/docs/foundry/code-examples/graph-and-tree-structured-datasets-functions-on-objects/"
canonicalUrl: "https://palantir.com/docs/foundry/code-examples/graph-and-tree-structured-datasets-functions-on-objects/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "7eed3aeb58a589a8620d8bce481a7b79d74ebe469586f341891e0e9db6a4b44f"
product: "foundry"
docsArea: "code-examples"
locale: "en"
upstreamTitle: "Documentation | Graph and tree structured datasets > Functions on Objects"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Functions on Objects

## Typescript

### Get tree from root object for Vertex

How do I get the full tree from a root object in a tree like structure to display in Vertex?

This code performs a breadth first search from the root object of a tree-like object structure. It then returns an `IGraphSearchAroundResultV1` to display this tree in Vertex.

```typescript
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

```typescript
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
