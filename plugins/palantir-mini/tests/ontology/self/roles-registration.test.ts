// Test: self-Ontology Role instances — pm's RBAC surface (rule 07 §Agent
// file-ownership + the read-only-vs-mutating capability split) registered AS Role
// primitive instances. Proves: the expected count is registered, no duplicate RIDs,
// every declared Role resolves from ROLE_REGISTRY, and every kind:"agent" principal
// references a real agents/<id>.md declaration (and the capability-split member RIDs
// resolve to live agents). The Role primitive's principal->permission grant is the
// GOVERNANCE/ACTORS gap closure; this test is the drift guard.

import { test, expect } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  ROLE_REGISTRY,
  roleRid,
  type RoleDeclaration,
} from "#schemas/ontology/primitives/role";
// Importing the barrel executes roles.ts → self-registration side effect.
import {
  ROLE_DECLARATIONS,
  ROLE_INSTANCES,
  READ_ONLY_AGENT_IDS,
  MUTATING_AGENT_IDS,
  type RoleInstance,
} from "#schemas/ontology/self";
import { loadPluginAgentInventory } from "../../../lib/agents/inventory";

const EXPECTED_ROLE_COUNT = 7;
const AGENTS_DIR = path.join(import.meta.dir, "../../../agents");
const PLUGIN_ROOT = path.resolve(import.meta.dir, "../../..");

/** Live agent IDs read off the agents/ directory (the real principal universe). */
const liveAgentIds = (): Set<string> =>
  new Set(
    fs
      .readdirSync(AGENTS_DIR, { withFileTypes: true })
      .filter((d) => d.isFile() && d.name.endsWith(".md"))
      .map((d) => d.name.replace(/\.md$/, "")),
  );

test(`Role seed has ${EXPECTED_ROLE_COUNT} declarations + matching instances`, () => {
  expect(ROLE_DECLARATIONS.length).toBe(EXPECTED_ROLE_COUNT);
  expect(ROLE_INSTANCES.length).toBe(EXPECTED_ROLE_COUNT);
});

test("Role RIDs are unique (no duplicates)", () => {
  const rids = ROLE_DECLARATIONS.map((d: RoleDeclaration) => d.rid as string);
  expect(new Set(rids).size).toBe(EXPECTED_ROLE_COUNT);
  const names = ROLE_DECLARATIONS.map((d: RoleDeclaration) => d.name);
  expect(new Set(names).size).toBe(EXPECTED_ROLE_COUNT); // names also unique
});

test("every declared Role resolves from ROLE_REGISTRY by its RID", () => {
  for (const decl of ROLE_DECLARATIONS as readonly RoleDeclaration[]) {
    const got = ROLE_REGISTRY.get(roleRid(decl.rid as string));
    expect(got).toBeDefined();
    expect(got).toBe(decl);
  }
  // The registry holds at least the seeded Roles (other modules may add more).
  const registeredRids = new Set(
    ROLE_REGISTRY.list().map((d: RoleDeclaration) => d.rid as string),
  );
  for (const decl of ROLE_DECLARATIONS as readonly RoleDeclaration[]) {
    expect(registeredRids.has(decl.rid as string)).toBe(true);
  }
});

test("every ROLE_INSTANCE mirrors its declaration's grant facts", () => {
  for (const decl of ROLE_DECLARATIONS as readonly RoleDeclaration[]) {
    const inst = ROLE_INSTANCES.find((i: RoleInstance) => i.rid === (decl.rid as string));
    expect(inst).toBeDefined();
    expect(inst!.name).toBe(decl.name);
    expect(inst!.principalKind).toBe(decl.principal.kind);
    expect(inst!.principalId).toBe(decl.principal.id);
    expect(inst!.grantedResourceRids).toEqual(decl.grantedResourceRids);
    expect(inst!.permissions).toEqual(decl.permissions);
    // Every Role grants at least one resource and one permission verb.
    expect(decl.grantedResourceRids.length).toBeGreaterThan(0);
    expect(decl.permissions.length).toBeGreaterThan(0);
  }
});

test("every kind:'agent' principal references a real agents/<id>.md declaration", () => {
  const live = liveAgentIds();
  const agentPrincipals = (ROLE_DECLARATIONS as readonly RoleDeclaration[]).filter(
    (d: RoleDeclaration) => d.principal.kind === "agent",
  );
  // The 3 real-agent ownership roles: hook-builder / plugin-maintainer / protocol-designer.
  expect(agentPrincipals.length).toBe(3);
  for (const decl of agentPrincipals) {
    expect(live.has(decl.principal.id)).toBe(true);
  }
});

test("capability-token principals are grant-LABELS, not live agent identities", () => {
  const live = liveAgentIds();
  // task-owner / shared / capability-read-only / capability-mutating are NOT agents.
  const labels = ["task-owner", "shared", "capability-read-only", "capability-mutating"];
  for (const label of labels) {
    expect(live.has(label)).toBe(false);
    const decl = (ROLE_DECLARATIONS as readonly RoleDeclaration[]).find(
      (d: RoleDeclaration) => d.principal.id === label,
    );
    expect(decl).toBeDefined();
    expect(decl!.principal.kind).toBe("capability-token");
  }
});

test("capability-split member RIDs reference real live agents + partition the 10-agent surface", () => {
  const live = liveAgentIds();
  // 2 read-only + 8 mutating = the full 10-agent surface, disjoint.
  expect(READ_ONLY_AGENT_IDS.length).toBe(2);
  expect(MUTATING_AGENT_IDS.length).toBe(8);
  const all = [...READ_ONLY_AGENT_IDS, ...MUTATING_AGENT_IDS];
  expect(new Set(all).size).toBe(10); // disjoint, no overlap
  expect(new Set(all)).toEqual(live); // exactly the live agent surface
  for (const id of all) {
    expect(live.has(id)).toBe(true);
  }
});

// Cross-lens drift guard (FIX F5): the SEED partition (MUTATING_/READ_ONLY_AGENT_IDS)
// and the RUNTIME inventory lens (classifyMutationCapability) must AGREE on every
// agent's capability. They previously disagreed for second-brain-fold — its body says
// "Never edit engine files" (a scoping caveat) and its tools carry no Write/Edit, so
// the readonly-negation heuristic falsely classified it read-only, while the seed lists
// it MUTATING (it writes graph.json via the engine + emits governed events). The fix
// only honors a readonly-negation phrase when the agent ALSO declares write-forbidding
// disallowedTools (genuine read-only agents do; second-brain-fold does not).
test("classifyMutationCapability AGREES with the seed capability partition for all agents (FIX F5)", () => {
  const inv = loadPluginAgentInventory(PLUGIN_ROOT);
  expect(inv.length).toBe(10);
  const mutating = new Set(MUTATING_AGENT_IDS);
  const readOnly = new Set(READ_ONLY_AGENT_IDS);
  for (const entry of inv) {
    const seedSaysMutating = mutating.has(entry.name);
    expect(readOnly.has(entry.name) || seedSaysMutating).toBe(true); // listed in exactly one
    expect(entry.mutationCapability.capable).toBe(seedSaysMutating);
  }
  // Explicit pin on the agent that motivated the fix.
  const sbf = inv.find((e) => e.name === "second-brain-fold");
  expect(sbf?.mutationCapability.capable).toBe(true);
});
