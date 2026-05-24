// palantir-mini - portable Palantir reference pack for education kernels.
//
// This is a small, dependency-free summary layer over the vendored
// runtime-overlay research-core. It is not a replacement for
// ~/.claude/research; it gives fresh runtimes stable routing anchors when the
// external research tree is absent or stale.

export type PalantirReferenceDomain =
  | "aip"
  | "ontology"
  | "context"
  | "function"
  | "action"
  | "security"
  | "evals";

export interface PalantirReferenceSource {
  readonly label: string;
  readonly path: string;
  readonly provenance: "plugin-runtime-overlay" | "external-research";
  readonly readOnly: boolean;
}

export interface PalantirReferenceEntry {
  readonly domain: PalantirReferenceDomain;
  readonly title: string;
  readonly summary: string;
  readonly kernelImplication: string;
  readonly sourceRefs: readonly PalantirReferenceSource[];
}

export interface PortablePalantirReferencePack {
  readonly packId: "portable-palantir-reference-pack.v0";
  readonly routing: {
    readonly browse: "runtime-overlay/research-core/palantir-foundry/BROWSE.md";
    readonly index: "runtime-overlay/research-core/palantir-foundry/INDEX.md";
  };
  readonly entries: readonly PalantirReferenceEntry[];
}

const SOURCE_ROOT = "runtime-overlay/research-core";

function overlaySource(label: string, relativePath: string): PalantirReferenceSource {
  return {
    label,
    path: `${SOURCE_ROOT}/${relativePath}`,
    provenance: "plugin-runtime-overlay",
    readOnly: true,
  };
}

function externalSource(label: string, relativePath: string): PalantirReferenceSource {
  return {
    label,
    path: `~/.claude/research/${relativePath}`,
    provenance: "external-research",
    readOnly: true,
  };
}

export const PORTABLE_PALANTIR_REFERENCE_PACK: PortablePalantirReferencePack = {
  packId: "portable-palantir-reference-pack.v0",
  routing: {
    browse: "runtime-overlay/research-core/palantir-foundry/BROWSE.md",
    index: "runtime-overlay/research-core/palantir-foundry/INDEX.md",
  },
  entries: [
    {
      domain: "aip",
      title: "AIP as agent runtime boundary",
      summary:
        "AIP work is treated as governed agent runtime work: agents use tools, memory, provenance, and human approval boundaries instead of free-form side effects.",
      kernelImplication:
        "Lecture delivery actions must preserve tool provenance, approval state, and replayable evidence before they become presenter-ready.",
      sourceRefs: [
        overlaySource(
          "Agentic Runtime security summary",
          "palantir-foundry/aip/blog-securing-agents-agentic-runtime-1-2026-01-22.md",
        ),
        externalSource(
          "Palantir Foundry AIP router",
          "palantir-foundry/BROWSE.md",
        ),
      ],
    },
    {
      domain: "ontology",
      title: "Ontology as semantic source of truth",
      summary:
        "Ontology-mediated reads and writes keep objects, actions, permissions, and application state explicit across humans and agents.",
      kernelImplication:
        "LectureProblem, SolutionStep, LectureSequence, SequencerDraft, and PresenterReadiness are modeled as explicit kernel nouns instead of inferred UI state.",
      sourceRefs: [
        externalSource("Ontology research router", "palantir-foundry/ontology/BROWSE.md"),
        overlaySource("Portable pack router", "palantir-foundry/BROWSE.md"),
      ],
    },
    {
      domain: "context",
      title: "Context is routed, not bulk-loaded",
      summary:
        "Context should be selected by BROWSE/INDEX routers and carried as traceable references rather than copied wholesale into every runtime.",
      kernelImplication:
        "The lecture kernel stores evidence refs and fixture provenance; it does not inline entire solution or presenter artifacts into the sequence model.",
      sourceRefs: [
        overlaySource("Portable pack router", "palantir-foundry/BROWSE.md"),
        overlaySource("Portable pack index", "palantir-foundry/INDEX.md"),
      ],
    },
    {
      domain: "function",
      title: "Functions are evaluable logic surfaces",
      summary:
        "AIP Evals treats function outputs as measurable behavior, including Boolean or numeric custom evaluation functions.",
      kernelImplication:
        "Lecture kernel functions return deterministic, testable objects: ingestion, sequence context, sequencer draft, readiness, and governance evaluation.",
      sourceRefs: [
        overlaySource(
          "AIP Evals and Ontology edit simulation",
          "palantir-foundry/aip/aip-evals-overview-and-ontology-edits-2026-04-14.md",
        ),
      ],
    },
    {
      domain: "action",
      title: "Actions require boundaries and recoverability",
      summary:
        "Ontology edits are tested through simulation and checked through identifiable properties instead of mutating production state during evaluation.",
      kernelImplication:
        "SequencerDraft contains proposed SequencerEdit records; v0 does not commit runtime changes or mutate generated presenter artifacts.",
      sourceRefs: [
        overlaySource(
          "AIP Evals and Ontology edit simulation",
          "palantir-foundry/aip/aip-evals-overview-and-ontology-edits-2026-04-14.md",
        ),
      ],
    },
    {
      domain: "security",
      title: "Security follows memory and tool provenance",
      summary:
        "Agentic runtime security depends on sandboxing, provenance-based tool management, ontology-mediated memory, and governance hooks.",
      kernelImplication:
        "Presenter readiness must fail closed when evidence, teacher approval, or declared mutation boundaries are missing.",
      sourceRefs: [
        overlaySource(
          "Agentic Runtime security summary",
          "palantir-foundry/aip/blog-securing-agents-agentic-runtime-1-2026-01-22.md",
        ),
      ],
    },
    {
      domain: "evals",
      title: "Evals make readiness measurable",
      summary:
        "AIP Evals provides suite, case, target function, evaluation function, and metrics concepts for comparing behavior across versions.",
      kernelImplication:
        "Lecture Delivery Kernel v0 ships with deterministic test cases and eval-suite metadata before any runtime presenter mutation.",
      sourceRefs: [
        overlaySource(
          "AIP Evals and Ontology edit simulation",
          "palantir-foundry/aip/aip-evals-overview-and-ontology-edits-2026-04-14.md",
        ),
      ],
    },
  ],
};

export function getReferenceEntry(
  domain: PalantirReferenceDomain,
  pack: PortablePalantirReferencePack = PORTABLE_PALANTIR_REFERENCE_PACK,
): PalantirReferenceEntry {
  const entry = pack.entries.find((item) => item.domain === domain);
  if (!entry) {
    throw new Error(`Unknown Palantir reference domain: ${domain}`);
  }
  return entry;
}

export function validatePortableReferencePack(
  pack: PortablePalantirReferencePack = PORTABLE_PALANTIR_REFERENCE_PACK,
): string[] {
  const issues: string[] = [];
  const requiredDomains: readonly PalantirReferenceDomain[] = [
    "aip",
    "ontology",
    "context",
    "function",
    "action",
    "security",
    "evals",
  ];

  for (const domain of requiredDomains) {
    const entry = pack.entries.find((item) => item.domain === domain);
    if (!entry) {
      issues.push(`missing-domain:${domain}`);
      continue;
    }
    if (!entry.summary.trim()) issues.push(`empty-summary:${domain}`);
    if (!entry.kernelImplication.trim()) issues.push(`empty-kernel-implication:${domain}`);
    if (entry.sourceRefs.length === 0) issues.push(`missing-source-ref:${domain}`);
    for (const source of entry.sourceRefs) {
      if (!source.readOnly) issues.push(`mutable-source-ref:${domain}:${source.label}`);
      if (!source.path.trim()) issues.push(`empty-source-path:${domain}:${source.label}`);
    }
  }

  if (!pack.routing.browse.endsWith("BROWSE.md")) {
    issues.push("routing-browse-missing");
  }
  if (!pack.routing.index.endsWith("INDEX.md")) {
    issues.push("routing-index-missing");
  }

  return issues;
}
