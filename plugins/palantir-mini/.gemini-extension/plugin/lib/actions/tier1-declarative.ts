/**
 * Tier-1 Declarative Action registry
 * @owner palantirkc-plugin-actions
 * @purpose Tier-1 Declarative Action registry
 */
// palantir-mini v0 — Tier-1 Declarative Action registry
// Domain: ACTION (prim-action-01 Tier-1 Declarative Action)
//
// Pure CRUD rules. Declarative spec: given ObjectType X and field Y, on
// operation Z, apply rule R. Compiled into the commit_edits handler fast path.
// Mutually exclusive with Tier-2 per §ACTION.MU-09..11.
//
// Unlike Tier-2, Tier-1 rules are DATA (config) not CODE. They describe what
// should happen without needing arbitrary TypeScript execution. The commit
// path expands the rule into OntologyEdit[] deterministically.

import type { OntologyEdit } from "../event-log/types";

export type Tier1Operation = "create" | "update" | "delete";

export interface Tier1Rule {
  /** Unique id for the rule */
  id: string;
  /** ObjectType this rule applies to */
  objectType: string;
  /** Operation this rule handles */
  operation: Tier1Operation;
  /**
   * Declarative specification expanded to OntologyEdit[]. Represented as a
   * pure data shape, not a function body — preserves the "declarative" property
   * of Tier-1 (no arbitrary code paths).
   */
  edits: Array<{
    kind: OntologyEdit["kind"];
    rid:  string;
    properties?: Record<string, unknown>;
    srcRid?: string;
    dstRid?: string;
    linkName?: string;
    interfaceName?: string;
  }>;
  /** Short description for discovery */
  description?: string;
}

const REGISTRY = new Map<string, Tier1Rule>();

/** Register a Tier-1 rule. Overrides on id collision. */
export function registerTier1Rule(rule: Tier1Rule): void {
  REGISTRY.set(rule.id, rule);
}

/** Retrieve a Tier-1 rule by id. */
export function getTier1Rule(id: string): Tier1Rule | undefined {
  return REGISTRY.get(id);
}

/** List all registered Tier-1 rule ids. */
export function listTier1Rules(): string[] {
  return [...REGISTRY.keys()];
}

/**
 * Apply a Tier-1 rule with params. Returns the OntologyEdit[] the declarative
 * specification would produce. Pure — no side effects.
 */
export function applyTier1Rule(id: string, params?: Record<string, unknown>): OntologyEdit[] {
  const rule = REGISTRY.get(id);
  if (!rule) throw new Error(`Tier-1 rule not registered: ${id}`);

  return rule.edits.map((specEdit) => {
    switch (specEdit.kind) {
      case "object":
        return {
          kind:       "object",
          rid:        specEdit.rid,
          properties: { ...(specEdit.properties ?? {}), ...(params ?? {}) },
        };
      case "link":
        return {
          kind:     "link",
          rid:      specEdit.rid,
          srcRid:   specEdit.srcRid   ?? "",
          dstRid:   specEdit.dstRid   ?? "",
          linkName: specEdit.linkName ?? "",
        };
      case "interface":
        return {
          kind:          "interface",
          rid:           specEdit.rid,
          interfaceName: specEdit.interfaceName ?? "",
        };
    }
  });
}
