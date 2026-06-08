/**
 * palantir-mini SELF-ONTOLOGY — ScenarioSandbox as a registered ObjectType
 * (Wave 2, harness redesign self-model build). Mirrors the `mcp-tool.objecttype.ts`
 * idiom: ONE `ScenarioSandbox` ObjectType (the type) registered into
 * OBJECT_TYPE_REGISTRY at module load.
 *
 * pm's Hands-layer executor sandbox modeled AS ontology: the neutral exec sandbox
 * (branch-required isolation) where registered edit functions run before atomic
 * commit. The live source is `lib/sandbox/` — its executor + adapter + contract are
 * the type's provenance.
 *
 * Count provenance (catalog §2): instanceCount = 0 — a real surface whose instances
 * are RUNTIME-SEEDED per-run (one sandbox session per exec), not hard-coded into the
 * self-model. The TYPE registration is the deliverable; `SCENARIO_SANDBOX_INSTANCES`
 * is the empty seed and the paired test is a registration-resolves check (no
 * filesystem drift guard — there is no static seed source to diff against).
 *
 * @owner palantirkc-ontology
 * @purpose Wave-2 self-Ontology ObjectType (M-SELF, harness redesign)
 */

import {
  type ObjectTypeDeclaration,
  OBJECT_TYPE_REGISTRY,
  objectTypeRid,
} from "../primitives/object-type";

/** Stable RID for the self-Ontology ScenarioSandbox ObjectType. */
export const SCENARIO_SANDBOX_OBJECT_TYPE_RID = objectTypeRid(
  "pm.self.ontology/object-type/scenario-sandbox",
);

/**
 * ScenarioSandbox modeled as a Palantir ObjectType. `sandboxId` is the stable primary
 * key; the descriptor properties mirror the Hands-layer executor sandbox record
 * (execAdapter, registeredEditFunctions, isolation).
 */
export const SCENARIO_SANDBOX_OBJECT_TYPE: ObjectTypeDeclaration = {
  rid: SCENARIO_SANDBOX_OBJECT_TYPE_RID,
  apiName: "ScenarioSandbox",
  name: "ScenarioSandbox",
  description:
    "palantir-mini Hands-layer executor sandbox modeled as an ObjectType: the neutral " +
    "exec sandbox (branch-required isolation) where registered edit functions run " +
    "before atomic commit. Identity (sandboxId) plus executor facts (execAdapter, " +
    "registeredEditFunctions, isolation); instances are runtime-seeded per exec " +
    "(lib/sandbox/), not hard-coded in this self-model.",
  primaryKeyProperty: "sandboxId",
  titleProperty: "sandboxId",
  properties: [
    { name: "sandboxId", type: "string" },
    { name: "execAdapter", type: "string", optional: true },
    { name: "registeredEditFunctions", type: "readonly string[]", optional: true },
    { name: "isolation", type: "string", optional: true },
  ],
};

/**
 * A registered ScenarioSandbox instance — the executor sandbox record (sandboxId
 * identity plus the exec facts). Instances are runtime-seeded per exec session.
 */
export interface ScenarioSandboxInstance {
  readonly sandboxId: string;
  readonly execAdapter?: string;
  readonly registeredEditFunctions?: readonly string[];
  readonly isolation?: string;
}

/**
 * The ScenarioSandbox instances — EMPTY by design (catalog §2 count = 0). Sandbox
 * sessions are materialized at runtime (one per exec) by the sandbox surface, so the
 * self-model registers the TYPE and leaves the seed empty; the paired test is a
 * registration-resolves check, not a filesystem drift guard.
 */
export const SCENARIO_SANDBOX_INSTANCES: readonly ScenarioSandboxInstance[] = [];

// Register the ScenarioSandbox ObjectType (the type). The instance seed above is empty
// by design — sandbox sessions are runtime-seeded per exec; the type registration is
// the Wave-2 deliverable. This turns OBJECT_TYPE_REGISTRY.register-grep one higher.
OBJECT_TYPE_REGISTRY.register(SCENARIO_SANDBOX_OBJECT_TYPE);
