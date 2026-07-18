// @generated
// DO NOT EDIT — produced by src/adapters/codex/generator.ts
// regenerate: bun run src/adapters/codex/generate.ts
// source: src/adapters/shared/capability-registry.json, read at generation time
// generator-schema-version: 1.0.0
//
// Deterministic Codex runtime binding: manifest facts + a flat MCP tool
// schema skeleton, generated from A610's neutral capability registry
// (docs/architecture.md ADR-007) — never hand-derived, hand-forked, or
// hand-maintained. Byte-stable: content depends only on the source
// registry file's bytes, never on wall-clock time. Drift is detected by
// `src/adapters/codex/drift-check.ts` (see generated-check.test.ts).

import type { CodexBinding } from "./types";

export const CODEX_BINDING: CodexBinding = {
  "manifest": {
    "runtimeId": "codex",
    "displayName": "Codex",
    "manifestPath": ".codex-plugin/plugin.json",
    "transports": [
      "stdio",
      "streamable-http"
    ],
    "configPaths": [
      "~/.codex/config.toml",
      "<project>/.codex/config.toml"
    ],
    "capabilities": [
      {
        "area": "packagingManifest",
        "verdicts": {
          "primary": "supported"
        },
        "citation": "R210 area 1 (Packaging/manifest), Codex row; R060:Codex#1"
      },
      {
        "area": "mcpRegistration",
        "verdicts": {
          "primary": "supported"
        },
        "citation": "R210 area 2 (MCP registration and transport), Codex row; R060:Codex#2"
      },
      {
        "area": "hooks",
        "verdicts": {
          "primary": "supported"
        },
        "citation": "R210 area 3 (Lifecycle hooks), Codex row + unsupported-facts row; R060:Codex#3"
      },
      {
        "area": "skillsCommands",
        "verdicts": {
          "skills": "supported",
          "commands": "unknown"
        },
        "citation": "R210 area 4 (Skills/commands), Codex row; R060:Codex#4 (skills); this task's fresh fetch (commands)"
      },
      {
        "area": "subagents",
        "verdicts": {
          "standalone": "supported",
          "pluginBundled": "unknown"
        },
        "citation": "R210 area 5 (Subagents), Codex row; R060:Codex#5 / R060:Codex#6"
      },
      {
        "area": "reloadInstall",
        "verdicts": {
          "primary": "supported",
          "ideExtension": "unsupported"
        },
        "citation": "R210 area 6 (Reload/install mechanics), Codex row; R060:Codex#8"
      },
      {
        "area": "schemaFlatLimits",
        "verdicts": {
          "officialRule": "unknown"
        },
        "citation": "R210 area 7 (Schema/flat-schema limits), Codex row; R060:Codex#9 and source-conflicts/unsupported-facts rows"
      },
      {
        "area": "configSurfaces",
        "verdicts": {
          "primary": "supported"
        },
        "citation": "R210 area 8 (Config surfaces), Codex row; R060:Codex#2 and R060:Codex#7"
      }
    ],
    "unsupportedFeatures": [
      "async-command-hooks",
      "prompt-agent-hook-handlers",
      "ide-extension-plugin-support"
    ],
    "unknownFeatures": [
      "plugin-bundled-custom-agents",
      "official-flat-schema-combinator-rule",
      "standalone-commands-plugin-component"
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
