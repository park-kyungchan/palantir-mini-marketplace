/**
 * Ontology → Frontend Registry Generator
 *
 * Generates typed registries from ontology runtime + frontend declarations:
 *   1. StepDetailEvent union types per view
 *   2. FrameOverrides field registry from crossViewDependencies
 *   3. InteractionMode unions per view
 *
 * ForwardPropagation:
 *   ontology/runtime.ts + ontology/frontend.ts → src/generated/ontology-registry.generated.ts
  * @owner palantirkc-ontology
 * @purpose Ontology → Frontend Registry Generator
 */

interface StepDetailEvent {
  readonly event: string;
  readonly captures: readonly string[];
}

interface CrossViewDependency {
  readonly from: string;
  readonly to: string;
  readonly dataPath: string;
  readonly fieldRefs: readonly string[];
}

interface ViewBinding {
  readonly apiName: string;
  readonly route: string;
  readonly stepDetailEvents?: readonly StepDetailEvent[];
  /** Project-local extension: some projects (e.g. palantir-math) declare audit events
   *  under `frameWorkspaceEvents` instead of `stepDetailEvents`. Both are merged into
   *  the same `${apiName}Event` union so downstream tests and consumers see one source
   *  of truth. */
  readonly frameWorkspaceEvents?: readonly StepDetailEvent[];
}

interface FrontendView {
  readonly apiName: string;
  readonly interactionModes?: readonly string[];
}

export interface GenerateFrontendRegistryOptions {
  viewBindings: readonly ViewBinding[];
  crossViewDependencies?: readonly CrossViewDependency[];
  frontendViews: readonly FrontendView[];
}

export function generateFrontendRegistry(opts: GenerateFrontendRegistryOptions): string {
  const lines: string[] = [
    "/**",
    " * AUTO-GENERATED from ontology/runtime.ts + ontology/frontend.ts",
    " * Do not edit manually. Run: bun run ontology:gen",
    " *",
    " * Provides compile-time registries for:",
    " *   - StepDetailEvent names per view (dispatch action validation)",
    " *   - FrameOverrides valid field names (crossViewDependency completeness)",
    " *   - InteractionMode unions per view",
    " */",
    "",
  ];

  // ── 1. StepDetailEvent registries per view ──
  lines.push("// ═══ StepDetailEvent Registries ═══");
  lines.push("");

  for (const view of opts.viewBindings) {
    const events: readonly StepDetailEvent[] = [
      ...(view.stepDetailEvents ?? []),
      ...(view.frameWorkspaceEvents ?? []),
    ];
    if (events.length === 0) continue;

    const typeName = `${view.apiName}Event`;
    const constName = `${view.apiName.replace(/([A-Z])/g, "_$1").toUpperCase().replace(/^_/, "")}_EVENTS`;

    // Union type
    lines.push(`/** All declared stepDetailEvents for ${view.apiName} (${view.route}) */`);
    lines.push(`export type ${typeName} =`);
    for (let i = 0; i < events.length; i++) {
      const sep = i < events.length - 1 ? "" : ";";
      lines.push(`  | "${events[i].event}"${sep}`);
    }
    lines.push("");

    // Const array
    lines.push(`export const ${constName} = [`);
    for (const ev of events) {
      lines.push(`  "${ev.event}",`);
    }
    lines.push("] as const;");
    lines.push("");

    // Captures map
    const capturesName = `${view.apiName.replace(/([A-Z])/g, "_$1").toUpperCase().replace(/^_/, "")}_EVENT_CAPTURES`;
    lines.push(`export const ${capturesName}: Record<${typeName}, readonly string[]> = {`);
    for (const ev of events) {
      lines.push(`  "${ev.event}": [${ev.captures.map(c => `"${c}"`).join(", ")}],`);
    }
    lines.push("};");
    lines.push("");
  }

  // ── 2. FrameOverrides field registry ──
  lines.push("// ═══ FrameOverrides Field Registry ═══");
  lines.push("");

  const allFieldRefs = new Set<string>();
  const frameOverrideFieldRefs = new Set<string>();
  for (const dep of opts.crossViewDependencies ?? []) {
    const isFrameOverride = dep.dataPath.includes("frameOverrides");
    for (const f of dep.fieldRefs) {
      allFieldRefs.add(f);
      if (isFrameOverride) frameOverrideFieldRefs.add(f);
    }
  }

  if (allFieldRefs.size > 0) {
    const sorted = [...allFieldRefs].sort();
    lines.push("/** All fields declared in ontology crossViewDependencies (includes non-FrameOverrides fields). */");
    lines.push(`export type OntologyCrossViewField =`);
    for (let i = 0; i < sorted.length; i++) {
      const sep = i < sorted.length - 1 ? "" : ";";
      lines.push(`  | "${sorted[i]}"${sep}`);
    }
    lines.push("");

    const foSorted = [...frameOverrideFieldRefs].sort();
    lines.push("/** Only FrameOverrides interface fields (from dependencies whose dataPath contains 'frameOverrides'). */");
    lines.push(`export type OntologyFrameOverrideField =`);
    for (let i = 0; i < foSorted.length; i++) {
      const sep = i < foSorted.length - 1 ? "" : ";";
      lines.push(`  | "${foSorted[i]}"${sep}`);
    }
    lines.push("");

    lines.push("export const ONTOLOGY_FRAME_OVERRIDE_FIELDS = [");
    for (const f of foSorted) {
      lines.push(`  "${f}",`);
    }
    lines.push("] as const;");
    lines.push("");

    lines.push("/**");
    lines.push(" * Compile-time check: ensure runtime FrameOverrides interface fields");
    lines.push(" * match ontology declarations. Import this in a test file and compare");
    lines.push(" * against keyof FrameOverrides to catch drift.");
    lines.push(" */");
    lines.push(`export const FRAME_OVERRIDE_FIELD_COUNT = ${frameOverrideFieldRefs.size};`);
    lines.push("");
  }

  // ── 3. CrossViewDependency graph ──
  lines.push("// ═══ CrossView Dependencies ═══");
  lines.push("");
  lines.push("export const CROSS_VIEW_DEPENDENCIES = [");
  for (const dep of opts.crossViewDependencies ?? []) {
    lines.push(`  { from: "${dep.from}", to: "${dep.to}", dataPath: "${dep.dataPath}", fieldRefs: [${dep.fieldRefs.map(f => `"${f}"`).join(", ")}] },`);
  }
  lines.push("] as const;");
  lines.push("");

  // ── 4. InteractionMode registries per view ──
  lines.push("// ═══ InteractionMode Registries ═══");
  lines.push("");

  for (const view of opts.frontendViews) {
    const modes = view.interactionModes ?? [];
    if (modes.length === 0) continue;

    const typeName = `${view.apiName}InteractionMode`;
    const constName = `${view.apiName.replace(/([A-Z])/g, "_$1").toUpperCase().replace(/^_/, "")}_INTERACTION_MODES`;

    lines.push(`export type ${typeName} =`);
    for (let i = 0; i < modes.length; i++) {
      const sep = i < modes.length - 1 ? "" : ";";
      lines.push(`  | "${modes[i]}"${sep}`);
    }
    lines.push("");

    lines.push(`export const ${constName} = [`);
    for (const m of modes) {
      lines.push(`  "${m}",`);
    }
    lines.push("] as const;");
    lines.push("");
  }

  return lines.join("\n");
}
