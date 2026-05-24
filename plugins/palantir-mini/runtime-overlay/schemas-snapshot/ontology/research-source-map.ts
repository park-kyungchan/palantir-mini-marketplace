/**
 * Schema-local research crosswalk.
 *
 * Why this file exists:
 * - `~/.claude/research/` is the active SSoT.
 * - `~/.claude/schemas/ontology/` still contains many pre-split legacy
 *   citations under `.claude/research/palantir/`.
 * - Agents reading schema code need an explicit translation layer that says
 *   whether a legacy citation now points to an active builder/fact/synthesis
 *   layer or only to an archive bridge.
 *
 * Agent contract:
 * - Treat `palantir-developers/` as builder-entry guidance.
 * - Treat `palantir-foundry/` as official factual reference.
 * - Treat `palantir-vision/` as interpretation/synthesis.
 * - Treat `_archive/2026-04-20-palantir-consolidation/` as a legacy bridge
 *   only. Do not elevate archive files to active SSoT.
 */

import { existsSync } from "node:fs";
import { dirname } from "node:path";

export type ResearchLibrary =
  | "palantir-developers"
  | "palantir-foundry"
  | "palantir-vision"
  | "claude-code"
  | "_archive";

export type ResearchAuthorityClass =
  | "builder"
  | "fact"
  | "synthesis"
  | "capability"
  | "archive";

export type ResearchResolutionKind =
  | "active-direct"
  | "legacy-promoted-to-builder"
  | "legacy-promoted-to-fact"
  | "legacy-promoted-to-synthesis"
  | "legacy-archive-bridge";

export interface ResearchSourceResolution {
  readonly rawRef: string;
  readonly normalizedRef: string;
  readonly primaryRef: string;
  readonly canonicalRefs: readonly string[];
  readonly library: ResearchLibrary;
  readonly authorityClass: ResearchAuthorityClass;
  readonly resolutionKind: ResearchResolutionKind;
  readonly archived: boolean;
  readonly legacyBridge: boolean;
  readonly exists: boolean;
  readonly agentDirective: string;
  readonly note?: string;
}

const HOME_DIR = process.env["HOME"] ?? "/home/palantirkc";
const SCHEMA_ROOT = `${HOME_DIR}/.claude/schemas/ontology`;
const LEGACY_PREFIX = ".claude/research/palantir/";
const ARCHIVE_PREFIX = ".claude/research/_archive/2026-04-20-palantir-consolidation/";

const ARCHIVE_SUPPORT_REFS = Object.freeze({
  data: [
    ".claude/research/palantir-foundry/architecture/ontology-overview.md",
    ".claude/research/palantir-foundry/ontology/BROWSE.md",
  ],
  logic: [
    ".claude/research/palantir-foundry/architecture/ontology-overview.md",
    ".claude/research/palantir-foundry/ontology/BROWSE.md",
  ],
  action: [
    ".claude/research/palantir-foundry/ontology/BROWSE.md",
    ".claude/research/palantir-foundry/ontology/action-types-overview.md",
  ],
  security: [
    ".claude/research/palantir-foundry/security-deployments/BROWSE.md",
    ".claude/research/palantir-foundry/architecture/security-overview.md",
  ],
  entry: [
    ".claude/research/palantir-developers/BROWSE.md",
  ],
  osdk: [
    ".claude/research/palantir-developers/defense-osdk.md",
  ],
  validation: [
    ".claude/research/palantir-vision/audits/BROWSE.md",
  ],
} as const);

export const SCHEMA_AUTHORITY_ENTRY_FILES = [
  `${SCHEMA_ROOT}/BROWSE.md`,
  `${SCHEMA_ROOT}/INDEX.md`,
  `${SCHEMA_ROOT}/semantics.ts`,
  `${SCHEMA_ROOT}/primitives/research-document.ts`,
] as const;

export const SCHEMA_DOMAIN_SOURCE_FILES = [
  `${SCHEMA_ROOT}/data/schema.ts`,
  `${SCHEMA_ROOT}/logic/schema.ts`,
  `${SCHEMA_ROOT}/action/schema.ts`,
  `${SCHEMA_ROOT}/security/schema.ts`,
] as const;

const ACTIVE_LIBRARY_PREFIXES = [
  {
    prefix: ".claude/research/palantir-developers/",
    library: "palantir-developers" as const,
    authorityClass: "builder" as const,
    agentDirective:
      "Use this layer first for official builder read order, then descend only one layer deeper if the question remains unresolved.",
  },
  {
    prefix: ".claude/research/palantir-foundry/",
    library: "palantir-foundry" as const,
    authorityClass: "fact" as const,
    agentDirective:
      "Treat this as verbatim official reference. Prefer exact files over synthesis when factual product behavior is at stake.",
  },
  {
    prefix: ".claude/research/palantir-vision/",
    library: "palantir-vision" as const,
    authorityClass: "synthesis" as const,
    agentDirective:
      "Use this after builder/fact layers when interpretation, adapter mapping, or internal position is required.",
  },
  {
    prefix: ".claude/research/claude-code/",
    library: "claude-code" as const,
    authorityClass: "capability" as const,
    agentDirective:
      "Use only for Claude-runtime capability facts; do not treat it as project or ontology authority.",
  },
  {
    prefix: ".claude/research/_archive/",
    library: "_archive" as const,
    authorityClass: "archive" as const,
    agentDirective:
      "Archive is a legacy bridge only. Read an active builder/fact/synthesis file first, then consult archive only for exact historical semantics.",
  },
];

function normalizeResearchRef(rawRef: string): string {
  let ref = rawRef.trim();
  ref = ref.replace(/^~\/\.claude\//, ".claude/");
  ref = ref.replace(/^research\//, ".claude/research/");
  ref = ref.replace(/\\/g, "/");
  ref = ref.replace(/\/{2,}/g, "/");
  return ref;
}

function toAbsoluteResearchPath(ref: string): string {
  if (!ref.startsWith(".claude/research/")) return ref;
  return `${HOME_DIR}/${ref}`;
}

function dedupe<T>(items: readonly T[]): readonly T[] {
  return [...new Set(items)];
}

function finalizeResolution(
  rawRef: string,
  normalizedRef: string,
  primaryRef: string,
  canonicalRefs: readonly string[],
  library: ResearchLibrary,
  authorityClass: ResearchAuthorityClass,
  resolutionKind: ResearchResolutionKind,
  archived: boolean,
  legacyBridge: boolean,
  agentDirective: string,
  note?: string,
): ResearchSourceResolution {
  const normalizedCanonicalRefs = dedupe(canonicalRefs.map(normalizeResearchRef));
  return {
    rawRef,
    normalizedRef,
    primaryRef: normalizeResearchRef(primaryRef),
    canonicalRefs: normalizedCanonicalRefs,
    library,
    authorityClass,
    resolutionKind,
    archived,
    legacyBridge,
    exists: normalizedCanonicalRefs.every((ref) => existsSync(toAbsoluteResearchPath(ref))),
    agentDirective,
    note,
  };
}

function resolveActiveResearchRef(rawRef: string, normalizedRef: string): ResearchSourceResolution | null {
  for (const prefix of ACTIVE_LIBRARY_PREFIXES) {
    if (!normalizedRef.startsWith(prefix.prefix)) continue;
    return finalizeResolution(
      rawRef,
      normalizedRef,
      normalizedRef,
      [normalizedRef],
      prefix.library,
      prefix.authorityClass,
      "active-direct",
      prefix.library === "_archive",
      prefix.library === "_archive",
      prefix.agentDirective,
      prefix.library === "_archive"
        ? "Archive references remain valid only as explicit legacy bridges."
        : undefined,
    );
  }
  return null;
}

function resolveLegacyArchiveBridge(
  rawRef: string,
  normalizedRef: string,
  legacySubpath: string,
  domain: keyof typeof ARCHIVE_SUPPORT_REFS,
): ResearchSourceResolution {
  const archiveRef = `${ARCHIVE_PREFIX}${legacySubpath}`;
  return finalizeResolution(
    rawRef,
    normalizedRef,
    archiveRef,
    [archiveRef, ...ARCHIVE_SUPPORT_REFS[domain]],
    "_archive",
    "archive",
    "legacy-archive-bridge",
    true,
    true,
    "Read the active builder/fact supporting refs first, then use this archive file only to recover the pre-split schema nuance that has not yet been re-fetched officially.",
    "Active official coverage is incomplete for this concept; schema keeps an explicit archive bridge instead of pretending the gap is closed.",
  );
}

function resolvePromotedVisionRef(
  rawRef: string,
  normalizedRef: string,
  targetRef: string,
  supportRefs: readonly string[],
  note: string,
): ResearchSourceResolution {
  return finalizeResolution(
    rawRef,
    normalizedRef,
    targetRef,
    [targetRef, ...supportRefs],
    "palantir-vision",
    "synthesis",
    "legacy-promoted-to-synthesis",
    false,
    false,
    "Treat the promoted palantir-vision file as the active interpretation layer. If factual product mechanics matter, step sideways into the supporting official refs before trusting the synthesis.",
    note,
  );
}

function resolvePromotedBuilderRef(
  rawRef: string,
  normalizedRef: string,
  targetRef: string,
  supportRefs: readonly string[],
  note: string,
): ResearchSourceResolution {
  return finalizeResolution(
    rawRef,
    normalizedRef,
    targetRef,
    [targetRef, ...supportRefs],
    "palantir-developers",
    "builder",
    "legacy-promoted-to-builder",
    false,
    false,
    "Use the promoted builder-entry file for read order and escalation boundaries; do not descend into archive unless the exact historical wording still matters.",
    note,
  );
}

function resolveLegacyResearchRef(rawRef: string, normalizedRef: string): ResearchSourceResolution {
  const legacySubpath = normalizedRef.slice(LEGACY_PREFIX.length);

  if (legacySubpath.startsWith("data/")) {
    return resolveLegacyArchiveBridge(rawRef, normalizedRef, legacySubpath, "data");
  }
  if (legacySubpath.startsWith("logic/")) {
    return resolveLegacyArchiveBridge(rawRef, normalizedRef, legacySubpath, "logic");
  }
  if (legacySubpath.startsWith("action/")) {
    return resolveLegacyArchiveBridge(rawRef, normalizedRef, legacySubpath, "action");
  }
  if (legacySubpath.startsWith("security/")) {
    return resolveLegacyArchiveBridge(rawRef, normalizedRef, legacySubpath, "security");
  }
  if (legacySubpath.startsWith("osdk/")) {
    return resolveLegacyArchiveBridge(rawRef, normalizedRef, legacySubpath, "osdk");
  }
  if (legacySubpath.startsWith("validation/")) {
    return resolveLegacyArchiveBridge(rawRef, normalizedRef, legacySubpath, "validation");
  }
  if (legacySubpath.startsWith("philosophy/")) {
    return resolvePromotedVisionRef(
      rawRef,
      normalizedRef,
      `.claude/research/palantir-vision/${legacySubpath}`,
      [".claude/research/palantir-vision/philosophy/BROWSE.md"],
      "Philosophy moved into palantir-vision/ during the 2026-04-20 split.",
    );
  }
  if (legacySubpath === "architecture/ontology-model.md") {
    return resolvePromotedVisionRef(
      rawRef,
      normalizedRef,
      ".claude/research/palantir-vision/architecture-gap/ontology-model.md",
      [
        ".claude/research/palantir-foundry/architecture/ontology-overview.md",
        ".claude/research/palantir-foundry/architecture/architecture-center-ontology-system.md",
      ],
      "The old architecture/ontology-model note is now an interpretation-layer adapter, not the sole source of ontology truth.",
    );
  }
  if (legacySubpath.startsWith("decision-lineage/")) {
    return resolvePromotedVisionRef(
      rawRef,
      normalizedRef,
      `.claude/research/palantir-vision/${legacySubpath}`,
      [".claude/research/palantir-vision/decision-lineage/BROWSE.md"],
      "Decision-lineage interpretation moved to palantir-vision/decision-lineage/.",
    );
  }
  if (legacySubpath.startsWith("cross-cutting/")) {
    return resolvePromotedVisionRef(
      rawRef,
      normalizedRef,
      `.claude/research/palantir-vision/${legacySubpath}`,
      [".claude/research/palantir-vision/cross-cutting/BROWSE.md"],
      "Cross-cutting interpretation moved to palantir-vision/cross-cutting/.",
    );
  }
  if (legacySubpath.startsWith("ship-os/")) {
    return resolvePromotedVisionRef(
      rawRef,
      normalizedRef,
      `.claude/research/palantir-vision/${legacySubpath}`,
      [".claude/research/palantir-vision/ship-os/BROWSE.md"],
      "Ship-OS interpretation moved to palantir-vision/ship-os/.",
    );
  }
  if (legacySubpath.startsWith("entry/")) {
    return resolvePromotedBuilderRef(
      rawRef,
      normalizedRef,
      ".claude/research/palantir-developers/BROWSE.md",
      [".claude/research/palantir-developers/developers-overview.md"],
      "Legacy entry guidance was replaced by the palantir-developers builder-entry layer.",
    );
  }

  return finalizeResolution(
    rawRef,
    normalizedRef,
    normalizedRef,
    [normalizedRef],
    "_archive",
    "archive",
    "legacy-archive-bridge",
    true,
    true,
    "This legacy ref has no explicit active promotion rule yet. Treat it as archive-only until the active research layer is expanded.",
    "Unclassified legacy path; schema should migrate this to an explicit rule when active coverage becomes available.",
  );
}

export function resolveResearchRef(rawRef: string): ResearchSourceResolution {
  const normalizedRef = normalizeResearchRef(rawRef);
  const active = resolveActiveResearchRef(rawRef, normalizedRef);
  if (active) return active;
  if (normalizedRef.startsWith(LEGACY_PREFIX)) {
    return resolveLegacyResearchRef(rawRef, normalizedRef);
  }

  return finalizeResolution(
    rawRef,
    normalizedRef,
    normalizedRef,
    [normalizedRef],
    "_archive",
    "archive",
    "legacy-archive-bridge",
    true,
    true,
    "This ref is outside the active split classifier. Treat it as unresolved legacy material until a schema-local rule is added.",
    "Unknown research path pattern.",
  );
}

export function extractResearchRefs(text: string): readonly string[] {
  const matches = text.match(
    /(?:~\/\.claude\/research|\.claude\/research|research)\/[A-Za-z0-9_./-]+\.md/g,
  );
  if (!matches) return [];
  return dedupe(matches.map(normalizeResearchRef));
}

export function expandResearchSourceString(source: string): readonly string[] {
  const refs: string[] = [];
  const current = {
    dir: "" as string,
    legacyRoot: "" as string,
  };

  for (const token of source.split(/\s*(?:,|\+)\s*/)) {
    if (!token) continue;

    const fullMatch = token.match(
      /(?:~\/\.claude\/research|\.claude\/research|research)\/[A-Za-z0-9_./-]+\.md/,
    );

    if (fullMatch) {
      const normalizedRef = normalizeResearchRef(fullMatch[0]);
      refs.push(normalizedRef);
      current.dir = dirname(normalizedRef);
      current.legacyRoot = normalizedRef.startsWith(LEGACY_PREFIX) ? ".claude/research/palantir" : "";
      continue;
    }

    const siblingMatch = token.match(/[A-Za-z0-9_./-]+\.md/);
    if (!siblingMatch) continue;

    const sibling = siblingMatch[0];
    let inferred = "";

    if (sibling.includes("/")) {
      if (current.legacyRoot) {
        inferred = `${current.legacyRoot}/${sibling}`;
      }
    } else if (current.dir) {
      inferred = `${current.dir}/${sibling}`;
    }

    if (!inferred) continue;

    const normalizedRef = normalizeResearchRef(inferred);
    refs.push(normalizedRef);
    current.dir = dirname(normalizedRef);
    current.legacyRoot = normalizedRef.startsWith(LEGACY_PREFIX) ? ".claude/research/palantir" : current.legacyRoot;
  }

  return dedupe(refs);
}
