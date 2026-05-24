import * as path from "path";
import { synthesizeRatchetProposals } from "../../lib/harness/ratchet-proposal";

interface HarnessRatchetSynthesizeArgs {
  readonly eventsJsonlPath?: string;
  readonly sinceMs?: number;
  readonly projectRoot?: string;
}

export default async function harnessRatchetSynthesize(
  rawArgs: unknown,
) {
  const args = (rawArgs ?? {}) as HarnessRatchetSynthesizeArgs;
  const projectRoot = args.projectRoot ?? process.cwd();
  const eventsJsonlPath = args.eventsJsonlPath ??
    path.join(projectRoot, ".palantir-mini", "session", "events.jsonl");
  const sinceMs = typeof args.sinceMs === "number" ? args.sinceMs : 24 * 60 * 60 * 1000;
  const proposals = await synthesizeRatchetProposals(eventsJsonlPath, sinceMs, projectRoot);
  return {
    status: "ok",
    proposalCount: proposals.length,
    proposals,
  };
}
