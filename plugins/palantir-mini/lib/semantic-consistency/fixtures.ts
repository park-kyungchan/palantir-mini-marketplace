import { resolveSemanticConsistency } from "./resolver";
import {
  canonicalTerm,
  registrySnapshot,
  sourceSystemRef,
  sourceSystemTerm,
  termAlias,
} from "./registry";
import type { SemanticConsistencyResolverInput } from "./types";

const crm = sourceSystemRef({ sourceSystemId: "salesforce", kind: "crm", displayName: "Salesforce", authorityRank: 70 });
const billing = sourceSystemRef({ sourceSystemId: "billing", kind: "billing", displayName: "Billing", authorityRank: 80 });
const support = sourceSystemRef({ sourceSystemId: "zendesk", kind: "support", displayName: "Support", authorityRank: 60 });
const repo = sourceSystemRef({ sourceSystemId: "repo", kind: "repo", displayName: "Repository", authorityRank: 50 });

const crmAccount = canonicalTerm({
  displayName: "CRM Account",
  definition: "Commercial account from CRM.",
  ontologyKind: "ObjectType",
  ontologyRef: "ontology://object-type/crm-account",
  approvalRef: "approval:fixture:crm-account",
});
const billingPayer = canonicalTerm({
  displayName: "Billing Payer",
  definition: "Entity responsible for invoice payment.",
  ontologyKind: "ObjectType",
  ontologyRef: "ontology://object-type/billing-payer",
  approvalRef: "approval:fixture:billing-payer",
});
const supportRequester = canonicalTerm({
  displayName: "Support Requester",
  definition: "Person or account requesting support.",
  ontologyKind: "ObjectType",
  ontologyRef: "ontology://object-type/support-requester",
  approvalRef: "approval:fixture:support-requester",
});
const hookPolicy = canonicalTerm({
  displayName: "Hook Policy",
  definition: "Repository policy that guards tool execution.",
  ontologyKind: "ActionType",
  ontologyRef: "ontology://action-type/hook-policy",
  approvalRef: "approval:fixture:hook-policy",
});

export function crmBillingSupportCustomerFixture(): SemanticConsistencyResolverInput {
  return {
    sourceTerms: [
      sourceSystemTerm({ sourceSystemRef: crm, fieldPath: "Account.Name", rawTerm: "customer", evidenceRefs: ["fixture:crm"] }),
      sourceSystemTerm({ sourceSystemRef: billing, fieldPath: "Invoice.Payer", rawTerm: "customer", evidenceRefs: ["fixture:billing"] }),
      sourceSystemTerm({ sourceSystemRef: support, fieldPath: "Ticket.Requester", rawTerm: "customer", evidenceRefs: ["fixture:support"] }),
    ],
    registry: registrySnapshot({
      sourceSystems: [crm, billing, support],
      canonicalTerms: [crmAccount, billingPayer, supportRequester],
      aliases: [
        termAlias({ canonicalTermId: crmAccount.canonicalTermId, alias: "customer", sourceSystemIds: ["salesforce"], approvalRef: "approval:fixture:crm-customer" }),
        termAlias({ canonicalTermId: billingPayer.canonicalTermId, alias: "customer", sourceSystemIds: ["billing"], approvalRef: "approval:fixture:billing-customer" }),
        termAlias({ canonicalTermId: supportRequester.canonicalTermId, alias: "customer", sourceSystemIds: ["zendesk"], approvalRef: "approval:fixture:support-customer" }),
      ],
    }),
  };
}

export function overloadedCustomerFixture(): SemanticConsistencyResolverInput {
  return {
    sourceTerms: [
      sourceSystemTerm({ sourceSystemRef: crm, fieldPath: "Account.Name", rawTerm: "customer", evidenceRefs: ["fixture:crm"] }),
    ],
    registry: registrySnapshot({
      sourceSystems: [crm, billing, support],
      canonicalTerms: [crmAccount, billingPayer, supportRequester],
      aliases: [
        termAlias({ canonicalTermId: crmAccount.canonicalTermId, alias: "customer", approvalRef: "approval:fixture:crm-customer" }),
        termAlias({ canonicalTermId: billingPayer.canonicalTermId, alias: "customer", approvalRef: "approval:fixture:billing-customer" }),
      ],
    }),
  };
}

export function repoSurfaceActionFixture(): SemanticConsistencyResolverInput {
  return {
    sourceTerms: [
      sourceSystemTerm({ sourceSystemRef: repo, fieldPath: "hooks/pre-tool-use", rawTerm: "hook policy", evidenceRefs: ["fixture:repo"] }),
    ],
    registry: registrySnapshot({
      sourceSystems: [repo],
      canonicalTerms: [hookPolicy],
    }),
  };
}

export function nonApplicableDocsOnlyFixture(): SemanticConsistencyResolverInput {
  return {
    sourceTerms: [
      sourceSystemTerm({ sourceSystemRef: repo, fieldPath: "docs/proposal.md", rawTerm: "proposal", evidenceRefs: ["fixture:docs-only"] }),
    ],
    registry: registrySnapshot({ sourceSystems: [repo], canonicalTerms: [] }),
    nonApplicableReason: "Read-only proposal analysis; no ontology-affecting promotion.",
    nonApplicableEvidenceRefs: ["fixture:non-applicable-docs-only"],
  };
}

export function fixtureOutputs() {
  return {
    customer: resolveSemanticConsistency(crmBillingSupportCustomerFixture()),
    overloaded: resolveSemanticConsistency(overloadedCustomerFixture()),
    repoSurfaceAction: resolveSemanticConsistency(repoSurfaceActionFixture()),
    docsOnly: resolveSemanticConsistency(nonApplicableDocsOnlyFixture()),
  };
}
