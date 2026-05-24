/**
 * Ontology → Runtime Bindings Generator
 *
 * Generates a typed writeTargets map from ontology/runtime.ts
 * that components import instead of hardcoding api.mutations.*.
 *
 * ForwardPropagation:
 *   ontology/runtime.ts (SSoT) → src/lib/runtimeBindings.generated.ts
  * @owner palantirkc-ontology
 * @purpose Ontology → Runtime Bindings Generator
 */

import type { RuntimeOntology } from "../types";

export interface GenerateRuntimeBindingsOptions {
  runtime: RuntimeOntology;
}

/**
 * Generate a TypeScript module that exports writeTarget maps per view.
 * Components import this instead of hardcoding mutation references.
 */
export function generateRuntimeBindings(opts: GenerateRuntimeBindingsOptions): string {
  const lines: string[] = [
    "/**",
    " * AUTO-GENERATED from ontology/runtime.ts",
    " * Do not edit manually. Run: bun run ontology:gen",
    " */",
    "",
    '// eslint-disable-next-line @typescript-eslint/no-unused-vars',
    'import { api } from "../../convex/_generated/api";',
    "",
  ];

  // Collect all unique mutation adapterRefs
  const allMutationRefs = new Set<string>();
  for (const view of opts.runtime.viewBindings) {
    for (const target of (view as any).writeTargets ?? []) {
      if (target.kind === "mutation" && target.adapterRef) {
        allMutationRefs.add(target.adapterRef);
      }
    }
  }

  // Generate per-view writeTarget maps
  for (const view of opts.runtime.viewBindings) {
    const targets = (view as any).writeTargets ?? [];
    if (targets.length === 0) continue;

    lines.push(`/** WriteTargets for ${view.apiName} (${view.route}) */`);
    lines.push(`export const ${view.apiName}_WRITE_TARGETS = {`);

    for (const target of targets) {
      const kindComment = target.blocking ? "blocking" : "non-blocking";
      lines.push(`  /** ${target.kind} — ${kindComment} */`);
      lines.push(`  ${target.apiName}: {`);
      lines.push(`    kind: "${target.kind}" as const,`);
      if (target.adapterRef) lines.push(`    adapterRef: "${target.adapterRef}",`);
      if (target.semanticRef) lines.push(`    semanticRef: "${target.semanticRef}",`);
      if (target.entityApiName) lines.push(`    entityApiName: "${target.entityApiName}",`);
      lines.push(`    blocking: ${target.blocking ?? false},`);
      lines.push("  },");
    }

    lines.push("} as const;");
    lines.push("");
  }

  // Generate combined lookup
  lines.push("/** All view writeTargets — keyed by view apiName */");
  lines.push("export const WRITE_TARGETS = {");
  for (const view of opts.runtime.viewBindings) {
    const targets = (view as any).writeTargets ?? [];
    if (targets.length > 0) {
      lines.push(`  ${view.apiName}: ${view.apiName}_WRITE_TARGETS,`);
    }
  }
  lines.push("} as const;");
  lines.push("");

  return lines.join("\n");
}
