// @generated
// DO NOT EDIT — produced by src/adapters/claude/generator.ts
// regenerate: bun run src/adapters/claude/generate.ts
// source: src/adapters/shared/capability-registry.json, read at generation time
// generator-schema-version: 1.0.0
//
// Deterministic Claude runtime binding: manifest facts + a flat MCP tool
// schema skeleton, generated from A610's neutral capability registry
// (docs/architecture.md ADR-007) — never hand-derived, hand-forked, or
// hand-maintained. Byte-stable: content depends only on the source
// registry file's bytes, never on wall-clock time. Drift is detected by
// `src/adapters/claude/drift-check.ts` (see generated-check.test.ts).

import type { ClaudeBinding } from "./types";

export const CLAUDE_BINDING: ClaudeBinding = {
  "manifest": {
    "runtimeId": "claude",
    "displayName": "Claude Code",
    "manifestPath": ".claude-plugin/plugin.json",
    "transports": [
      "stdio",
      "http"
    ],
    "configPaths": [
      ".claude/settings.json",
      ".claude/settings.local.json"
    ],
    "capabilities": [
      {
        "area": "packagingManifest",
        "verdicts": {
          "primary": "supported"
        },
        "citation": "R210 area 1 (Packaging/manifest), Claude Code row; R060:Claude#1"
      },
      {
        "area": "mcpRegistration",
        "verdicts": {
          "primary": "supported",
          "sseNewRegistration": "unsupported"
        },
        "citation": "R210 area 2 (MCP registration and transport), Claude Code row; R060:Claude#2"
      },
      {
        "area": "hooks",
        "verdicts": {
          "primary": "supported"
        },
        "citation": "R210 area 3 (Lifecycle hooks), Claude Code row; R060:Claude#3"
      },
      {
        "area": "skillsCommands",
        "verdicts": {
          "skills": "supported",
          "commands": "supported"
        },
        "citation": "R210 area 4 (Skills/commands), Claude Code row; R060:Claude#4 (skills); this task's fresh fetch (commands)"
      },
      {
        "area": "subagents",
        "verdicts": {
          "primary": "supported"
        },
        "citation": "R210 area 5 (Subagents), Claude Code row; R060:Claude#5"
      },
      {
        "area": "reloadInstall",
        "verdicts": {
          "primary": "supported"
        },
        "citation": "R210 area 6 (Reload/install mechanics), Claude Code row; R060:Claude#7"
      },
      {
        "area": "schemaFlatLimits",
        "verdicts": {
          "officialRule": "unknown"
        },
        "citation": "R210 area 7 (Schema/flat-schema limits), Claude Code row; R060:Claude#9"
      },
      {
        "area": "configSurfaces",
        "verdicts": {
          "primary": "supported"
        },
        "citation": "R210 area 8 (Config surfaces), Claude Code row; R060:Claude#6"
      }
    ],
    "unsupportedFeatures": [
      "plugin-agent-hooks-mcpServers-permissionMode-fields",
      "new-remote-sse-mcp-registration"
    ],
    "unknownFeatures": [
      "runtime-specific-flat-schema-combinator-rule"
    ]
  },
  "tools": [
    {
      "name": "queryCapability_packagingManifest",
      "description": "Query the \"packagingManifest\" capability fact for a runtime, sourced from A610's neutral capability registry (never hand-derived).",
      "inputSchema": {
        "type": "object",
        "properties": {
          "runtime": {
            "type": "string",
            "description": "Which runtime's fact to query.",
            "enum": [
              "codex",
              "claude",
              "gemini"
            ]
          }
        },
        "required": [
          "runtime"
        ],
        "additionalProperties": false
      }
    },
    {
      "name": "queryCapability_mcpRegistration",
      "description": "Query the \"mcpRegistration\" capability fact for a runtime, sourced from A610's neutral capability registry (never hand-derived).",
      "inputSchema": {
        "type": "object",
        "properties": {
          "runtime": {
            "type": "string",
            "description": "Which runtime's fact to query.",
            "enum": [
              "codex",
              "claude",
              "gemini"
            ]
          }
        },
        "required": [
          "runtime"
        ],
        "additionalProperties": false
      }
    },
    {
      "name": "queryCapability_hooks",
      "description": "Query the \"hooks\" capability fact for a runtime, sourced from A610's neutral capability registry (never hand-derived).",
      "inputSchema": {
        "type": "object",
        "properties": {
          "runtime": {
            "type": "string",
            "description": "Which runtime's fact to query.",
            "enum": [
              "codex",
              "claude",
              "gemini"
            ]
          }
        },
        "required": [
          "runtime"
        ],
        "additionalProperties": false
      }
    },
    {
      "name": "queryCapability_skillsCommands",
      "description": "Query the \"skillsCommands\" capability fact for a runtime, sourced from A610's neutral capability registry (never hand-derived).",
      "inputSchema": {
        "type": "object",
        "properties": {
          "runtime": {
            "type": "string",
            "description": "Which runtime's fact to query.",
            "enum": [
              "codex",
              "claude",
              "gemini"
            ]
          }
        },
        "required": [
          "runtime"
        ],
        "additionalProperties": false
      }
    },
    {
      "name": "queryCapability_subagents",
      "description": "Query the \"subagents\" capability fact for a runtime, sourced from A610's neutral capability registry (never hand-derived).",
      "inputSchema": {
        "type": "object",
        "properties": {
          "runtime": {
            "type": "string",
            "description": "Which runtime's fact to query.",
            "enum": [
              "codex",
              "claude",
              "gemini"
            ]
          }
        },
        "required": [
          "runtime"
        ],
        "additionalProperties": false
      }
    },
    {
      "name": "queryCapability_reloadInstall",
      "description": "Query the \"reloadInstall\" capability fact for a runtime, sourced from A610's neutral capability registry (never hand-derived).",
      "inputSchema": {
        "type": "object",
        "properties": {
          "runtime": {
            "type": "string",
            "description": "Which runtime's fact to query.",
            "enum": [
              "codex",
              "claude",
              "gemini"
            ]
          }
        },
        "required": [
          "runtime"
        ],
        "additionalProperties": false
      }
    },
    {
      "name": "queryCapability_schemaFlatLimits",
      "description": "Query the \"schemaFlatLimits\" capability fact for a runtime, sourced from A610's neutral capability registry (never hand-derived).",
      "inputSchema": {
        "type": "object",
        "properties": {
          "runtime": {
            "type": "string",
            "description": "Which runtime's fact to query.",
            "enum": [
              "codex",
              "claude",
              "gemini"
            ]
          }
        },
        "required": [
          "runtime"
        ],
        "additionalProperties": false
      }
    },
    {
      "name": "queryCapability_configSurfaces",
      "description": "Query the \"configSurfaces\" capability fact for a runtime, sourced from A610's neutral capability registry (never hand-derived).",
      "inputSchema": {
        "type": "object",
        "properties": {
          "runtime": {
            "type": "string",
            "description": "Which runtime's fact to query.",
            "enum": [
              "codex",
              "claude",
              "gemini"
            ]
          }
        },
        "required": [
          "runtime"
        ],
        "additionalProperties": false
      }
    }
  ],
  "sourceOfRecord": "outputs/r210-runtime-capability-matrix.md",
  "registrySourceSha256": "ca3fbda0e75db1d8a6cf5dbb2f0b2442ee6a1107d2af73476f7ad326687ef364"
};
