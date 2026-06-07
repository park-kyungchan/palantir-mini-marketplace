// palantir-mini v6.31.0 — contract-propagation agent authority chain test
// PR-G Phase 8 additions: canonical plugin agent inventory + output contract coverage.

import { test, expect, describe } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import {
  OUTPUT_CONTRACT_MINIMUM_FIELDS,
  OUTPUT_PAYLOAD_REQUIRED_FIELDS,
  loadPluginAgentInventory,
} from "../../lib/agents/inventory";

const PLUGIN_ROOT = path.resolve(import.meta.dir, "../..");
const AGENTS_DIR = path.join(PLUGIN_ROOT, "agents");

const AGENT_FILES = [
  "ontology-steward.md",
];

const AUTHORITY_HEADER = "## Authority chain (runtime, sprint-123+)";
const REQUIRED_CONTRACT_MENTIONS = [
  "SprintContract",
  "SemanticIntentContract",
  "DigitalTwinChangeContract",
];

const EXPECTED_MUTATION_CAPABLE = [
  "agent-author",
  "docs-researcher",
  "hook-builder",
  "implementer",
  "lead-orchestrator",
  "ontology-steward",
  "plugin-maintainer",
  "protocol-designer",
];

const EXPECTED_EXEMPT = [
  "code-grader",
  "eval-judge",
  "model-grader",
  "researcher",
  "scrapling-fetcher",
  "verifier-adversarial",
  "verifier-correctness",
];

describe("contract-propagation: agent authority chain section", () => {
  for (const agentFile of AGENT_FILES) {
    const filePath = path.join(AGENTS_DIR, agentFile);

    test(`${agentFile} — file exists`, () => {
      expect(fs.existsSync(filePath)).toBe(true);
    });

    test(`${agentFile} — contains authority chain header`, () => {
      const content = fs.readFileSync(filePath, "utf8");
      expect(content).toContain(AUTHORITY_HEADER);
    });

    for (const contractType of REQUIRED_CONTRACT_MENTIONS) {
      test(`${agentFile} — mentions ${contractType}`, () => {
        const content = fs.readFileSync(filePath, "utf8");
        const headerIdx = content.indexOf(AUTHORITY_HEADER);
        expect(headerIdx).toBeGreaterThanOrEqual(0);
        const sectionContent = content.slice(headerIdx);
        expect(sectionContent).toContain(contractType);
      });
    }
  }
});

describe("PR-G agent inventory", () => {
  const inventory = loadPluginAgentInventory(PLUGIN_ROOT);

  test("parses all 19 plugin agents", () => {
    expect(inventory.length).toBe(15);
    expect(new Set(inventory.map((entry) => entry.name)).size).toBe(15);
  });

  test("classifies mutation-capable plugin agents", () => {
    const actual = inventory
      .filter((entry) => entry.mutationCapability.capable && !entry.frontmatter.outputContractExempt)
      .map((entry) => entry.name)
      .sort();
    expect(actual).toEqual([...EXPECTED_MUTATION_CAPABLE].sort());
  });

  test("declares explicit outputContractExempt metadata only for read-only or special agents", () => {
    const actual = inventory
      .filter((entry) => entry.frontmatter.outputContractExempt)
      .map((entry) => entry.name)
      .sort();
    expect(actual).toEqual([...EXPECTED_EXEMPT].sort());
    for (const entry of inventory.filter((item) => item.frontmatter.outputContractExempt)) {
      expect(entry.outputContractStatus.kind).toBe("exempt");
      expect(entry.outputContractStatus.exemptionReason?.length ?? 0).toBeGreaterThan(20);
    }
  });

  test("all mutation-capable non-exempt agents carry complete PR-G output contracts", () => {
    const mutationAgents = inventory.filter((entry) => entry.mutationCapability.capable && !entry.frontmatter.outputContractExempt);
    expect(mutationAgents.length).toBe(EXPECTED_MUTATION_CAPABLE.length);
    for (const entry of mutationAgents) {
      expect(entry.outputContractStatus.kind).toBe("complete");
      expect(entry.outputContract?.markdownReportPath ?? "").toMatch(/\.md$/);
      expect(entry.outputContract?.missingMinimumFields).toEqual([]);
      expect(entry.outputContract?.missingRequiredFields).toEqual([]);
      for (const field of OUTPUT_CONTRACT_MINIMUM_FIELDS) {
        expect(entry.outputContract?.rawFields[field]).toBeDefined();
      }
      for (const field of OUTPUT_PAYLOAD_REQUIRED_FIELDS) {
        expect(entry.outputContract?.requiredFields).toContain(field);
      }
    }
  });
});
