---
source-url: https://openai.com/index/the-next-evolution-of-the-agents-sdk/
source-author: OpenAI
source-published: 2026-04-15
fetched-at: 2026-05-06T13:42:00Z
license-note: "External source — read-only mirror for AI-agent research SSoT per ~/.claude/CLAUDE.md §Artifact Layer Policy. Do not redistribute outside ~/.claude/research/."
topic: "OpenAI Agents SDK April 2026 launch — model-native harness + native sandbox execution + Manifest abstraction + 7 sandbox providers (Blaxel/Cloudflare/Daytona/E2B/Modal/Runloop/Vercel) + harness/compute separation for security/durability/scale"
---

# The next evolution of the Agents SDK

> Published April 15, 2026 by OpenAI.
> Source: https://openai.com/index/the-next-evolution-of-the-agents-sdk/
> Cited by: Wave 2 sprint-046 research wave (Angle C — vendor-neutral harness/sandbox decoupling architecture; Manifest abstraction; native sandbox execution).

> The updated Agents SDK helps developers build agents that can inspect files, run commands, edit code, and work on long-horizon tasks within controlled sandbox environments.

We're introducing new capabilities to the Agents SDK that give developers standardized infrastructure that is easy to get started with and is built correctly for OpenAI models: a model-native harness that lets agents work across files and tools on a computer, plus native sandbox execution for running that work safely.

For example, developers can give an agent a controlled workspace, explicit instructions, and the tools it needs to inspect evidence:

### Python

```python
# pip install "openai-agents>=0.14.0"

import asyncio
import tempfile
from pathlib import Path

from agents import Runner
from agents.run import RunConfig
from agents.sandbox import Manifest, SandboxAgent, SandboxRunConfig
from agents.sandbox.entries import LocalDir
from agents.sandbox.sandboxes import UnixLocalSandboxClient


async def main() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        dataroom = Path(tmp) / "dataroom"
        dataroom.mkdir()
        (dataroom / "metrics.md").write_text(
            """# Annual metrics

| Year | Revenue | Operating income | Operating cash flow |
| --- | ---: | ---: | ---: |
| FY2025 | $124.3M | $18.6M | $24.1M |
| FY2024 | $98.7M | $12.4M | $17.9M |
""",
            encoding="utf-8",
        )

        agent = SandboxAgent(
            name="Dataroom Analyst",
            model="gpt-5.4",
            instructions="Answer using only files in data/. Cite source filenames.",
            default_manifest=Manifest(entries={"data": LocalDir(src=dataroom)}),
        )

        result = await Runner.run(
            agent,
            "Compare FY2025 revenue, operating income, and operating cash flow with FY2024.",
            run_config=RunConfig(
                sandbox=SandboxRunConfig(client=UnixLocalSandboxClient()),
            ),
        )
        print(result.final_output)


if __name__ == "__main__":
    asyncio.run(main())
```

Developers need more than the best models to build useful agents—they need systems that support how agents inspect files, run commands, write code, and keep working across many steps.

The systems that exist today come with tradeoffs as teams move from prototypes to production. Model-agnostic frameworks are flexible but do not fully utilize frontier models capabilities; model-provider SDKs can be closer to the model but often lack enough visibility into the harness; and managed agent APIs can simplify deployment but constrain where agents run and how they access sensitive data.

> "The updated Agents SDK made it production-viable for us to automate a critical clinical records workflow that previous approaches couldn't handle reliably enough. For us, the difference was not just extracting the right metadata, but correctly understanding the boundaries of each encounter in long, complex records. As a result, we can more quickly understand what's happening for each patient in a given visit, helping members with their care needs and improving their experience with us."
> — Rachael Burns, Staff Engineer & AI Tech Lead, Oscar Health

## A more capable harness for the agent loop

With today's release, the Agents SDK harness becomes more capable for agents that work with documents, files, and systems. It now has configurable memory, sandbox-aware orchestration, Codex-like filesystem tools, and standardized integrations with primitives that are becoming common in frontier agent systems.

These primitives include tool use via **MCP**, progressive disclosure via **skills**, custom instructions via **AGENTS.md**, code execution using the **shell** tool, file edits using the **apply patch** tool, and more. The harness will continue to incorporate new agentic patterns and primitives over time, so developers can spend less time on core infrastructure updates and more time on the domain-specific logic that makes their agents useful.

The harness also helps developers unlock more of a frontier model's capability by aligning execution with the way those models perform best. That keeps agents closer to the model's natural operating pattern, improving reliability and performance on complex tasks—particularly when work is long-running or coordinated across a diverse set of tools and systems.

In addition, we realize each product is unique and rarely fits neatly into a mold. We designed Agents SDK to support this diversity. Developers get a harness that's turnkey yet flexible—making it easy to adapt it to their own stack—including tool use, memory, and sandbox environment.

## Native sandbox execution

The updated Agents SDK supports sandbox execution natively, so agents can run in controlled computer environments with the files, tools, and dependencies they need for a task.

Many useful agents need a workspace where they can read and write files, install dependencies, run code, and use tools safely. Native sandbox support gives developers that execution layer out of the box, instead of forcing them to piece it together themselves.

Developers can bring their own sandbox or use built-in support for **Blaxel, Cloudflare, Daytona, E2B, Modal, Runloop, and Vercel**.

To make those environments portable across providers, the SDK also introduces a **Manifest** abstraction for describing the agent's workspace. Developers can mount local files, define output directories, and bring in data from storage providers including AWS S3, Google Cloud Storage, Azure Blob Storage, and Cloudflare R2.

This gives developers a consistent way to shape the agent's environment from local prototype to production deployment. It also gives the model a predictable workspace: where to find inputs, where to write outputs, and how to keep work organized across a long-running task.

## Separating harness from compute for security, durability, and scale

Agent systems should be designed assuming prompt-injection and exfiltration attempts. Separating harness and compute helps keep credentials out of environments where model-generated code executes.

It also enables **durable execution**. When the agent's state is externalized, losing a sandbox container does not mean losing the run. With built-in snapshotting and rehydration, the Agents SDK can restore the agent's state in a fresh container and continue from the last checkpoint if the original environment fails or expires.

Finally, it makes agents more **scalable**. Agent runs can use one sandbox or many, invoke sandboxes only when needed, route subagents to isolated environments, and parallelize work across containers for faster execution.

## Pricing and availability

These new Agents SDK capabilities are generally available to all customers via the API and use standard API pricing, based on tokens and tool use.

## What's next

As we continue to develop the Agents SDK, we'll keep expanding what developers can build with it, making it easier to bring more capable agents into production with less custom infrastructure, while preserving the flexibility and control developers need to fit agents into their own environments.

The new harness and sandbox capabilities are launching first in Python, with TypeScript support planned for a future release. We're also working to bring additional agent capabilities, including code mode and subagents, to both Python and TypeScript.

In addition, we want to help bring the broader agent ecosystem together over time, with support for more sandbox providers, more integrations, and more ways for developers to plug the SDK into the tools and systems they already use.

---

## Local indexing notes

- Cited by Wave 2 sprint-046 research wave (Angle C — Manifest abstraction + harness/compute decoupling).
- **Architectural parallel to Anthropic's Lance Martin "Scaling Managed Agents" Brain/Hands/Session model** (`~/.claude/research/anthropic/scaling-managed-agents-2026-04-08.md`). Both vendors converged on the same decomposition within ~1 week of each other:
  - **OpenAI**: harness (control plane) ↔ compute (sandbox execution plane); Manifest = workspace abstraction; snapshotting = durable execution
  - **Anthropic**: Brain (model + harness species) ↔ Hands (sandbox executor; "cattle, not pets") ↔ Session (event log)
- **palantir-mini cross-ref**: Manifest abstraction parallels palantir-mini's `~/.claude/schemas/ontology/primitives/research-source-manifest.ts` (v1.39.0+). Both standardize "what files exist in the agent's workspace" as a typed, portable contract.
- Sandbox provider list (7) sets baseline expectation for any harness-engineering plan: Blaxel / Cloudflare / Daytona / E2B / Modal / Runloop / Vercel + bring-your-own.
- Companion: `sandbox-agents-developer-docs.md` (concrete API + Manifest schema + 9-provider table including Unix-local + Docker).
