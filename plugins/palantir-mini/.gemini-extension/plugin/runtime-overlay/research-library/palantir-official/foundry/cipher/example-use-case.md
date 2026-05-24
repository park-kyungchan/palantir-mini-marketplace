---
sourceUrl: "https://www.palantir.com/docs/foundry/cipher/example-use-case/"
canonicalUrl: "https://palantir.com/docs/foundry/cipher/example-use-case/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "ad60d9b7ab6eac991149a4fe65a463b93f7ce6520e76bde2a971e62936acdfee"
product: "foundry"
docsArea: "cipher"
locale: "en"
upstreamTitle: "Documentation | Workflows > Example use case"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Example Cipher use case

One common use case for Cipher is to encrypt sensitive data by default, but allow operational users with legitimate purposes to selectively decrypt specific fields when they need it with an audit trail of actions.

In the example diagram below, sensitive data lands in a Foundry dataset with a security [Marking](/docs/foundry/security/markings/) applied. The steps outline how to use Cipher to obfuscate data before sharing, and enabling only targeted decryptions for operational users.

![Architecture\_diagram](/docs/resources/foundry/cipher/cipher_arch_diagram.png)

## Steps to reproduce

1. [Create a Cipher Channel](/docs/foundry/cipher/getting-started/#create-a-cipher-channel) in your landing Project.
2. [Issue an Admin License](/docs/foundry/cipher/getting-started/#admin-license) and grant access to it to a relevant admin user.
3. [Obfuscate sensitive columns via Transforms](/docs/foundry/cipher/apply-operations/#python-transforms) and [unmark](/docs/foundry/building-pipelines/remove-inherited-markings/#remove-inherited-markings-and-organizations) the minimized dataset.
4. Reference the minimized dataset in the Project to which operational users have access.
5. [Issue a decrypt Operational User License](/docs/foundry/cipher/getting-started/#operational-user-license) and move it to the Project for operational users.
6. Set up your [Ontology](/docs/foundry/ontology/overview/) and [enable rendering of encrypted values](/docs/foundry/cipher/decrypt-individual-values/#render-encrypted-values-in-objects).
