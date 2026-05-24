---
sourceUrl: "https://www.palantir.com/docs/foundry/automate/automation-dependencies/"
canonicalUrl: "https://palantir.com/docs/foundry/automate/automation-dependencies/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "da3d379f5f21277ef22289a7342053f558eb834afc35d0be5bad548a981ea203"
product: "foundry"
docsArea: "automate"
locale: "en"
upstreamTitle: "Documentation | Condition > Automation dependencies"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Automation dependencies

The automation dependencies feature in Foundry Automate allows you to schedule an automation to run after a parent automation completes. This feature is designed to streamline workflows by automatically triggering subsequent processes, regardless of the success or failure of the parent automation.

You can configure the automation to trigger using the criteria below:

* **Automatic scheduling:** The dependent automation is triggered automatically after the parent automation completes, without the need for manual intervention.
* **Object set conditions:** In addition to being triggered by the completion of a parent automation, you can specify object set conditions for the dependent automation, similar to other automations.

As an example, consider a scenario where you have an automation that processes incoming data files. Once this automation completes, regardless of whether it successfully processes all files or encounters errors, a dependent automation can be triggered to notify the data team and log the results for further analysis. Additionally, you can specify object set conditions to ensure that the notification is only sent if certain criteria are met, such as the presence of critical errors.

## Set up an automation dependency

<img src="./media/automation-dependencies.png" alt="Automation dependencies" width="600">

Follow the steps below to set up automation dependencies.

1. **Define parent automation:** Start by defining the parent automation that will trigger the dependent automation upon completion.
2. **Configure dependent automation:** Set up the dependent automation and specify any additional object set conditions that should be met for the automation to proceed.
3. **Link automations:** Link the dependent automation to the parent automation to ensure it triggers upon the parent’s completion.

## Considerations

The following are some considerations you should have when setting up automation dependencies:

* **Non-configurable trigger:** The dependent automation will trigger regardless of the parent automation's success or failure. This behavior is currently not configurable, so plan your automation logic accordingly.
* **Object set conditions:** Ensure that any object set conditions specified for the dependent automation are correctly defined to avoid unexpected behavior.

By leveraging automation dependencies, you can create more efficient and responsive workflows that adapt to the outcomes of preceding processes.

## Known limitations

Automation dependencies have the following limitations:

* **Single dependency only:** Automation dependencies only support a single dependency (parent → child). Multi-level chains (parent → child → grandchild) are not supported.
* **Requires Project-scoped supported object types:** The monitored object type must support Project scoping.
* **Branching not supported:** Automation dependencies cannot be used with branching workflows.
