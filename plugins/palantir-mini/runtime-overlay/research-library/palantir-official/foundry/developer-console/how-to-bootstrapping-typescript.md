---
sourceUrl: "https://www.palantir.com/docs/foundry/developer-console/how-to-bootstrapping-typescript/"
canonicalUrl: "https://palantir.com/docs/foundry/developer-console/how-to-bootstrapping-typescript/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "f1b0d38982f860acc6a1e22ec0925591008ed291b1532f3c941ac83d82e3f356"
product: "foundry"
docsArea: "developer-console"
locale: "en"
upstreamTitle: "Documentation | How-to guides > Bootstrap a TypeScript application"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Bootstrap a new OSDK TypeScript application

This page will walk you through the process of creating your frontend application on top of popular JavaScript frameworks using the `@osdk/create-app` CLI tool.

If you want to add OSDK support for an existing application, view our documentation on [adding an OSDK to an existing application](/docs/foundry/developer-console/how-to-add-to-existing-typescript/).

## 1: Prerequisites

### Create a Developer Console application

Follow the steps listed in the [create a new Developer Console application](/docs/foundry/developer-console/create-application/) page.

### Set up your token

Export your token in your local environment. Below is an example using a sample personal access token, but you can generate a longer-lived one in the Developer Console. This token should not be checked into source control because it is your personal access token.

```bash
export FOUNDRY_TOKEN=<YOUR-TOKEN-FROM-GETTING-STARTED-PAGE>
```

### Check Node version

The Typescript SDK requires Node 18 or higher to work. To check what version of Node you are using, enter the command below:

```bash
node --version
```

## 2. Quick start with `@osdk/create-app`

### Create your frontend application

Run the provided command and follow the interactive prompts to customize your project, including the project name and framework choice. On the **Getting Started** page, you will find application-specific information that will be prefilled in a command for you. Below is an example of this code, with placeholders inside the `< >` where your specific details will be filled:

```bash
npm create @osdk/app@latest -- \
    --application <RID OF YOUR DEVELOPER CONSOLE APPLICATION> \
    --foundryUrl <YOUR FOUNDRY URL> \
    --applicationUrl <SUBDOMAIN OF YOUR FOUNDRY URL USED FOR HOSTING> \
    --clientId <YOUR CLIENT ID> \
    --osdkPackage <YOUR PACKAGE NAME> \
    --osdkRegistryUrl <YOUR PACKAGE HOSTING URL> \
    --corsProxy false
```

:::callout{theme="neutral"}
A prefilled command with all of these parameters can be found on the **Getting Started** page in the **API Documentation** section of the Developer Console, or on the **Overview** page.
:::

### Develop your frontend application

Your project files have now been generated in a directory based on the project name you entered. A local development server can be started by running the commands below:

```bash
cd <project-directory>
npm install
npm run dev
```
