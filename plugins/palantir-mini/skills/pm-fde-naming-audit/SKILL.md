---
name: pm-fde-naming-audit
category: fde-workflow
surfaceStatus: public-core
description: "Run a read-only FDE naming audit against the current project — scans markdown,..."
allowed-tools: Read Write mcp__palantir-mini__emit_event
effort: medium
disable-model-invocation: false
---

# pm-fde-naming-audit — FDE Naming Audit (read-only)

## Purpose

Palantir의 FDE (Foundry Deployment Engine) Naming Brief §8 에서 정의한 3-way 분류
(preferred-user-facing / legacy-user-facing / compatibility-identifier) 에 따라
현재 프로젝트의 네이밍 준수 여부를 읽기 전용으로 감사합니다.

감사 결과는 마크다운 파일로 `<project>/.palantir-mini/plan/YYYY-MM-DD-fde-naming-audit-<slug>.md`
에 저장되고 사용자에게 경로가 안내됩니다.

## When to use

- 사용자가 "naming audit", "FDE 네이밍", "AIP Agent Studio vs Chatbot Studio",
  "compatibility identifier 보존" 을 요청할 때.
- `/palantir-mini:pm-fde-naming-audit` 가 명시적으로 호출될 때.
- Sprint 완료 전 naming regression 체크가 필요할 때.

## Invocation pattern

### Step 1 — Determine project root

사용자가 명시하지 않은 경우 현재 작업 디렉토리를 projectRoot로 사용합니다.

### Step 2 — Run the naming audit (pure read-only)

```typescript
import { runNamingAudit } from "lib/fde-build";

const report = await runNamingAudit({
  projectRoot: "<absolute-path>",
  maxFindings: 200,          // optional, default 200
  nowIso: new Date().toISOString(), // optional, for deterministic tests
});
```

`runNamingAudit` 는 파일을 수정하지 않습니다. 소스 파일 I/O는 읽기만 합니다.

### Step 3 — Render to markdown

```typescript
import { renderNamingAuditReportMarkdown } from "lib/fde-build";

const markdown = renderNamingAuditReportMarkdown(report, { language: "ko" });
// 또는 영어: { language: "en" }
```

### Step 4 — Save report to plans directory

```typescript
import * as fs from "node:fs";
import * as path from "node:path";
import { resolvePlanRoot } from "lib/plan-root/resolve-plan-root";

const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
const slug = "fde-naming-audit-" + report.reportRid.slice(0, 8);
const plansDir = resolvePlanRoot({ projectRoot });
const reportPath = path.join(plansDir, `${today}-${slug}.md`);

fs.mkdirSync(plansDir, { recursive: true });
fs.writeFileSync(reportPath, markdown, "utf-8");
```

보고서 저장은 **skill 호출 사이트(이 파일)**에서 수행합니다.
`lib/fde-build/naming-*.ts` 모듈 자체는 I/O를 하지 않고 string만 반환합니다.

### Step 5 — User presentation

```
# FDE Naming Audit 완료

**Report**: <reportPath>
**생성 시각**: <report.generatedAt>
**Read-only**: true (소스 파일 수정 없음)

## 요약
<report.executiveSummary>

## 주요 발견
- 호환성 식별자 (보존됨): <compatCount>건
- 레거시 사용자 노출 용어 (조치 권장): <legacyCount>건
- 선호 용어 사용 (정보): <preferredCount>건

마크다운 보고서: <reportPath>
```

### Step 6 — Emit lineage event

```
mcp__palantir-mini__emit_event({
  type: "phase_completed",
  payload: {
    phaseTag: "fde-naming-audit-completed",
    reportRid: report.reportRid,
    totalFindings: report.totalFindings,
    legacyCount: <legacyFindings.length>,
    compatCount: <compatFindings.length>
  },
  withWhat: {
    reasoning: "FDE naming audit completed for <projectRoot>. Found <N> total findings. Compatibility identifiers preserved per brief §8.3. Read-only — no source files modified.",
    memoryLayers: ["episodic", "procedural"]
  }
})
```

## Hard invariants

1. **read-only 감사**: `lib/fde-build/naming-*.ts` 모듈은 절대 소스 파일을
   수정하지 않습니다. `fs.writeFile`, `fs.appendFile`, `writeFileSync` 호출이
   해당 모듈에 존재하지 않습니다.

2. **compatibility identifier 영구 보존**: `agentRid`, `AIPAgentDeclaration`,
   `aipAgentRid`, `AIP_AGENT_REGISTRY`, `legacyNames` 는 API/스키마 surface에
   persisted된 식별자이므로 절대 리네임하지 않습니다.

3. **generated 파일 제외**: `**/src/generated/**` 경로는 DENY_GLOBS에 포함되어
   절대 스캔되지 않습니다.

4. **node_modules 제외**: `**/node_modules/**` 경로는 DENY_GLOBS에 포함됩니다.

5. **scope 외 파일 스캔 없음**: ALLOW_GLOBS에 매칭되지 않는 파일은 열리지 않습니다.

## NOT in MCP TOOLS

이 skill은 skill-only입니다. `bridge/mcp-server.ts` TOOLS 배열에 등록되지 않습니다.
직접 호출은 `/palantir-mini:pm-fde-naming-audit` 를 통해서만 가능합니다.

## Authority + cross-refs

- Schema primitive: `runtime-overlay/schemas-snapshot/ontology/primitives/fde-naming-classification.ts`
- Classifier: `lib/fde-build/naming-classifier.ts`
- Runner: `lib/fde-build/naming-audit-runner.ts`
- Renderer: `lib/fde-build/naming-report-renderer.ts`
- Plan: `~/.claude/plans/splendid-mapping-lemur.md` (sprint-138 Slice 2)
- Gap analysis brief: `~/docs/proposals/2026-05-14-claude-fde-ontology-build-gap-analysis-brief.md §8`
