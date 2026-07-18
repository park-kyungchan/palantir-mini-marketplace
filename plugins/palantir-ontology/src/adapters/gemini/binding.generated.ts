// @generated
// DO NOT EDIT — produced by src/adapters/gemini/generator.ts
// regenerate: bun run src/adapters/gemini/generate.ts
// source: src/adapters/shared/capability-registry.json, read at generation time
// generator-schema-version: 1.0.0
//
// Deterministic Gemini runtime binding: manifest facts + a flat MCP tool
// schema skeleton, generated from A610's neutral capability registry
// (docs/architecture.md ADR-007) — never hand-derived, hand-forked, or
// hand-maintained. Byte-stable: content depends only on the source
// registry file's bytes, never on wall-clock time. Drift is detected by
// `src/adapters/gemini/drift-check.ts` (see generated-check.test.ts).

import type { GeminiBinding } from "./types";

export const GEMINI_BINDING: GeminiBinding = {
  "manifest": {
    "runtimeId": "gemini",
    "displayName": "Gemini CLI",
    "manifestPath": "gemini-extension.json",
    "transports": [
      "stdio",
      "sse",
      "streamable-http"
    ],
    "configPaths": [
      "user settings.json",
      "project settings.json",
      "extension mcpServers"
    ],
    "capabilities": [
      {
        "area": "packagingManifest",
        "verdicts": {
          "primary": "supported"
        },
        "citation": "R210 area 1 (Packaging/manifest), Gemini CLI row; R060:Gemini#1 and R060:Gemini#10"
      },
      {
        "area": "mcpRegistration",
        "verdicts": {
          "primary": "supported",
          "trustField": "unsupported"
        },
        "citation": "R210 area 2 (MCP registration and transport), Gemini CLI row; R060:Gemini#2"
      },
      {
        "area": "hooks",
        "verdicts": {
          "primary": "supported"
        },
        "citation": "R210 area 3 (Lifecycle hooks), Gemini CLI row + unsupported-facts row; R060:Gemini#3"
      },
      {
        "area": "skillsCommands",
        "verdicts": {
          "skills": "supported",
          "commands": "supported"
        },
        "citation": "R210 area 4 (Skills/commands), Gemini CLI row; R060:Gemini#4 and R060:Gemini#1"
      },
      {
        "area": "subagents",
        "verdicts": {
          "primary": "supported"
        },
        "citation": "R210 area 5 (Subagents), Gemini CLI row; R060:Gemini#5"
      },
      {
        "area": "reloadInstall",
        "verdicts": {
          "primary": "supported"
        },
        "citation": "R210 area 6 (Reload/install mechanics), Gemini CLI row; R060:Gemini#7"
      },
      {
        "area": "schemaFlatLimits",
        "verdicts": {
          "primary": "supported"
        },
        "citation": "R210 area 7 (Schema/flat-schema limits), Gemini CLI row; R060:Gemini#8"
      },
      {
        "area": "configSurfaces",
        "verdicts": {
          "primary": "supported"
        },
        "citation": "R210 area 8 (Config surfaces), Gemini CLI row; R060:Gemini#6"
      }
    ],
    "unsupportedFeatures": [
      "extension-mcp-trust-field",
      "non-command-hook-handler-types",
      "stable-release-critical-extension-subagents",
      "universal-unpaid-google-one-availability"
    ],
    "unknownFeatures": [],
    "nativePackaging": {
      "supported": false,
      "transportMode": "neutral-mcp-cli",
      "note": "This marketplace (/home/palantirkc/palantir-mini-marketplace) ships no gemini-extension.json / .gemini-plugin/ native packaging convention at generation time (only .codex-plugin/ and .claude-plugin/ exist here). Per execution-plan §9 row A640 / docs/architecture.md ADR-007, this row ships a neutral MCP/CLI transport (this binding's flat queryCapability_<area> tool skeleton) and records native packaging unsupported rather than fabricating native-support. This is a marketplace-packaging determination, not a claim about Gemini CLI's own documented capability — contrast with manifest.capabilities.packagingManifest below, whose verdict/citation is carried forward verbatim from R210 and records Gemini CLI's own documentation as supporting extension packaging in the abstract."
    }
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
