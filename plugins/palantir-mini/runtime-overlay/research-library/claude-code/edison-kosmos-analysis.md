# Edison Kosmos: Research Analysis & Implications for kosmos/

> Date: 2026-04-11 | Sources: 15+ (arXiv, Edison blog, Korean press, GitHub)

---

## 1. What Edison Kosmos IS

**Edison Kosmos** is an autonomous AI scientist built by **Edison Scientific**
(commercial spinout of FutureHouse nonprofit, founded by Eric Schmidt).

- Given a research objective + dataset → runs 12 hours → produces scientific report
- Reads ~1,500 papers, executes ~42,000 lines of analysis code per run
- 79.4% statement accuracy (independently validated by scientists)
- Beta users: "6 months of work in a single day"
- $70M seed at $250M valuation (Dec 2025), investors include Jeff Dean

**NOT related to math education.** Targets biomedical, materials science, genomics.

---

## 2. Architecture (Key Innovation: Structured World Models)

Edison Kosmos's core breakthrough: **structured world models** that allow
information sharing across 200+ parallel agent trajectories, maintaining
coherence over tens of millions of tokens.

### Agent Pipeline
```
Data Analysis Agent ──┐
                      ├── Shared Structured World Model ──→ Report
Literature Agent ─────┘
```

### Predecessor Agents (FutureHouse)
| Agent | Function |
|-------|----------|
| Crow | Paper/database search |
| Falcon | Paper/database search (variant) |
| Phoenix | Experiment design |
| Owl | Prior research search |
| PaperQA | Literature RAG (8.4k GitHub stars) |
| Robin | Multi-agent discovery (Kosmos predecessor) |

### vs Our kosmos/ Architecture
| Aspect | Edison Kosmos | Our kosmos/ |
|--------|--------------|-------------|
| **Pipeline** | 2 agents + shared world model | 7 stages, 6 agents |
| **Agents** | Data analyst + Literature searcher | orchestrator, researcher, ontologist, simulator, evaluator, reporter |
| **Coherence** | Structured world model (tens of millions of tokens) | Ontology-state + decision-log.json |
| **Duration** | 12 hours per run | Single session |
| **Output** | Scientific report with citations | TechBlueprint + 13-section report |
| **Domain** | Biomedical/materials science | Tech implementation research |
| **Scale** | 200+ parallel trajectories | 1-6 parallel subagents |

---

## 3. What We Can Learn

### 3.1 Structured World Model → Our Ontology-State

Edison's key insight: **sharing state across parallel agents prevents
divergent conclusions**. Their "world model" is a structured representation
that all agents read and write to.

Our kosmos/ already has this pattern: `ontology-state/decision-log.json`.
But Edison takes it further:
- Their world model is **typed and structured** (not a flat JSON log)
- It enables **200+ parallel rollouts** (we cap at ~6 subagents)
- It maintains **multi-million token coherence** (we rely on context compaction)

**Recommendation**: Evolve `decision-log.json` into a typed schema
(`ontology-state/world-model.ts`) with entity-relationship structure,
not just an append-only log.

### 3.2 Inference-Time Scaling Law

Edison discovered that work equivalency scales linearly with run depth:
- 5 steps = 3.9 months equivalent
- 10 steps = 4.4 months
- 20 steps = 6.2 months

This is one of the first documented **inference-time scaling laws** for
research agents. It suggests our kosmos/ could benefit from configurable
run depth — allow longer runs for harder research questions.

### 3.3 Traceability as First-Class Feature

Every Edison Kosmos conclusion traces to specific code lines or literature passages.
Our kosmos/ has provenance markers (§DC5-01, etc.) but lacks automated traceability
from conclusion → evidence. The evaluator agent should enforce this.

### 3.4 Multiple Runs, Not Single Runs

Edison explicitly recommends running Kosmos multiple times on the same objective:
"Kosmos often goes down rabbit holes or chases statistically significant yet
scientifically irrelevant findings."

Our kosmos/ runs once per session. Consider adding a `/kosmos-repeat` pattern
that runs 3 parallel research sessions and synthesizes via evaluator.

---

## 4. What Does NOT Transfer

| Edison Pattern | Why It Doesn't Apply |
|----------------|---------------------|
| 12-hour autonomous runs | Our Claude Code sessions are interactive, not fire-and-forget |
| 200+ parallel trajectories | CC subagent limit is 10 per team |
| Biomedical domain ontology | Our ontology is tech/platform/Palantir-specific |
| PaperQA literature RAG | Our research library is 81 files, not millions of papers |
| $200/run compute budget | We operate within Claude subscription limits |

---

## 5. Pricing & Access Reference

| Tier | Price | Credits | Notes |
|------|-------|---------|-------|
| Free | $0/mo | 10 expiring/mo | Standard agents only, no Kosmos |
| Founding | $200/mo | 650 expiring/mo | Kosmos access, priority |
| Academic | Free (.edu) | 650 expiring/mo | Full Kosmos, academic verification |
| Enterprise | Custom | Custom | Internal tool integration |

Single Kosmos run ≈ 200 credits ($200). Platform: `platform.edisonscientific.com`

---

## 6. Developer Resources

- **edison-client**: Programmatic API client
- **Auth**: API key from `platform.edisonscientific.com/profile`
- **FutureHouse GitHub** (github.com/Future-House):
  - `paper-qa` (8.4k stars) — Literature RAG
  - `robin` (291 stars) — Multi-agent predecessor
  - `aviary` (249 stars) — Agent evaluation gym
  - `ether0` (159 stars) — Scientific reasoning model
  - `ldp` (128 stars) — Modular agent interchange framework
- **Third-party**: `jimmc414/Kosmos` — Open-source reimplementation for Claude Code

---

## 7. Korean Coverage

Strong Korean tech press coverage (AI Times, ET News, KOSAC), but:
- No Korean office, team, or localization
- No Korean-language product or API
- Korean government science education body (KOSAC) tracks it as a trend

---

## 8. Actionable Implications for Our Projects

### For kosmos/ (Research Engine)
1. **Typed world model**: Upgrade `decision-log.json` → typed `world-model.ts`
2. **Run depth scaling**: Add configurable step count (5/10/20) to pipeline
3. **Multi-run synthesis**: Run 3 parallel sessions, synthesize via evaluator
4. **Traceability enforcement**: Evaluator agent should require evidence chains
5. **Consider PaperQA integration**: `paper-qa` is MIT-licensed, 8.4k stars,
   could augment our researcher agent for academic literature access

### For palantir-math/ (Math Education)
- No direct applicability. Edison Kosmos has zero math-education features.
- The **inference-time scaling** insight is interesting for future LEARN loop depth.

### For mathcrew/ (3D Math Learning)
- No direct applicability.

---

## Sources

- [Edison Scientific — Announcing Kosmos](https://edisonscientific.com/articles/announcing-kosmos)
- [arXiv:2511.02824 — Kosmos: An AI Scientist](https://arxiv.org/abs/2511.02824)
- [Edison Scientific — $70M Seed](https://edisonscientific.com/articles/we-raised-70m-to-accelerate-science)
- [Edison Pricing](https://edisonscientific.com/pricing)
- [FutureHouse GitHub](https://github.com/Future-House)
- [Edison Client Docs](https://docs.edisonscientific.com/edison-client)
- [AI Times Korea](https://www.aitimes.com/news/articleView.html?idxno=204045)
- [ET News Korea](https://www.etnews.com/20251117000329)
- [SiliconANGLE](https://siliconangle.com/2025/12/18/edison-scientific-raises-70m-build-autonomous-ai-scientists-research/)
- [jimmc414/Kosmos](https://github.com/jimmc414/Kosmos)
