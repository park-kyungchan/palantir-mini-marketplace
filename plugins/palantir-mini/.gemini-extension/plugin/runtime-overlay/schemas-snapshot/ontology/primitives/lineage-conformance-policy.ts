/**
 * palantir-mini — LineageConformancePolicy primitive (prim-learn-09)
 *
 * Declares which of the 5 Decision Lineage dimensions
 * (when/atopWhich/throughWhich/byWhom/withWhat) MUST be non-empty
 * for each event type. Drives the `audit_events_5d_conformance`
 * MCP handler.
 *
 * Authority chain:
 *   research/palantir/ -> rules/10-events-jsonl.md
 *   -> schemas/ontology/primitives/lineage-conformance-policy.ts
 *   -> palantir-mini/lib/audits/events-5d-audit.ts
 *
 * Branded RID pattern (zero runtime cost):
 *   type LineageConformancePolicyRid = string & { __brand: "LineageConformancePolicyRid" };
 *
 * This file is STABLE CONTRACT. Do not change without a migration plan.
  * @owner palantirkc-ontology
 * @purpose LineageConformancePolicy primitive (prim-learn-09)
 */

export type LineageConformancePolicyRid = string & {
  readonly __brand: "LineageConformancePolicyRid";
};

export const lineageConformancePolicyRid = (
  s: string,
): LineageConformancePolicyRid => s as LineageConformancePolicyRid;

export type LineageDimension =
  | "when"
  | "atopWhich"
  | "throughWhich"
  | "byWhom"
  | "withWhat";

export const ALL_LINEAGE_DIMENSIONS: ReadonlyArray<LineageDimension> = [
  "when",
  "atopWhich",
  "throughWhich",
  "byWhom",
  "withWhat",
];

export type LineageEnforcement = "hard" | "warn";

export interface LineageConformancePolicyDeclaration {
  readonly rid: LineageConformancePolicyRid;
  /** Event type name from lineage/event-types.ts */
  readonly eventType: string;
  /** Dimensions that MUST be non-empty on every event of this type */
  readonly requiredDims: ReadonlySet<LineageDimension>;
  /** byWhom.identity values that are forbidden for this event type */
  readonly deniedIdentities?: ReadonlyArray<string>;
  readonly enforcement: LineageEnforcement;
}

export interface LineageViolation {
  readonly event: unknown;
  readonly eventType: string;
  readonly missingDims: ReadonlyArray<LineageDimension>;
  readonly enforcement: LineageEnforcement;
}

export interface LineageAuditReport {
  readonly eventsScanned: number;
  readonly violations: ReadonlyArray<LineageViolation>;
}

interface LineageEventShape {
  readonly type?: string;
  readonly when?: unknown;
  readonly atopWhich?: unknown;
  readonly throughWhich?: unknown;
  readonly byWhom?: { readonly identity?: string };
  readonly withWhat?: unknown;
}

/** Registry helper — v0 minimal registry via plain Map */
export class LineageConformancePolicyRegistry {
  private readonly policies = new Map<
    string,
    LineageConformancePolicyDeclaration
  >();

  register(decl: LineageConformancePolicyDeclaration): void {
    this.policies.set(decl.eventType, decl);
  }

  get(eventType: string): LineageConformancePolicyDeclaration | undefined {
    return this.policies.get(eventType);
  }

  list(): LineageConformancePolicyDeclaration[] {
    return [...this.policies.values()];
  }

  /**
   * Audit an events.jsonl file against registered policies.
   * The caller provides the parsed events (one per line). This contract
   * defines the shape of the report.
   */
  audit(
    events: ReadonlyArray<LineageEventShape>,
  ): LineageAuditReport {
    const violations: LineageViolation[] = [];
    for (const event of events) {
      const type = event.type ?? "unknown";
      const policy = this.policies.get(type) ?? DEFAULT_POLICY;
      const missing: LineageDimension[] = [];
      for (const dim of policy.requiredDims) {
        const value = event[dim];
        if (value === undefined || value === null || value === "") {
          missing.push(dim);
        }
      }
      if (missing.length > 0) {
        violations.push({
          event,
          eventType: type,
          missingDims: missing,
          enforcement: policy.enforcement,
        });
      }
    }
    return { eventsScanned: events.length, violations };
  }
}

export const LINEAGE_CONFORMANCE_POLICY_REGISTRY =
  new LineageConformancePolicyRegistry();

/**
 * Default policy: every event MUST carry all 5 dimensions. Events that
 * are legitimately exempt from `withWhat` (e.g. `session_started`) must
 * register an override policy that drops it from `requiredDims`.
 */
export const DEFAULT_POLICY: LineageConformancePolicyDeclaration = {
  rid: lineageConformancePolicyRid("policy:lineage:default"),
  eventType: "*",
  requiredDims: new Set<LineageDimension>(ALL_LINEAGE_DIMENSIONS),
  enforcement: "hard",
};

/** `session_started` is exempt from `withWhat` (no prior reasoning). */
export const SESSION_STARTED_POLICY: LineageConformancePolicyDeclaration = {
  rid: lineageConformancePolicyRid("policy:lineage:session_started"),
  eventType: "session_started",
  requiredDims: new Set<LineageDimension>([
    "when",
    "atopWhich",
    "throughWhich",
    "byWhom",
  ]),
  enforcement: "hard",
};

const FOUR_DIM_REQUIRED = new Set<LineageDimension>([
  "when",
  "atopWhich",
  "throughWhich",
  "byWhom",
]);

/**
 * Lifecycle and monitor events are lineage anchors, not semantic reasoning
 * events. They must identify WHEN / ATOP_WHICH / THROUGH_WHICH / BY_WHOM, but
 * requiring WITH_WHAT on every heartbeat/task marker creates false audit noise.
 */
export const FOUR_DIM_LIFECYCLE_EVENT_TYPES = [
  "session_ended",
  "session_resumed",
  "post_compact_verified",
  "user_prompt_submitted",
  "task_created",
  "teammate_idle",
  "subagent_stop",
  "agent_start",
  "agent_stop",
  "shutdown_request",
  "inbox_delivered",
  "stale_state_warning",
  "inbox_cleaned",
  "subagent_state_validation",
  "agent_frontmatter_validated",
  "session_drift_check_completed",
  "skill_started",
] as const;

export const FOUR_DIM_LIFECYCLE_POLICIES: ReadonlyArray<LineageConformancePolicyDeclaration> =
  FOUR_DIM_LIFECYCLE_EVENT_TYPES.map((eventType) => ({
    rid: lineageConformancePolicyRid(`policy:lineage:${eventType}`),
    eventType,
    requiredDims: FOUR_DIM_REQUIRED,
    enforcement: "hard",
  }));

// --- Foundry equivalence (R5-F14 / S3) ---
import type { FoundryEquivalence } from "./category-foundry-equivalent";
const categoryFoundryEquivalent: FoundryEquivalence = {
  kind: "claude-extension",
  rationale: "5-dim envelope conformance policy for events.jsonl substrate (rule 10); palantir-mini-native",
};
export { categoryFoundryEquivalent as lineageConformancePolicyFoundryEquivalent };
