// @generated
// DO NOT EDIT — produced by scripts/generators/contract-index.ts
// regenerate: bun run generate:all
// source: contracts/*.contract.json (sorted by filename), read at generation time
// generator-schema-version: 1.0.0
//
// Deterministic derived index: one entry per contracts/*.contract.json file.
// Byte-stable: content depends only on the source contract files' bytes,
// never on wall-clock time. generated:check (scripts/generated-check.ts)
// regenerates this in memory and fails the build on any drift.

export interface ContractIndexEntry {
  readonly file: string;
  readonly id: string;
  readonly title: string;
  readonly requiredFieldCount: number;
  readonly sha256: string;
}

export const CONTRACT_INDEX: readonly ContractIndexEntry[] = [
  {
    file: "digital-twin-change.contract.json",
    id: "https://palantir-ontology.internal/contracts/digital-twin-change.contract.json",
    title: "Digital Twin Change Contract (DTC)",
    requiredFieldCount: 7,
    sha256: "3db022bb55573f1fa2bff73ac577379954906c4152da70821b7c5b086b84287e",
  },
  {
    file: "event-envelope.contract.json",
    id: "https://palantir-ontology.internal/contracts/event-envelope.contract.json",
    title: "Event Envelope Contract",
    requiredFieldCount: 8,
    sha256: "86765dee1e9b611814159fe6ef683a1735f81da125a9d3999e235eaa225635bf",
  },
  {
    file: "fde-session.contract.json",
    id: "https://palantir-ontology.internal/contracts/fde-session.contract.json",
    title: "FDE Session Contract",
    requiredFieldCount: 6,
    sha256: "7c78a1a5a2370c4baf649c4f4392fa922208b3501d8c6050e78c69ae406fdbf1",
  },
  {
    file: "memory-item.contract.json",
    id: "https://palantir-ontology.internal/contracts/memory-item.contract.json",
    title: "Memory Item Contract",
    requiredFieldCount: 8,
    sha256: "b7a0ef157929c5f280780c7c477c5e00581b631586bb35713a1eb196bac7349f",
  },
  {
    file: "migration-manifest.contract.json",
    id: "https://palantir-ontology.internal/contracts/migration-manifest.contract.json",
    title: "Migration Manifest Contract",
    requiredFieldCount: 8,
    sha256: "395f21b710dde630eb25c0f8c2d201c4120b87769d8961fc4ba35cb176da5ab1",
  },
  {
    file: "mutation-authority.contract.json",
    id: "https://palantir-ontology.internal/contracts/mutation-authority.contract.json",
    title: "Mutation Authority Envelope",
    requiredFieldCount: 17,
    sha256: "7a549f5055b6e484ce02327de82c1d3da74738d267e521fd831d2db50e0c5cde",
  },
  {
    file: "ontology-binding.contract.json",
    id: "https://palantir-ontology.internal/contracts/ontology-binding.contract.json",
    title: "Ontology Binding Contract",
    requiredFieldCount: 8,
    sha256: "6abf15001e5a9b3bd2d5672a2d4705568ce3eb361a76ee94e3092427ad31ef96",
  },
  {
    file: "second-brain-graph.contract.json",
    id: "https://palantir-ontology.internal/contracts/second-brain-graph.contract.json",
    title: "SecondBrain Governing Graph Document",
    requiredFieldCount: 6,
    sha256: "d4866f6ec4f56cb77f7e0b82863bace2cec9940382a11b0e24a606da30f0f1a9",
  },
  {
    file: "second-brain-interchange.contract.json",
    id: "https://palantir-ontology.internal/contracts/second-brain-interchange.contract.json",
    title: "SecondBrain Fold Interchange Line",
    requiredFieldCount: 5,
    sha256: "5fcf98f15e59e50d3a003224844dc41adb5895e434e986a7f47b1de696e9c2ff",
  },
  {
    file: "semantic-intent.contract.json",
    id: "https://palantir-ontology.internal/contracts/semantic-intent.contract.json",
    title: "Semantic Intent Contract (SIC)",
    requiredFieldCount: 6,
    sha256: "77140ceaa902436fe24e4998429f47d949eda8630dcf98bac66f56037ed5acb2",
  },
];
