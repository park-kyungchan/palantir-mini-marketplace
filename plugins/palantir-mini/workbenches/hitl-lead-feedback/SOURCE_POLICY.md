# HITL HTML Source Policy

This workbench uses a strict direct-source policy. A summary source card is not
enough to authorize a new HTML HITL artifact.

## Schema Primitives

### HITLHtmlEvidenceSource

Required fields:

- `sourceId`
- `url`
- `sourceKind`
- `captureStatus`: `complete` or `blocked`
- `rawRef`
- `renderedDomSnapshotRef`
- `screenshotRef`
- `imageInventoryRef`
- `claimMapRef`
- `provenance.hash`
- `blockedReason` when `captureStatus` is `blocked`

### HITLHtmlInteractionPattern

Required fields:

- `patternId`
- `taskCondition`
- `userFeedbackNeed`
- `recommendedSurface`
- `requiredControls`
- `antiPatterns`
- `sourceRefs`

### HITLHtmlVisualGuideline

Required fields:

- `layout`
- `color`
- `typography`
- `contrast`
- `accessibility`
- `motion`
- `density`
- `sourceRefs`

### HITLHtmlArtifactRecipe

Required fields:

- `stage`
- `selectedPattern`
- `requiredSections`
- `exportFormat`
- `sourceRefs`
- `metadata`

### HITLHtmlRequestGate

Required fields:

- `explicitHtmlRequested`
- `htmlRequestSignal`
- `defaultNoHtmlBehavior`
- `blockedReason`

## Required Evidence Classes

Every source used by a generated HTML artifact must have all of these evidence
classes:

| Evidence class | Required ref |
|---|---|
| Raw text or HTML | Scrapling or equivalent direct capture ref with hash |
| Rendered DOM | Playwright accessibility or DOM snapshot ref |
| Full-page screenshot | Playwright full-page screenshot ref |
| Image inventory | List of rendered images, charts, diagrams, icons, alt text, and inferred meaning |
| Claim map | Claim-source-confidence-gap map |
| Provenance | URL, final URL, method, timestamp, status, content type, and hash |

If any required evidence class is missing, the source is `blocked` for HTML
generation. A source can still be useful as a refresh target or background
reading, but it cannot be cited as a passing `sourceRef` in artifact metadata.

## Required Source Set

The manifest in `sources/required-sources.json` must track:

- Five direct trq212 X posts.
- Claude HTML blog.
- Companion examples index and all 20 demo HTML URLs.
- Anthropic Opus 4.7 announcement.
- OpenAI GPT-5.5 latest model guide.
- Microsoft Magentic-UI.
- Apple designer-feedback UI generation paper.
- DuetUI.
- CopilotKit Generative UI Spectrum.
- Vercel Generative UI.
- NN/g usability heuristics.
- WCAG 2.2.
- Material color/accessibility.
- GOV.UK styles.
- Apple Human Interface Guidelines.

## Allowed Sources

Allowed evidence must come from the direct URL or a sub-URL visibly linked by
that direct URL. Official docs are preferred for capability and accessibility
claims. Practitioner posts can inform patterns, but cannot be the only basis
for runtime capability facts.

## Not Allowed

Do not use:

- Third-party mirrors.
- Search snippets.
- Cache/proxy pages.
- Social reposts.
- Model memory.
- Historical source cards as proof of current source accessibility.

## Current Refresh Note

On 2026-05-21, direct text probes succeeded for the official/model/UI guidance
sources listed in `sources/claim-map-2026-05-21.md`. Current direct X probes for
the five trq212 URLs returned an X error page. Because complete rendered and
image evidence has not been committed for the required set, the source manifest
is blocked for HTML generation until a full capture refresh is recorded.

## Blocked Report Contract

When HTML is requested but required evidence is blocked, return a blocked report
with:

- requested artifact type
- selected pattern candidate
- blocked source IDs
- missing evidence classes
- direct capture attempts
- what the user can provide next
- copyable next prompt

Do not create a placeholder HTML file in this state.
