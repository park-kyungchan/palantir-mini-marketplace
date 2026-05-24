---
sourceUrl: "https://www.palantir.com/docs/foundry/vs-code/local-vs-workspace-guide/"
canonicalUrl: "https://palantir.com/docs/foundry/vs-code/local-vs-workspace-guide/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "1eb683162b7aedbf22ff7f908fda3056b642acdc0809600dd0960032ec533cf8"
product: "foundry"
docsArea: "vs-code"
locale: "en"
upstreamTitle: "Documentation | VS Code workspaces > Choose between local development and VS Code workspaces"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Choose between local development and VS Code workspaces

When working with VS Code in Foundry, you can choose between two developer environment options: use VS Code workspaces deployed on Palantir infrastructure, or install the Palantir extension in your local VS Code application. This guide helps you understand the differences and choose the right option for your needs.

## Quick comparison

|  | VS Code workspaces | Palantir extension for local development |
|---|---|---|
| **Setup** | No installation required; select **Open in VS Code** | Download and install the extension locally |
| **Environment** | Deployed on Palantir infrastructure | Runs on your local machine |
| **Data handling** | Data stays on platform (except for displayed preview results) | Streams data to local memory during preview |
| **Access requirements** | Code Workspaces enabled | Administrator approval plus download permissions |
| **Third-party extensions** | Not supported | Supported (if allowed by your organization) |

## Option: VS Code workspaces

**Best for the following:**

* **Getting started quickly:** No installation or configuration needed; open your repository and start coding.
* **Sensitive data workflows:** Data remains on Palantir infrastructure during development, with strict security controls.
* **Teams requiring consistent environments:** Everyone works in the same standardized environment.
* **Users without download permissions:** Preview transforms without needing download operations on datasets.

## Option: Palantir extension for local development

**Best for the following:**

* **Developers who prefer local workflows:** Work with your existing local setup and familiar tools.
* **Using third-party tools and extensions:** Access the full VS Code extension marketplace (if allowed by your organization).
* **Custom development environments:** Full control over your IDE configuration and installed tools.

**Requirements:**

* Platform administrator must enable local preview in [Control Panel](/docs/foundry/code-repositories/configure-repositories-in-control-panel/).
* You must have download permissions (`s3-proxy:datasets-read` and `api:datasets-read`) on all input datasets.
  * These are privileged operations that allow downloading entire datasets locally.

## Data security

### VS Code workspaces

**Data handling:** Data remains on Palantir infrastructure during development. Only preview results (up to 1000 rows) are displayed in the results table. No input datasets are streamed to your machine.

**Security controls:** Strict access controls and audit logging are maintained. No risk of accidental data leakage to local machines.

### Palantir extension for local development

Review our documentation on [security considerations for local development](/docs/foundry/palantir-extension-for-visual-studio-code/security-considerations/).

If you are unsure which option is best for you, we recommend starting with VS Code workspaces. This option requires no setup and maintains the strictest security controls. You can always switch to local development later if you need additional flexibility.

## Getting started

### VS Code workspaces

1. Open a [supported repository](/docs/foundry/vs-code/overview/#supported-workflows) in VS Code.
2. From code repositories, you can select **Open in VS Code** in the upper right corner (shown for supported repositories).
3. At the time of creating a new repository, selecting VS Code will automatically bring you into a VS Code workspace.
4. Your environment is ready, and you can start coding.

### Palantir extension for local development

1. Verify with your administrator that local preview is enabled.
2. Ensure you have the necessary download permissions on your datasets.
3. [Download and install the Palantir extension](/docs/foundry/palantir-extension-for-visual-studio-code/overview/#locally).
4. Clone your repository and start developing.

For detailed local preview setup instructions (including Java transforms), review our documentation on [previewing transforms in local development](/docs/foundry/transforms-common/local-preview/).

For more information, review additional documentation:

* [VS Code workspaces overview](/docs/foundry/vs-code/overview/)
* [Palantir extension for Visual Studio Code](/docs/foundry/palantir-extension-for-visual-studio-code/overview/)
* [Security considerations for local development](/docs/foundry/palantir-extension-for-visual-studio-code/security-considerations/)
