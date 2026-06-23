# Altitude-1 Runtime Guide

The Altitude-1 runtime **operating crib** for the palantir-mini `pm` flow: detect a stale
session → fill the 9-axis SemanticIntentContract (SIC) → approve it → (conditionally) approve
the TechnologyRecommendation → build the DigitalTwinChange contract (DTC) → advance the prompt
envelope → dispatch the build.

**Runtime-agnostic.** This crib serves Claude **and** Codex **and** Gemini. Everything here is
expressed as `pm` MCP tool calls (`pm_semantic_intent_gate`, `pm_ontology_engineering_workflow`,
…) and the contract fields they thread — never a single-runtime tool. Stage 07 "dispatch" means
**native subagent dispatch (each runtime's own mechanism)**, never a Claude-only tool.

**This is an OPERATING crib, NOT an ontology artifact — Separation.** It describes how to *drive*
the `pm` runtime; it does not model `pm`'s own machinery (SIC/DTC, envelope store, readiness gate)
in any project Ontology. The runtime is the external channel; the project Ontology declares the
domain. (CORE.md, Separation P2.)

## When to use
Use this crib when **pm is ON** (owner-controlled via `.claude/settings.json`
`enabledPlugins."palantir-mini@palantir-mini-marketplace"`) **and** you are running the
Altitude-1 flow: the turn-by-turn **9-axis** elicitation → **SIC** → **DTC** → **build**. If you
are doing everyday Altitude-2 operation atop an already-built ontology, you do not need this.

## The 8-stage ladder (one line)
`00 stale-session → 01 fde-provenance → 02 9-axis-sic-fill → 03 approve-sic → 04 approve-technology (conditional) → 05 dtc-fill → 06 envelope-advance → 07 dispatch`

Plus one **resume class** off the forward ladder: [08 cross-session-minted-snapshot-resume](./08-cross-session-minted-snapshot-resume.md) — read it when you resume an already-approved-SIC flow in a *different* session than minted it.

## Pointer-not-copy + verify against disk
Every slice cites a **live source file** by path and tells you what stable symbol to `grep`
for — it does **not** copy volatile line numbers, version strings, or fill-sequence ranges
(global CLAUDE.md §6). Before you act on any pointer, **verify it against disk** (`ls`/`grep`):
the source is authoritative, this crib is a map. If the map and the disk disagree, the **disk
wins** — correct the crib or report the drift.

## Router
Don't read this whole guide. Open **[BROWSE.md](./BROWSE.md)** — route by *what you're about to do*
**or** *the exact blocker string you just hit* → read ONE slice → act.
