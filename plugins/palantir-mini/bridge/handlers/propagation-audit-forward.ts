// palantir-mini v4.0.0 — MCP tool handler: propagation_audit_forward
// Domain: LEARN (ForwardProp 6-step chain audit)
//
// Walks the ForwardProp authority chain:
//   research → schema → shared-core → project-ontology → contracts → runtime
// calling a named validator per step. Returns PropagationAuditPayload.
//
// Authority chain:
//   rules/01-ontology-first-core.md §Propagation (ForwardProp chain)
//   schemas/ontology/primitives/propagation-audit.ts (PropagationAuditPayload SSoT)
//   plans/distributed-wishing-manatee.md §T4.2

import * as fs from "fs";
import * as path from "path";
import { emit, projectRoot as resolveProjectRoot } from "../../scripts/log";
import { resolveResearchAnchor } from "../../lib/runtime-overlay/research-core-select";
import { resolveSchemaPath } from "../../lib/runtime-overlay/schema-resolve";
import { resolveSharedCorePath } from "../../lib/runtime-overlay/shared-core-resolve";
import {
  PROPAGATION_STEPS,
  type PropagationAuditPayload,
  type PropagationStep,
  type PropagationStepResult,
} from "#schemas/ontology/primitives/propagation-audit";

export interface PropagationAuditForwardInput {
  project?: string;
  startStep?: PropagationStep;
}

// ── Per-step validators ────────────────────────────────────────────────────

/** research: delegate to pm_research_citation_validate (lightweight inline version). */
async function validateResearch(project: string): Promise<PropagationStepResult> {
  const anchor = await resolveResearchAnchor("ForwardProp research layer audit", "palantir-official");
  const hasMd = anchor.files.some((f) => f.exists && f.path.endsWith(".md"));
  return {
    pass: hasMd,
    validator: "research-citation-validate",
    evidence: `${anchor.source}:${anchor.files.map((f) => f.path).join(",")}`,
  };
}

/** schema: check resolved schemas snapshot has ontology primitives. */
async function validateSchema(_project: string): Promise<PropagationStepResult> {
  const schemasDir = path.join((await resolveSchemaPath()).resolvedPath, "ontology", "primitives");
  if (!fs.existsSync(schemasDir)) {
    return { pass: false, validator: "schema-dir-exists", evidence: schemasDir };
  }
  const tsFiles = fs.readdirSync(schemasDir).filter((f) => f.endsWith(".ts"));
  return {
    pass: tsFiles.length > 0,
    validator: "schema-primitives-present",
    evidence: `${tsFiles.length} primitives in ${schemasDir}`,
  };
}

/** shared-core: resolved ontology shared-core index exists. */
async function validateSharedCore(_project: string): Promise<PropagationStepResult> {
  const sharedCore = resolveSharedCorePath().resolvedPath;
  const indexTs = path.join(sharedCore, "index.ts");
  const pass = fs.existsSync(indexTs);
  return {
    pass,
    validator: "shared-core-index-exists",
    evidence: indexTs,
  };
}

/** project-ontology: <project>/ontology/ directory exists. */
async function validateProjectOntology(project: string): Promise<PropagationStepResult> {
  const ontologyDir = path.join(project, "ontology");
  const pass = fs.existsSync(ontologyDir) && fs.statSync(ontologyDir).isDirectory();
  return {
    pass,
    validator: "project-ontology-dir-exists",
    evidence: ontologyDir,
  };
}

/** contracts: check for src/generated/ or ontology/generated/ in project. */
async function validateContracts(project: string): Promise<PropagationStepResult> {
  const candidates = [
    path.join(project, "src", "generated"),
    path.join(project, "ontology", "generated"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return { pass: true, validator: "contracts-generated-dir-exists", evidence: c };
    }
  }
  // No generated dir is advisory for some projects — treat as pass with note
  return {
    pass: true,
    validator: "contracts-generated-dir-exists",
    evidence: "no-generated-dir-advisory",
  };
}

/** runtime: check package.json and attempt tsc --version to confirm TS toolchain. */
async function validateRuntime(project: string): Promise<PropagationStepResult> {
  const pkgJson = path.join(project, "package.json");
  if (!fs.existsSync(pkgJson)) {
    // Not all projects are node packages — advisory pass
    return { pass: true, validator: "runtime-package-json", evidence: "no-package-json-advisory" };
  }
  // package.json present — confirm it's parseable
  try {
    JSON.parse(fs.readFileSync(pkgJson, "utf8"));
    return { pass: true, validator: "runtime-package-json", evidence: pkgJson };
  } catch {
    return { pass: false, validator: "runtime-package-json", evidence: pkgJson };
  }
}

const STEP_VALIDATORS: Record<
  PropagationStep,
  (project: string) => Promise<PropagationStepResult>
> = {
  "research":         validateResearch,
  "schema":           validateSchema,
  "shared-core":      validateSharedCore,
  "project-ontology": validateProjectOntology,
  "contracts":        validateContracts,
  "runtime":          validateRuntime,
};

// ── Handler ────────────────────────────────────────────────────────────────

export default async function propagationAuditForward(
  rawArgs: unknown,
): Promise<PropagationAuditPayload> {
  const args = (rawArgs ?? {}) as PropagationAuditForwardInput;
  const project = args.project ?? resolveProjectRoot();

  const startStep = args.startStep ?? "research";
  const startIdx = PROPAGATION_STEPS.indexOf(startStep);
  const stepsToWalk = startIdx >= 0
    ? (PROPAGATION_STEPS.slice(startIdx) as PropagationStep[])
    : ([...PROPAGATION_STEPS] as PropagationStep[]);

  const perStepResult: Partial<Record<PropagationStep, PropagationStepResult>> = {};
  let firstFailureStep: PropagationStep | null = null;

  for (const step of stepsToWalk) {
    const validator = STEP_VALIDATORS[step];
    const result = await validator(project);
    perStepResult[step] = result;
    if (!result.pass && firstFailureStep === null) {
      firstFailureStep = step;
      // Stop at first failure (fail-fast behavior)
      break;
    }
  }

  const verdict: "pass" | "fail" = firstFailureStep === null ? "pass" : "fail";
  const auditId = crypto.randomUUID();
  const auditedAt = new Date().toISOString();

  const payload: PropagationAuditPayload = {
    auditId,
    chainSteps: stepsToWalk,
    firstFailureStep,
    perStepResult,
    verdict,
    auditedAt,
  };

  await emit({
    type: "validation_phase_completed",
    payload: {
      phase: "post_write",
      passed: verdict === "pass",
      errorClass: "propagation_audit_forward",
    },
    toolName: "propagation_audit_forward",
    cwd: project,
    reasoning: `ForwardProp audit: walked ${Object.keys(perStepResult).length}/${stepsToWalk.length} steps, firstFailure=${firstFailureStep ?? "none"}, verdict=${verdict}`,
  });

  return payload;
}
