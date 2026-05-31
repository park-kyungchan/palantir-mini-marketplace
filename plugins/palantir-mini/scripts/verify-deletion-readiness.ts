import { checkDeletionReadiness } from "../bridge/handlers/pm-plugin-self-check/check-deletion-readiness";

const result = checkDeletionReadiness();

if (result.status === "fail") {
  console.error(
    `[deletion-readiness] FAIL: ${result.details}`,
  );
  for (const candidate of result.candidates.filter((entry) => entry.deletionAllowed)) {
    console.error(
      `[deletion-readiness] deletion-ready owner still present: ${candidate.surfaceName} -> ${candidate.ownerPath}`,
    );
  }
  for (const surface of result.missingDecisionSurfaces) {
    console.error(`[deletion-readiness] missing managed-settings decision: ${surface}`);
  }
  process.exit(1);
}

console.log(
  `[deletion-readiness] OK: ${result.candidateCount} candidate(s), ` +
  `${result.blockedCount} blocked, ${result.deletionAllowedCount} deletion-ready.`,
);
