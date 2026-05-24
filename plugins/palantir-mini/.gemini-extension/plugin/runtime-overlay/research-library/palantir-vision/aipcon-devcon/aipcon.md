---
title: AIPCon 9 (Mar 12, 2026) — Comprehensive Reference
slug: aipcon
fileClass: vision-aipcon-devcon
provenanceMarkers: [Synthesis, Adapter]
primaryCitations:
  - { source: "AIPCon 9 talk: investing.com transcript + businesswire press releases", fetched: 2026-05-01, verbatimAvailableAt: null }
adapterTargets: []
lastVerified: 2026-05-01
harnessSpeciesMentioned: []
ssotTier: T3
---

# AIPCon 9 (Mar 12, 2026) — Comprehensive Reference

> **Provenance:** Mixed — official announcements + investing.com AIPCon 9 transcript + businesswire press releases [Official], plus local interpretation [Inference]
> **Schema anchors:** `WL-01..05`, `MCP-01..03`, `MCP-PS-01..02`, `PMC-01..13`, `PB-01..03`, `ORCH-01..06`, `WLG-01..10`
> **Markers:** `[§APC9-nn]`
> **Note:** AIPCon 6-8 deployment examples (Andretti RaceOS, Nebraska Medicine, GE Aerospace) are referenced in `philosophy/digital-twin.md` and `philosophy/ontology-ultimate-vision.md`. This file focuses on AIPCon 9.

---

## [§APC9-01] AIPCon 9 (Mar 12, 2026) — Miami

> **Date:** March 12, 2026, co-held with DevCon 5 (March 11)
> **Context:** Occurred 1 week after DOD designated Anthropic a supply chain risk (March 5, 2026)

### [§APC9-02] Three Macro Themes

1. **Deployment Velocity Revolution** — Ted Mabrey: 4 production apps in 24 hours, full operating systems in 4 days, 2-year migrations in 2 weeks
2. **Sovereign AI + Edge Convergence** — NVIDIA + Dell + Palantir Sovereign AI OS Reference Architecture: air-gapped, edge-deployed modular data centers
3. **Agentic Operations at Scale** — GE Aerospace: "orchestration agents continuously monitoring and synthesizing signals, routing to functional expert agents" (ACP validated)

### [§APC9-03] Partnerships (17 total: 6 announced at event + 11 additional)

| # | Partner | Key Detail | Marker |
|---|---------|-----------|--------|
| 1 | [§APC9-P01] NVIDIA + Dell | Sovereign AI OS Reference Architecture, Armada "cruiser", Blackwell Ultra | →[§SOS-01] |
| 2 | [§APC9-P02] GE Aerospace | Multi-year expansion, J85/T-38 fleet, 26% more engines output | →[§PA-01] |
| 3 | [§APC9-P03] Centrus Energy | $300M savings [unverified — not in AIPCon 9 transcript], 16→11,520 centrifuges, Centrifuge Mission Control | →[§DL-01] |
| 4 | [§APC9-P04] Ondas + World View + Anduril | Multi-domain ISR, stratospheric balloons + UAVs, SkyWeaver | — |
| 5 | [§APC9-P05] Polymarket + TWG AI | Sports integrity, Vergence AI engine, anomaly detection | — |
| 6 | [§APC9-P06] LG CNS | AI transformation across LG Group, dedicated FDE team | — |
| 7 | [§APC9-P07] SAP + Accenture | ERP migration, 88K employees, 99% accuracy, 70% time reduction | — |
| 8 | [§APC9-P08] Accenture Sovereign AI EMEA | UK-based, Dell AI Factory, expand to APAC (Davos, Jan 20) | — |
| 9 | [§APC9-P09] HD Hyundai | Group-wide expansion, largest Korea partnership (Davos, Jan 20) | — |
| 10 | [§APC9-P10] Rackspace | Managed Operations, 30→250+ engineers by 2027 (Feb 18) | — |
| 11 | [§APC9-P11] Airbus | Multi-year Skywise renewal, 50K daily users (Feb 10) | — |
| 12 | [§APC9-P12] DHS | $1B 5-year BPA: CBP, ICE, FEMA, CISA (Feb 19) | — |
| 13 | [§APC9-P13] U.S. Navy ShipOS | $448M through 2027, submarine industrial base (Dec 9, 2025) | →[§SOS-01] |
| 14 | [§APC9-P14] Tampa General Hospital | Partnership of the Year, 700+ lives, Care Progression Navigator | — |
| 15 | [§APC9-P15] Joint Commission | "Reforge" digital control plane, healthcare accreditation | — |
| 16 | [§APC9-P16] Databricks | 100+ joint customers, Unity Catalog integration | — |
| 17 | [§APC9-P17] Fujitsu / Uvance | Japan market, $100M by FY2029 | — |

### [§APC9-04] Key Direct Quotes (Verbatim, Official Transcript)

**[§APC9-Q01] D/L/A Direct Validation (Chad Wahlquist, Palantir Architect):**
> "Our whole ethos at Palantir is how do I take the data, the logic, and then turn those into actions."
> "It's really about all the way from the data to the logic, when I think about it, and then to the action, right?"

**[§APC9-Q01a] Additional Chad Wahlquist Quotes [Official — AIPCon 9 transcript]:**
> "Making more data computable" — recurring phrase across multiple demo segments
> "Dark matter of data" — institutional knowledge trapped in phone calls, emails, undocumented processes
> "Your demand planning is probably not your forecast accuracy, it's your ability to execute a plan"

**[§APC9-Q02] Digital Twin (Patrick Brown, Centrus Energy):**
> "Every centrifuge becomes a living object when it comes in as a supply chain, engineering, manufacturing, quality, and when it gets put into operation in Ohio. Everything's connected, live, learning, and improving with each decision."

**[§APC9-Q03] Ontology as Memory (Ryan Hartman, World View):**
> "With that, every mission, the ontology becomes a living memory of the operation."

**[§APC9-Q04] Ontology as Control Plane (William Walters, Joint Commission):**
> "What you see on the screen is exactly that. It is our control plane, our operating system. We call it Reforge."

**[§APC9-Q05] Engagement Model (Ted Mabrey, Palantir):**
- 24-hour initial MVP (4 production apps for a battery manufacturer)
- 30-day intensive buildout
- 12-month plan to make customer "financials look like ours" by 2027

**[§APC9-Q06] Decision-Centric Approach (Cameron Stanley, CDAO) [Official — AIPCon 9 transcript]:**
> "We rejected the hypothesis that getting the AI in the hands of the war fighter was the right answer. The real issue isn't AI, the real issue is workflow."

- **9 Questions Methodology** — decision-centric framework for AI deployment: before deploying AI, map the decision workflow, not the technology
- **Third Offset = Decision Advantage** — citing Secretary Carter's doctrine: the third offset strategy is fundamentally about achieving decision advantage, not technological superiority
- **Two Coupled Flywheels** — technology improvement and process improvement must be coupled; one without the other stalls
- **Maven Smart System Evolution** — 7 years of iteration; initially rejected the hypothesis that simply deploying AI to warfighters was sufficient. Workflow transformation was the real requirement

**[§APC9-Q07] Deployment Velocity — 11 Examples (Ted Mabrey, Palantir) [Official — AIPCon 9 transcript]:**

| # | Customer/Sector | Deployment | Timeline |
|---|----------------|-----------|----------|
| 1 | Battery manufacturer | Factory tour → AIP → 4 production apps | 24 hours |
| 2 | Global logistics | Cartel violence response → "global disruption manager" | One afternoon |
| 3 | Fleet management | 4 predictive models outperforming SOTA | 24 hours |
| 4 | Automotive financing | 2-year planned migration completed | 2 weeks |
| 5 | Major retailer | 200 stores at 99.4% accuracy | 2 weeks |
| 6 | Software replatforming | "Granular technical ontology" for every code file | — |
| 7 | Medical device | "CI/CD for new product development" | — |
| 8 | Drone manufacturer | Fleet visibility → integrated ops | — |
| 9 | Tier one auto | "Agentic advocate for every component" | — |
| 10 | Fashion retailer | "Agentic advocate for each address" | — |
| 11 | Submarine hatch | Quoting automation | 2 to 3 shifts |

> "Iron Man suits around people" — on how AIP augments workers
> "Reintegrating their companies...like the X-Men" — on breaking down organizational silos

**[§APC9-Q08] GE Aerospace Vision (Jess Salzbrun, CIO) [Official — AIPCon 9 transcript]:**
> "Not just visibility, recommending actions" — progression from PA-01 (Monitor) to PA-02 (Recommend)
> "Monday 8 hours stitching spreadsheets" — the pre-Palantir reality being eliminated

- **"6 FDEs the next week"** — speed of Palantir Forward Deployed Engineer engagement
- **2026 Roadmap:** orchestration agents + functional expert agents (validates ACP pattern at scale)

**[§APC9-Q09] Joint Commission Operations (William Walters, EVP/CDIO) [Official — AIPCon 9 transcript]:**
> "600 surveyors scheduled in seconds" — using tool called "Solver"
> "Healthcare data router of the country" — Joint Commission's self-description of their role

- **Cyber event response:** draw circle on map → surveys in affected area automatically canceled
- **Operational scale:** accreditation for healthcare organizations nationwide

**[§APC9-Q10] Sovereign AI Technical Detail [Official — AIPCon 9 transcript]:**
- **3 T-shirt sizes** for Sovereign AI deployments: Small = 32 B200 GPUs
- **Armada "Galleon"** — the largest modular data center form factor
- **"Chain Reaction" project** — Apollo + Rubix deployment architecture
- **Alaska deployment:** 24+ hours latency → real-time drone data processing at the edge

### [§APC9-05] Presenter List

**Keynote Speakers:**
| # | Name | Title | Organization |
|---|------|-------|-------------|
| 1 | Vice Admiral Seiko Okano | Principal Military Deputy ASN for RD&A | U.S. Navy |
| 2 | Ryan Hartman | President & CEO | World View |
| 3 | Michael Middleman | Chairman | Freedom Mortgage / Motor |
| 4 | Sebastian Steinhaeuser | COO | SAP |
| 5 | Tracy Venable | AI Delivery Lead (SAP) | Accenture |
| 6 | Jess Salzbrun | CIO, Defense & Systems | GE Aerospace |
| 7 | William Walters | EVP, CDIO | The Joint Commission |
| 8 | Patrick Brown | SVP Field Operations | Centrus Energy |
| 9 | Cameron Stanley | CDAO | U.S. Department of Defense |
| 10 | Ted Mabrey | Global Head of Commercial | Palantir |
| 11 | Sasha Spivak | Head of Corp Dev | Palantir |

**Demo Walkthrough Hosts:** Chad Wahlquist (all demos), Patrick Dods (Maven/ShipOS)

### [§APC9-06] Deployment Demonstrations

| Demo | Key Metric | Philosophy Mapping |
|------|-----------|-------------------|
| [§APC9-D01] ShipOS (US Navy) | 200h→15s BOM, 96% backlog clearance | PA-03, SCN, Decision Lineage |
| [§APC9-D02] World View | 2 weeks→minutes mission planning | LEARN-01+03, Edge Semantics |
| [§APC9-D03] GE Aerospace | 26% output increase, orchestration agents | ACP, LEARN-02, PA-01→03 |
| [§APC9-D04] Centrus Energy | $300M savings [unverified — not in AIPCon 9 transcript], 8-week→instant visibility | AG-01..05, PA-01/02, LEARN-03 |
| [§APC9-D05] Freedom Mortgage | 500K calls/month, "flattened Ontology" | OAG, OOSD-03 |
| [§APC9-D06] Joint Commission | 400 apps modernized, weeks→3 min | OOSD-03, OOSD-04 |
| [§APC9-D07] US CDAO (Maven) | 2000→20 intel officers, hours→minutes (demo by Chad Wahlquist, not Cameron Stanley) | PA-04/05, Scenarios |
| [§APC9-D08] SAP + Accenture | 99% accuracy, 70%+ time reduction | OOSD-03 |
| [§APC9-D09] Tampa General | 1.5 hours→2 seconds prep, 700+ lives | Digital Twin, LEARN-01 |

### [§APC9-07] Anthropic-Pentagon Context

**CRITICAL:** DOD designated Anthropic a supply chain risk on March 5, 2026. Karp confirmed: "The Department of War is planning to phase out Anthropic." Maven Smart System uses Claude across 6 military branches + CENTCOM. This makes LLM independence (→[§LLMI-01]) and model catalog diversity a strategic imperative.

---

## [§APC-SIG-01] Significance for Our System

AIPCon 9 validated ontology patterns encoded in `schemas/ontology/`:

| Pattern | Validated By | Evidence |
|---------|-------------|---------|
| Decision Lineage | ShipOS, Centrus Energy, GE | LEARN-03 at scale |
| Progressive Autonomy | Nebraska Medicine (APC8), Centrus Energy, GE Aerospace | PA-01→PA-02 graduation; "not just visibility, recommending actions" [§APC9-Q08] |
| Agentic Workflows | Freedom Mortgage, CDAO, GE Aerospace | Multi-tool chaining; orchestration + functional expert agents [§APC9-Q08] |
| Scenarios/COA | ShipOS, CDAO | PA-03 (approve-then-act) |
| Digital Twin | Centrus Energy, World View | Living objects, mission memory |
| Decision-Centric AI | CDAO (Cameron Stanley) | Workflow > technology; 9 Questions methodology [§APC9-Q06] |
| Deployment Velocity | Ted Mabrey (11 examples) | 24h MVPs, 2-week migrations, "Iron Man suits" [§APC9-Q07] |

---

## Sources

- https://www.investing.com/news/transcripts/palantir-at-aipcon-9-ai-transformations-across-industries-93CH-4557860 (full transcript)
- businesswire.com — AIPCon 9 press releases (GE, Ondas, NVIDIA)
- https://www.palantir.com/sovereignaios/ (NVIDIA partnership)
- https://blog.palantir.com/maven-smart-system-innovating-for-the-alliance-5ebc31709eea (Maven NATO)
