/**
 * palantir-mini — ManagedSettingsFragment primitive (prim-learn-10)
 *
 * Typed mirror of per-project `managed-settings.d/50-palantir-mini.json`
 * RBAC fragments. Lets the system audit permission drift without reading
 * JSON ad-hoc.
 *
 * Authority chain:
 *   research/palantir/ -> rules/07-plugins-and-mcp.md
 *   -> schemas/ontology/primitives/managed-settings-fragment.ts
 *   -> palantir-mini/lib/audits/managed-settings-audit.ts
 *
 * Branded RID pattern (zero runtime cost):
 *   type ManagedSettingsFragmentRid = string & { __brand: "ManagedSettingsFragmentRid" };
 *
 * This file is STABLE CONTRACT. Do not change without a migration plan.
  * @owner palantirkc-ontology
 * @purpose ManagedSettingsFragment primitive (prim-learn-10)
 */

export type ManagedSettingsFragmentRid = string & {
  readonly __brand: "ManagedSettingsFragmentRid";
};

export const managedSettingsFragmentRid = (
  s: string,
): ManagedSettingsFragmentRid => s as ManagedSettingsFragmentRid;

export type PermissionRuleKind = "allow" | "deny";

export interface PermissionRule {
  readonly kind: PermissionRuleKind;
  /** Claude Code permission-rule pattern (e.g. "mcp__palantir-mini__emit_event") */
  readonly pattern: string;
}

export interface CapabilityTokenGate {
  readonly tokenRid: string;
  /** Dependent capability tokens that must also be present */
  readonly requires?: ReadonlyArray<string>;
}

export interface ManagedSettingsFragmentDeclaration {
  readonly rid: ManagedSettingsFragmentRid;
  /** e.g. "50-palantir-mini" */
  readonly fragmentId: string;
  readonly projectRid: string;
  readonly permissionRules: ReadonlyArray<PermissionRule>;
  readonly capabilityTokenGates?: ReadonlyArray<CapabilityTokenGate>;
  /** sha256 of the on-disk JSON fragment */
  readonly checksum: string;
  /** ISO timestamp of last known migration */
  readonly lastMigratedAt: string;
}

export interface ManagedSettingsDriftEntry {
  readonly kind:
    | "missing-tool"
    | "unexpected-tool"
    | "checksum-mismatch"
    | "gate-mismatch";
  readonly detail: string;
}

export interface ManagedSettingsAuditReport {
  readonly fragmentId: string;
  readonly projectRid: string;
  readonly drift: ReadonlyArray<ManagedSettingsDriftEntry>;
}

export interface FragmentLoader {
  (path: string): ManagedSettingsFragmentDeclaration;
}

/** Registry helper — v0 minimal registry via plain Map */
export class ManagedSettingsFragmentRegistry {
  private readonly fragments = new Map<
    ManagedSettingsFragmentRid,
    ManagedSettingsFragmentDeclaration
  >();

  register(decl: ManagedSettingsFragmentDeclaration): void {
    this.fragments.set(decl.rid, decl);
  }

  get(
    rid: ManagedSettingsFragmentRid,
  ): ManagedSettingsFragmentDeclaration | undefined {
    return this.fragments.get(rid);
  }

  list(): ManagedSettingsFragmentDeclaration[] {
    return [...this.fragments.values()];
  }

  /**
   * Load a fragment from disk. The actual JSON parsing + checksum lives in
   * the audits layer; this contract defines the return shape.
   */
  loadFromDisk(
    path: string,
    loader: FragmentLoader,
  ): ManagedSettingsFragmentDeclaration {
    const decl = loader(path);
    this.fragments.set(decl.rid, decl);
    return decl;
  }

  /**
   * Audit a fragment against the current tool surface expected by the
   * plugin manifest. Drift falls into four kinds — see ManagedSettingsDriftEntry.
   */
  audit(
    fragmentRid: ManagedSettingsFragmentRid,
    expectedTools: ReadonlyArray<string>,
  ): ManagedSettingsAuditReport {
    const decl = this.fragments.get(fragmentRid);
    if (!decl) {
      return {
        fragmentId: String(fragmentRid),
        projectRid: "",
        drift: [
          {
            kind: "missing-tool",
            detail: `Fragment ${String(fragmentRid)} not registered.`,
          },
        ],
      };
    }
    const allowed = new Set(
      decl.permissionRules.filter((r) => r.kind === "allow").map((r) => r.pattern),
    );
    const drift: ManagedSettingsDriftEntry[] = [];
    for (const tool of expectedTools) {
      if (!allowed.has(tool)) {
        drift.push({ kind: "missing-tool", detail: tool });
      }
    }
    for (const pattern of allowed) {
      if (!expectedTools.includes(pattern)) {
        drift.push({ kind: "unexpected-tool", detail: pattern });
      }
    }
    return {
      fragmentId: decl.fragmentId,
      projectRid: decl.projectRid,
      drift,
    };
  }
}

export const MANAGED_SETTINGS_FRAGMENT_REGISTRY =
  new ManagedSettingsFragmentRegistry();
