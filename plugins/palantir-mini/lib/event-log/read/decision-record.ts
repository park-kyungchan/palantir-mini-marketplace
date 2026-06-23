/**
 * palantir-mini P1-13 — Fold the event stream into bound D+L+A+S DecisionRecords
 * @owner palantirkc-plugin-events
 * @purpose Reducer<EventEnvelope, DecisionRecord[]> — unite Logic⇄Action+Data+Security.
 */
// Domain: LOGIC (prim-logic-05 Reducer) — a PURE projection over the append-only
// event log (read-only; events.jsonl stays the SSoT).
//
// GROUNDING (ssot/palantir/ontology/decision-model.md + approval-and-lineage.md):
// "decision = Data + Logic + Action + Security" IS the commit pipeline. Logic +
// the staged edit are emitted as `edit_proposed`; Action + Security + Data land
// as `edit_committed`. Before P1-13 those rows were UNLINKED. This reducer binds
// each proposal to its commit into ONE `DecisionRecord`, so a KG decision folds
// its staging (Logic) + data (Action/Data) + gate (Security) as one unit.
//
// Binding rule (deterministic, order-preserving): walk the stream once; for each
// `edit_committed`, claim the most-recent UNCLAIMED `edit_proposed` in the SAME
// session whose staged edit rids are a superset of the committed edit rids (the
// staged hypothetical edits become the applied edits — design-model.md). A
// committed row with no matching proposal yields a commit-only record
// (action.committed = true, logic.proposedSeq absent). A proposal never matched
// by a later commit yields a proposal-only record (action.committed = false) —
// the `proposal-only` boundary state from approval-and-lineage.md.

import type {
  EventEnvelope,
  EditProposedEnvelope,
  EditCommittedEnvelope,
  OntologyEdit,
  DecisionRecord,
} from "../types";

/** rid-set of an edit list (the stable identity used to match staged⇄applied). */
function ridSet(edits: readonly OntologyEdit[] | undefined): Set<string> {
  const s = new Set<string>();
  for (const e of edits ?? []) {
    if (e && typeof (e as { rid?: unknown }).rid === "string") s.add((e as { rid: string }).rid);
  }
  return s;
}

/** True when every rid in `committed` is present in `staged` (staged ⊇ committed). */
function stagedCovers(staged: Set<string>, committed: Set<string>): boolean {
  if (committed.size === 0) return staged.size === 0; // both empty (e.g. interface-only) ⇒ match
  for (const rid of committed) if (!staged.has(rid)) return false;
  return true;
}

function sessionOf(ev: EventEnvelope): string | undefined {
  const sid = ev.throughWhich?.sessionId;
  return sid === undefined ? undefined : String(sid);
}

function proposalRecord(p: EditProposedEnvelope, commit?: EditCommittedEnvelope): DecisionRecord {
  const cp = commit?.payload;
  return {
    decisionId: commit
      ? `dr-${p.sequence}-${commit.sequence}`
      : `dr-${p.sequence}`,
    // DATA — applied edits when committed (what actually landed), else the staged edits.
    data: (cp?.appliedEdits as readonly OntologyEdit[] | undefined) ?? p.payload?.hypotheticalEdits ?? [],
    logic: {
      functionName: p.payload?.functionName,
      reasoning:    p.withWhat?.reasoning,
      proposedSeq:  p.sequence,
    },
    action: {
      actionTypeRid: cp?.actionTypeRid,
      committed:     commit !== undefined,
      committedSeq:  commit?.sequence,
    },
    security: {
      actor:                    (commit ?? p).byWhom?.identity,
      submissionCriteriaPassed: cp?.submissionCriteriaPassed,
      atopWhich:                (commit ?? p).atopWhich === undefined ? undefined : String((commit ?? p).atopWhich),
    },
    when:      (commit ?? p).when,
    sessionId: sessionOf(commit ?? p),
  };
}

function commitOnlyRecord(c: EditCommittedEnvelope): DecisionRecord {
  return {
    decisionId: `dr-c${c.sequence}`,
    data: (c.payload?.appliedEdits as readonly OntologyEdit[] | undefined) ?? [],
    // Logic side is empty — the commit arrived without an observed proposal in
    // this stream window (e.g. a register edit committed directly, or a proposal
    // that rotated out of the read window).
    logic: { reasoning: c.withWhat?.reasoning },
    action: {
      actionTypeRid: c.payload?.actionTypeRid,
      committed:     true,
      committedSeq:  c.sequence,
    },
    security: {
      actor:                    c.byWhom?.identity,
      submissionCriteriaPassed: c.payload?.submissionCriteriaPassed,
      atopWhich:                c.atopWhich === undefined ? undefined : String(c.atopWhich),
    },
    when:      c.when,
    sessionId: sessionOf(c),
  };
}

/**
 * Fold a contiguous event stream into bound D+L+A+S DecisionRecords.
 *
 * PURE + read-only: never mutates the input, never writes the log. Records are
 * returned in binding-event order (each `edit_committed` binds at its own
 * position; trailing un-committed proposals are appended as proposal-only
 * records in proposal order). Idempotent and a provable no-op on a stream that
 * carries no `edit_proposed` / `edit_committed` rows (returns []).
 */
export function foldDecisionRecords(events: readonly EventEnvelope[]): DecisionRecord[] {
  // Per-session queue of UNCLAIMED proposals, newest last.
  const openProposals = new Map<string, EditProposedEnvelope[]>();
  const records: DecisionRecord[] = [];

  for (const ev of events) {
    if (ev.type === "edit_proposed") {
      const sid = sessionOf(ev) ?? "";
      const q = openProposals.get(sid) ?? [];
      q.push(ev);
      openProposals.set(sid, q);
      continue;
    }
    if (ev.type === "edit_committed") {
      const sid = sessionOf(ev) ?? "";
      const q = openProposals.get(sid) ?? [];
      const committedRids = ridSet(ev.payload?.appliedEdits as readonly OntologyEdit[] | undefined);
      // Claim the most-recent proposal whose staged edits cover the committed set.
      let matchIdx = -1;
      for (let i = q.length - 1; i >= 0; i--) {
        if (stagedCovers(ridSet(q[i]!.payload?.hypotheticalEdits), committedRids)) {
          matchIdx = i;
          break;
        }
      }
      if (matchIdx >= 0) {
        const [proposal] = q.splice(matchIdx, 1);
        records.push(proposalRecord(proposal!, ev));
      } else {
        records.push(commitOnlyRecord(ev));
      }
      continue;
    }
    // All other event types do not participate in the D⇄L⇄A binding.
  }

  // Trailing proposals never matched by a commit ⇒ proposal-only decisions
  // (the `proposal-only` boundary state: staged, not yet admitted by the
  // ActionType gate). Emitted in original proposal order across sessions.
  const trailing: EditProposedEnvelope[] = [];
  for (const q of openProposals.values()) for (const p of q) trailing.push(p);
  trailing.sort((a, b) => a.sequence - b.sequence);
  for (const p of trailing) records.push(proposalRecord(p));

  return records;
}
