---
sourceUrl: "https://www.palantir.com/docs/foundry/carbon/code-example/"
canonicalUrl: "https://palantir.com/docs/foundry/carbon/code-example/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "e6068f5aae5e447a126ffe6ec1a65c1515508abf9f193996e8d40ea125b3eb6f"
product: "foundry"
docsArea: "carbon"
locale: "en"
upstreamTitle: "Documentation | Editing with code > YAML configuration example"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# YAML configuration example

Carbon workspaces can be edited directly in YAML as well as with the graphical user interface. This page contains the YAML code for an example Carbon workspace. Details about this configuration can be found in the [YAML configuration reference](/docs/foundry/carbon/code-reference/).

![Example Carbon workspace](/docs/resources/foundry/carbon/carbon-workspace.png)

```yaml
displayMetadata:
  title: Claim Portal
  description: Claim Department App
discoverableModules:
  - ri.workshop.main.module.25b772f5-a095-48c6-a889-a960eeb93ce1
  - ri.workshop.main.module.6e10d8bb-90a4-47d2-86e3-3f10bfca0a1e
configuration:
  moduleShortcuts:
    primary:
      - title: Explore data
        description: ''
        icon:
          type: blueprintIcon
          blueprintIcon:
            iconName: search
            color:
              type: custom
              custom: '#2965CC'
        moduleRid: ri.carbon..core-module.search
        parameterValues: {}
      - title: Alert Triaging
        description: Inbox for quantity alerts with all the data needed to make a decision
        icon:
          type: blueprintIcon
          blueprintIcon:
            iconName: inbox
            color:
              type: custom
              custom: '#FFC940'
        moduleRid: ri.workshop.main.module.a1838b32-448d-43f6-beff-3c9e40a34929
        parameterValues:
          autoRefreshOnDataChanges:
            type: string
            string:
              string: 'true'
      - title: Alert Investigator
        description: Shows all alerts connected to an order
        icon:
          type: blueprintIcon
          blueprintIcon:
            iconName: badge
            color:
              type: custom
              custom: '#B6D94C'
        moduleRid: ri.workshop.main.module.25b772f5-a095-48c6-a889-a960eeb93ce1
        parameterValues:
          variable.priority:
            type: string
            string:
              string: P2
          autoRefreshOnDataChanges:
            type: string
            string:
              string: 'true'
      - title: Order View
        description: null
        icon:
          type: blueprintIcon
          blueprintIcon:
            iconName: layers
            color:
              type: custom
              custom: '#FF66A1'
        moduleRid: ri.workshop.main.module.6e10d8bb-90a4-47d2-86e3-3f10bfca0a1e
        parameterValues: {}
    secondary:
      - title: All Orders
        description: ''
        icon:
          type: blueprintIcon
          blueprintIcon:
            iconName: clipboard
            color:
              type: custom
              custom: '#202b33'
        moduleRid: ri.carbon..core-module.exploration
        parameterValues:
          objectSetRid:
            type: string
            string:
              string: >-
                ri.object-set.main.versioned-object-set.d1e3f2e1-849e-4aaa-ae01-5c63e8771be7
  homePage:
    logo:
      source:
        type: compassResource
        compassResource:
          resourceRid: ri.blobster.main.image.77b48452-73e0-431a-909e-efa286a2d5e2
      maxWidth: 400
      maxHeight: 80
    welcomeText: null
    shouldHideSearchBar: false
    defaultObjectTypesFilter:
      specific:
        selectedObjectTypes:
          - ri.ontology.main.object-type.af927662-698b-42ab-8e91-5d67304b0e8f
      type: specific
    columns:
      - sections:
          - title: null
            description: null
            displayAs: CARD
            contents:
              type: custom
              custom:
                items:
                  - type: module
                    module:
                      displayMetadata:
                        thumbnail:
                          source:
                            type: compassResource
                            compassResource:
                              resourceRid: >-
                                ri.blobster.main.image.b551eeb1-ad11-4f19-b166-241a6463f096
                      moduleRid: >-
                        ri.workshop.main.module.a1838b32-448d-43f6-beff-3c9e40a34929
                      parameterValues: {}
                  - type: module
                    module:
                      displayMetadata:
                        thumbnail:
                          source:
                            type: compassResource
                            compassResource:
                              resourceRid: >-
                                ri.blobster.main.image.545f9fb8-14dc-4b3b-a823-e57492e502d5
                      moduleRid: >-
                        ri.workshop.main.module.25b772f5-a095-48c6-a889-a960eeb93ce1
                      parameterValues: {}
          - contents:
              custom:
                items: []
              type: custom
      - sections:
          - title: null
            description: null
            displayAs: CARD
            contents:
              type: custom
              custom:
                items:
                  - type: module
                    module:
                      displayMetadata:
                        title: Order View
                        description: '360 order view '
                        icon:
                          type: blueprintIcon
                          blueprintIcon:
                            iconName: layers
                            color:
                              type: custom
                              custom: '#FF66A1'
                        thumbnail:
                          source:
                            type: compassResource
                            compassResource:
                              resourceRid: >-
                                ri.blobster.main.image.46edffad-903f-4434-84f0-f0892d861ae4
                          position: TOP
                      moduleRid: >-
                        ri.workshop.main.module.6e10d8bb-90a4-47d2-86e3-3f10bfca0a1e
                      parameterValues: {}
      - sections:
          - title: null
            description: null
            displayAs: null
            contents:
              type: custom
              custom:
                items:
                  - type: module
                    module:
                      displayMetadata:
                        title: Explore all data
                        description: Search objects and links
                        icon:
                          type: blueprintIcon
                          blueprintIcon:
                            iconName: search
                            color:
                              type: custom
                              custom: '#2965CC'
                        thumbnail: null
                      moduleRid: ri.carbon..core-module.search
                      parameterValues: {}
                  - type: module
                    module:
                      displayMetadata:
                        title: Dispatch Alert
                        description: ''
                        icon:
                          type: blueprintIcon
                          blueprintIcon:
                            iconName: warning-sign
                            color:
                              type: custom
                              custom: '#ff7373'
                        thumbnail: null
                      moduleRid: ri.carbon..core-module.exploration
                      parameterValues:
                        objectSetRid:
                          type: string
                          string:
                            string: >-
                              ri.object-set.main.object-set.3f583a3e-5847-447e-8184-a56fef9a1ccc
                  - type: objectType
                    objectType:
                      objectTypeRid: >-
                        ri.ontology.main.object-type.14014a36-91d6-45b7-a288-bda5f2881568
                  - type: objectType
                    objectType:
                      objectTypeRid: >-
                        ri.ontology.main.object-type.fec52161-983f-40cc-8233-f73112c3850c
                  - type: objectType
                    objectType:
                      objectTypeRid: >-
                        ri.ontology.main.object-type.e5a5adea-cfa4-4a80-808b-3dbbe7e0bc4b
          - title: Top Accounts
            description: null
            displayAs: null
            contents:
              type: objects
              objects:
                objects:
                  - objectRid: >-
                      ri.phonograph2-objects.main.object.fea24c1e-582d-40ab-85a4-423a523cfb7f
                  - objectRid: >-
                      ri.phonograph2-objects.main.object.9c145afd-baa3-4734-a76d-f5f15f77899d
```
