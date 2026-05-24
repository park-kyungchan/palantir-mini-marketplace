// palantir-mini v3.5.0 — detect-doc-drift sibling: BROWSE/INDEX cross-reference scanner
// Wave 2 SP-2: authority-class-aware xref scanning via lib/research/resolve-ref.

import * as fs from "fs";
import * as path from "path";
import { resolveResearchRef } from "../../../lib/research/resolve-ref";
import type { DocDriftSignal } from "./types";
import { RESEARCH_HREF_RE } from "./types";

export function scanXrefs(docFile: string): DocDriftSignal[] {
  const signals: DocDriftSignal[] = [];
  if (!fs.existsSync(docFile)) return signals;

  const content = fs.readFileSync(docFile, "utf8");
  const mdLinkRe = /\[([^\]]*)\]\(([^)]+)\)/g;
  let m: RegExpExecArray | null;

  while ((m = mdLinkRe.exec(content)) !== null) {
    const href = m[2];
    if (!href) continue;
    if (href.startsWith("http") || href.startsWith("#")) continue;
    const hrefNoAnchor = href.split("#")[0] ?? href;
    const resolved = path.resolve(path.dirname(docFile), hrefNoAnchor);

    if (RESEARCH_HREF_RE.test(hrefNoAnchor)) {
      const resolution = resolveResearchRef(hrefNoAnchor);
      const isLegacyPromoted =
        resolution.resolutionKind === "legacy-promoted-to-builder" ||
        resolution.resolutionKind === "legacy-promoted-to-fact" ||
        resolution.resolutionKind === "legacy-promoted-to-synthesis";

      if (!resolution.archived && !resolution.legacyBridge && isLegacyPromoted) {
        signals.push({
          driftKind: "legacy_ref_should_migrate",
          evidencePath: docFile,
          expected: resolution.primaryRef,
          observed: hrefNoAnchor,
          authorityClass: resolution.authorityClass,
        });
      } else if (resolution.archived && !fs.existsSync(resolved)) {
        signals.push({
          driftKind: "broken_xref",
          evidencePath: docFile,
          expected: `${href} exists on disk`,
          observed: `not found at ${resolved}`,
          authorityClass: "archive",
        });
      } else if (!fs.existsSync(resolved)) {
        signals.push({
          driftKind: "broken_xref",
          evidencePath: docFile,
          expected: `${href} exists on disk`,
          observed: `not found at ${resolved}`,
          authorityClass: resolution.authorityClass,
        });
      }
      // else: active ref to an existing file — no signal
    } else {
      // Non-research xref — preserve existing behavior, no authorityClass
      if (!fs.existsSync(resolved)) {
        signals.push({
          driftKind: "broken_xref",
          evidencePath: docFile,
          expected: `${href} exists on disk`,
          observed: `not found at ${resolved}`,
        });
      }
    }
  }

  return signals;
}
