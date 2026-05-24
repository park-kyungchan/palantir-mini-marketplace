---
sourceUrl: "https://www.palantir.com/docs/foundry/consumer-mode/oauth-application-setup/"
canonicalUrl: "https://palantir.com/docs/foundry/consumer-mode/oauth-application-setup/"
sourceLastmod: "2026-05-12T17:06:26.158Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "dc2ea68e27f457eab4c6b4f0d2400a72cae219fb4887b928774ca26fce988048"
product: "foundry"
docsArea: "consumer-mode"
locale: "en"
upstreamTitle: "Documentation | Solution setup guides > Foundry-hosted OAuth applications"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Foundry-hosted OAuth applications

OAuth applications are pro-code OSDK applications hosted within Foundry that support interactive user authentication using the authorization grant flow. These applications leverage Foundry security primitives for interactive custom applications.

Foundry-hosted OAuth applications are ideal for the following use cases:

* **Interactive web applications** that require user authentication.
* **Multi-user applications** where different users require different permissions.
* **Pro-code custom applications** built with the OSDK and hosted on Foundry.

## Architecture

```
User → Foundry Subdomain → OAuth Flow → OSDK App → Foundry APIs
```

Foundry-hosted applications are deployed at dedicated subdomains (for example, `https://subdomain-for-app.your-foundry-domain.com/`) and follow the login flow with OAuth redirect where consent is configurable.

## Prerequisites

Before setting up a Foundry-hosted OAuth application, ensure the following:

* The Foundry platform is configured to use [**consumer mode**](/docs/foundry/consumer-mode/foundry-consumer-setup/).
* You have the [**correct permissions**](/docs/foundry/developer-console/permissions/) to create and host a Developer Console application.
* You have or have access to **frontend development experience** to build applications.

## Setup

### Step 1: Create an OSDK application

Follow [our documentation](/docs/foundry/developer-console/create-application/) to create a new OSDK application.

1. **Create the application:** Use Developer Console to create a new frontend application.
2. **Configure OAuth settings:** Use the public client for user authentication.
3. **Define application restrictions:** Configure the required restrictions for accessing Foundry resources.

### Step 2: Develop your OSDK application

Build your frontend application using the OSDK framework. You can review a TypeScript example in our [OSDK documentation](/docs/foundry/developer-console/how-to-bootstrapping-typescript/).

### Step 3: Deploy the application to Foundry

Deploy your OSDK application [to be hosted on Foundry](/docs/foundry/developer-console/deploy-custom-application-on-foundry/#host-an-osdk-application-on-foundry), and remember your subdomain.

### Step 4: Verify consumer access

1. **Configure application permissions:** Grant your consumer rule-based group access to the deployed OSDK application.
2. **Check consumer access in Developer Console:** If a user is missing any permissions, add them to the necessary projects within the consumer space to grant them access.
3. **Test user flow:** Verify that consumer users can access the application with appropriate permissions.

## Troubleshooting

* **Permission issue:** Confirm in the **Check Access** panel that users can access all resources in the application.
* **Scope errors:** Validate that the OAuth client has the correct scopes in Developer Console.

### User experience issues

* **Multiple login prompts:** Review our [getting started documentation for consumer mode](/docs/foundry/consumer-mode/foundry-consumer-setup/) to understand how to hide the login page with a default identify provider.

You now have a working Foundry-hosted application for secure external consumer use. Your OSDK application provides authenticated users with secure access to Foundry data and functionality while maintaining appropriate permission boundaries and user isolation.
