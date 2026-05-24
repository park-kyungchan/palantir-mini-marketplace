---
sourceUrl: "https://www.palantir.com/docs/foundry/sensitive-data-scanner/best-practices/"
canonicalUrl: "https://palantir.com/docs/foundry/sensitive-data-scanner/best-practices/"
sourceLastmod: "2026-05-12T17:06:26.158Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "e315802c0452f430df559f57f45af93216fd992624eab3d5cc1285e03e747fe3"
product: "foundry"
docsArea: "sensitive-data-scanner"
locale: "en"
upstreamTitle: "Documentation | Sensitive Data Scanner > Best practices"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Best practices

Sensitive Data Scanner (SDS) automates a configurable integration of many of Foundry's most powerful capabilities (such as Markings), so should be used by those with some baseline proficiency of Foundry. The following are a set of best practices and guidelines to have in mind when using the tool.

## Optimizing compute

As SDS can be configured to scan across an entire [space](/docs/foundry/security/orgs-and-spaces/#spaces), concerns about the compute cost / time of each one-time or recurring scan may arise. There are two factors to consider when thinking about compute time: the number of datasets, and the type of match condition.
We have provided scan optimization guidelines for both of these factors below:

### (A) Optimize the number of datasets scanned:

* Scan only where data enters the platform (also known as ["boundary" datasets](/docs/foundry/sensitive-data-scanner/create-a-sensitive-data-scan/#scan-strategy)).
* [Exclude entire subfolders](/docs/foundry/sensitive-data-scanner/create-a-sensitive-data-scan/#excluded-datasets-and-folders) from being scanned, if sensitivity of content is already known.
* [Exclude datasets with certain markings](/docs/foundry/sensitive-data-scanner/create-a-sensitive-data-scan/#included-and-excluded-markings) from being scanned, if, for example, they have a PII or PHI marking indicating the presence of sensitive data.

![Screenshot of Scan filters in Sensitive Data Scanner](/docs/resources/foundry/sensitive-data-scanner/sds_config_guideline.png)

### (B) Optimize the match condition applied to each scan

Running a content-based regex search over the entire dataset is exhaustive and often resource-intensive. SDS optimizes compute by biasing toward checking the schema for column names prior to performing a content-based regex search. In practice, this means that SDS prevents builds if there is no possibility of a match based on columns when using either of the following regex match conditions:

* Match column name only
* Match both column name and content

## Markings

The provision of access to a Marking is binary (all-or-nothing). Regardless of role, a user cannot access a resource unless they satisfy all Marking requirements. [Learn more about Markings](/docs/foundry/security/markings/).
When a scan finds matching datasets, it applies markings automatically. Mistakenly using restrictive markings can block users from essential workflows and be hard to fix. Users should be careful and limit the match action's scope to a specific subset.

![Screenshot of selected match actions including an access restriction warning](/docs/resources/foundry/sensitive-data-scanner/sds_warning.png)

## Permission Model in Sensitive Data Scanner

Sensitive Data Scanner finds and protects sensitive data in Foundry. Permissions are carefully set so a user can only do what they are allowed to with SDS without exceeding their individual permissions on the resource. Data Governance Officers can monitor the whole organization's data without needing risky Owner permissions on every resource.

This following section presents the two ways a user can interact with Foundry resources using SDS:

1. Through specific [Space Roles](/docs/foundry/security/projects-and-roles/)
2. By being designated as the [Data Governance Officer](/docs/foundry/security/data-protection-and-governance/) of the an organization, and having Viewer role on the space

| Action                          | Data Governance Officer + Space Viewer | Space Owner | Space Editor | Space Viewer (Only) |
|---------------------------------|:---------------------------------------|:-----------:|:------------:|:-------------------:|
| Configure MC & MA               |                      ✔️                 |        ✔️    |              |                     |
| Manage recurring scans          |                      ✔️                 |        ✔️    |              |                     |
| Run sensitive data scans        |                      ✔️                 |        ✔️    |              |                     |
| Cancel sensitive data scans     |                      ✔️                 |        ✔️    |              |                     |
| View sensitive data scan status |                      ✔️                 |        ✔️    |         ✔️    |            ✔️        |
| View MC / MA                    |                      ✔️                 |        ✔️    |         ✔️    |            ✔️        |

As a resource Owner, a user has full control over SDS scanning and can manage interactions with the resource, including configuring settings and canceling scans. Editors can only request SDS interactions based on the Owner's preferences - such as running a scan with pre-configured match conditions, while Viewers can only see SDS outcomes. However, a "Data Governance Officer" role grants scanning privileges like a Space Owner.
