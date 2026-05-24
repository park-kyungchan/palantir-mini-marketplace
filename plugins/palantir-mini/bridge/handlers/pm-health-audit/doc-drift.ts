import * as fs from "fs";
import * as path from "path";
import { detectDocDriftFn } from "../detect-doc-drift";
import { checkProjectSkillOntology } from "../pm-plugin-self-check/check-project-skill-ontology";
import { loadKnownIssues } from "../../../lib/issues/issue-store";
import {
  loadProjectOntologyIndex,
  type ProjectOntologyIndex,
} from "../../../lib/capability/project-ontology-index";
import { validateCapabilityContract } from "../../../lib/capability/capability-contract";
import { PORTABLE_PALANTIR_REFERENCE_PACK, validatePortableReferencePack } from "../../../lib/education/palantir-reference-pack";
import { loadProjectScope } from "../../../lib/project-scope/loader";
import {
  normalizeSkillOntologyContract,
  type SkillOntologyContract,
} from "../../../lib/skills/skill-ontology-contract";
import type { DocDriftSignal } from "../detect-doc-drift/types";

export interface HealthDocDriftSignal {
  readonly signalId: string;
  readonly severity: "warn" | "fail";
  readonly evidencePath: string;
  readonly expected: string;
  readonly observed: string;
}

export interface HealthDocDriftResult {
  readonly mode: "doc-drift";
  readonly project: string;
  readonly memorySignals: readonly DocDriftSignal[];
  readonly browseIndexSignals: readonly DocDriftSignal[];
  readonly skillOntologySignals: readonly HealthDocDriftSignal[];
  readonly mcpSurfaceSignals: readonly HealthDocDriftSignal[];
  readonly projectOntologyIndexSignals: readonly HealthDocDriftSignal[];
  readonly agentOntologySignals: readonly HealthDocDriftSignal[];
  readonly projectScopeSignals: readonly HealthDocDriftSignal[];
  readonly knownIssueSignals: readonly HealthDocDriftSignal[];
  readonly referencePackSignals: readonly HealthDocDriftSignal[];
  readonly linkBrokenSignals: readonly HealthDocDriftSignal[];
}

interface LoadedSkillRegistry {
  readonly registryPath: string;
  readonly contracts: readonly SkillOntologyContract[];
}

function pluginRoot(): string {
  return path.resolve(import.meta.dir, "../../..");
}

function signal(
  signalId: string,
  evidencePath: string,
  expected: string,
  observed: string,
  severity: "warn" | "fail" = "warn",
): HealthDocDriftSignal {
  return { signalId, severity, evidencePath, expected, observed };
}

function normalizeSurface(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.\//, "");
}

function globMatches(pattern: string, value: string): boolean {
  const normalizedPattern = normalizeSurface(pattern);
  const normalizedValue = normalizeSurface(value);
  if (normalizedPattern === normalizedValue) return true;
  const escaped = normalizedPattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`).test(normalizedValue);
}

function loadSkillRegistry(project: string): LoadedSkillRegistry {
  const registryPath = path.join(project, ".palantir-mini", "skill-ontology", "skill-registry.json");
  if (!fs.existsSync(registryPath)) return { registryPath, contracts: [] };
  const parsed = JSON.parse(fs.readFileSync(registryPath, "utf8")) as { contracts?: unknown[] };
  const contracts = (parsed.contracts ?? [])
    .filter((item): item is SkillOntologyContract => typeof item === "object" && item !== null)
    .map((contract) => normalizeSkillOntologyContract(contract));
  return { registryPath, contracts };
}

function projectScopeSignals(project: string, registry: LoadedSkillRegistry): HealthDocDriftSignal[] {
  const scope = loadProjectScope(project);
  const scopePath = path.join(project, scope.sourcePath);
  const declaredSurfaces = [
    ...scope.surfaceMutationBoundaries.map((boundary) => boundary.surface),
    ...scope.seqDataLaneInventory.flatMap((lane) => lane.writerSurfaces),
  ];
  const signals: HealthDocDriftSignal[] = [];

  for (const contract of registry.contracts) {
    const lifecycleMutates = contract.inputOntology.artifactLifecycle.mutates;
    const surfaces = new Set([
      ...contract.actionBoundary.mutationSurfaces,
      ...lifecycleMutates,
      ...(contract.writeSurfaces ?? []),
    ]);
    for (const surface of surfaces) {
      if (declaredSurfaces.some((declared) => globMatches(declared, surface))) continue;
      signals.push(signal(
        "skill-surface-not-in-project-scope",
        registry.registryPath,
        `project scope should declare writer/mutation boundary for ${surface}`,
        `${contract.skillId} mutates ${surface}; checked ${scopePath}`,
      ));
    }
  }

  return signals;
}

function skillOntologySignals(project: string): HealthDocDriftSignal[] {
  const result = checkProjectSkillOntology(project);
  const signals: HealthDocDriftSignal[] = [];
  for (const issue of result.contractIssues ?? []) {
    signals.push(signal(
      issue.issueId,
      issue.skillPath,
      issue.message,
      `${issue.field} severity=${issue.severity}`,
      issue.severity === "fail" ? "fail" : "warn",
    ));
  }
  for (const line of result.staleSemanticSources ?? []) {
    signals.push(signal("stale-skill-semantic-source", line, "active skill docs avoid legacy semantic sources", line));
  }
  for (const line of result.presenterEditViolations ?? []) {
    signals.push(signal("presenter-edit-skill-drift", line, "Presenter remains downstream playback/readiness", line, "fail"));
  }
  for (const line of result.studioStructureViolations ?? []) {
    signals.push(signal("studio-sequencer-ownership-drift", line, "Sequencer structure ownership stays out of Studio wording", line, "fail"));
  }
  return signals;
}

function toolMetadataByName(root: string): Map<string, { lifecycle: string }> {
  const source = fs.readFileSync(path.join(root, "bridge", "mcp-server.ts"), "utf8");
  const matches = [...source.matchAll(/\n\s*name:\s*"([^"]+)"/g)];
  const tools = new Map<string, { lifecycle: string }>();
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]!;
    const next = matches[i + 1];
    const block = source.slice(match.index, next?.index ?? source.length);
    const lifecycle = /"?lifecycle"?:\s*"([^"]+)"/.exec(block)?.[1] ?? "public";
    tools.set(match[1]!, { lifecycle });
  }
  return tools;
}

function allowedMcpToolNames(markdown: string): string[] {
  const match = /^allowed-tools:\s*(.+)$/m.exec(markdown);
  if (!match) return [];
  return match[1]!
    .split(/[\s,]+/)
    .map((token) => token.trim())
    .filter((token) => token.startsWith("mcp__"))
    .map((token) => token.split("__").at(-1) ?? "")
    .filter(Boolean);
}

function mcpSurfaceSignals(root: string): HealthDocDriftSignal[] {
  const tools = toolMetadataByName(root);
  const skillsDir = path.join(root, "skills");
  const signals: HealthDocDriftSignal[] = [];
  if (!fs.existsSync(skillsDir)) return signals;

  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillPath = path.join(skillsDir, entry.name, "SKILL.md");
    if (!fs.existsSync(skillPath)) continue;
    const markdown = fs.readFileSync(skillPath, "utf8");
    for (const toolName of allowedMcpToolNames(markdown)) {
      const metadata = tools.get(toolName);
      const relative = path.relative(root, skillPath);
      if (!metadata) {
        signals.push(signal(
          "skill-allowed-tool-missing-from-mcp",
          relative,
          `${toolName} should be registered in bridge/mcp-server.ts`,
          `${entry.name} allowed-tools references ${toolName}`,
          "fail",
        ));
      } else if (metadata.lifecycle !== "public") {
        signals.push(signal(
          "skill-allowed-tool-nonpublic-lifecycle",
          relative,
          `${toolName} should be public or removed from skill allowed-tools`,
          `${toolName} lifecycle=${metadata.lifecycle}`,
        ));
      }
    }
  }

  return signals;
}

function projectOntologyIndexSignals(index: ProjectOntologyIndex): HealthDocDriftSignal[] {
  const signals: HealthDocDriftSignal[] = [];
  const validationPackIds = new Set(index.validationPacks.map((pack) => pack.validationPackId));
  for (const capability of index.capabilities) {
    for (const issue of validateCapabilityContract(capability).issues) {
      signals.push(signal(
        issue.issueId,
        capability.sourceRef,
        issue.message,
        `${capability.capabilityId}.${issue.field}`,
        issue.severity,
      ));
    }
    for (const pack of capability.outputOntology.validationPacks) {
      if (validationPackIds.has(pack)) continue;
      signals.push(signal(
        "capability-validation-pack-missing",
        capability.sourceRef,
        `${pack} should be declared in ProjectOntologyIndex.validationPacks`,
        capability.capabilityId,
      ));
    }
  }
  if (index.capabilities.length === 0) {
    signals.push(signal(
      "project-ontology-index-no-capabilities",
      ".palantir-mini/ontology-index",
      "ProjectOntologyIndex should load at least one capability",
      "none",
    ));
  }
  return signals;
}

function frontmatterBlock(markdown: string): string {
  if (!markdown.startsWith("---\n")) return "";
  const end = markdown.indexOf("\n---", 4);
  return end >= 0 ? markdown.slice(4, end) : "";
}

function frontmatterHasOntologyAgent(markdown: string): boolean {
  return /^ontologyAgent:\s*$/m.test(frontmatterBlock(markdown)) ||
    /^ontologyAgent:\s*\{.*\}\s*$/m.test(frontmatterBlock(markdown));
}

function frontmatterBoolean(block: string, key: string): boolean | undefined {
  const match = new RegExp(`^\\s*${key}:\\s*(true|false)\\s*$`, "m").exec(block);
  return match ? match[1] === "true" : undefined;
}

function agentOntologySignals(root: string): HealthDocDriftSignal[] {
  const agentsDir = path.join(root, "agents");
  const signals: HealthDocDriftSignal[] = [];
  if (!fs.existsSync(agentsDir)) return signals;

  for (const entry of fs.readdirSync(agentsDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const agentPath = path.join(agentsDir, entry.name);
    const relative = path.relative(root, agentPath);
    const markdown = fs.readFileSync(agentPath, "utf8");
    const hasBootstrap = markdown.includes("## Ontology Context Bootstrap");
    if (hasBootstrap && !frontmatterHasOntologyAgent(markdown)) {
      signals.push(signal(
        "agent-ontology-frontmatter-missing",
        relative,
        "agent with Ontology Context Bootstrap should declare ontologyAgent frontmatter",
        "missing ontologyAgent",
        "fail",
      ));
    }
    const block = frontmatterBlock(markdown);
    const mutates = /tools:.*\b(Write|Edit|MultiEdit|NotebookEdit)\b/s.test(block);
    const requiresDtc = frontmatterBoolean(block, "requiresDtcForMutation");
    if (hasBootstrap && mutates && requiresDtc !== true) {
      signals.push(signal(
        "agent-mutation-dtc-frontmatter-missing",
        relative,
        "ontology bootstrap mutating agents should declare requiresDtcForMutation: true",
        `requiresDtcForMutation=${String(requiresDtc)}`,
        "fail",
      ));
    }
  }

  return signals;
}

function knownIssueSignals(project: string, registry: LoadedSkillRegistry): HealthDocDriftSignal[] {
  const issues = loadKnownIssues(project);
  const skillIds = new Set(registry.contracts.map((contract) => contract.skillId));
  const surfaces = new Set(
    registry.contracts.flatMap((contract) => [
      ...contract.actionBoundary.mutationSurfaces,
      ...contract.inputOntology.artifactLifecycle.mutates,
      ...(contract.readSurfaces ?? []),
      ...(contract.writeSurfaces ?? []),
    ]),
  );
  const signals: HealthDocDriftSignal[] = [];
  const issueStorePath = path.join(project, ".palantir-mini", "issues", "known-issues.json");

  for (const issue of issues) {
    for (const capability of issue.affectedCapabilityRefs) {
      if (skillIds.has(capability)) continue;
      signals.push(signal(
        "known-issue-capability-missing",
        issueStorePath,
        `${capability} should exist in the project skill ontology registry`,
        `${issue.issueId} references missing capability ${capability}`,
      ));
    }
    for (const affectedSurface of issue.affectedSurfaceRefs) {
      if ([...surfaces].some((surface) => globMatches(surface, affectedSurface) || globMatches(affectedSurface, surface))) continue;
      signals.push(signal(
        "known-issue-surface-unmapped",
        issueStorePath,
        `${affectedSurface} should map to a skill read/write/mutation surface`,
        `${issue.issueId} affected surface is not covered by registry surfaces`,
      ));
    }
  }

  return signals;
}

function referencePackSignals(root: string): HealthDocDriftSignal[] {
  const signals = validatePortableReferencePack().map((issue) =>
    signal("reference-pack-contract", "lib/education/palantir-reference-pack.ts", "portable reference pack should validate", issue, "fail")
  );
  const paths = [
    PORTABLE_PALANTIR_REFERENCE_PACK.routing.browse,
    PORTABLE_PALANTIR_REFERENCE_PACK.routing.index,
    ...PORTABLE_PALANTIR_REFERENCE_PACK.entries.flatMap((entry) =>
      entry.sourceRefs
        .filter((source) => source.provenance === "plugin-runtime-overlay")
        .map((source) => source.path)
    ),
  ];

  for (const target of paths) {
    if (fs.existsSync(path.join(root, target))) continue;
    signals.push(signal(
      "reference-pack-target-missing",
      "lib/education/palantir-reference-pack.ts",
      `${target} should resolve inside the plugin runtime overlay`,
      "missing",
      "fail",
    ));
  }

  return signals;
}

// ─── PR-9: documentation-link-broken validators ───────────────────────────────

const WIKILINK_RE = /\[\[([^\]]+)\]\]/g;
const ANCHOR_RE = /\[([^\]]+)\]\(#([^)]+)\)/g;
const CROSS_PROJECT_XREF_RE = /(~\/(?:docs|\.claude)\/[^\s)`'"]+|`<project>\/[^\s)`'"]+`)/g;

/**
 * Validator 1 (PR-9): scan BROWSE.md / INDEX.md for wikilinks [[name]] and
 * section anchors [text](#anchor). Verify each resolves to a real file or header.
 */
function validateBrowseIndexLinks(projectRoot: string): HealthDocDriftSignal[] {
  const signals: HealthDocDriftSignal[] = [];
  const targets = [
    path.join(projectRoot, "BROWSE.md"),
    path.join(projectRoot, "INDEX.md"),
    path.join(projectRoot, ".claude", "BROWSE.md"),
    path.join(projectRoot, ".claude", "INDEX.md"),
  ];
  for (const filePath of targets) {
    if (!fs.existsSync(filePath)) continue;
    let content: string;
    try { content = fs.readFileSync(filePath, "utf8"); } catch { continue; }

    // Wikilinks: [[name]] — resolve as sibling file of same dir
    for (const match of content.matchAll(WIKILINK_RE)) {
      const target = match[1]!.trim();
      if (!target) continue;
      const candidates = [
        path.join(path.dirname(filePath), `${target}.md`),
        path.join(path.dirname(filePath), target, "BROWSE.md"),
        path.join(projectRoot, `${target}.md`),
      ];
      if (candidates.some((c) => fs.existsSync(c))) continue;
      signals.push(signal(
        "documentation-link-broken",
        filePath,
        `wikilink [[${target}]] should resolve to a file`,
        `unresolved against: ${candidates.join(", ")}`,
        "warn",
      ));
    }

    // Anchor links: [text](#anchor) — anchor must appear as a section header in same file
    const headers = new Set<string>();
    for (const headerMatch of content.matchAll(/^#{1,6}\s+(.+)$/gm)) {
      const slug = headerMatch[1]!.trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/^-+|-+$/g, "");
      if (slug) headers.add(slug);
    }
    for (const anchorMatch of content.matchAll(ANCHOR_RE)) {
      const anchor = anchorMatch[2]!.trim().toLowerCase();
      if (headers.has(anchor)) continue;
      signals.push(signal(
        "documentation-link-broken",
        filePath,
        `anchor #${anchor} should resolve to a section header in same file`,
        `not present in headers`,
        "warn",
      ));
    }
  }
  return signals;
}

/**
 * Validator 2 (PR-9): scan MEMORY.md, CLAUDE.md, BROWSE.md, INDEX.md for
 * cross-project xref patterns (~/docs/..., ~/.claude/..., `<project>/...`) and
 * verify the targeted file/dir exists on disk.
 */
function validateCrossProjectXrefs(projectRoot: string): HealthDocDriftSignal[] {
  const signals: HealthDocDriftSignal[] = [];
  const home = process.env.HOME ?? "/home/palantirkc";
  const targets = [
    path.join(projectRoot, "MEMORY.md"),
    path.join(projectRoot, "CLAUDE.md"),
    path.join(projectRoot, "BROWSE.md"),
    path.join(projectRoot, "INDEX.md"),
    path.join(projectRoot, ".claude", "MEMORY.md"),
    path.join(projectRoot, ".claude", "CLAUDE.md"),
  ];
  const seenRefs = new Set<string>();
  for (const filePath of targets) {
    if (!fs.existsSync(filePath)) continue;
    let content: string;
    try { content = fs.readFileSync(filePath, "utf8"); } catch { continue; }
    for (const match of content.matchAll(CROSS_PROJECT_XREF_RE)) {
      let ref = match[1]!.replace(/^`|`$/g, "").trim();
      if (!ref) continue;
      const key = `${filePath}::${ref}`;
      if (seenRefs.has(key)) continue;
      seenRefs.add(key);
      let resolved: string;
      if (ref.startsWith("~/")) {
        resolved = path.join(home, ref.slice(2));
      } else if (ref.startsWith("<project>/")) {
        resolved = path.join(projectRoot, ref.slice("<project>/".length));
      } else {
        continue;
      }
      // Strip trailing punctuation that may have been captured
      resolved = resolved.replace(/[.,;:)]+$/, "");
      if (fs.existsSync(resolved)) continue;
      signals.push(signal(
        "documentation-link-broken",
        filePath,
        `cross-project xref ${ref} should resolve to an existing file/dir`,
        `missing: ${resolved}`,
        "warn",
      ));
    }
  }
  return signals;
}

/**
 * Validator 3 (PR-9): scan MEMORY.md for "interface X { ... }" code blocks and
 * verify the referenced primitive still exists with claimed fields in
 * ~/.claude/schemas/. Best-effort — skips when no schema file for interface X
 * is found.
 */
function findSchemaFile(schemaRoot: string, interfaceName: string): string | null {
  function walk(dir: string): string | null {
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return null; }
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const found = walk(fullPath);
        if (found) return found;
      } else if (entry.isFile() && entry.name.endsWith(".ts")) {
        try {
          const content = fs.readFileSync(fullPath, "utf8");
          if (new RegExp(`(?:export\\s+)?interface\\s+${interfaceName}\\s*[{<]`).test(content)) return fullPath;
        } catch { /* skip */ }
      }
    }
    return null;
  }
  return walk(schemaRoot);
}

function validateMemorySchemaDrift(projectRoot: string): HealthDocDriftSignal[] {
  const signals: HealthDocDriftSignal[] = [];
  const memoryPaths = [
    path.join(projectRoot, "MEMORY.md"),
    path.join(projectRoot, ".claude", "MEMORY.md"),
  ];
  const schemaRoot = path.join(process.env.HOME ?? "/home/palantirkc", ".claude", "schemas");
  if (!fs.existsSync(schemaRoot)) return signals;

  for (const memoryPath of memoryPaths) {
    if (!fs.existsSync(memoryPath)) continue;
    let content: string;
    try { content = fs.readFileSync(memoryPath, "utf8"); } catch { continue; }

    // Extract interface blocks: interface Name { ... }
    const blocks: Array<{ name: string; body: string }> = [];
    const blockRe = /interface\s+([A-Z][A-Za-z0-9_]*)\s*\{([\s\S]*?)\n\}/g;
    for (const m of content.matchAll(blockRe)) {
      blocks.push({ name: m[1]!, body: m[2]! });
    }

    for (const block of blocks) {
      const primFile = findSchemaFile(schemaRoot, block.name);
      if (!primFile) continue; // no primitive found — skip best-effort
      let primContent: string;
      try { primContent = fs.readFileSync(primFile, "utf8"); } catch { continue; }

      // Extract claimed field names from MEMORY block
      const claimed = Array.from(block.body.matchAll(/\n\s+(?:readonly\s+)?(\w+)[?:]?\s*:/g)).map((m) => m[1]!);
      for (const fieldName of claimed) {
        const fieldRe = new RegExp(`(?:readonly\\s+)?${fieldName}\\??\\s*:`, "g");
        if (fieldRe.test(primContent)) continue;
        signals.push(signal(
          "documentation-link-broken",
          memoryPath,
          `MEMORY.md mentions interface ${block.name}.${fieldName} but primitive at ${primFile} does not have it`,
          `field absent from ${path.basename(primFile)}`,
          "warn",
        ));
      }
    }
  }
  return signals;
}

export default async function pmHealthAuditDocDrift(rawArgs: unknown): Promise<HealthDocDriftResult> {
  const args = (rawArgs ?? {}) as { project?: string };
  const project = args.project ?? process.cwd();
  const root = pluginRoot();
  const registry = loadSkillRegistry(project);
  const projectIndex = loadProjectOntologyIndex(project);
  const memory = await detectDocDriftFn({ project, scope: "memory" });
  const browse = await detectDocDriftFn({ project, scope: "browse" });
  const index = await detectDocDriftFn({ project, scope: "index" });

  const linkBrokenSignals = [
    ...validateBrowseIndexLinks(project),
    ...validateCrossProjectXrefs(project),
    ...validateMemorySchemaDrift(project),
  ];

  return {
    mode: "doc-drift",
    project,
    memorySignals: memory.signals,
    browseIndexSignals: [...browse.signals, ...index.signals],
    skillOntologySignals: skillOntologySignals(project),
    mcpSurfaceSignals: mcpSurfaceSignals(root),
    projectOntologyIndexSignals: projectOntologyIndexSignals(projectIndex),
    agentOntologySignals: agentOntologySignals(root),
    projectScopeSignals: projectScopeSignals(project, registry),
    knownIssueSignals: knownIssueSignals(project, registry),
    referencePackSignals: referencePackSignals(root),
    linkBrokenSignals,
  };
}
