---
sourceUrl: "https://www.palantir.com/docs/foundry/administration/configure-workshop/"
canonicalUrl: "https://palantir.com/docs/foundry/administration/configure-workshop/"
sourceLastmod: "2026-05-12T17:06:26.158Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "98ca7f1a2324259151310fc6d4f92b95f23e075322984bdc77c19cd1498a3cc0"
product: "foundry"
docsArea: "administration"
locale: "en"
upstreamTitle: "Documentation | Organization settings > Configure Workshop"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Configure Workshop settings

## Kiosk mode

[Kiosk mode](/docs/foundry/workshop/kiosk-mode/) settings are configured and managed on the Organization level. Administrators with the **Data Governance Officer** role have the ability within Control Panel to set which modules may enable kiosk mode as well as which group of users may launch kiosk mode sessions.

For Workshop modules in Projects shared across multiple Organizations, kiosk mode can be enabled for the module in one Organization but not another. The user launching a kiosk mode session for that module will have the Control Panel settings of their primary Organization checked when verifying their access.

To access and configure kiosk mode settings, navigate to the **All settings** tab of the relevant Organization and select **Workshop** from the **Application Configuration** section. Within the **Kiosk mode** tab, you can view the following sections:

* **Allowlist:** Add or remove Workshop modules from the allowlist to set which modules may or may not enable kiosk mode.
* **Permission group:** Search for, add, or remove user groups to set which users will have permission to launch kiosk mode sessions for modules with kiosk mode enabled.
* **Session Launch History:** Provides a view of all historical and active kiosk mode sessions.

<img src="./media/kiosk-mode-allow-list.png" alt="Kiosk mode module allowlist and permission group allowlist." width="550">

<img src="./media/kiosk-mode-session-launch-history.png" alt="Kiosk mode module allowlist and permission group allowlist." width="600">
