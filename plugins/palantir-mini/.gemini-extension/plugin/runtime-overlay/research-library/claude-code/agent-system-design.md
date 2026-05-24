# Claude Code Agent System Design — Patterns & Architecture

> Date: 2026-04-11 (updated 2026-04-19) | CC Version baseline: v2.1.101 + v2.1.102-113 W2-7 addenda | Model: Opus 4.7 (1M)
> Sources: claude-code-guide agent, official docs scraping, cc-agent-guide deep dive
> Purpose: Production patterns for ontology-driven agent systems

---

## 1. Agent Taxonomy

Claude Code provides 4 layers of agent capability:

```
Layer 1: Subagents (Agent tool)
  └─ Spawned by lead, isolated context, returns result
  └─ Max 10 simultaneous, no nested spawn
  └─ Types: general-purpose, Explore, Plan, implementer, researcher,
            verifier-correctness, verifier-adversarial, claude-code-guide

Layer 2: Custom Agents (.claude/agents/*.md)
  └─ Frontmatter-configured, reusable definitions
  └─ Own tool allowlists, permissions, hooks, MCP servers
  └─ Invoked via @mention, /agents, or --agent flag

Layer 3: Agent Teams (experimental, CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1)
  └─ Lead + up to 10 teammates
  └─ Shared task list, mailbox messaging, file-lock claiming
  └─ TeammateIdle/TaskCompleted hooks for feedback loops

Layer 4: Managed Agents (cloud, separate product)
  └─ See managed-agents.md
```

---

## 2. Agent Teams — Internal Architecture

### 2.1 Communication Protocol

```
~/.claude/teams/{name}/
├── config.json          ← Runtime state: members[], heartbeats
└── (auto-managed)

~/.claude/tasks/{name}/
├── task-001.jsonl       ← File-lock claimed
├── task-002.jsonl
└── ...
```

**Task Claiming (File-Lock)**:
1. Read `task-{id}` → check `status == "pending"`
2. Check `dependencies[]` all completed
3. Atomically write: `status = "in_progress"`, `assigned_to = name`
4. Race resolution: filesystem last-write-wins
5. Lock timeout: ~15 min idle → reclaimable

**Message Routing**:

| Type | Mechanism | Blocking? |
|------|-----------|-----------|
| Point-to-point | `SendMessage(to: "name")` | Optional (`metadata.blocking`) |
| Broadcast | `SendMessage(to: "*")` | Optional |
| Structured | `shutdown_request`, `plan_approval_response` | Protocol-defined |

**Context Isolation**:
- 팀원은 리드의 대화 이력을 받지 않음
- 프로젝트 context (CLAUDE.md, rules, skills, MCP) 공유
- 스폰 프롬프트가 팀원 시스템 지침에 주입

### 2.2 TeammateIdle / TaskCompleted Hooks

**Exit code 2 = block + feedback** (핵심 enforcement 메커니즘):

```bash
#!/bin/bash
# TaskCompleted hook — ontology validation gate
INPUT=$(cat)
TASK_ID=$(echo "$INPUT" | jq -r '.task_id')

# Run semantic audit
if ! bunx tsc --noEmit 2>/dev/null; then
  echo "TypeScript errors. Fix before marking complete." >&2
  exit 2  # BLOCKS completion, teammate gets feedback
fi
exit 0  # Allow completion
```

**Flow when exit 2:**
1. Hook stderr → 팀원에게 context/feedback으로 전달
2. 팀원 중단되지 않음 — 피드백 기반 재시도
3. 같은 태스크 재시도 또는 접근 조정

### 2.3 Limits

| Limit | Value |
|-------|-------|
| Max teammates | 10 (practical), 5-6 optimal |
| Nested teams | 금지 |
| Teams per session | 1 |
| Session resumption | 진행 중 팀원 복구 불가 |
| Context isolation | 완전 (교차 이력 없음) |
| Circular dependencies | 데드락 발생 (문서화된 제한) |
| Token cost | ~5-8x single session (5 teammates) |

---

## 3. Custom Agent Definition — Complete Frontmatter

### 3.1 All Fields

```yaml
# .claude/agents/ontology-verifier.md
---
name: ontology-verifier           # 필수. @mention에서 사용
description: Validates semantic drift  # 필수. 에이전트 선택기에 표시
model: opus                        # haiku | sonnet | opus
tools:                             # 허용 도구 목록 (미지정 시 전체)
  - Read
  - Glob
  - Grep
  - "Bash(bun test *)"
  - "Bash(bunx tsc *)"
  - "mcp__context7__*"
disallowedTools: []                # 차단 도구 목록
permissionMode: default            # default | acceptEdits | bypassPermissions | plan
isolation: none                    # none | worktree
maxTurns: 50                       # 하드 스톱 (graceful 없음)
skills:                            # 사용 가능 스킬
  - /verify
  - /3d-scene-audit
mcpServers:                        # 에이전트 전용 MCP 서버
  - name: context7
    command: bunx
    args: ["@context7/mcp"]
memory: true                       # 메모리 읽기/쓰기 허용
hooks:                             # 에이전트 스코프 hook
  PreToolUse:
    - matcher: "Edit|Write"
      hooks:
        - type: command
          command: ./hooks/ontology-gate.sh
background: false                  # 미래 예약 (현재 미노출)
effort: high                       # low | medium | high | max
---

# Agent instructions (markdown body)
You validate ontology semantic drift...
```

### 3.2 Tool Allowlist Mechanics

```yaml
tools:
  - "Bash(npm test)"          # 정확히 npm test만
  - "Bash(npm run *)"         # npm run <anything>
  - "Read"                    # 모든 Read 호출
  - "mcp__github__*"          # GitHub MCP 전체
  - "mcp__tavily__search"     # 특정 Tavily 도구만
```

**항상 사용 가능 (팀 context):** SendMessage, TaskCreate, TaskUpdate, RequestShutdown

### 3.3 Worktree Isolation

```
isolation: worktree 설정 시:
  → .git/worktrees/claude/agent-{id}-{timestamp}/ 생성
  → 브랜치: claude/agent-{uuid}
  → 에이전트 종료 시 자동 정리
  → SubagentStop hook 완료 후 삭제
  → 크래시 시 수동 정리 필요: git worktree remove ...
```

### 3.4 maxTurns

- N턴 도달 시 시스템 메시지: "Maximum turns reached. Session ending."
- 턴 N+1 불가 → SubagentStop hook fire → 에이전트 exit
- graceful degradation 없음 — 체크포인트 강제를 위해 hook과 함께 사용

---

## 4. Orchestration Patterns

### 4.1 Decision Tree

```
작업이 병렬화 가능한가?
├─ NO → Single session 또는 subagents
└─ YES
   ├─ 팀원 간 소통/토론 필요?
   │  ├─ NO → Subagents (저렴, 단순)
   │  └─ YES → Agent Teams
   │     ├─ 독립 탐색 (리서치, 리뷰) → 3-5 팀원, 리드 종합
   │     └─ 협업 구현 (파일 분산) → disjoint ownership + hooks
   └─ 오버헤드 정당화?
      ├─ 소규모 (<30분) → Single session
      └─ 대규모 (>2시간) → Teams (병렬 가치 > token 비용 시)
```

### 4.2 Phase-Gated Execution

```
Phase A: ontology/*.ts        (병렬, 파일별 1 에이전트)
  ↓ tsc gate (TaskCompleted hook)
Phase B: src/config/*.ts      (병렬, 파일별 1 에이전트)
  ↓ tsc gate
Phase C: src/systems/*.ts     (단일 또는 디렉토리별 병렬)
  ↓ codegen + tsc + drift + test gate
Phase D: Documentation + Validation
```

**Hook-based gate:**

```bash
#!/bin/bash
# phase-gate.sh — TaskCompleted hook
INPUT=$(cat)
TASK=$(echo "$INPUT" | jq -r '.task_subject')

if [[ "$TASK" =~ "Phase A" ]]; then
  if ! bunx tsc --noEmit 2>/dev/null; then
    echo "Phase A gate: TypeScript errors" >&2
    exit 2
  fi
fi
exit 0
```

### 4.3 File Conflict Prevention

**Pattern 1: Disjoint Ownership (preferred)**
```
Backend agent: src/api/*, src/services/*
Frontend agent: src/components/*, src/pages/*
Test agent: tests/* (read-only on src/)
```

**Pattern 2: Sequential Phases**
```
Phase 1: All implementation → gate
Phase 2: All tests → gate
Phase 3: All docs
```

**Pattern 3: Hook Enforcement**
```bash
#!/bin/bash
TEAMMATE=$(echo "$INPUT" | jq -r '.teammate_name')
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path')

case "$TEAMMATE" in
  backend) [[ "$FILE" =~ frontend/ ]] && echo "Forbidden" >&2 && exit 2 ;;
  frontend) [[ "$FILE" =~ api/ ]] && echo "Forbidden" >&2 && exit 2 ;;
esac
exit 0
```

### 4.4 Result Collection

**3가지 패턴:**

| Pattern | Mechanism | When |
|---------|-----------|------|
| SendMessage sync | broadcast → 각 팀원 응답 | 실시간 종합 필요 |
| Memory-based | 각 팀원 memory 파일 작성 → 리드 읽기 | 비동기 수집 |
| Task metadata | TaskUpdate metadata에 결과 기록 | 구조화된 수집 |

---

## 5. Automation Composition

### 5.1 Monitor vs /loop vs CronCreate

| Tool | 용도 | 메커니즘 | 지속성 |
|------|------|----------|--------|
| **Monitor** | 장기 실행 출력 스트리밍 | 백그라운드 스크립트, 줄별 이벤트 | 세션 범위 |
| **/loop fixed** | 고정 간격 폴링 | `*/N * * * *` cron | 7일 만료 |
| **/loop dynamic** | 적응 간격 | ScheduleWakeup(60-3600s) | 7일 만료 |
| **CronCreate** | 예약 실행 | cron expression | session/durable |
| **RemoteTrigger** | 원격 예약 | 클라우드 인프라 | 영구 |

### 5.2 Continuous Validation Pipeline

```
세션 시작:
  1. Hook(SessionStart) → 감사 체크리스트 주입
  2. Monitor: tsc --watch 오류 스트리밍
  3. /loop 1h: 전체 테스트 스위트

작업 중:
  4. Hook(PostToolUse: Edit) → 타입 체커 실행
  5. Hook(TaskCompleted) → 시맨틱 검증

세션 종료:
  6. Hook(SessionEnd) → 최종 감사 리포트
```

### 5.3 ScheduleWakeup Cache Strategy

```
< 270s (5분 미만): 캐시 warm 유지. 활성 작업에 적합
300s: 피하기 (worst-of-both — 캐시 miss + 짧은 대기)
> 300s–3600s: 캐시 miss 감수. 변화가 느린 대기에 적합
기본 idle: 1200-1800s (20-30분)
```

---

## 6. Hook-Agent Integration

### 6.1 Hook Firing Context

```json
// LEAD SESSION:
{ "hook_event_name": "PreToolUse", "tool_name": "Bash" }
// agent_id 없음

// SUBAGENT:
{ "hook_event_name": "PreToolUse", "agent_id": "agent-xyz",
  "agent_type": "security-reviewer" }

// TEAM TEAMMATE:
{ "hook_event_name": "TaskCompleted", "teammate_name": "backend-dev",
  "team_name": "my-team", "agent_id": "agent-team-001" }
```

### 6.2 SubagentStart/Stop Hooks

**SubagentStart — 사전 검증:**
```json
{
  "hooks": {
    "SubagentStart": [{
      "matcher": "security-reviewer|web-scraper",
      "hooks": [{
        "type": "command",
        "command": "./hooks/subagent-preflight.sh"
      }]
    }]
  }
}
```

**SubagentStop — 결과 캡처 + 품질 게이트:**
```bash
#!/bin/bash
# exit 2 → 에이전트 완료 차단, 계속 작업하도록 피드백
AGENT_TYPE=$(echo "$INPUT" | jq -r '.agent_type')
if [ "$AGENT_TYPE" = "code-generator" ]; then
  if ! grep -r "TEST PASSED" output.log; then
    echo "Must pass tests before stopping" >&2
    exit 2
  fi
fi
exit 0
```

### 6.3 TaskCreated — 사전 검증

```bash
#!/bin/bash
TASK_SUBJECT=$(echo "$INPUT" | jq -r '.task_subject')

# 태스크 명명 규칙 강제
if ! [[ "$TASK_SUBJECT" =~ ^\[(PHASE|P0|P1|P2|P3)\] ]]; then
  echo "Task must start with [PHASE] or [priority]. Example: '[P0] Fix auth'" >&2
  exit 2
fi
exit 0
```

### 6.4 Complete Ontology Enforcement Pipeline

```json
{
  "hooks": {
    "TaskCreated": [{
      "hooks": [{
        "type": "command",
        "command": "./hooks/ontology-pipeline.sh"
      }]
    }],
    "PreToolUse": [{
      "matcher": "Edit|Write",
      "hooks": [{
        "type": "command",
        "command": "./hooks/ontology-pipeline.sh"
      }]
    }],
    "TaskCompleted": [{
      "hooks": [{
        "type": "command",
        "command": "./hooks/ontology-pipeline.sh"
      }]
    }],
    "SubagentStop": [{
      "hooks": [{
        "type": "command",
        "command": "./hooks/subagent-audit.sh"
      }]
    }]
  }
}
```

**Pipeline script logic:**
- `TaskCreated`: 온톨로지 도메인 참조 필수 (DATA/LOGIC/ACTION/LEARN)
- `PreToolUse(Edit|Write)`: 편집 전 tsc 통과 필수
- `TaskCompleted`: 시맨틱 감사 통과 필수
- `SubagentStop`: 결과 로그 기록 + 품질 검증

---

## 7. Best Practices Summary

### Do:
- 3-5 teammates, 5-6 tasks/teammate
- Disjoint file ownership (hook enforced)
- Phase gates via TaskCompleted + exit 2
- Named subagents for @mention routing
- Memory-based result collection for async synthesis
- Monitor for streaming, /loop for polling

### Don't:
- 같은 파일 2+ 에이전트 동시 편집
- 10+ 팀원 (coordination overhead > benefit)
- Circular task dependencies (deadlock)
- maxTurns 없이 autonomous agents
- /loop 300s (cache worst-case)
- 팀 세션 resume 후 팀원 참조 (복구 불가)

---

## 8. CC Agent Feature Utilization Checklist

| Feature | Status | Used in mathcrew? |
|---------|--------|-------------------|
| Subagents (Agent tool) | GA | Yes (orchestrate, verify) |
| Custom agents (.claude/agents/) | GA | Partial (3d-scene-audit, verify) |
| Agent Teams | Experimental | Not yet |
| Named subagents | v2.1.89+ | Yes (orchestrate skill) |
| Task management | GA | Yes (orchestrate skill) |
| Monitor tool | v2.1.98+ | Not yet |
| CronCreate/Loop | v2.1.71+ | Not yet |
| SubagentStart/Stop hooks | GA | Not yet |
| TaskCreated/Completed hooks | v2.1.84+ | Not yet |
| TeammateIdle hook | v2.1.33+ | Not yet |
| Agent-scoped hooks | GA | Not yet |
| Worktree isolation | v2.1.49+ | Not yet |
| Channels (push events) | Research preview | Not yet |
| Managed Agents (cloud) | Beta | Not applicable (separate product) |

---

## 9. Additional Findings (cc-docs-scraper)

### 9.1 Complete Frontmatter (27 fields)

Agent definition에서 이전 15개 + 추가 발견된 필드:

| Field | Type | Notes |
|-------|------|-------|
| `color` | string | `red/blue/green/yellow/purple/orange/pink/cyan` — UI 표시 |
| `initialPrompt` | string | `--agent` 실행 시 첫 유저 턴으로 자동 제출 — **[FORBIDDEN per rule 12 §Agent frontmatter standard — bypasses Lead briefing, fires un-gated first user turn]** |

### 9.2 Agent Spawning Restriction

```yaml
tools:
  - "Agent(worker, researcher)"  # 특정 subagent만 허용
  - "Agent"                      # 모든 subagent 허용
  # Agent 생략 시 → subagent spawn 불가
```

### 9.3 Model Resolution Order

```
1. CLAUDE_CODE_SUBAGENT_MODEL env var
2. Per-invocation model parameter
3. Subagent definition model frontmatter
4. Main conversation model (inherit)
```

### 9.4 Memory Scopes (Subagent-Specific)

| Scope | Location | Use case |
|-------|----------|----------|
| `user` | `~/.claude/agent-memory/<name>/` | 프로젝트 간 학습 |
| `project` | `.claude/agent-memory/<name>/` | 프로젝트 전용 (VCS 공유) |
| `local` | `.claude/agent-memory-local/<name>/` | 프로젝트 전용 (gitignored) |

### 9.5 Hook Events — Full 27 Events

기존 24개 + 추가 발견:

| # | Event | Added |
|---|-------|-------|
| 25 | `CwdChanged` | — |
| 26 | `FileChanged` | matcher: literal filenames (`.envrc\|.env`) |
| 27 | (reserved) | — |

**Hook types 4가지:**
- `command` — shell 명령 (가장 일반적)
- `http` — POST JSON to URL
- `prompt` — single-turn LLM 평가 (Haiku 기본)
- `agent` — multi-turn 검증 (60s timeout, max 50 turns)

### 9.6 Channels (Research Preview, v2.1.80+)

MCP 서버가 실행 중 세션에 이벤트를 **push**하는 양방향 채널:

```bash
claude --channels plugin:telegram@claude-plugins-official
```

**지원 채널:** Telegram, Discord, iMessage (macOS), fakechat (demo)
**보안:** sender allowlist, pairing flow, enterprise `channelsEnabled` 제어

### 9.7 Scheduled Tasks — 3 Tiers

| Tier | Runs on | Persistent | Min interval |
|------|---------|------------|-------------|
| **Cloud** | Anthropic cloud | Yes | 1 hour |
| **Desktop** | Your machine | Yes | 1 minute |
| **/loop** | Your machine (session) | No | 1 minute |

**loop.md 커스터마이징:**
- `.claude/loop.md` (프로젝트, 우선)
- `~/.claude/loop.md` (유저)
- Max 25,000 bytes

### 9.8 `--bare` Mode (CI/Script)

모든 auto-discovery 스킵 (hooks, skills, plugins, MCP, memory, CLAUDE.md):

```bash
claude --bare -p "Summarize this file" --allowedTools "Read"
```

**향후 `-p`의 기본 모드가 될 예정.**

### 9.9 Plugin Subagent Restrictions

Plugin subagent에서 **silently ignored** 되는 필드:
- `hooks`
- `mcpServers`
- `permissionMode`

Team 컨텍스트에서 **NOT applied** 되는 필드:
- `skills`
- `mcpServers`

---

## Agent Teams v3 — Applied Experience (2026-04-18)

> Phase A-2 W2-7 addendum. Observations drawn from the Phase A session (`0dff144d`, kosmos rebuild-research, 2026-04-17) and the W2-3..W2-6 cross-repo adoption waves (merged PRs kosmos#13, palantir-math#168, mathcrew#108, home#57) that rolled the Lead Protocol v2 hook suite into every consumer.

### A.1 Lazy-spawn pattern — proven across 4 repos [Applied]

Phase A burned ~40 idle turns across a 6-teammate team because all teammates were spawned at T0 (defect #4, `lead-system-v2.md` §6). Post-W2-2 `teammate-idle.ts` ships with a three-tier throttle (silent → cost warning → auto-shutdown) keyed on `idleCount >= 3` AND `blockedBy` depth > 1 (rule 06 §Idle cost management). W2-3..W2-6 applied the same hook to four repos — kosmos kept 8 local agents as overrides, palantir-math standardized 8 of 8 agents, mathcrew created 3 net-new domain agents, and home's control plane registered 6 cross-repo agents with two new roles (`ontology-steward`, `plugin-maintainer`). Rollout notes on the lazy-spawn pattern:

- **kosmos (PR #13, sha c63bc8f)** — 10 hooks deleted from `.claude/hooks/` because the plugin now owns idle-shutdown; 8 hooks kept as genuine project-specific overrides [Applied: events.jsonl seq 41]. Pre-existing bug repaired in passing: `enforce-file-ownership` was moved from `PostToolUse` to `PreToolUse` (a semantic correctness fix discovered during the adoption audit).
- **palantir-math (PR #168, sha 8e35cea)** — 0 hooks deleted; 11 kept as overrides. The repo already carried project-specific gates (ontology drift, registry freshness) that plugin v1.1 does not subsume. Model policy realignment: `llm-judge sonnet → opus` to match the evaluator-class convention in `lead-system-v2.md` §5.2 [Applied: events.jsonl seq 43].
- **mathcrew (PR #108, sha 5981bef)** — bootstrapped 3 new domain agents (`theater-expert`, `pedagogy-expert`, `implementer`) against `mathcrew-registry.json v1.0.0`. No legacy hooks to retire; lazy-spawn was the first protocol the repo received [Applied: events.jsonl seq 44].
- **home control plane (PR #57, sha bf639a5)** — published `home-registry.json v1.0.0` with 5 phases, 6 agents, and two net-new roles (`ontology-steward`, `plugin-maintainer`). OBS-02 (tavily rotation) was flagged as `NO_ACTION_NEEDED`; the `~/ontology/` shared-core layer stayed intact during migration [Applied: events.jsonl seq 42].

Net outcome: **lazy-spawn is no longer an experimental pattern — it is the default across every consumer repo, with >40 agent .md files conforming to the same minimum frontmatter (rule 12 §3.1).**

### A.2 Model-policy enforcement via `agent-frontmatter-validate` [Applied]

W2-2 added `hooks/agent-frontmatter-validate.ts` (new hook for defect #6). On `SessionStart` it scans `.claude/agents/*.md` + `~/.claude/agents/*.md` and rejects with exit-2 any file that (a) is missing `name` / `description` / `tools` / `model`, (b) contains the forbidden `initialPrompt`, or (c) sets a silently-ignored field (`permissionMode` / `hooks` / `mcpServers` for plugin-shipped agents). Applied findings:

- palantir-math pre-check: W2-4 implementer reported `initialPrompt` was **not present** in the project's pre-existing agent .md files — defect #6 had already been handled prior to adoption (likely by an earlier manual sweep). Frontmatter validator ran clean on first pass [Applied: events.jsonl seq 43 — "0 hooks deleted" indicates no cleanup was necessary].
- kosmos standardized 8 agents in a single pass (W2-3). Model policy realignments were pure frontmatter edits: `researcher sonnet→opus`, `simulator opus→sonnet`, `evaluator sonnet→opus`, `orchestrator opus→sonnet` [Applied: events.jsonl seq 41].
- mathcrew: 3 net-new agents authored against the v2 template from scratch — validator was effectively a schema check rather than a migration tool [Applied: events.jsonl seq 44].

**Empirical rule**: the validator is cheaper to run than to author correct `.md` files. Lead should treat a non-conformant `.md` as a session-boot blocker, not a warning.

### A.3 Auto-inbox injection + auto-idle-shutdown observed behavior [Applied]

Defects #3 (inbox injection) and #4 (auto-shutdown) are the two behavioral changes that most visibly alter teammate turn cost. Combined shape of the v1.1 hooks:

| Hook | Event | Mode | Observed behavior |
|------|-------|------|-------------------|
| `user-prompt-submit.ts` | `UserPromptSubmit` | Advisory, async | Reads unread `.palantir-mini/session/inbox-<teammate>.json`, emits `additionalContext` summarizing each entry, marks as read, emits `inbox_delivered` event. Teammates no longer need an explicit "check inbox" turn. |
| `teammate-idle.ts` | `TeammateIdle` | Advisory | Tier 1 (idleCount<3): silent pass. Tier 2 (3≤idleCount<ceiling): injects cost warning. Tier 3 (idleCount≥ceiling AND blockedBy depth>1): sends `shutdown_request`. Re-spawn is cheaper than indefinite idleness. |

Both hooks were delivered in W2-2 (`plugin v1.0.0 → v1.1.0`, PR #56, sha bf7a153, 2038 insertions across 18 files, 6 new test files, 63 new test cases, total hook test count 70 [Applied: events.jsonl seq 40]).

**Rollout effect**: kosmos reported `289/289` tests passing post-adoption; palantir-math reported `797/797`; mathcrew reported `180 pass / 3 pre-existing fail` (the 3 failures were in `packages/api/` and unrelated to agent-team code). No regressions traced to the new hooks [Applied: seq 41, 43, 44].

### A.4 Cross-repo Protocol v2 registry pattern [Applied]

Each consumer repo adds a top-level registry file (`<repo>-registry.json`) with three fields that anchor it into the Protocol v2 ecosystem:

```json
{
  "leadProtocolVersion": "2.0",
  "pluginMinVersion": "1.1.0",
  "agents": [ /* per-repo agent roster */ ]
}
```

Observed registry versions at W2-7 checkpoint:

| Repo | Registry | Version | Agents | PR |
|------|----------|---------|--------|-----|
| kosmos | `kosmos-registry.json` | 3.0.0 → 3.1.0 | 8 standardized | #13 |
| palantir-math | (registry) | 1.0.0 → 1.1.0 | 8 standardized | #168 |
| mathcrew | `mathcrew-registry.json` | new @ 1.0.0 | 3 created | #108 |
| home | `home-registry.json` | new @ 1.0.0 | 6 + 2 new domain roles | #57 |

Pattern: **registries are small (~100 lines), declarative, and act as a protocol handshake.** A consumer with `pluginMinVersion < 1.1.0` should refuse to boot v2 hooks rather than silently degrade (see §A.5 deferred item).

### A.5 Implementer-report deviations from the original protocol [Applied]

Per-wave implementer reports (events.jsonl seq 41–44) surfaced three deviations from the original W2-0 SSoT that are worth reflecting back into future protocol revisions:

1. **palantir-math — `initialPrompt` defect already remediated** (pm-implementer note). The blanket rule "remove `initialPrompt` from all teammate files" is a no-op in repos that ran an earlier manual cleanup. Consider a pre-flight check that skips the substitution entirely and reports "already clean" so implementer time isn't spent on non-work.
2. **kosmos — unexpected hook deletion volume** (10 of 18 local hooks deleted). The blueprint had anticipated overrides, not wholesale deletion; the actual pattern was "delete if semantically subsumed by plugin, keep if genuinely project-specific." Rule 12 should encode this decision tree explicitly.
3. **mathcrew — no legacy hooks to delete** (0 deletions). The lazy-spawn pattern landed on a greenfield agent layer, so "how do we remove without breaking" advice was unused. For net-new consumers, protocol should provide a shorter bootstrap path skipping migration steps.

These deviations are also logged in `lead-system-v2.md` §11 (W2-7 append).

### A.6 Research-over-codegen validation [Applied — positive outcome]

Rule 06 §Research-over-codegen principle ("canonical deliverable is the blueprint + implementation guidance, not raw generated code") held across Phase A: the researcher's blueprint.json (seq 33–34) anchored both H-A/H-B prototypes and the 15-gate evaluator (seq 30–32). The prototypes themselves were small (~50 lines each) because the blueprint named existing primitives rather than generating ad-hoc code. **This is the first end-to-end pipeline where the principle was tested at scale (12 tasks × 6 teammates) and held.**

