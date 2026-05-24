---
source-url: https://www.palantir.com/docs/foundry/global-branching/overview/
source-author: "Palantir Technologies (official Foundry docs)"
source-published: 2026-05-05
fetched-at: 2026-05-06T12:40:00Z
license-note: "External source — read-only mirror for AI-agent research SSoT per ~/.claude/CLAUDE.md §Artifact Layer Policy. Original docs copyright Palantir Technologies. Do not redistribute outside ~/.claude/research/."
topic: "Global Branching (formerly Foundry Branching) — cross-application unified branching, end-to-end test on branch, single-click merge; GA week of 2026-05-18; approval policies + branch lifecycle"
---

# Global Branching — Overview

> Source: https://www.palantir.com/docs/foundry/global-branching/overview/
> Fetched 2026-05-06 from official Palantir Foundry docs.
> GA anchor: 2026-05-05 announcement "Global Branching is generally available May 18: branch, test, and merge across applications."
> Cited by: rule 16 v4.0.0 §Loop (the harness loop's commit/merge phase parallels Global Branching's proposal model); `palantir-vision/aipcon-devcon/ai-fde.md` (AI FDE auto-uses Global Branching by default).

---

## Overview

Global Branching (previously known as "Foundry Branching") enables you to
develop and test comprehensive end-to-end workflows in the Palantir
platform that might otherwise be too disruptive or risky for a live
production environment.

While code repositories, data pipelines, and the Ontology support separate
branching workflows, Global Branching provides a unified experience to
make modifications across multiple applications on a single branch, test
those changes end-to-end without disrupting the production environment,
and merge those changes with a single click.

Global Branching is in active development; the supported-functionality
page lists currently available features.

## Enable Global Branching

Administrators can enable Global Branching within the Application Access
section in Control Panel. Global Branching is available for Pipeline
Builder, the Ontology, Workshop, datasets in Code Repositories, and
running actions on a branch.

Note that if your Workshop module contains non-Workshop elements for which
Global Branching is not available, such as Quiver dashboards, these
elements will not be modifiable on a branch.

## Example Global Branching workflow

You can make changes to transforms code repositories, Pipeline Builder,
the Ontology, and Workshop modules on a single branch. You can also run
Actions on branches without writing back edits to `Main`.

For instance, take a workflow that consists of a simple pipeline in
Pipeline Builder that outputs a dataset used to back an object type. With
Global Branching, you can make changes to the logic and schema of your
output dataset on a branch, see these changes in Ontology Manager on that
same branch, and modify the object type definition as a result.

Global Branching also supports a review process; developers can add
reviewers for different resources depending on each resource's approval
policy. Once changes are finalized and approved, they can be deployed into
the `Main` branch. This feature ensures a safe and controlled approach to
updating and improving data pipelines, the Ontology, and Workshop
applications.

## Branch cost and retention

Each branch has associated compute and storage costs, and modifying large
object types on a branch can incur significant additional costs. Branch
cost insights in Resource Management are currently in progress. Branches
are intended to be relatively short-lived, and retention policies are
available to automatically close stagnant branches.

## Global Branching vs. release management

Global Branching enables development and testing of workflow changes on a
separate branch. This is ideal for managing changes in a development
environment, as it allows developers to work in isolation and only merge
changes into the `Main` branch when the feature is complete. Release
management is the process of managing multiple versions of resources
across distinct environments that serve different purposes.

Release management and Global Branching can work together harmoniously.
They should not be seen as alternative solutions to the same problem, but
rather complementary solutions to different problems.

For example, you can use release management and Global Branching together
when developing a large feature that needs to be added to a workflow.
Larger features could take a few weeks to develop and require foundational
changes to dataset and object type schemas. You can develop this feature
on a Global branch and merge the changes into the development environment
when it is completed. Then, you can use release management to deploy these
changes to your test and production environments.

---

## GA delta (2026-05-05 announcement) — supported applications & approval policies

The 2026-05-05 announcement (GA week of 2026-05-18) extends the overview
with these new details:

### Supported applications and workflows (GA)

Global Branching is available for: transforms and TypeScript v1 functions
repositories, Pipeline Builder, the Ontology, Workshop, AIP Logic, and
Object Views.

For these applications, the following workflows are supported:

- **Branch and modify resources**: Create or access a branch, and make
  changes to resources without affecting the `Main` branch.
- **Remove resources**: Remove a resource from a branch to reset it to its
  state on the `Main` branch.
- **Include new updates from `Main` and resolve conflicts**: Rebase your
  branched resource to update it with the latest changes from the `Main`
  branch. If conflicts exist, you will be redirected to the appropriate
  application to resolve them.
- **Protect resources**: Resource owners can protect resources so that
  changes must go through a branch and receive approval before merging.
- **Define approval policies**: Project owners define approval policies
  specifying eligible reviewers, required approvals, and whether
  contributors can self-approve. For Code Repositories and Pipeline
  Builder, you define policies within the resource itself.
- **View branched resources**: Use Data Lineage to inspect the branched
  state of your resources and trace how changes propagate.
- **Clear all checks and merge changes**: When a proposal is created, the
  system runs checks on each resource to surface issues such as conflicts
  or missing approvals. Once all checks pass, you can merge your proposal.

### Updated security model and branch lifecycle (GA)

When Global Branching reaches GA, the security model and branch lifecycle
will feature:

- **Simplified merge permissions**: Previously, merging required a
  dedicated branch role. Going forward, any user who can view a proposal
  can merge it once all approvals and checks are satisfied. A new **Do
  not merge** setting allows branch owners to block merges until they
  are ready.
- **Revamped branch lifecycle**: Inactive branches will have ontology
  resources de-indexed and data eventually deleted, but all logic is
  preserved. Branches will no longer be auto-closed. Instead, branches
  can be manually archived and restored at any time.

### Restricted Views, Automate, and what's ahead (beta)

Restricted Views and Automate are now available in beta. The core branching
workflow is functional, but some GA-level features — such as approval
integration and removing a resource from a branch — are not yet available.
Contact Palantir Support to enable.

Beyond these two applications, branching support is being actively
expanded across the Palantir platform, starting with OSDK, TypeScript v2
and Python functions, and Developer Console.

---

## Architectural significance for palantir-mini

palantir-mini's auto-merge + cleanup default (rule 25 v1.0.0) shares
several invariants with Global Branching:

- **Branch is the unit of change** — both palantir-mini's `pm-ship` and
  Global Branching treat the branch (not the individual file edit) as the
  reviewable atomic unit.
- **Merge gates are explicit** — Global Branching: approvals + checks
  passing. palantir-mini rule 25: branch-prefix allowlist + isDraft=false
  + mergeable=MERGEABLE. Different gates, same shape.
- **Branch lifecycle is governed** — Global Branching: archive/restore +
  retention. palantir-mini: post-merge `git branch -d` + `git worktree
  prune` + stash count ≤1 invariant.
- **Cross-application atomicity** — Global Branching merges N applications
  in one click. palantir-mini's monorepo workspace structure (palantirkc
  G2 consolidation 2026-04-21) takes the same posture: schemas + ontology
  + plugin all merge together, not separately.

AI FDE relevance: per the AI FDE overview (companion mirror), AI FDE
**defaults to using branching across all workflows** — it proposes changes
in a Global Branch proposal or Code Repository pull request for review.
This matches palantir-mini's harness-generator role (rule 16 v4.0.0
§Roles): the Generator never commits directly to main; it proposes via
edit_proposed → edit_committed events.

---

## Local indexing notes

- **Cited by**:
  - `~/.claude/rules/25-auto-merge-cleanup-default.md` v1.0.0 — auto-merge gate-set rationale.
  - `~/.claude/rules/16-3-agent-harness.md` v4.0.0 §Loop — propose/commit pattern parallel.
  - `~/.claude/research/palantir-foundry/aip/ai-fde-overview-and-modes-skills-2026-03-12.md` §How AI FDE works step 4 — closed-loop validation maps to Global Branching review.
- **Companion mirrors**:
  - `aip/ai-fde-overview-and-modes-skills-2026-03-12.md` — AI FDE closed-loop default-uses-branching.
  - `dev-toolchain/palantir-mcp-and-ontology-mcp-2026-03-26.md` — builder/consumer MCP split.
  - `security-deployments/announcements-2026-03-04-05-aipcon9-bundle.md` — May 2026 GA announcement.
- **Pre-existing fetch overlap**: none — Global Branching docs were not in the 2026-04-20 batch. This is a **new file**.
- **Refresh trigger**: refetch on the GA date (week of 2026-05-18) for any GA-final-only fields, or when OSDK / TypeScript v2 / Python functions / Developer Console branching support ships.
