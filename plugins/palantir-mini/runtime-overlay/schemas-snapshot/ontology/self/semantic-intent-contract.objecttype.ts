/**
 * palantir-mini SELF-ONTOLOGY — SemanticIntentContract as a registered ObjectType
 * instance (M-SELF deliverable #1 — see effort README §M-SELF + memory
 * `pm-self-ontology-milestone`).
 *
 * THE LATENCY THIS UN-LATENTS: the ObjectType primitive *type* has shipped at
 * `../primitives/object-type.ts` for many versions, but `OBJECT_TYPE_REGISTRY.register`
 * for pm's OWN control surface had **0 hits** across the whole snapshot — pm had
 * never turned the Palantir vocabulary on itself. This file is the first instance:
 * pm's understand-phase meaning contract (`SemanticIntentContract`, prim-learn-25)
 * modeled AS a typed Palantir ObjectType, registered at module load. Importing the
 * `self/` barrel registers it → `register`-grep goes 0 → 1.
 *
 * Mapping (derived-view invariant: the 9 axes are the SSoT here; the
 * DATA/LOGIC/ACTION/GOVERNANCE lens is a VIEW generated FROM them, never a peer):
 *   contractId            → primaryKey (object identity)
 *   confirmedIntent       → titleProperty (human-readable object title)
 *   the 9 understand axes  → one Property each (type "Struct" → the registered SicAxis struct)
 *
 * Authority chain (rule 01): research/palantir → primitives/semantic-intent-contract.ts
 *   (the type) → THIS file (the registered instance) → W3.5 dogfood
 *   (ONTOLOGY_DTC_BUILD_SEQUENCE ready-for-dtc + propagation_audit_forward over self).
 *
 * @owner palantirkc-ontology
 * @purpose First registered self-Ontology instance (M-SELF, harness redesign W3d-2a)
 */

import {
  type ObjectTypeDeclaration,
  OBJECT_TYPE_REGISTRY,
  objectTypeRid,
} from "../primitives/object-type";
import {
  SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION,
  type SicAxisKey,
} from "../primitives/semantic-intent-contract";
// Side-effect import: registering the SicAxis struct (STRUCT_REGISTRY) so the axis
// Properties below — typed "Struct" — resolve to a real, dereferenceable shape even
// when this ObjectType module is imported directly (not only via the self/ barrel).
import "./sic-axis.struct";

/** Stable RID for the self-Ontology SemanticIntentContract ObjectType. */
export const SEMANTIC_INTENT_CONTRACT_OBJECT_TYPE_RID = objectTypeRid(
  "pm.self.ontology/object-type/semantic-intent-contract",
);

/**
 * The 9 understand-phase axes, in `SemanticIntentAxes` declaration order.
 * `as const satisfies readonly SicAxisKey[]` checks every entry IS a real axis key
 * (so a renamed/removed/typo'd key stops compiling). On its own that does NOT catch
 * a NEWLY-added axis, so the `_AxisKeysComplete` guard below adds the missing half —
 * exhaustiveness. Together the self-model can't silently drift from the primitive's
 * axis set in either direction.
 */
const AXIS_KEYS = [
  "data",
  "logic",
  "action",
  "governance",
  "context",
  "successEval",
  "constraintsNonGoals",
  "actors",
  "memoryPrior",
] as const satisfies readonly SicAxisKey[];

// Exhaustiveness: if the primitive ADDS an axis to SicAxisKey, [SicAxisKey] no longer
// extends [AXIS_KEYS[number]] → _AxisKeysComplete becomes `never` → `true` fails to
// assign → compile error here forces AXIS_KEYS (and this self-model) to be updated.
type _AxisKeysComplete = [SicAxisKey] extends [(typeof AXIS_KEYS)[number]] ? true : never;
const _axisKeysComplete: _AxisKeysComplete = true;
void _axisKeysComplete;

/**
 * SemanticIntentContract modeled as a Palantir ObjectType.
 *
 * `apiName`/`name` mirror the primitive's exported interface name so OSDK clients
 * and the generated `objects.d.ts` reconcile to the same symbol. The axis properties
 * carry the canonical PropertyTypeName `"Struct"`, resolving to the registered
 * `SIC_AXIS_STRUCT` struct (see `./sic-axis.struct`); the core identity/lifecycle
 * fields complete the stored-fact surface.
 */
export const SEMANTIC_INTENT_CONTRACT_OBJECT_TYPE: ObjectTypeDeclaration = {
  rid: SEMANTIC_INTENT_CONTRACT_OBJECT_TYPE_RID,
  apiName: "SemanticIntentContract",
  name: "SemanticIntentContract",
  description:
    "palantir-mini understand-phase meaning contract: the user-approved semantic " +
    "boundary for ontology-affecting work, surfaced as 9 axes (DATA/LOGIC/ACTION/" +
    "GOVERNANCE + CONTEXT/SUCCESS-EVAL/CONSTRAINTS-NONGOALS/ACTORS/MEMORY-PRIOR). " +
    `Schema: ${SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION}.`,
  primaryKeyProperty: "contractId",
  titleProperty: "confirmedIntent",
  properties: [
    // --- Core identity + lifecycle (stored facts) ---
    { name: "contractId", type: "string" },
    { name: "schemaVersion", type: "string" },
    { name: "status", type: '"draft" | "approved" | "superseded"' },
    { name: "rawIntent", type: "string" },
    { name: "confirmedIntent", type: "string" },
    { name: "verdict", type: '"draft" | "filled" | "approved" | "rejected"', optional: true },
    // --- The 9 understand-phase axes (one Property each; type "Struct" → SIC_AXIS_STRUCT) ---
    ...AXIS_KEYS.map((key) => ({
      name: key,
      type: "Struct",
      optional: true,
    })),
  ],
};

// The un-latenting act: register pm's own surface as a typed primitive instance.
// This is what turns `OBJECT_TYPE_REGISTRY.register`-grep from 0 → 1.
OBJECT_TYPE_REGISTRY.register(SEMANTIC_INTENT_CONTRACT_OBJECT_TYPE);
