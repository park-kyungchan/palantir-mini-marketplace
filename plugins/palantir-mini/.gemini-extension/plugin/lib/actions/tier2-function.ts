/**
 * Tier-2 Function-Backed Action registry
 * @owner palantirkc-plugin-actions
 * @purpose Tier-2 Function-Backed Action registry
 */
// palantir-mini v0 — Tier-2 Function-Backed Action registry
// Domain: LOGIC (prim-logic-01 EditFunction) + ACTION (prim-action-02 Tier-2)
//
// Edit Functions compute OntologyEdit[] WITHOUT committing, per Palantir
// §LOGIC.FN-04. The function registry holds pure computation; the COMMIT is
// handled by lib/actions/commit.ts using the Tier-2 wrapper.
//
// Read-only enforcement: plugin agents running edit functions MUST have
// disallowedTools: [Write, Edit, Bash] (mechanical no-side-effect guarantee).
// This module is itself pure — it never touches the filesystem.

import type { OntologyEdit } from "../event-log/types";

export interface EditFunctionSpec<P = unknown> {
  /** Unique registered name used by apply_edit_function */
  name: string;
  /** Short description for discovery */
  description?: string;
  /**
   * Pure compute function. MUST NOT commit — only returns hypothetical edits.
   * Any attempt to perform side effects is a bug (and is mechanically blocked
   * at the agent layer via disallowedTools).
   */
  apply: (params: P) => OntologyEdit[] | Promise<OntologyEdit[]>;
}

const REGISTRY = new Map<string, EditFunctionSpec<any>>();

/** Register an edit function. Overrides any prior registration with the same name. */
export function registerEditFunction<P = unknown>(spec: EditFunctionSpec<P>): void {
  REGISTRY.set(spec.name, spec as EditFunctionSpec<any>);
}

/** Retrieve an edit function by name. */
export function getEditFunction(name: string): EditFunctionSpec | undefined {
  return REGISTRY.get(name);
}

/** List all registered edit function names. */
export function listEditFunctions(): string[] {
  return Array.from(REGISTRY.keys());
}

/**
 * Execute an edit function returning hypothetical OntologyEdit[] WITHOUT committing.
 * Throws if the function is not registered.
 */
export async function applyEditFunction(
  functionName: string,
  params: unknown
): Promise<{ functionName: string; edits: OntologyEdit[] }> {
  const fn = REGISTRY.get(functionName);
  if (!fn) throw new Error(`edit function not registered: ${functionName}`);
  const edits = await fn.apply(params);
  return { functionName, edits };
}

// ─── v0 built-in edit functions (stub — projects register their own) ───────

// A no-op identity function for smoke tests: echoes params as a synthetic edit
registerEditFunction({
  name: "noop_identity",
  description: "v0 smoke-test edit function. Returns a single object edit with the params as properties.",
  apply: (params: unknown): OntologyEdit[] => {
    return [
      {
        kind: "object",
        rid: "smoke-test-object",
        properties: (params && typeof params === "object") ? (params as Record<string, unknown>) : { payload: params },
      },
    ];
  },
});
