# Templates

These templates are used in Phase 3 (DECIDE) to collect user scope decisions.
The key principle: never assume what the user wants — always ask explicitly.

## Why Structured Questions Matter

Unstructured questions like "What should I do?" produce vague answers.
Structured with concrete options produce actionable decisions:
- "Delete or keep?" is a binary choice the user can make in 2 seconds
- Feature descriptions in `description` field prevent confusion
- multiSelect allows batch decisions

---

## Template 1: Core Workflow Confirmation

Use after Phase 2 audit reveals which features exist.

```({
  questions: [{
    question: "Which of these workflows do you actually use? Deselect any you don't.",
    header: "Active workflows",
    options: [
      // Populate from Phase 2 audit findings — list each discovered feature
      { label: "{Feature A name}", description: "{What it does in plain language}" },
      { label: "{Feature B name}", description: "{What it does in plain language}" },
      { label: "{Feature C name}", description: "{What it does in plain language}" },
      { label: "{Feature D name}", description: "{What it does in plain language}" },
    ],
    multiSelect: true,
  }]
})
```

---

## Template 2: Unused Feature Disposition

Use after Template 1 identifies unused features.

```({
  questions: [{
    question: "For these unused features, should we keep them for later or delete them?",
    header: "Unused features",
    options: [
      // Each option is a feature + disposition
      { label: "{Feature X} = keep for later",
        description: "{Plain explanation of what it does}. Code stays but is unused." },
      { label: "{Feature X} = delete OK",
        description: "Remove all code, types, and DB tables for {Feature X}." },
      { label: "{Feature Y} = keep for later",
        description: "{Plain explanation}" },
      { label: "{Feature Y} = delete OK",
        description: "Remove all code for {Feature Y}." },
    ],
    multiSelect: true,
  }]
})
```

---

## Template 3: Clarification Round

Use when the user says "I don't understand what X is."

```({
  questions: [{
    question: "{Feature X} does this: {VERY simple explanation with concrete example}.
               Do you use this?",
    header: "Clarify {X}",
    options: [
      { label: "Yes, I use it", description: "Keep all {X} code." },
      { label: "No, but keep for later", description: "Code stays, not actively used." },
      { label: "No, delete it", description: "Remove all {X} code." },
    ],
    multiSelect: false,
  }]
})
```

---

## Template 4: Work Type Selection

Use at the START of orchestration when the user's task is ambiguous.

```({
  questions: [{
    question: "What kind of work is this?",
    header: "Work type",
    options: [
      { label: "Audit / Analysis",
        description: "Find problems (drift, dead code, bottlenecks) without changing anything." },
      { label: "Cleanup / Refactor",
        description: "Remove dead code, fix drift, improve structure." },
      { label: "Add Feature",
        description: "Add new functionality to existing ontology." },
      { label: "Full Redesign",
        description: "Major restructuring across ontology, backend, and frontend." },
    ],
    multiSelect: false,
  }]
})
```

---

## Guidelines for Writing Question Options

1. **Use plain language** — "A feature that records lecture sessions in the DB"
   not "startLecture mutation with Lecture entity persistence"

2. **Max 4 options per question** — supports 2-4 options.
   If more items need decisions, split across multiple questions.

3. **Include "Other"** — The tool automatically adds an "Other" option for
   custom text input. Don't duplicate it.

4. **Batch related decisions** — Group similar features in one multiSelect
   rather than asking one question per feature.

5. **Description length** — Keep descriptions under 100 characters.
   Long descriptions get truncated in the UI.

6. **Re-ask if unclear** — If the user picks "Other" with a confused response,
   explain the feature more simply and ask again. Never proceed on ambiguity.
