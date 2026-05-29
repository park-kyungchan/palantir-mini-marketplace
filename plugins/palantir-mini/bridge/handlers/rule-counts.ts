import { RULE_REGISTRY_ENTRIES } from "#schemas/src/generated/rule-registry";
import {
  isRuleRetired,
  isRuleScopeMigrated,
} from "#schemas/ontology/primitives/rule";

export interface RuleRegistryCounts {
  registeredTotal: number;
  activeGlobalCount: number;
}

export function ruleRegistryCounts(): RuleRegistryCounts {
  return {
    registeredTotal: RULE_REGISTRY_ENTRIES.length,
    activeGlobalCount: RULE_REGISTRY_ENTRIES.filter(
      (rule) =>
        rule.scope === "global" &&
        rule.ruleId >= 1 &&
        !isRuleRetired(rule) &&
        !isRuleScopeMigrated(rule),
    ).length,
  };
}
