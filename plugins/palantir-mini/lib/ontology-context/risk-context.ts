import type { ApplicationStateProjection } from "./application-state";
import type { EvidenceSourcePolicyDecision } from "../evidence/evidence-source-policy";

export interface DtcToolReadinessRiskProjection {
  readonly blockingUnresolvedTerms: readonly string[];
}

export interface OntologyRiskRecord {
  readonly riskId: string;
  readonly severity: "info" | "warn" | "blocking";
  readonly source: string;
  readonly description: string;
  readonly acknowledgementRequired: boolean;
}

export interface OntologyRiskContext {
  readonly status: "composed";
  readonly risks: readonly OntologyRiskRecord[];
}

export interface ComposeOntologyRiskContextInput {
  readonly applicationState: ApplicationStateProjection;
  readonly evidence?: readonly EvidenceSourcePolicyDecision[];
  readonly dtcFillReadinessDiagnostics?: DtcToolReadinessRiskProjection;
}

export function composeOntologyRiskContext(
  input: ComposeOntologyRiskContextInput,
): OntologyRiskContext {
  const risks: OntologyRiskRecord[] = [];
  const subrepos = input.applicationState.subrepoReadOnlyApplicationState;

  for (const dirtyPath of subrepos.dirtyPaths) {
    risks.push({
      riskId: `subrepo.dirty:${dirtyPath}`,
      severity: "warn",
      source: dirtyPath,
      description: "Read-only subrepo manifest reports dirty local state.",
      acknowledgementRequired: true,
    });
  }
  for (const mismatchPath of subrepos.mismatchPaths) {
    risks.push({
      riskId: `subrepo.mismatch:${mismatchPath}`,
      severity: "warn",
      source: mismatchPath,
      description: "Read-only subrepo manifest reports expected head mismatch.",
      acknowledgementRequired: true,
    });
  }
  for (const detail of subrepos.dirtyDetails) {
    for (const dirtyEntry of detail.dirtyEntries) {
      risks.push({
        riskId: `subrepo.dirty-entry:${detail.path}:${dirtyEntry}`,
        severity: "warn",
        source: detail.path,
        description: `Read-only subrepo manifest reports dirty entry ${dirtyEntry}.`,
        acknowledgementRequired: true,
      });
    }
  }
  for (const detail of subrepos.mismatchDetails) {
    if (detail.remoteBranchMatchesLocal === false) {
      risks.push({
        riskId: `subrepo.remote-branch-mismatch:${detail.path}`,
        severity: "warn",
        source: detail.path,
        description: "Read-only subrepo manifest reports remote branch does not match local branch.",
        acknowledgementRequired: true,
      });
    }
    if (
      detail.head !== undefined &&
      detail.expectedHead !== undefined &&
      detail.head !== detail.expectedHead
    ) {
      risks.push({
        riskId: `subrepo.head-expected-mismatch:${detail.path}`,
        severity: "warn",
        source: detail.path,
        description: "Read-only subrepo manifest reports head differs from expected head.",
        acknowledgementRequired: true,
      });
    }
  }

  for (const decision of input.evidence ?? []) {
    if (decision.allowed) continue;
    risks.push({
      riskId: `evidence.unsupported:${decision.normalizedPath}`,
      severity: "warn",
      source: decision.normalizedPath,
      description: decision.reason,
      acknowledgementRequired: true,
    });
  }

  for (const term of input.dtcFillReadinessDiagnostics?.blockingUnresolvedTerms ?? []) {
    risks.push({
      riskId: `dtc.unresolved-tool-term:${term}`,
      severity: "blocking",
      source: "dtcFillReadinessDiagnostics.blockingUnresolvedTerms",
      description: `Unresolved DTC tool surface term: ${term}`,
      acknowledgementRequired: true,
    });
  }

  if (
    input.applicationState.currentDirtyState.available &&
    (input.applicationState.currentDirtyState.dirtyFileCount ?? 0) > 0
  ) {
    risks.push({
      riskId: "application-state.dirty-target",
      severity: "warn",
      source: input.applicationState.project,
      description: "Target project has local dirty state at context-query time.",
      acknowledgementRequired: true,
    });
  }

  return { status: "composed", risks };
}
