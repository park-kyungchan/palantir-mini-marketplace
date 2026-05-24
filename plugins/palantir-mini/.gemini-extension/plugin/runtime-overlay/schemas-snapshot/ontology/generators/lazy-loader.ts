/**
 * palantir-mini — Lazy loader primitive for OSDK 2.0 codegen
 *
 * Pattern: emit lazy-imported references in generated code to prevent circular
 * imports and reduce cold-start cost. Instead of:
 *
 *   import { Foo } from "./foo";
 *   export const bar = foo_related_code;
 *
 * we emit:
 *
 *   export const bar = () => import("./foo").then(m => m.foo_related_code);
 *
 * This file defines the typed shape of lazy references.
 */

export interface LazyRef<T> {
  readonly target: string;     // module path
  readonly exportName: string; // named export to reach for
  /** Resolve the lazy reference at runtime */
  readonly resolve: () => Promise<T>;
}

export function makeLazyRef<T>(target: string, exportName: string): LazyRef<T> {
  return {
    target,
    exportName,
    resolve: async () => {
      const mod = await import(target) as Record<string, T>;
      const value = mod[exportName];
      if (value === undefined) {
        throw new Error(`LazyRef: export "${exportName}" not found in ${target}`);
      }
      return value;
    },
  };
}

/**
 * Registry of lazy references for generated code. Populated by descender-gen
 * when it writes generated files that depend on other generated files.
 */
export class LazyRefRegistry {
  private readonly refs = new Map<string, LazyRef<unknown>>();
  register(id: string, ref: LazyRef<unknown>): void { this.refs.set(id, ref); }
  get<T = unknown>(id: string): LazyRef<T> | undefined {
    return this.refs.get(id) as LazyRef<T> | undefined;
  }
  list(): string[] { return [...this.refs.keys()]; }
}

export const LAZY_REF_REGISTRY = new LazyRefRegistry();
