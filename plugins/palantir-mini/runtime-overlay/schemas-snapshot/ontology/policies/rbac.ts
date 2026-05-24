/**
 * palantir-mini — Layer-1 RBAC Policy primitive (prim-sec-01)
 *
 * Per-project managed-settings.d/50-palantir-mini.json fragment declares
 * permission allowlists (tools, paths, MCP servers). Layer 1 only in v0 —
 * Markings / ObjectSecurity / PermissionsCascade deferred to v1.
 *
 * This file is a TYPED schema for the policy fragment format.
 */

export type PermissionRule = string; // e.g. "Read(./ontology/**)", "Bash(bun test *)"

export interface ManagedSettingsFragment {
  readonly description?: string;
  readonly permissions: {
    readonly allow?: ReadonlyArray<PermissionRule>;
    readonly deny?:  ReadonlyArray<PermissionRule>;
    readonly ask?:   ReadonlyArray<PermissionRule>;
  };
  readonly env?: Readonly<Record<string, string>>;
}

/** Layer-1 role declarations — v0 minimal role set */
export type Layer1Role =
  | "ontology-reader"       // read-only schemas/ontology/*
  | "ontology-writer"       // Write/Edit schemas/ontology/* (ontologist agent only)
  | "codegen-executor"      // Write <project>/src/generated/*
  | "action-executor"       // can commit via MCP bridge
  | "verifier";             // read-only audit

export interface Layer1RoleDeclaration {
  readonly role: Layer1Role;
  readonly description: string;
  readonly permissions: {
    readonly allow: ReadonlyArray<PermissionRule>;
    readonly deny:  ReadonlyArray<PermissionRule>;
  };
}

export const LAYER1_ROLE_TEMPLATES: Readonly<Record<Layer1Role, Layer1RoleDeclaration>> = Object.freeze({
  "ontology-reader": {
    role: "ontology-reader",
    description: "Read-only ontology audit. Cannot write to any schema file.",
    permissions: {
      allow: ["Read(~/.claude/schemas/ontology/**)", "Read(./ontology/**)", "Grep(./**)"],
      deny:  ["Write(./**)", "Edit(./**)"],
    },
  },
  "ontology-writer": {
    role: "ontology-writer",
    description: "Authoritative ontology declaration author. Only for ontologist agents.",
    permissions: {
      allow: ["Read(~/.claude/schemas/ontology/**)", "Write(~/.claude/schemas/ontology/**)", "Edit(~/.claude/schemas/ontology/**)"],
      deny:  ["Write(~/.claude/schemas/ontology/types.ts)", "Write(~/.claude/schemas/ontology/semantics.ts)"],
    },
  },
  "codegen-executor": {
    role: "codegen-executor",
    description: "Can regenerate <project>/src/generated/*. Nothing else.",
    permissions: {
      allow: ["Write(./src/generated/**)", "Edit(./src/generated/**)", "Read(./src/**)", "Read(~/.claude/schemas/ontology/**)"],
      deny:  ["Write(./src/*.ts)", "Edit(./src/*.ts)"],
    },
  },
  "action-executor": {
    role: "action-executor",
    description: "Invokes the commit_edits MCP tool. Can write to events.jsonl via the bridge.",
    permissions: {
      allow: ["Read(./**)", "Write(./.palantir-mini/session/**)"],
      deny:  ["Write(./src/**)", "Edit(./src/**)"],
    },
  },
  "verifier": {
    role: "verifier",
    description: "Read-only verifier agent. Cannot commit or edit anything.",
    permissions: {
      allow: ["Read(./**)", "Grep(./**)", "Glob(./**)"],
      deny:  ["Write(./**)", "Edit(./**)"],
    },
  },
});
