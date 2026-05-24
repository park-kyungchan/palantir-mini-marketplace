#!/usr/bin/env bun
/// <reference types="bun-types" />
/**
 * CLI Validator — validates API names against ontology structural rules.
 *
 * Usage:
 *   bun run validate-file.ts <domain> <name> <target>
 *   bun run validate-file.ts data MyEntity "Entity (ObjectType) API name"
 *   bun run validate-file.ts logic getArticles "Query API name"
 *   bun run validate-file.ts --list-targets
 *
 * Exit codes:
 *   0 — valid
 *   1 — validation errors found
 *   2 — usage error
 */

import {
  validateOntologyFile,
  getAllTargets,
  findDomainForTarget,
  type DomainId,
  DOMAIN_RULE_MAP,
} from "./validate-rules";

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
  console.log("Usage: bun run validate-file.ts <domain> <name> <target>");
  console.log("       bun run validate-file.ts --list-targets");
  console.log("       bun run validate-file.ts --list-domains");
  console.log("");
  console.log("Domains: data, logic, action, security");
  process.exit(2);
}

if (args[0] === "--list-targets") {
  const targets = getAllTargets();
  console.log(`${targets.length} registered targets:\n`);
  for (const t of targets) {
    const domain = findDomainForTarget(t);
    console.log(`  [${domain}] ${t}`);
  }
  process.exit(0);
}

if (args[0] === "--list-domains") {
  for (const [domain, rules] of Object.entries(DOMAIN_RULE_MAP)) {
    console.log(`${domain}: ${rules.length} structural rules`);
  }
  process.exit(0);
}

if (args.length < 3) {
  console.error("Error: expected <domain> <name> <target>");
  console.error("Run with --help for usage.");
  process.exit(2);
}

const [domainArg, name, target] = args;
const validDomains = ["data", "logic", "action", "security"];

if (!validDomains.includes(domainArg)) {
  console.error(`Error: unknown domain "${domainArg}". Valid: ${validDomains.join(", ")}`);
  process.exit(2);
}

const domain = domainArg as DomainId;
const result = validateOntologyFile([{ name, target }], domain);

if (result.valid) {
  console.log(`PASS: "${name}" is valid for [${domain}] "${target}"`);
  process.exit(0);
} else {
  console.log(`FAIL: "${name}" has ${result.errorCount} error(s) for [${domain}] "${target}":`);
  for (const n of result.names) {
    for (const err of n.result.errors) {
      console.log(`  - ${err}`);
    }
  }
  process.exit(1);
}
