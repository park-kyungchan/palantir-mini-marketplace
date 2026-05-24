---
sourceUrl: "https://www.palantir.com/docs/foundry/aip/aip-security/"
canonicalUrl: "https://palantir.com/docs/foundry/aip/aip-security/"
sourceLastmod: "2026-05-12T17:06:26.146Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "2ebf178409e98388b25bc225b48b29ce7fcdb73863a342c3d239f08744fd08b3"
product: "foundry"
docsArea: "aip"
locale: "en"
upstreamTitle: "Documentation | AI Platform (AIP) > AIP security and privacy"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# AIP security and privacy

Palantir is committed to protecting the privacy and security of customer data. The protection and responsible processing of customer information are integral to our operations and built as first principles into our products, including AIP.

While generative AI models, including LLMs, present an opportunity to improve and accelerate business processes and decision-making, these technologies can raise issues around privacy and security, bias and discrimination, and the role of human judgment. Palantir takes these concerns seriously; this page contains a selection of frequently asked questions about AIP security and privacy. For more information, see [FAQs: Security and Privacy of Palantir's AIP leveraging third-party-hosted LLMs ↗](https://palantir.safebase.us/?itemName=data_privacy\&source=click) in the [Palantir trust portal ↗](https://palantir.safebase.us/).

## Is AIP protected by the same security measures as data in Foundry?

**Yes.** AIP incorporates all of Palantir's advanced [security](/docs/foundry/security/overview/) measures for the protection of sensitive data in compliance with industry regulations. AIP provides robust access controls, encryption, and auditing capabilities to maintain data integrity and transparency. Moreover, built-in governance tools help organizations maintain accountability and historical lineage in AI operations.

## Where are AIP third-party-hosted models provided from?

When integrating with third-party-hosted models, AIP is designed to take advantage of regional endpoints wherever available and possible. Doing so helps minimize latency and is currently provided in regions like the US, UK and EU for some models. The specific geographic region is subject to the technical restrictions and stipulations that exist across the third-party-hosted AI model services available via AIP, which may change over time. [Learn more about AIP geographic restrictions.](/docs/foundry/aip/supported-llms/#llm-availability-by-geography)

## Does the service result in storage of any customer data by third-party-hosted model service providers?

**No.** When Palantir AIP leverages third-party-hosted model services, no customer data contained in prompts or completions is retained by the applicable third party.

Prior to making new models available in AIP, Palantir secures technical and contractual guarantees from third-party-hosted model service providers, ensuring consistent application of this policy.

## Is customer data being used to retrain models?

**No.** When AIP accesses third-party-hosted model services, no customer data is used to retrain such models. Palantir secures strict technical and contractual guarantees from third-party-hosted model service providers to ensure that no customer data submitted in prompts or contained in completions is used for model training.

Completely separate from third-party-hosted model services: if customers do desire retraining of their own private AI model deployments, AIP can be used to facilitate such private, governed retraining, with full-spectrum governance tools for teams to audit, interrogate, and monitor model performance.

## Do third-party-hosted model service providers have access to the data in AIP’s prompts?

**No.** No personnel of a third-party-hosted model service provider has access to prompts or completions, given the strict technical guarantees that Palantir ensures when establishing access for any given third-party-hosted model service. Third-party-hosted model service providers also do not store or retain customer prompts or completions. All data transmitted to the underlying services are immediately discarded after prompt completion.

Consult the relevant documentation for [Azure ↗](https://learn.microsoft.com/en-us/legal/cognitive-services/openai/data-privacy?tabs=azure-portal), [AWS ↗](https://aws.amazon.com/compliance/data-privacy/), and [Google Cloud ↗](https://cloud.google.com/privacy) for more information on associated privacy considerations with each provider.

## How secure is AIP's leveraging of third-party-hosted model services?

Palantir AIP services are built atop secure infrastructure from cloud providers (inclusive of AWS, Azure, Google Cloud). Providers of third-party-hosted model services that have been made available through AIP, unless stated explicitly otherwise in your agreement with Palantir for AIP, have received ISO 27017, SOC (1, 2, 3), CSA STAR and/or other certifications. To learn more about Palantir’s security posture, visit Palantir’s [trust portal ↗](https://palantir.safebase.us/).

## What contractual commitments has Palantir made around the processing of customer data through AI models and beyond?

Palantir signs data protection and substantially similar agreements (e.g., business associate agreements) before starting to process any personal data on customers’ behalf. These contractual commitments generally apply to all services provided by Palantir, including AIP.

## How does Palantir enable responsible use of AI?

Palantir's Privacy and Civil Liberties Team has provided extensive [guidance on developing, building, and deploying AI enabling technologies ↗](https://www.palantir.com/pcl/palantir-ai-ethics/). Palantir is committed to the following principles of AI ethics:

1. Focus on the fully integrated system, not just its component tools.
2. Acknowledge technology limits.
3. Don’t solve problems that shouldn’t be solved.
4. Adhere to methodological best practices for sound data science.
5. Keep AI responsible, accountable, and oriented towards humans.
6. Promote multi-stakeholder engagement.
7. Ensure technical, governance, and cultural awareness in data and technology applications.

Palantir's principles of security, privacy, and responsible use are the foundation of our product development and deployment.
