/**
 * Ontology Codegen CLI
 *
 * Compiles ontology declarations into Convex runtime artifacts.
 *
 * Usage:
 *   bun run ~/.claude/schemas/ontology/codegen/index.ts \
 *     --project=/path/to/ontology/schema.ts \
 *     [--out=/path/to/convex/]     \
 *     [--dry-run]
 *
 * Dry-run: prints generated code to stdout without writing files.
 * With --out: writes convex/schema.ts and convex/queries.ts.
  * @owner palantirkc-ontology
 * @purpose Ontology Codegen CLI
 */

import { generateConvexSchema } from "./convex-schema-gen";
import { generateConvexQueries } from "./convex-queries-gen";
import { generateConvexMutations } from "./convex-mutations-gen";
import { generateRuntimeBindings } from "./runtime-bindings-gen";
import { generateFrontendRegistry } from "./frontend-registry-gen";
import { generatePmInstanceWrappers } from "./pm-instance-gen";
import { generateTypedFunctions } from "./typed-functions-gen";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { resolve, join, dirname } from "path";

function parseArgs(): { projectPath: string; outDir: string | null; dryRun: boolean } {
  const args = process.argv.slice(2);
  let projectPath = "";
  let outDir: string | null = null;
  let dryRun = false;

  for (const arg of args) {
    if (arg.startsWith("--project=")) projectPath = arg.slice("--project=".length);
    else if (arg.startsWith("--out=")) outDir = arg.slice("--out=".length);
    else if (arg === "--dry-run") dryRun = true;
  }

  if (!projectPath) {
    // Fallback: use ONTOLOGY_PATH env var
    projectPath = process.env["ONTOLOGY_PATH"] ?? "";
  }

  if (!projectPath) {
    console.error("Usage: --project=/path/to/ontology/schema.ts [--out=/path/to/convex/] [--dry-run]");
    process.exit(1);
  }

  return { projectPath: resolve(projectPath), outDir: outDir ? resolve(outDir) : null, dryRun };
}

async function main() {
  const { projectPath, outDir, dryRun } = parseArgs();

  if (!existsSync(projectPath)) {
    console.error(`Ontology not found: ${projectPath}`);
    process.exit(1);
  }

  // Dynamic import of the project ontology
  const mod = await import(projectPath);
  const ontology = mod.default ?? mod;

  // Extract data and runtime from either OntologyExports or ProjectOntologyScope
  const data = ontology.data ?? ontology.backend?.data;
  const logic = ontology.logic ?? ontology.backend?.logic;
  const action = ontology.action ?? ontology.backend?.action;
  const runtime = ontology.runtime;

  if (!data) {
    console.error("Ontology has no data domain. Cannot generate schema.");
    process.exit(1);
  }

  // Extract frontend views for interactionModes
  const frontend = ontology.frontend ?? ontology.frontend;
  const frontendViews = frontend?.views ?? [];

  // Generate all artifacts
  const schemaCode = generateConvexSchema({ data, runtime });
  const queriesCode = logic ? generateConvexQueries({ data, logic }) : null;
  const mutationsCode = action ? generateConvexMutations({ data, action }) : null;
  const bindingsCode = runtime ? generateRuntimeBindings({ runtime }) : null;
  const registryCode = runtime ? generateFrontendRegistry({
    viewBindings: runtime.viewBindings ?? [],
    crossViewDependencies: (runtime as any).crossViewDependencies ?? [],
    frontendViews,
  }) : null;
  const pmInstanceCode = generatePmInstanceWrappers({ data, logic: logic ?? undefined });
  const typedFunctionsCode = logic ? generateTypedFunctions({ data, logic }) : null;

  if (dryRun || !outDir) {
    console.log("=== convex/schema.ts ===");
    console.log(schemaCode);
    if (queriesCode) {
      console.log("\n=== convex/queries.ts ===");
      console.log(queriesCode);
    }
    if (mutationsCode) {
      console.log("\n=== convex/mutations.ts (STUBS) ===");
      console.log(mutationsCode);
    }
    if (bindingsCode) {
      console.log("\n=== src/lib/runtimeBindings.generated.ts ===");
      console.log(bindingsCode);
    }
    if (registryCode) {
      console.log("\n=== src/generated/ontology-registry.generated.ts ===");
      console.log(registryCode);
    }
    console.log("\n=== src/generated/pm-instance.generated.ts ===");
    console.log(pmInstanceCode);
    if (typedFunctionsCode) {
      console.log("\n=== src/generated/typed-functions.generated.ts ===");
      console.log(typedFunctionsCode);
    }
    return;
  }

  // Write files
  const schemaPath = join(outDir, "schema.ts");
  const queriesPath = join(outDir, "queries.ts");
  const mutationsStubPath = join(outDir, "mutations.generated.ts");

  writeFileSync(schemaPath, schemaCode, "utf-8");
  console.log(`Written: ${schemaPath}`);

  if (queriesCode) {
    writeFileSync(queriesPath, queriesCode, "utf-8");
    console.log(`Written: ${queriesPath}`);
  }

  if (mutationsCode) {
    writeFileSync(mutationsStubPath, mutationsCode, "utf-8");
    console.log(`Written: ${mutationsStubPath} (stubs — merge manually)`);
  }

  // Write frontend registry + new Phase B1 generators to src/generated/
  const projectRoot = dirname(dirname(projectPath));
  const generatedDir = join(projectRoot, "src", "generated");
  const needsGeneratedDir = registryCode || pmInstanceCode || typedFunctionsCode;
  if (needsGeneratedDir && !existsSync(generatedDir)) mkdirSync(generatedDir, { recursive: true });

  if (registryCode) {
    const registryPath = join(generatedDir, "ontology-registry.generated.ts");
    writeFileSync(registryPath, registryCode, "utf-8");
    console.log(`Written: ${registryPath}`);
  }

  if (pmInstanceCode) {
    const pmInstancePath = join(generatedDir, "pm-instance.generated.ts");
    writeFileSync(pmInstancePath, pmInstanceCode, "utf-8");
    console.log(`Written: ${pmInstancePath}`);
  }

  if (typedFunctionsCode) {
    const typedFunctionsPath = join(generatedDir, "typed-functions.generated.ts");
    writeFileSync(typedFunctionsPath, typedFunctionsCode, "utf-8");
    console.log(`Written: ${typedFunctionsPath}`);
  }

  console.log("Codegen complete.");
}

main().catch((err) => {
  console.error("Codegen failed:", err);
  process.exit(1);
});
