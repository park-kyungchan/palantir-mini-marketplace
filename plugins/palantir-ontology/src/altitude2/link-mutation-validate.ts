// Link-mutation existence + cardinality validator (ADR-006 Unit B).
//
// Engine-V2 §3 (`ActionExecutor.apply_action`, lines 287-301) applies each
// `link_mutations` item's `"CREATE"`/`"DELETE"` op straight against
// `LinkInstanceModel` with NO check that `link_type_id` resolves in
// `LinkTypeModel`, and NO enforcement of the `LinkCardinality` the same
// design's §2 (lines 79-82, 143-151) already defines (`ONE_TO_ONE`,
// `ONE_TO_MANY`, `MANY_TO_ONE`, `MANY_TO_MANY`). This module supplies that
// enforcement, standalone, ahead of any mutation being applied.
//
// Local failure codes: the `code` values below (e.g. `UNKNOWN_LINK_TYPE`,
// `DUPLICATE_LINK`) are short identifiers scoped to THIS module only. They
// are deliberately NOT drawn from — and must never be registered against —
// the governance reason-code registry (`contracts/reason-code-registry.json`
// / `src/semantic-core/reason-codes.ts`): this is altitude2 build-only
// enforcement, not a governed-path denial surface.
//
// Intra-batch semantics boundary: `validateLinkMutations` checks every
// mutation in the input batch against the SAME injected `existing` snapshot
// — it does NOT simulate applying earlier mutations in the batch before
// evaluating later ones. Two mutations in one call that would conflict only
// once applied in sequence (e.g. a DELETE then a CREATE of the same link)
// are each validated independently against the pre-batch state. Composing a
// batch so that mutations are threaded through incrementally is the concern
// of whatever executor later applies these mutations, not this validator.
//
// DTC citation: de-2026-07-24-s19-kinetic-adr006-scope-of-record.

/** The V2 §2 cardinality enum (lines 143-151), verbatim. */
export type LinkCardinality = "ONE_TO_ONE" | "ONE_TO_MANY" | "MANY_TO_ONE" | "MANY_TO_MANY";

export interface LinkTypeDefinition {
  readonly link_type_id: string;
  readonly cardinality: LinkCardinality;
  readonly source_object_type_id: string;
  readonly target_object_type_id: string;
}

/** Port: resolves a link type definition, or `null` if it does not exist (the V2 existence gap). */
export interface LinkTypeCatalog {
  getLinkType(link_type_id: string): LinkTypeDefinition | null;
}

/** Port: queries live `LinkInstanceModel`-equivalent state for existence + fan-in/fan-out counts. */
export interface ExistingLinkLookup {
  has(link_type_id: string, source_instance_id: string, target_instance_id: string): boolean;
  countFrom(link_type_id: string, source_instance_id: string): number;
  countTo(link_type_id: string, target_instance_id: string): number;
}

export interface LinkMutation {
  readonly op: "CREATE" | "DELETE";
  readonly link_type_id: string;
  readonly source_instance_id: string;
  readonly target_instance_id: string;
}

export interface LinkMutationFailure {
  readonly index: number;
  readonly code: string;
  readonly detail: string;
}

export interface LinkMutationValidationResult {
  readonly pass: boolean;
  readonly failures: readonly LinkMutationFailure[];
}

const VALID_OPS = new Set(["CREATE", "DELETE"]);

/**
 * Total-evaluation validator for a batch of `link_mutations` items against an
 * injected link-type catalog and injected existing-link state. Never throws:
 * a malformed mutation object yields a failure entry at its index rather than
 * aborting the batch, and every mutation in the batch is evaluated (no
 * first-failure-only short-circuit).
 */
export function validateLinkMutations(
  mutations: readonly unknown[],
  catalog: LinkTypeCatalog,
  existing: ExistingLinkLookup,
): LinkMutationValidationResult {
  const failures: LinkMutationFailure[] = [];

  mutations.forEach((raw, index) => {
    if (raw === null || typeof raw !== "object") {
      failures.push({ index, code: "MALFORMED_MUTATION", detail: `mutation at index ${index} is not an object` });
      return;
    }
    const mutation = raw as Partial<LinkMutation>;
    const { op, link_type_id, source_instance_id, target_instance_id } = mutation;

    if (typeof op !== "string" || !VALID_OPS.has(op)) {
      failures.push({ index, code: "UNKNOWN_OP", detail: `mutation at index ${index} has unrecognized op ${JSON.stringify(op)}` });
      return;
    }
    if (typeof link_type_id !== "string" || link_type_id.length === 0) {
      failures.push({ index, code: "MALFORMED_MUTATION", detail: `mutation at index ${index} is missing a string link_type_id` });
      return;
    }
    if (typeof source_instance_id !== "string" || source_instance_id.length === 0) {
      failures.push({ index, code: "MALFORMED_MUTATION", detail: `mutation at index ${index} is missing a string source_instance_id` });
      return;
    }
    if (typeof target_instance_id !== "string" || target_instance_id.length === 0) {
      failures.push({ index, code: "MALFORMED_MUTATION", detail: `mutation at index ${index} is missing a string target_instance_id` });
      return;
    }

    const linkType = catalog.getLinkType(link_type_id);
    if (linkType === null) {
      failures.push({ index, code: "UNKNOWN_LINK_TYPE", detail: `link_type_id ${JSON.stringify(link_type_id)} does not resolve in the catalog (the V2 apply_action existence gap)` });
      return;
    }

    if (op === "DELETE") {
      if (!existing.has(link_type_id, source_instance_id, target_instance_id)) {
        failures.push({
          index,
          code: "DELETE_NONEXISTENT",
          detail: `DELETE targets a link that does not exist: ${link_type_id} ${source_instance_id} -> ${target_instance_id}`,
        });
      }
      return;
    }

    // op === "CREATE"
    if (existing.has(link_type_id, source_instance_id, target_instance_id)) {
      failures.push({
        index,
        code: "DUPLICATE_LINK",
        detail: `CREATE duplicates an existing link (uq_link_inst analog): ${link_type_id} ${source_instance_id} -> ${target_instance_id}`,
      });
      return;
    }

    switch (linkType.cardinality) {
      case "ONE_TO_ONE": {
        const fromCount = existing.countFrom(link_type_id, source_instance_id);
        const toCount = existing.countTo(link_type_id, target_instance_id);
        if (fromCount > 0 || toCount > 0) {
          failures.push({
            index,
            code: "CARDINALITY_ONE_TO_ONE_VIOLATION",
            detail: `ONE_TO_ONE link_type ${link_type_id}: source ${source_instance_id} already has ${fromCount} outgoing link(s) and/or target ${target_instance_id} already has ${toCount} incoming link(s)`,
          });
        }
        break;
      }
      case "ONE_TO_MANY": {
        const toCount = existing.countTo(link_type_id, target_instance_id);
        if (toCount > 0) {
          failures.push({
            index,
            code: "CARDINALITY_ONE_TO_MANY_VIOLATION",
            detail: `ONE_TO_MANY link_type ${link_type_id}: target ${target_instance_id} already has ${toCount} incoming link(s) (a target may have only one source)`,
          });
        }
        break;
      }
      case "MANY_TO_ONE": {
        const fromCount = existing.countFrom(link_type_id, source_instance_id);
        if (fromCount > 0) {
          failures.push({
            index,
            code: "CARDINALITY_MANY_TO_ONE_VIOLATION",
            detail: `MANY_TO_ONE link_type ${link_type_id}: source ${source_instance_id} already has ${fromCount} outgoing link(s) (a source may link to only one target)`,
          });
        }
        break;
      }
      case "MANY_TO_MANY":
        // No cardinality constraint beyond the duplicate rule already checked above.
        break;
    }
  });

  return { pass: failures.length === 0, failures };
}
