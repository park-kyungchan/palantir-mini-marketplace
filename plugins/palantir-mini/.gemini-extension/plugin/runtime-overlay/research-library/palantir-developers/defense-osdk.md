---
source: official-builder-routing
fetched: 2026-04-23
section: palantir-developers
doc_title: Defense OSDK — official builder path and MAVEN-adjacent reading
citations:
  - https://www.palantir.com/docs/foundry/developers
  - https://www.palantir.com/docs/defense-osdk/api
  - https://www.palantir.com/docs/defense-osdk/api/common/overview/about
  - https://www.palantir.com/docs/defense-osdk/api/targetingFires/overview/about/
  - https://www.palantir.com/docs/defense-osdk/api/orderOfBattle/overview/about/
  - https://blog.palantir.com/maven-smart-system-innovating-for-the-alliance-5ebc31709eea
---

# Defense OSDK — official builder path and MAVEN-adjacent reading

## Why this is the right official entrypoint

The developers landing page explicitly links **Build with the Defense OSDK** as a featured example. That makes Defense OSDK the most relevant official public entrypoint for defense-domain builder questions.

## Canonical read order

1. developers landing page
2. `defense-osdk/api`
3. one domain overview:
   - common interfaces
   - order of battle
   - targeting and fires
   - sustainment
   - intelligence
4. MAVEN / MSS design reading only after the API-layer shape is clear

## What the official Defense OSDK docs establish

- Defense OSDK is an API layer that abstracts heterogeneous defense data models.
- Its purpose is not just data access, but a semantically consistent development surface for third-party applications.
- The public builder contract is **interface-first**:
  applications code against shared interfaces rather than every concrete object type.
- Developer Console is still the generation surface for clients and scoped access.

## Why this matters for MAVEN design reading

The public MSS / MAVEN material is thinner than the Defense OSDK API reference. So for architecture questions, agents should infer MSS from the public builder surfaces in this order:

1. Defense OSDK interface model
2. ontology-backed objects / links / actions
3. mission-domain interface families like targeting and fires, order of battle, tracked entities
4. MSS blog examples showing those primitives in an operational loop

## Minimal deep-dive sets

### "What kind of system is MAVEN / MSS?"

1. `defense-osdk/api`
2. common interfaces overview
3. `~/docs/research-synthesis/2026-04-23-maven-defense-osdk-design-reading.md` (migrated 2026-05-01)

### "How is mission targeting modeled?"

1. targeting and fires overview
2. common interfaces overview
3. Defense Tracked Entity API surface if live tracks are relevant

### "How do third parties build on defense semantics?"

1. `defense-osdk/api`
2. Developer Console generation path
3. one domain overview

## Boundary

Do not treat the Defense OSDK docs as a full public specification for all of MSS. Treat them as the clearest public builder-facing semantic contract that explains what kind of system MSS must be built on top of.
