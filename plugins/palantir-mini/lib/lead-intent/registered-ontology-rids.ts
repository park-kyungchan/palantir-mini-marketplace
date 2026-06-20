/**
 * @owner palantirkc-ontology
 * @purpose Derive the LIVE registered-ontology rid set for the ontology-DTC
 *          readiness gate's `registeredOntologyRids` input (Improvement #4 —
 *          0-new-term DYNAMIC re-bind lane).
 *
 * This is the SOLE production source of `registeredOntologyRids`. It reads ONLY the
 * genuine governed snapshot (`getOntology(project).snapshot.registeredPrimitives`,
 * the same fold `elevate.ts`'s register seam reads) and flattens it to bare rids
 * across all six primitive buckets. It is FAIL-CLOSED: a missing project, a snapshot
 * read failure, or an absent `registeredPrimitives` returns `undefined` — NEVER a
 * partial or guessed list. An `undefined` result makes `isZeroNewTermRebind` return
 * false, so the gate stays byte-identical to legacy. The rid set is NEVER sourced
 * from a caller-trusted/request field; only the live snapshot.
 */
import getOntology from "../../bridge/handlers/get-ontology";

/**
 * Read the project's governed ontology snapshot and return the set of ALREADY-
 * registered rids (objectTypes + linkTypes + actionTypes + functions + roles +
 * properties), or `undefined` when the snapshot is unavailable (fail-closed).
 */
export async function deriveRegisteredOntologyRids(
  projectRoot: string | undefined,
): Promise<readonly string[] | undefined> {
  if (!projectRoot || typeof projectRoot !== "string") return undefined;
  try {
    const reg = (await getOntology({ project: projectRoot })).snapshot
      .registeredPrimitives;
    if (!reg) return undefined;
    const rids = [
      ...(reg.objectTypes ?? []),
      ...(reg.linkTypes ?? []),
      ...(reg.actionTypes ?? []),
      ...(reg.functions ?? []),
      ...(reg.roles ?? []),
      ...(reg.properties ?? []),
    ].map((entry) => entry.rid);
    return rids;
  } catch {
    // Fail-closed: any read/fold failure ⇒ no registry ⇒ not a rebind ⇒ full gate.
    return undefined;
  }
}
