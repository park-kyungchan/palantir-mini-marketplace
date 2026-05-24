---
sourceUrl: "https://www.palantir.com/docs/foundry/ontologies/"
canonicalUrl: "https://palantir.com/docs/foundry/ontologies/"
sourceLastmod: "2026-05-12T17:06:26.160Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "e3d0af01b6b990ad10593e92619cd10b3051a3be151b36b4a37176d66435eff8"
product: "foundry"
docsArea: "ontologies"
locale: "en"
upstreamTitle: "Documentation | Ontologies > Overview"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Ontologies

An ontology is an artifact which stores ontological resources or entities, including the following:

* [Object types](/docs/foundry/object-link-types/object-types-overview/)
* [Link types](/docs/foundry/object-link-types/link-types-overview/)
* [Action types](/docs/foundry/action-types/overview/)
* [Interfaces](/docs/foundry/interfaces/interface-overview/)
* [Shared properties](/docs/foundry/object-link-types/shared-property-overview/)
* [Object type groups](/docs/foundry/object-link-types/type-groups/)

We call these resources **Ontology resources**. An ontology can either be private and assigned to a single [organization](/docs/foundry/security/orgs-and-spaces/) or shared among multiple organizations. Shared ontologies allow users of different organizations to share data and workflows safely. Grouping entities in ontologies ensures that only users of the specified organizations can access ontological entities.

## Relation with spaces

An ontology is mapped 1:1 with a [space](/docs/foundry/security/orgs-and-spaces/#spaces). When a new space is created, a corresponding ontology with the same name is simultaneously created with the same organization [markings](/docs/foundry/security/markings/) as the space. A private space will map to a private ontology, while a shared space will map to a shared ontology.
