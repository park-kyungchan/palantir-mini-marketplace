---
sourceUrl: "https://www.palantir.com/docs/foundry/notepad/templates-configuration/"
canonicalUrl: "https://palantir.com/docs/foundry/notepad/templates-configuration/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "ad2688879b867d4427fb2366194650e9572a596520e54fd2d3f0ccaed1ebf9e0"
product: "foundry"
docsArea: "notepad"
locale: "en"
upstreamTitle: "Documentation | Templates > Configure space template generation limits"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Configure space template generation limits

Template generation is one of Notepad's most powerful and flexible features. It can use row and section generators, enabling users to dynamically populate tables and structured sections from object sets. These templates generate one row or section per object, allowing the document size to scale with the number of objects in the set.

## Configuration

in Control Panel, [space](/docs/foundry/security/orgs-and-spaces/) owners and managers can manage Notepad configuration settings on a space level in for the following features:

* **Maximum number of sections:** In top-level and nested generators.
* **Maximum number of rows:** In top-level and nested generators.

During template generation, Notepad will adhere to these configured values to control the size of generated templates.

## Safeguards

To prevent scale issues, Notepad has implemented the following safeguards.

### Prevent degrading Notepad or upstream services

Generating a document from a template involves loading and processing that scales with the number of generated rows/sections. To prevent a rogue template from disrupting Notepad or its dependent services, there is an extra-large hard limit in place. Templates exceeding this limit will fail to generate.

### Limits on large documents

Nested generators can easily create documents with a large number of sections, leading to unloadable documents. While not all instances of large document generation need to be safeguarded, an upper bound on configuration limits is in place:

* **Large document generation limit:** All generator configurations are capped at 1,000.
