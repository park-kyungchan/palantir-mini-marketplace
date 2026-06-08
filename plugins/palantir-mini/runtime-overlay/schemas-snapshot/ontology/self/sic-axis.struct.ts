/**
 * palantir-mini SELF-ONTOLOGY — SicAxis as a registered Struct instance.
 *
 * One understand-phase axis (DATA/LOGIC/ACTION/… ) modeled as a Palantir Struct
 * (named record type, no RID identity of its own — embedded as the type of each
 * axis Property on the SemanticIntentContract ObjectType). This makes the axis
 * shape RESOLVABLE in STRUCT_REGISTRY so the W3.5 dogfood (propagation_audit_forward
 * over the self-model) can dereference what `type: "Struct"` axis properties point to,
 * rather than a free-floating type string.
 *
 * Faithful to the primitive `SicAxis` interface
 * (../primitives/semantic-intent-contract.ts): { summary, refs, status }.
 *
 * @owner palantirkc-ontology
 * @purpose Self-Ontology Struct for the 9 understand-phase axes (M-SELF, W3d-2a)
 */

import {
  type StructDeclaration,
  STRUCT_REGISTRY,
  structRid,
} from "../primitives/struct";
import type { SicAxis, SicAxisStatus } from "../primitives/semantic-intent-contract";

/** Stable RID for the self-Ontology SicAxis Struct. */
export const SIC_AXIS_STRUCT_RID = structRid("pm.self.ontology/struct/sic-axis");

/**
 * Compile-time fidelity guard: SicAxisStatus must remain exactly these 3 members.
 * If the primitive's status union changes, this stops compiling — keeping the
 * Struct's `status` field literal in lockstep with the type it models.
 */
const SIC_AXIS_STATUS_TS_LITERAL = '"open" | "filled" | "not-applicable"';
type _StatusInSync = [SicAxisStatus] extends ["open" | "filled" | "not-applicable"]
  ? (["open" | "filled" | "not-applicable"] extends [SicAxisStatus] ? true : never)
  : never;
const _statusInSync: _StatusInSync = true;
void _statusInSync;

export const SIC_AXIS_STRUCT: StructDeclaration = {
  rid: SIC_AXIS_STRUCT_RID,
  name: "SicAxis",
  description:
    "One surfaced axis of user intent: a plain-language summary, the typed refs/" +
    "evidence captured for it, and its fill status (open/filled/not-applicable).",
  fields: [
    // Field names + TS type literals mirror the primitive SicAxis interface 1:1.
    { name: "summary", type: "string" } satisfies { name: keyof SicAxis; type: string },
    { name: "refs", type: "readonly string[]" } satisfies { name: keyof SicAxis; type: string },
    { name: "status", type: SIC_AXIS_STATUS_TS_LITERAL } satisfies { name: keyof SicAxis; type: string },
  ],
};

// Register so axis Properties typed "Struct" resolve to this shape via STRUCT_REGISTRY.
STRUCT_REGISTRY.register(SIC_AXIS_STRUCT);
