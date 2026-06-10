/**
 * palantir-mini SELF-ONTOLOGY — DigitalTwinChangeContract as a registered ObjectType
 * (Wave 2, harness redesign self-model build). Mirrors the
 * `semantic-intent-contract.objecttype.ts` idiom: ONE `DigitalTwinChangeContract`
 * ObjectType (the type) modeling the approved mutation boundary derived from an approved
 * SemanticIntentContract.
 *
 * pm's front-door mutation-authorization surface modeled AS ontology: a
 * DigitalTwinChangeContract (DTC) is the approved mutation boundary derived SOLELY from an
 * approved SemanticIntentContract (SIC) plus FDE/context evidence — the gate
 * `pm_intent_router` enforces before dispatching any ontology-affecting execution. This
 * file declares the type; the snapshot OWNS the seed (no lib/lead-intent import).
 *
 * Count provenance: DTC instances are RUNTIME-SEEDED per front-door run (one DTC is
 * derived+approved each time an approved SIC authorizes a mutation boundary) — they are
 * not a fixed filesystem surface, so the seed is EMPTY at build time. The TYPE
 * registration is the deliverable: the noun exists in the self-model so the SIC→DTC
 * derivation LinkType (Wave 2 graph) and the RuntimeDecision→DTC gate edge have a typed
 * endpoint. The paired registration test asserts the type resolves from the registry (no
 * filesystem drift guard — there is no static source to drift against).
 *
 * PROJECTION (not a peer definition): this ObjectType is a registry-only PROJECTION of
 * the unified runtime/primitive DTC core defined at `../primitives/digital-twin-change-contract.ts`
 * — the primitive interface is the SSoT; this file only models that core AS a registered
 * Palantir ObjectType. The `dtcId`/`sicRef` ObjectType-property idiom (vs. the primitive's
 * own field names) is INTENTIONAL — it is the self-model's identity/reference convention,
 * not drift; do NOT rename it to chase the primitive's field shape.
 *
 * @owner palantirkc-ontology
 * @purpose Wave-2 self-Ontology ObjectType (M-SELF, harness redesign)
 */

import {
  type ObjectTypeDeclaration,
  OBJECT_TYPE_REGISTRY,
  objectTypeRid,
} from "../primitives/object-type";

/** Stable RID for the self-Ontology DigitalTwinChangeContract ObjectType. */
export const DIGITAL_TWIN_CHANGE_CONTRACT_OBJECT_TYPE_RID = objectTypeRid(
  "pm.self.ontology/object-type/digital-twin-change-contract",
);

/**
 * DigitalTwinChangeContract modeled as a Palantir ObjectType. `dtcId` is the stable
 * primary key; the descriptor properties (`sicRef`, `mutationBoundary`, `status`,
 * `evidenceRefs`) mirror a derived DTC but are carried on instances, of which there are
 * currently none (runtime-seeded). The PascalCase apiName mirrors the generated symbol.
 */
export const DIGITAL_TWIN_CHANGE_CONTRACT_OBJECT_TYPE: ObjectTypeDeclaration = {
  rid: DIGITAL_TWIN_CHANGE_CONTRACT_OBJECT_TYPE_RID,
  apiName: "DigitalTwinChangeContract",
  name: "DigitalTwinChangeContract",
  description:
    "palantir-mini approved mutation boundary modeled as an ObjectType: derived solely " +
    "from an approved SemanticIntentContract plus FDE/context evidence and enforced by " +
    "the intent-router before ontology-affecting dispatch. dtcId identity plus sicRef, " +
    "mutationBoundary, status, and evidenceRefs; instances are runtime-seeded per " +
    "front-door run, so the build-time seed is empty — the type registration is the " +
    "deliverable.",
  primaryKeyProperty: "dtcId",
  titleProperty: "dtcId",
  properties: [
    { name: "dtcId", type: "string" },
    { name: "sicRef", type: "string", optional: true },
    { name: "mutationBoundary", type: "string", optional: true },
    { name: "status", type: '"draft" | "approved" | "superseded"', optional: true },
    { name: "evidenceRefs", type: "readonly string[]", optional: true },
  ],
};

/**
 * A registered DigitalTwinChangeContract instance — stable dtc identity plus the derived
 * mutation-boundary facts read off an approved derivation.
 */
export interface DigitalTwinChangeContractInstance {
  readonly dtcId: string;
  readonly sicRef?: string;
  readonly mutationBoundary?: string;
  readonly status?: "draft" | "approved" | "superseded";
  readonly evidenceRefs?: readonly string[];
}

/**
 * The DigitalTwinChangeContract instances — EMPTY at build time (runtime-seeded per
 * front-door run; one DTC derived+approved each time an approved SIC authorizes a
 * mutation boundary). The type registration is the deliverable; instances populate at
 * runtime.
 */
export const DIGITAL_TWIN_CHANGE_CONTRACT_INSTANCES: readonly DigitalTwinChangeContractInstance[] = [];

// Register the DigitalTwinChangeContract ObjectType (the type). Instances are
// runtime-seeded (none at build time); the registration test asserts the type resolves
// from the registry.
OBJECT_TYPE_REGISTRY.register(DIGITAL_TWIN_CHANGE_CONTRACT_OBJECT_TYPE);
