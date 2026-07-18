// @generated
// DO NOT EDIT — produced by scripts/generators/capability-index.ts
// regenerate: bun run generate:all
// source: src/adapters/shared/capability-registry.json, read at generation time
// generator-schema-version: 1.0.0
//
// Deterministic derived index: one entry per (runtime, capability area)
// pair, flattened and sorted for byte-stable output. Byte-stable: content
// depends only on the source registry file's bytes, never on wall-clock
// time. generated:check (scripts/generated-check.ts) regenerates this in
// memory and fails the build on any drift.

export interface CapabilityIndexEntry {
  readonly runtime: string;
  readonly area: string;
  readonly verdicts: Readonly<Record<string, string>>;
  readonly citation: string;
  readonly factSha256: string;
}

export const CAPABILITY_INDEX: readonly CapabilityIndexEntry[] = [
  {
    runtime: "claude",
    area: "configSurfaces",
    verdicts: { "primary": "supported" },
    citation: "R210 area 8 (Config surfaces), Claude Code row; R060:Claude#6",
    factSha256: "bc4ac0f4d8233e51af030475ec1569be158a4bb84e4156308cbfad6f16ac4467",
  },
  {
    runtime: "claude",
    area: "hooks",
    verdicts: { "primary": "supported" },
    citation: "R210 area 3 (Lifecycle hooks), Claude Code row; R060:Claude#3",
    factSha256: "dabeb11476bf60d3fc199119aec307102933b8fab3d33d8eceff0c2eb97a7e74",
  },
  {
    runtime: "claude",
    area: "mcpRegistration",
    verdicts: { "primary": "supported", "sseNewRegistration": "unsupported" },
    citation: "R210 area 2 (MCP registration and transport), Claude Code row; R060:Claude#2",
    factSha256: "8bd6477caf3306ddb779bffe9692154474689f5ef98a212a1c3c342245e6cca3",
  },
  {
    runtime: "claude",
    area: "packagingManifest",
    verdicts: { "primary": "supported" },
    citation: "R210 area 1 (Packaging/manifest), Claude Code row; R060:Claude#1",
    factSha256: "734ac82aa3b0a332db6d1d8d011515620c2336110d8f7288d27db937d932bd9a",
  },
  {
    runtime: "claude",
    area: "reloadInstall",
    verdicts: { "primary": "supported" },
    citation: "R210 area 6 (Reload/install mechanics), Claude Code row; R060:Claude#7",
    factSha256: "38cf3179478b03d1ad63ccdf1c4e2e6101869f0094b52579a4722b4c5ca097f6",
  },
  {
    runtime: "claude",
    area: "schemaFlatLimits",
    verdicts: { "officialRule": "unknown" },
    citation: "R210 area 7 (Schema/flat-schema limits), Claude Code row; R060:Claude#9",
    factSha256: "f3f1071cd4f90561104b81ba5e276288cca419230e77ab3bbbaf27eef07eab5c",
  },
  {
    runtime: "claude",
    area: "skillsCommands",
    verdicts: { "commands": "supported", "skills": "supported" },
    citation: "R210 area 4 (Skills/commands), Claude Code row; R060:Claude#4 (skills); this task's fresh fetch (commands)",
    factSha256: "7b6e8943aa8977dec14df949143fc64136a693f5092e68de959e965a8946050a",
  },
  {
    runtime: "claude",
    area: "subagents",
    verdicts: { "primary": "supported" },
    citation: "R210 area 5 (Subagents), Claude Code row; R060:Claude#5",
    factSha256: "193be30b2e6dfc5315d267dfcb09ce0ba4637653175ad101f8c32a386a750cb5",
  },
  {
    runtime: "codex",
    area: "configSurfaces",
    verdicts: { "primary": "supported" },
    citation: "R210 area 8 (Config surfaces), Codex row; R060:Codex#2 and R060:Codex#7",
    factSha256: "d836292a79bd647410112a6dade681ad5f558ff766a4d2b1b11e68057ebdd551",
  },
  {
    runtime: "codex",
    area: "hooks",
    verdicts: { "primary": "supported" },
    citation: "R210 area 3 (Lifecycle hooks), Codex row + unsupported-facts row; R060:Codex#3",
    factSha256: "878a56108b73e96a1bc4ebd35076fa491fefa686432818872fddcbac40da7ca3",
  },
  {
    runtime: "codex",
    area: "mcpRegistration",
    verdicts: { "primary": "supported" },
    citation: "R210 area 2 (MCP registration and transport), Codex row; R060:Codex#2",
    factSha256: "f0a11f7eec68ecf92d7d07d9779a3bbac9541c3d2747cfb877aecacda8881637",
  },
  {
    runtime: "codex",
    area: "packagingManifest",
    verdicts: { "primary": "supported" },
    citation: "R210 area 1 (Packaging/manifest), Codex row; R060:Codex#1",
    factSha256: "a79185fa0e4b5f567e3fc042aa5015d2d0285f5e6a33948ec9d1d35521a62c60",
  },
  {
    runtime: "codex",
    area: "reloadInstall",
    verdicts: { "ideExtension": "unsupported", "primary": "supported" },
    citation: "R210 area 6 (Reload/install mechanics), Codex row; R060:Codex#8",
    factSha256: "0f3293a1cb32c5ce8384722e5ae89147b33bab5bc313dd5a7c52ecec7b47cc08",
  },
  {
    runtime: "codex",
    area: "schemaFlatLimits",
    verdicts: { "officialRule": "unknown" },
    citation: "R210 area 7 (Schema/flat-schema limits), Codex row; R060:Codex#9 and source-conflicts/unsupported-facts rows",
    factSha256: "816a8683409236fd918026db5f98d097f5aa64adf596e7d46efe497eddcfcd27",
  },
  {
    runtime: "codex",
    area: "skillsCommands",
    verdicts: { "commands": "unknown", "skills": "supported" },
    citation: "R210 area 4 (Skills/commands), Codex row; R060:Codex#4 (skills); this task's fresh fetch (commands)",
    factSha256: "b7a6c346e2e7d3af5bd49a3a15ef11a1f45b87309ace4cfcd2a1c12d1cccad13",
  },
  {
    runtime: "codex",
    area: "subagents",
    verdicts: { "pluginBundled": "unknown", "standalone": "supported" },
    citation: "R210 area 5 (Subagents), Codex row; R060:Codex#5 / R060:Codex#6",
    factSha256: "97b1a4300d3170ccd5f8fa897d4aed589e73d838ecc2695b08f983ee6fb782b6",
  },
  {
    runtime: "gemini",
    area: "configSurfaces",
    verdicts: { "primary": "supported" },
    citation: "R210 area 8 (Config surfaces), Gemini CLI row; R060:Gemini#6",
    factSha256: "1564f275b516ed1bf89da42b3dae5f6194977954df3a6bb1e9ca4bde53fbddc4",
  },
  {
    runtime: "gemini",
    area: "hooks",
    verdicts: { "primary": "supported" },
    citation: "R210 area 3 (Lifecycle hooks), Gemini CLI row + unsupported-facts row; R060:Gemini#3",
    factSha256: "05680d9feb5e3df5e62e6220c9768c02027963d2d20f0de3cc8988cf0433ab7a",
  },
  {
    runtime: "gemini",
    area: "mcpRegistration",
    verdicts: { "primary": "supported", "trustField": "unsupported" },
    citation: "R210 area 2 (MCP registration and transport), Gemini CLI row; R060:Gemini#2",
    factSha256: "ec3683a869043148e720b5e2fc847bea902be8f0c8815a237cc162b7ecf1f83f",
  },
  {
    runtime: "gemini",
    area: "packagingManifest",
    verdicts: { "primary": "supported" },
    citation: "R210 area 1 (Packaging/manifest), Gemini CLI row; R060:Gemini#1 and R060:Gemini#10",
    factSha256: "d63fe4bbf5989cf638c12fc23c14d1a169a6e9582c5c212923b4d27dfd69509a",
  },
  {
    runtime: "gemini",
    area: "reloadInstall",
    verdicts: { "primary": "supported" },
    citation: "R210 area 6 (Reload/install mechanics), Gemini CLI row; R060:Gemini#7",
    factSha256: "1ef7d984c1969a0ad83a0c4faf0f0ce289f55fa3a7c0e445d05279887d1f4ded",
  },
  {
    runtime: "gemini",
    area: "schemaFlatLimits",
    verdicts: { "primary": "supported" },
    citation: "R210 area 7 (Schema/flat-schema limits), Gemini CLI row; R060:Gemini#8",
    factSha256: "c4a13662438e4d7d9461419a48ecd5e02d0afc7bf46d51ee9607637b1fdc305c",
  },
  {
    runtime: "gemini",
    area: "skillsCommands",
    verdicts: { "commands": "supported", "skills": "supported" },
    citation: "R210 area 4 (Skills/commands), Gemini CLI row; R060:Gemini#4 and R060:Gemini#1",
    factSha256: "99819fdb7c157c808160409468ffb3fb06a929506dfbc1acd57d8723142869e1",
  },
  {
    runtime: "gemini",
    area: "subagents",
    verdicts: { "primary": "supported" },
    citation: "R210 area 5 (Subagents), Gemini CLI row; R060:Gemini#5",
    factSha256: "d4c44bd617773809b91d29abb7dad238bc4f8f0f2bb615d8bc146d2f6ba43454",
  },
];

export const CAPABILITY_REGISTRY_SOURCE_SHA256 = "ca3fbda0e75db1d8a6cf5dbb2f0b2442ee6a1107d2af73476f7ad326687ef364";
