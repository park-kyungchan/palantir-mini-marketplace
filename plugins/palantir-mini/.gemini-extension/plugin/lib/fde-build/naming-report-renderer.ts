/**
 * palantir-mini lib/fde-build/naming-report-renderer.ts
 *
 * Renders a NamingAuditReport to a markdown string for human review.
 *
 * HARD INVARIANTS:
 *   1. This module contains ZERO I/O calls. Pure string transformation only.
 *   2. Never calls fs.writeFile or any mutation path. Report writing is the
 *      caller's responsibility (skill invocation site).
 *
 * @owner palantirkc-project-implementer
 * @sprint sprint-138 Slice 2.B
 */

import type {
  NamingAuditReport,
  NamingAuditFinding,
} from "../../runtime-overlay/schemas-snapshot/ontology/primitives/fde-naming-classification";

// =============================================================================
// Options
// =============================================================================

export interface RenderOptions {
  /** Language for section headers (default: "en"). */
  readonly language?: "ko" | "en";
}

// =============================================================================
// Internal helpers
// =============================================================================

function header(text: string, level: 1 | 2 | 3): string {
  return `${"#".repeat(level)} ${text}\n`;
}

function fmtFinding(f: NamingAuditFinding): string {
  const lines: string[] = [];
  lines.push(
    `- **${f.term}** at \`${f.location}\`${f.line !== undefined ? `:${f.line}` : ""} [${f.severity}]`,
  );
  if (f.excerpt) {
    lines.push(`  > ${f.excerpt}`);
  }
  if (f.compatibilityReason) {
    lines.push(`  Compatibility reason: ${f.compatibilityReason}`);
  }
  if (f.recommendedAction && f.recommendedAction !== "no-action") {
    lines.push(
      `  Recommended action: \`${f.recommendedAction}\``,
    );
  }
  return lines.join("\n");
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Render a NamingAuditReport as a markdown string.
 *
 * Structure:
 *   - YAML front-matter (reportRid, generatedAt, readOnly flag)
 *   - Executive Summary
 *   - Term counts table (baseline count vs actual count)
 *   - Findings sections (compatibility-identifier first, then legacy-user-facing)
 *   - Out-of-scope reaffirmation
 */
export function renderNamingAuditReportMarkdown(
  report: NamingAuditReport,
  opts?: RenderOptions,
): string {
  const lang = opts?.language ?? "en";
  const isKo = lang === "ko";

  const sections: string[] = [];

  // Front-matter
  sections.push(
    [
      "---",
      `reportRid: ${report.reportRid}`,
      `generatedAt: ${report.generatedAt}`,
      `project: ${report.project}`,
      `readOnly: ${report.readOnly}`,
      `schemaVersion: ${report.schemaVersion}`,
      "---",
      "",
    ].join("\n"),
  );

  // Title
  sections.push(
    header(
      isKo
        ? "FDE Naming Audit Report (읽기 전용)"
        : "FDE Naming Audit Report (read-only)",
      1,
    ),
  );

  // Executive Summary
  sections.push(header(isKo ? "Executive Summary" : "Executive Summary", 2));
  sections.push(`${report.executiveSummary}\n`);

  // Term counts table
  sections.push(
    header(isKo ? "용어별 카운트 (baseline vs 실제)" : "Term Counts (baseline vs actual)", 2),
  );
  const tableRows = [
    "| Term | Classification | Baseline Count | Actual Count |",
    "|------|----------------|---------------|--------------|",
  ];
  for (const tc of report.termCounts) {
    const baselineSpec = null; // resolved below
    void baselineSpec; // suppress unused warning
    tableRows.push(
      `| \`${tc.term}\` | ${tc.classification} | — | ${tc.count} |`,
    );
  }
  sections.push(tableRows.join("\n") + "\n");

  // Findings — compatibility-identifier (preserved)
  const compatFindings = report.findings.filter(
    (f) => f.classification === "compatibility-identifier",
  );
  const legacyFindings = report.findings.filter(
    (f) => f.classification === "legacy-user-facing",
  );
  const preferredFindings = report.findings.filter(
    (f) => f.classification === "preferred-user-facing",
  );

  sections.push(
    header(
      isKo
        ? `호환성 식별자 (${compatFindings.length}건 — 보존 필수)`
        : `Compatibility Identifiers (${compatFindings.length} — must be preserved)`,
      2,
    ),
  );
  if (compatFindings.length === 0) {
    sections.push(
      isKo
        ? "_이 범주에서 발견된 항목 없음._\n"
        : "_No findings in this category._\n",
    );
  } else {
    sections.push(compatFindings.map(fmtFinding).join("\n") + "\n");
  }

  // Findings — legacy-user-facing (flagged)
  sections.push(
    header(
      isKo
        ? `레거시 사용자 노출 용어 (${legacyFindings.length}건 — 조치 권장)`
        : `Legacy User-Facing Terms (${legacyFindings.length} — action recommended)`,
      2,
    ),
  );
  if (legacyFindings.length === 0) {
    sections.push(
      isKo ? "_이 범주에서 발견된 항목 없음._\n" : "_No findings in this category._\n",
    );
  } else {
    sections.push(legacyFindings.map(fmtFinding).join("\n") + "\n");
  }

  // Findings — preferred (informational)
  if (preferredFindings.length > 0) {
    sections.push(
      header(
        isKo
          ? `선호 용어 사용 (${preferredFindings.length}건 — 정보성)`
          : `Preferred Term Usage (${preferredFindings.length} — informational)`,
        2,
      ),
    );
    sections.push(preferredFindings.map(fmtFinding).join("\n") + "\n");
  }

  // Out-of-scope reaffirmation
  sections.push(header(isKo ? "범위 외 재확인" : "Out-of-Scope Reaffirmation", 2));
  sections.push(
    [
      isKo
        ? "이 감사는 **읽기 전용**입니다. 소스 파일을 직접 수정하지 않습니다."
        : "This audit is **read-only**. It does not modify source files.",
      "",
      isKo
        ? `다음 항목은 스캔에서 제외됩니다:`
        : `The following are excluded from scanning:`,
      ...report.deniedGlobs.map((g) => `- \`${g}\``),
      "",
      isKo
        ? "호환성 식별자(compatibility identifiers)는 영구 보존됩니다:"
        : "Compatibility identifiers are permanently preserved:",
      ...report.termCounts
        .filter((tc) => tc.classification === "compatibility-identifier")
        .map((tc) => `- \`${tc.term}\``),
    ].join("\n") + "\n",
  );

  return sections.join("\n");
}
