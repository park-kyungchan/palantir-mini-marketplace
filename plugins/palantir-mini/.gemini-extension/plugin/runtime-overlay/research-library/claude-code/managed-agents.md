# Claude Managed Agents — Complete Reference

> Date: 2026-04-11 | Status: Public Beta (launched 2026-04-08)
> API Beta Header: `managed-agents-2026-04-01`
> Sources: platform.claude.com docs, Anthropic engineering blog, claude-code-guide agent research

---

## Executive Summary

Claude Managed Agents는 Anthropic의 **클라우드 호스팅 에이전트 하네스** — 자체 에이전트 루프, 도구 실행, 런타임을 구축할 필요 없이 완전 관리형 환경에서 자율적 Claude 에이전트를 실행하는 서비스. 로컬 실행 도구(Claude Code, Agent SDK)와 **별개 제품**.

---

## 1. Architecture: Brain ↔ Hands Decoupling

```
┌──────────────────────────────┐
│   Brain (Claude + Harness)   │  Stateless, replaceable
│   - Model inference          │  - P50 TTFT ~60% 감소
│   - Tool orchestration       │  - P95 TTFT >90% 감소
├──────────────────────────────┤
│   Session (Event Log)        │  Durable, immutable
│   - Append-only event log    │  - 서버측 영구 저장
│   - Full conversation history│  - 연결 끊김 시에도 유지
├──────────────────────────────┤
│   Hands (Sandbox)            │  Ephemeral containers
│   - Code execution           │  - 교체 가능한 "cattle"
│   - File system              │  - 네트워크 접근 제어
│   - Package installation     │
└──────────────────────────────┘
```

**설계 이점:**
- 컨테이너는 교체 가능한 cattle (not critical pets)
- 하네스가 세션 로그에서 상태 손실 없이 재시작
- 여러 실행 환경이 같은 brain에 연결 가능

---

## 2. Four Core Concepts

| Concept | Description | Lifecycle |
|---------|-------------|-----------|
| **Agent** | 모델, 시스템 프롬프트, 도구, MCP 서버, 스킬 구성 | 재사용 가능, 버전 관리 |
| **Environment** | 컨테이너 템플릿: 패키지, 네트워크 접근 규칙, 마운트 파일 | 에이전트당 1개 이상 |
| **Session** | 실행 인스턴스: 에이전트 + 환경 조합, 태스크 수행 | 영구 지속, 재개 가능 |
| **Events** | 앱-에이전트 간 교환 메시지 (SSE 스트리밍) | 실시간 양방향 |

---

## 3. API Endpoints

```
POST   /v1/agents              → Create agent (versioned)
GET    /v1/agents/{id}         → Retrieve agent
POST   /v1/environments        → Create environment
GET    /v1/environments/{id}   → Retrieve environment
POST   /v1/sessions            → Start session
GET    /v1/sessions/{id}       → Retrieve session
POST   /v1/sessions/{id}/events → Send events (SSE stream)
GET    /v1/sessions/{id}/events → Stream responses
GET    /v1/sessions/{id}/threads → List threads (multi-agent)
```

**Rate Limits:**
- Create endpoints: 60 req/min
- Read endpoints: 600 req/min

---

## 4. Built-in Tools

모든 도구는 기본 활성화. 개별 비활성화 가능:

```python
tools=[{
    "type": "agent_toolset_20260401",
    "configs": [
        {"name": "web_fetch", "enabled": False}  # 개별 비활성화
    ]
}]

# 또는 기본 비활성화 + 선택적 활성화
tools=[{
    "type": "agent_toolset_20260401",
    "default_config": {"enabled": False},
    "configs": [
        {"name": "bash", "enabled": True},
        {"name": "read", "enabled": True}
    ]
}]
```

**Available tools:** Bash, Read, Write, Edit, Glob, Grep, Web Search, Web Fetch, MCP servers, Custom tools

---

## 5. Multi-Agent Orchestration (Research Preview)

**1-level delegation**: coordinator → callable agents (agents cannot call other agents)

```python
orchestrator = client.beta.agents.create(
    name="Engineering Lead",
    model="claude-sonnet-4-6",
    system="You coordinate engineering work...",
    tools=[{"type": "agent_toolset_20260401"}],
    callable_agents=[
        {"type": "agent", "id": reviewer.id, "version": reviewer.version},
        {"type": "agent", "id": tester.id, "version": tester.version}
    ]
)
```

**제약사항:**
- 에이전트 간 독립된 context thread
- 도구/context는 thread 간 공유 불가
- 모든 에이전트가 같은 컨테이너 + 파일시스템 공유
- Session thread 영구 지속 — coordinator가 이전 에이전트에 후속 메시지 전송 가능

**Multi-agent events:**
- `session.thread_created` — coordinator가 thread 생성
- `session.thread_idle` — 에이전트 thread 완료
- `agent.thread_message_sent/received` — 에이전트 간 메시지

---

## 6. MCP Integration

```python
agent = client.beta.agents.create(
    name="Web Researcher",
    model="claude-sonnet-4-6",
    tools=[
        {"type": "agent_toolset_20260401"},
        {
            "type": "mcp",
            "name": "playwright",
            "command": "npx",
            "args": ["@playwright/mcp@latest"]
        }
    ]
)
```

**지원 transport:** stdio (로컬 프로세스), HTTP (원격 서버)
**Tool search:** 많은 MCP 도구 구성 시 자동 활성화, 미사용 도구 정의 보류

---

## 7. Sessions: Durable Execution

```python
session = client.beta.sessions.create(
    agent=agent.id,
    environment_id=environment.id,
    title="Multi-step research task"
)

# 네트워크 끊김에도 세션 지속
# 나중에 전체 이력으로 재개
client.beta.sessions.events.send(session.id, events=[...])

# 이벤트 스트리밍
with client.beta.sessions.events.stream(session.id) as stream:
    for event in stream:
        if event.type == "session.status_idle":
            break
```

---

## 8. Pricing

| Component | Cost |
|-----------|------|
| **Token consumption** | 표준 Claude API 가격 (input/output per token) |
| **Session runtime** | **$0.08/session-hour** (active 시간만 과금) |

**예시:** 10시간 세션, 5시간 active = $0.40 + token costs

---

## 9. Anthropic AI Agent Ecosystem Comparison

| Product | Execution | Persistence | Multi-Agent | Best For |
|---------|-----------|-------------|-------------|----------|
| **Messages API** | Local (your code) | None | Manual | Custom logic, direct model access |
| **Agent SDK** | Local (SDK wrapper) | Optional | Subagents | CI/CD, scripts, programmatic |
| **Claude Code CLI** | Local (CLI) | Session-scoped | Agent Teams (experimental) | Interactive dev, code review |
| **Managed Agents** | **Cloud (managed)** | **Always persistent** | **Native orchestration** | **Production agents, long-running** |

**Key differentiator:** Managed Agents = 유일한 클라우드 관리형 옵션. 인프라 자체 관리 불필요.

---

## 10. Early Adopters

| Company | Use Case |
|---------|----------|
| **Notion** | 워크스페이스 내 병렬 태스크 에이전트 |
| **Rakuten** | 부서별 엔터프라이즈 에이전트 |
| **Sentry** | 디버깅 에이전트 — 패치 작성 + PR 오픈 |
| **Asana** | 프로젝트 내 협업 AI 팀원 |

**성능:** "Managed Agents improved outcome task success by up to 10 points over standard prompting, with largest gains on hardest problems."

---

## 11. Research Preview Features (Early Access)

https://claude.com/form/claude-managed-agents 에서 접근 요청:

| Feature | Description |
|---------|-------------|
| **Outcomes** | 에이전트 정의 성공 기준 + 자동 개선 |
| **Multiagent** | 전체 멀티 에이전트 오케스트레이션 |
| **Memory** | 세션 간 영구 메모리 |

---

## 12. Connection to Claude Code / mathcrew

| Question | Answer |
|----------|--------|
| Claude Code CLI와 통합? | 현재 직접 통합 없음 (별개 제품) |
| RemoteTrigger/schedule 연결? | 별도 시스템, Managed Agents와 미통합 |
| Agent SDK 관계? | Agent SDK = 로컬, Managed Agents = 클라우드 버전 |
| mathcrew 배포 가능? | 게임 루프를 자율 에이전트로 배포 시 Managed Agents 플랫폼 사용 가능 |

---

## 13. SDK Examples

### Python

```python
import anthropic

client = anthropic.Anthropic()

# 1. Create agent
agent = client.beta.agents.create(
    name="Code Reviewer",
    model="claude-sonnet-4-6",
    system="You review code for bugs and security issues.",
    tools=[{"type": "agent_toolset_20260401"}]
)

# 2. Create environment
env = client.beta.environments.create(
    name="review-env",
    config={
        "type": "cloud",
        "networking": {"type": "unrestricted"}
    }
)

# 3. Start session
session = client.beta.sessions.create(
    agent=agent.id,
    environment_id=env.id,
    title="Review PR #42"
)

# 4. Stream interaction
with client.beta.sessions.events.stream(session.id) as stream:
    client.beta.sessions.events.send(session.id, events=[
        {"type": "user_turn", "content": "Review the auth module for SQL injection."}
    ])
    for event in stream:
        if event.type == "assistant_message":
            print(event.content)
        if event.type == "session.status_idle":
            break
```

### TypeScript

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const agent = await client.beta.agents.create({
  name: "Code Reviewer",
  model: "claude-sonnet-4-6",
  system: "You review code for bugs and security issues.",
  tools: [{ type: "agent_toolset_20260401" }]
});

const env = await client.beta.environments.create({
  name: "review-env",
  config: { type: "cloud", networking: { type: "unrestricted" } }
});

const session = await client.beta.sessions.create({
  agent: agent.id,
  environment_id: env.id,
  title: "Review PR #42"
});
```

---

## 14. Outcomes (Research Preview) — Self-Evaluating Agent

```python
# Send outcome definition with rubric
client.beta.sessions.events.send(session.id, events=[{
    "type": "user.define_outcome",
    "description": "Write a FastAPI app with auth",
    "rubric": "## Criteria\n- JWT auth\n- Rate limiting\n- Tests",
    "max_iterations": 5  # default 3, max 20
}])
```

- 별도 **grader** (다른 context window)가 rubric 기반으로 결과물 평가
- 결과: `satisfied`, `needs_revision`, `max_iterations_reached`, `failed`, `interrupted`
- 결과물은 `/mnt/session/outputs/`에 저장 → Files API로 조회
- 추가 beta header: `managed-agents-2026-04-01-research-preview`

---

## 15. Vaults (Credential Management)

- Vault에 서드파티 서비스 자격 증명 저장
- `mcp_server_url`에 바인딩 → 런타임 자동 주입
- MCP OAuth (자동 갱신) + static bearer token 지원
- Secret 필드는 write-only (응답에 절대 노출 안 됨)
- Vault당 max 20 credentials (max MCP servers per agent과 일치)
- 실행 중 세션에서 자격 증명 교체 시 재시작 없이 자동 반영

---

## 16. Advisor Tool (Beta)

저비용 executor 모델 + 고지능 advisor 모델 페어링:

```python
tools=[{
    "type": "advisor_20260301",
    # Valid pairs: Haiku+Opus, Sonnet+Opus, Opus+Opus
}]
```

- Beta header: `advisor-tool-2026-03-01`
- Advisor는 서버 사이드 실행, 계획/가이던스 반환 (보통 400-700 tokens)
- 응답: `server_tool_use` → `advisor_tool_result`
- Advisor 측 프롬프트 캐싱 지원

---

## 17. Agent Skills (API)

- Pre-built: PowerPoint, Excel, Word, PDF
- Custom: SKILL.md + YAML frontmatter
- 3단계 점진적 노출: metadata (~100 tokens, 항상) → instructions (<5K, 트리거 시) → resources (무제한, 필요 시)
- Beta headers: `code-execution-2025-08-25`, `skills-2025-10-02`, `files-api-2025-04-14`
- Skills API: `/v1/skills` 엔드포인트
- 오픈소스: `github.com/anthropics/skills`

---

## 18. Complete Beta Headers

| Header | Product |
|--------|---------|
| `managed-agents-2026-04-01` | Managed Agents |
| `managed-agents-2026-04-01-research-preview` | Outcomes/Multiagent/Memory |
| `advisor-tool-2026-03-01` | Advisor Tool |
| `code-execution-2025-08-25` | Code Execution |
| `skills-2025-10-02` | Skills API |
| `files-api-2025-04-14` | Files API |

---

## 19. Complete Documentation Sitemap

```
platform.claude.com/docs/en/managed-agents/
├── First steps
│   ├── overview
│   ├── quickstart
│   └── onboarding (Prototype in Console)
├── Define your agent
│   ├── agent-setup
│   ├── tools
│   ├── mcp-connector
│   ├── permission-policies
│   └── skills
├── Configure environment
│   ├── environments
│   └── cloud-containers (Container reference)
├── Delegate work
│   ├── sessions
│   ├── events-and-streaming
│   ├── define-outcomes
│   ├── vaults
│   ├── github
│   ├── files
│   └── memory
├── Advanced orchestration
│   └── multi-agent
└── Admin
    └── observability
```

---

## Sources

- [Managed Agents Overview](https://platform.claude.com/docs/en/managed-agents/overview)
- [Quickstart](https://platform.claude.com/docs/en/managed-agents/quickstart)
- [Multi-agent Sessions](https://platform.claude.com/docs/en/managed-agents/multi-agent)
- [Tools](https://platform.claude.com/docs/en/managed-agents/tools)
- [Blog: Claude Managed Agents](https://claude.com/blog/claude-managed-agents)
- [Engineering: Scaling Managed Agents](https://www.anthropic.com/engineering/managed-agents)
- [Agent SDK Overview](https://code.claude.com/docs/en/agent-sdk/overview)
