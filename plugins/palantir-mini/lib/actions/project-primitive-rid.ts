/**
 * Per-project primitive RID minting (ENTRY-loop register seam, O-2 closure).
 *
 * The ENTRY-loop `register` seam materializes an approved ontology-engineering
 * session's accepted candidate set into REGISTERED, READABLE primitives. Each
 * minted rid is **namespaced by project slug** so two different projects that
 * accept a candidate of the same plain name get DISTINCT rids — register is
 * per-project isolated. The fold (lib/event-log/read/fold-snapshot.ts) bins by
 * rid, so:
 *   - identical inputs (same project + kind + plainName) → identical rid →
 *     idempotent re-register dedups (a second `register` adds no new primitive);
 *   - slug-collision (two plainNames that kebab to the same slug) → same rid →
 *     fold dedups them into one primitive (intentional: the slug IS the identity).
 *
 * PURE + STABLE: no fs, no clock, no randomness — same inputs always yield the
 * same rid. This is load-bearing for idempotent fold.
 *
 * @owner palantirkc-plugin-actions
 * @purpose Per-project namespaced RID minting for the register seam
 */

import * as path from "path";
import { objectTypeRid } from "../../runtime-overlay/schemas-snapshot/ontology/primitives/object-type";
import { linkTypeRid } from "../../runtime-overlay/schemas-snapshot/ontology/primitives/link-type";
import { actionTypeRid } from "../../runtime-overlay/schemas-snapshot/ontology/primitives/action-type";
import { aipLogicFunctionRid } from "../../runtime-overlay/schemas-snapshot/ontology/primitives/function";
import { roleRid } from "../../runtime-overlay/schemas-snapshot/ontology/primitives/role";

export type PrimitiveKindSlug =
  | "object-type"
  | "link-type"
  | "action-type"
  | "function"
  | "role";

/**
 * Normalize an arbitrary string to a stable kebab-case slug:
 *   lowercase; every non-alphanumeric run → "-"; collapse repeats; trim "-".
 */
export function kebab(s: string): string {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Stable project slug = kebab of the project root's basename. */
export function projectSlug(projectRoot: string): string {
  return kebab(path.basename(projectRoot));
}

/**
 * Mint a per-project namespaced primitive rid.
 *
 * The namespaced slug `${projectSlug}/${kind}/${kebab(plainName)}` is passed
 * through the matching branded rid minter. Functions have no dedicated minter
 * in the primitives layer (FunctionRid IS AIPLogicFunctionRid), so the function
 * case uses `aipLogicFunctionRid` with the same namespaced slug.
 */
export function projectPrimitiveRid(
  projectRoot: string,
  kind: PrimitiveKindSlug,
  plainName: string,
): string {
  const slug = `${projectSlug(projectRoot)}/${kind}/${kebab(plainName)}`;
  switch (kind) {
    case "object-type":
      return objectTypeRid(slug);
    case "link-type":
      return linkTypeRid(slug);
    case "action-type":
      return actionTypeRid(slug);
    case "function":
      return aipLogicFunctionRid(slug);
    case "role":
      return roleRid(slug);
  }
}
