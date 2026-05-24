/**
 * palantir-mini v2.6.0 — MCP tool handler: semantic_drift_audit
 * @owner palantirkc-plugin-learn
 * @purpose Audits graph integrity across 4 layers: ontology ↔ codegen ↔ runtime ↔ verification.
 *          Returns per-layer node counts, a findings list, and an overallAligned boolean.
 *
 * Wave 3 W3.5. Orthogonal to gate_on_drift (which runs scripts).
 * This handler runs all 4 producers in Promise.all, derives alignment signals,
 * and emits semantic_drift_audited (Wave 3 event — `as any` per W2.10 precedent).
 */
// Domain: LEARN | Authority: plan §Wave 3 · W3.5

import { emit } from "../../scripts/log";
import { runProducerOntology } from "../../lib/semantic-graph/producer-ontology";
import { runProducerCodegen } from "../../lib/semantic-graph/producer-codegen";
import { runProducerRuntime } from "../../lib/semantic-graph/producer-runtime";
import { runProducerVerification } from "../../lib/semantic-graph/producer-verification";
import type { ProducerResult } from "../../lib/semantic-graph/types";

// ─── Public types ──────────────────────────────────────────────────────────────

export type FindingSeverity = "critical" | "warn" | "info";

export interface DriftFinding {
  severity: FindingSeverity;
  layer: string;
  message: string;
  remediation: string;
}

export interface LayerStats {
  nodeCount: number;
  uncertainties: ReadonlyArray<string>;
  durationMs: number;
}

export interface SemanticDriftAuditResult {
  project: string;
  layers: {
    ontology: LayerStats;
    codegen: LayerStats;
    runtime: LayerStats;
    verification: LayerStats;
  };
  findings: DriftFinding[];
  overallAligned: boolean;
  auditedAt: string;
}

interface SemanticDriftAuditArgs {
  project: string;
}

// ─── Alignment checks (Wave 3 MVP) ────────────────────────────────────────────

function deriveFindings(
  ontology: ProducerResult,
  codegen: ProducerResult,
  runtime: ProducerResult,
  verification: ProducerResult,
): DriftFinding[] {
  const findings: DriftFinding[] = [];

  const ontCount = ontology.nodes.length;
  const genCount = codegen.nodes.length;
  const runtimeCount = runtime.nodes.length;
  const verifyCount = verification.nodes.length;

  // critical: ontology has nodes but codegen has 0
  if (ontCount > 0 && genCount === 0) {
    findings.push({
      severity: "critical",
      layer: "codegen",
      message: `Ontology has ${ontCount} nodes but codegen layer is empty (0 gen:* RIDs).`,
      remediation: "Run /palantir-mini:pm-codegen to regenerate src/generated/*.ts from current ontology.",
    });
  }

  // warn: codegen has nodes but runtime=0
  if (genCount > 0 && runtimeCount === 0) {
    findings.push({
      severity: "warn",
      layer: "runtime",
      message: `Codegen layer has ${genCount} nodes but no runtime entrypoints scanned (0 runtime:* RIDs).`,
      remediation: "Check RUNTIME_DIRS (skills, apps, src/app, src/pages) are present in the project root.",
    });
  }

  // warn: verification=0
  if (verifyCount === 0) {
    findings.push({
      severity: "warn",
      layer: "verification",
      message: "No verification nodes detected (0 eval:* or doc:* RIDs).",
      remediation: "Add eval-rubric.md or ontology/*.md docs to register verification coverage.",
    });
  }

  // info: ontology uncertainties exist
  if (ontology.uncertainties.length > 0) {
    findings.push({
      severity: "info",
      layer: "ontology",
      message: `Ontology producer reported ${ontology.uncertainties.length} uncertainty(ies): ${ontology.uncertainties.slice(0, 2).join("; ")}${ontology.uncertainties.length > 2 ? "; ..." : ""}.`,
      remediation: "Inspect shared-core and project-local ontology barrels for missing or malformed exports.",
    });
  }

  return findings;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function semanticDriftAudit(
  rawArgs: unknown,
): Promise<SemanticDriftAuditResult> {
  const args = (rawArgs ?? {}) as SemanticDriftAuditArgs;
  if (!args.project || typeof args.project !== "string") {
    throw new Error("semantic_drift_audit: `project` is required");
  }

  const ctx = { projectRoot: args.project };

  // Run all 4 producers concurrently; producer failures surface as empty results.
  const [ontology, codegen, runtime, verification] = await Promise.all([
    runProducerOntology(ctx).catch((e: unknown): ProducerResult => ({
      producer: "ontology", nodes: [], edges: [], durationMs: 0,
      uncertainties: [`producer threw: ${(e as Error).message}`],
    })),
    runProducerCodegen(ctx).catch((e: unknown): ProducerResult => ({
      producer: "codegen", nodes: [], edges: [], durationMs: 0,
      uncertainties: [`producer threw: ${(e as Error).message}`],
    })),
    runProducerRuntime(ctx).catch((e: unknown): ProducerResult => ({
      producer: "runtime", nodes: [], edges: [], durationMs: 0,
      uncertainties: [`producer threw: ${(e as Error).message}`],
    })),
    runProducerVerification(ctx).catch((e: unknown): ProducerResult => ({
      producer: "verification", nodes: [], edges: [], durationMs: 0,
      uncertainties: [`producer threw: ${(e as Error).message}`],
    })),
  ]);

  const findings = deriveFindings(ontology, codegen, runtime, verification);
  const hasCritical = findings.some((f) => f.severity === "critical");
  const overallAligned = !hasCritical;
  const auditedAt = new Date().toISOString();

  const result: SemanticDriftAuditResult = {
    project: args.project,
    layers: {
      ontology:     { nodeCount: ontology.nodes.length,     uncertainties: ontology.uncertainties,     durationMs: ontology.durationMs },
      codegen:      { nodeCount: codegen.nodes.length,      uncertainties: codegen.uncertainties,      durationMs: codegen.durationMs },
      runtime:      { nodeCount: runtime.nodes.length,      uncertainties: runtime.uncertainties,      durationMs: runtime.durationMs },
      verification: { nodeCount: verification.nodes.length, uncertainties: verification.uncertainties, durationMs: verification.durationMs },
    },
    findings,
    overallAligned,
    auditedAt,
  };

  // Emit event (non-fatal) — Wave 3 event type, `as any` per W2.10 precedent.
  try {
    await emit({
      type: "semantic_drift_audited",
      payload: {
        project: args.project,
        ontologyNodes: ontology.nodes.length,
        codegenNodes: codegen.nodes.length,
        runtimeNodes: runtime.nodes.length,
        verificationNodes: verification.nodes.length,
        findingCount: findings.length,
        overallAligned,
      },
      toolName: "semantic_drift_audit",
      cwd: args.project,
      reasoning: overallAligned
        ? `Semantic drift audit passed: ${findings.length} finding(s), no critical issues.`
        : `Semantic drift audit found critical issues: ${findings.filter((f) => f.severity === "critical").map((f) => f.message).join("; ")}`,
    } as any); // Wave 3 event discriminator — schemas/ontology/lineage/event-types.ts extension deferred.
  } catch { /* non-fatal */ }

  return result;
}
