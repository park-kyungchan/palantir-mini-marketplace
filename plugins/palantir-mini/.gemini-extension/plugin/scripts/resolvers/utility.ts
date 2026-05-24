// Utility resolvers — Claude-slim selection of gstack utility.ts.
// Ports: BASE_BRANCH_DETECT, CO_AUTHOR_TRAILER, CHANGELOG_WORKFLOW, QA_METHODOLOGY.
// Dropped (gstack-specific): SLUG_EVAL, SLUG_SETUP, DEPLOY_BOOTSTRAP
// (Slug uses gstack-slug bin; deploy targets are project-specific.)

import type { TemplateContext } from "./types";

export function generateBaseBranchDetect(_ctx: TemplateContext): string {
  return `## Step 0: Detect base branch

Before running any git comparison, detect the repository's base branch dynamically:

\`\`\`bash
base=$(gh pr view --json baseRefName -q .baseRefName 2>/dev/null ||
       gh repo view --json defaultBranchRef -q .defaultBranchRef.name 2>/dev/null ||
       git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' ||
       echo main)
echo "base-branch: $base"
\`\`\`

Use \`$base\` (or "the base branch" in prose) for subsequent \`git log origin/$base..HEAD\` and \`git diff origin/$base...HEAD\` operations. Never hardcode \`main\` or \`master\`.`;
}

export function generateCoAuthorTrailer(_ctx: TemplateContext): string {
  return `## Co-Authored-By Trailer

When creating commits during this skill, append the co-authored-by trailer:

\`\`\`
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
\`\`\`

Use a HEREDOC for commit messages to preserve formatting:

\`\`\`bash
git commit -m "$(cat <<'EOF'
<commit message>

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
\`\`\``;
}

export function generateChangelogWorkflow(_ctx: TemplateContext): string {
  return `## CHANGELOG workflow

**VERSION and CHANGELOG are branch-scoped.** Every feature branch that ships gets its own version bump and CHANGELOG entry. The entry describes what THIS branch adds — not what was already on the base branch.

**When to write the CHANGELOG entry:**
- At ship time (final step before opening the PR), not during development.
- The entry covers ALL commits on this branch vs the base branch.
- Never fold new work into a prior entry that already landed on the base branch.

**Key questions before writing:**
1. What branch am I on? What did THIS branch change?
2. Is the base branch version already released? (If yes, bump and create a new entry.)
3. Does an existing entry on this branch already cover earlier work? (If yes, replace it with one unified entry for the final version.)

**Merging base does NOT mean adopting base's version.** When base is at vX.Y.Z and your branch adds features, bump to vX.Y.(Z+1) with a new entry. Your entry goes on top because your branch lands next.

**After any CHANGELOG edit:**

\`\`\`bash
grep "^## \\[" CHANGELOG.md
\`\`\`

Verify the full version sequence is contiguous — no gaps, no duplicates. If the edit broke the sequence, fix it before committing.

**CHANGELOG.md is for users, not contributors.** Write like product release notes. Lead with what the user can now do. Plain language, not implementation details. No TODOS, internal tracking, or contributor-facing details in the main section.`;
}

export function generateQAMethodology(_ctx: TemplateContext): string {
  return `## QA methodology

**Report-only unless asked to fix.** QA findings are observations, not automated patches. Prefer:

1. **Reproduce** — can you make the failure happen again? Record the steps.
2. **Localize** — which file and line does the failure manifest? Use logs, stack traces, and git blame to narrow scope.
3. **Classify** — is this a bug (code wrong), a spec gap (contract missing), a flake (timing/env), or a misuse (caller wrong)?
4. **Grade severity** — P0 (production broken), P1 (feature broken), P2 (degraded), P3 (cosmetic).
5. **Cite the evidence** — quote the failing assertion, log line, or stack trace. Don't paraphrase.

**Never silence by retry-until-pass.** A failing test that passes on retry is still broken — investigate the flake before moving on.`;
}
