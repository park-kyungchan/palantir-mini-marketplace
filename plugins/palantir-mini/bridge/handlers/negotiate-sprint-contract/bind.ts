// palantir-mini v6.22.0 — negotiate-sprint-contract sibling: contract binding + dissent emit
// Side-effect: emits sprint_contract_bound + (when applicable) sprint_contract_dissent_preserved.
// v6.22.0: advisory runtime validation checks 1/3/4 (sprint-112 PR 5.2, canonical plan v2 §4 row 5.2).

import * as fs from "fs";
import { emit } from "../../../scripts/log";
import { deriveProjectSlug } from "../../../lib/project/slug";
import {
  isValidTransition,
  findSprintNumberCollisions,
  findMissingScopePaths,
  type ContractStatus,
} from "../../../lib/sprint-contract/validation";
import type { NegotiateSprintContractArgs } from "./types";

export interface BindContractCtx {
  args: NegotiateSprintContractArgs;
  project: string;
  negotiationFile: string;
  contractFile: string;
  round: number;
}

/**
 * Both-approved branch: extract final contract, write contract.json, emit
 * sprint_contract_bound + (when applicable) sprint_contract_dissent_preserved.
 */
export async function bindContract(
  ctx: BindContractCtx,
  argsContract: unknown,
): Promise<{ writtenContractPath: string | null; finalContract: unknown }> {
  let finalContract: unknown = argsContract ?? null;
  let writtenContractPath: string | null = null;

  if (!finalContract) {
    const proposalMatches =
      fs.readFileSync(ctx.negotiationFile, "utf8").match(/```json\n([\s\S]*?)\n```/g) ?? [];
    const lastJson = proposalMatches[proposalMatches.length - 1] ?? null;
    if (lastJson) {
      finalContract = JSON.parse(lastJson.replace(/^```json\n/, "").replace(/\n```$/, ""));
    }
  }

  // v3.13.0+ crystalline-resilient-narwhal — derive project slug for cross-project
  // disambiguation. Honor caller-supplied slug if present, else derive from path.
  const projectSlug =
    ctx.args.projectSlug && ctx.args.projectSlug.length > 0
      ? ctx.args.projectSlug
      : deriveProjectSlug(ctx.project);

  // Stamp projectSlug into the contract being written so disk artifact also carries it
  // (idempotent: if caller-supplied finalContract already has projectSlug, we keep
  // their value; else we add it).
  if (finalContract && typeof finalContract === "object" && finalContract !== null) {
    const fc = finalContract as { projectSlug?: string };
    if (typeof fc.projectSlug !== "string" || fc.projectSlug.length === 0) {
      (finalContract as { projectSlug: string }).projectSlug = projectSlug;
    }
  }

  // v6.22.0 — Advisory runtime validation checks (sprint-112 PR 5.2).
  // Check 1: status transition validity — verify current contract status can legally reach "bound".
  if (finalContract && typeof finalContract === "object" && finalContract !== null) {
    const fc = finalContract as { status?: string };
    const currentStatus = fc.status as ContractStatus | undefined;
    if (currentStatus !== undefined && currentStatus !== "bound") {
      const transitionOk = isValidTransition(currentStatus, "bound");
      if (!transitionOk) {
        await emit({
          type: "validation_phase_completed",
          payload: {
            phase: "sprint_contract_bind",
            passed: false,
            errorClass: "sprint_contract_invalid_transition",
            fromStatus: currentStatus,
            toStatus: "bound",
            sprintNumber: ctx.args.sprintNumber,
            project: ctx.project,
          } as Record<string, unknown>,
          toolName: "negotiate_sprint_contract",
          cwd: ctx.project,
          reasoning: `Sprint-112 PR 5.2 — SprintContract runtime advisory validation (status transitions + scope paths + action invariants + sprint# collisions) per canonical plan v2 §4 row 5.2 + Phase 5 hardening. Illegal status transition detected: ${currentStatus} → bound is not a valid progression.`,
        });
      }
    }
  }

  // Check 3: sprint number collision — detect same sprintNumber with different contractId.
  const incomingContractId =
    finalContract && typeof finalContract === "object" && finalContract !== null
      ? ((finalContract as { contractId?: string }).contractId ?? "")
      : "";
  if (incomingContractId) {
    const collisions = findSprintNumberCollisions(ctx.project, ctx.args.sprintNumber, incomingContractId);
    if (collisions.length > 0) {
      await emit({
        type: "validation_phase_completed",
        payload: {
          phase: "sprint_contract_bind",
          passed: false,
          errorClass: "sprint_contract_sprint_number_collision",
          sprintNumber: ctx.args.sprintNumber,
          incomingContractId,
          collisions: collisions.map((c) => ({
            existingContractId: c.existingContractId,
            existingContractPath: c.existingContractPath,
          })),
          project: ctx.project,
        } as Record<string, unknown>,
        toolName: "negotiate_sprint_contract",
        cwd: ctx.project,
        reasoning: `Sprint-112 PR 5.2 — SprintContract runtime advisory validation (status transitions + scope paths + action invariants + sprint# collisions) per canonical plan v2 §4 row 5.2 + Phase 5 hardening. Sprint number collision: sprintNumber=${ctx.args.sprintNumber} already exists with contractId=${collisions[0]?.existingContractId}.`,
      });
    }
  }

  // Check 4: scope path existence — verify inputs[].scopePaths resolve on disk.
  if (finalContract) {
    const missingPaths = findMissingScopePaths(ctx.project, finalContract);
    if (missingPaths.length > 0) {
      await emit({
        type: "validation_phase_completed",
        payload: {
          phase: "sprint_contract_bind",
          passed: false,
          errorClass: "sprint_contract_scope_path_missing",
          sprintNumber: ctx.args.sprintNumber,
          missingPaths: missingPaths.map((m) => ({
            scopePath: m.scopePath,
            resolvedPath: m.resolvedPath,
            featureId: m.featureId,
          })),
          project: ctx.project,
        } as Record<string, unknown>,
        toolName: "negotiate_sprint_contract",
        cwd: ctx.project,
        reasoning: `Sprint-112 PR 5.2 — SprintContract runtime advisory validation (status transitions + scope paths + action invariants + sprint# collisions) per canonical plan v2 §4 row 5.2 + Phase 5 hardening. ${missingPaths.length} scope path(s) in inputs[].scopePaths do not exist on disk.`,
      });
    }
  }

  if (finalContract) {
    fs.writeFileSync(ctx.contractFile, JSON.stringify(finalContract, null, 2), "utf8");
    writtenContractPath = ctx.contractFile;
  }

  // Pull the bound contractId (slug-prefixed if writers updated it; else legacy)
  // for inclusion in the event payload — readers can query by contractId without
  // re-reading contract.json.
  const boundContractId =
    finalContract && typeof finalContract === "object" && finalContract !== null
      ? ((finalContract as { contractId?: string }).contractId ?? undefined)
      : undefined;

  await emit({
    type: "sprint_contract_bound",
    payload: {
      project: ctx.project,
      sprintNumber: ctx.args.sprintNumber,
      contractPath: writtenContractPath,
      roundCount: ctx.round,
      role: ctx.args.role,
      projectSlug,
      ...(boundContractId !== undefined ? { contractId: boundContractId } : {}),
    },
    toolName: "negotiate_sprint_contract",
    cwd: ctx.project,
    reasoning: `Sprint ${ctx.args.sprintNumber} contract bound after ${ctx.round} rounds; both generator + evaluator approved. projectSlug=${projectSlug}${boundContractId ? ` contractId=${boundContractId}` : ""}`,
  });

  // v2.19.0 W3 Dissent Record
  const history = Array.isArray(
    (finalContract as { negotiationHistory?: unknown } | null)?.negotiationHistory,
  )
    ? ((finalContract as { negotiationHistory: unknown[] }).negotiationHistory as Array<{
        acceptedInFinal?: boolean;
      }>)
    : [];
  const disputedRounds = history.filter((r) => r && r.acceptedInFinal === false);
  if (disputedRounds.length > 0) {
    await emit({
      type: "sprint_contract_dissent_preserved",
      payload: {
        project: ctx.project,
        contractId: (finalContract as { contractId?: string } | null)?.contractId ?? "",
        sprintNumber: ctx.args.sprintNumber,
        disputedRounds,
        totalRounds: history.length,
        projectSlug,
      },
      toolName: "negotiate_sprint_contract",
      cwd: ctx.project,
      reasoning: `Sprint ${ctx.args.sprintNumber} bound with ${disputedRounds.length} of ${history.length} negotiation rounds rejected in final contract — dissent audit trail preserved for BackwardProp replay. projectSlug=${projectSlug}`,
      hypothesis:
        "Rejected proposals correlate with downstream failure modes; preserve for post-sprint analysis.",
    });
  }

  return { writtenContractPath, finalContract };
}
