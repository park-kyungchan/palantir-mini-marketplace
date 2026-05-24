/**
 * DATA Domain Semantics
 *
 * Split from legacy semantics.ts v1.13.1 (D1, 2026-04-19).
 * Digital Twin stage: SENSE. Owns 12 concept types. See README in
 * .claude/research/palantir/data/ for domain authority.
 *
 * Consumers MUST import from the parent barrel: `from "../semantics"`.
 */

import type { DomainSemantics } from "./semantics-core";

// =========================================================================
// Section 4: DATA_SEMANTICS
// =========================================================================

export const DATA_SEMANTICS: DomainSemantics = {
  domain: "data",
  realWorldRole: "Represents the current state of the world as operational ground truth",
  semanticQuestion: "Does this describe WHAT EXISTS right now — independent of interpretation or action?",
  description:
    "DATA is the context store of what exists. It represents reality as-is: entities, their properties, "
    + "their types, and their structural shape. In a commercial sense: ERP inventory levels, CRM customer "
    + "records, engineering specs, sensor readings, financial instruments. On a battlefield: sensor fusion "
    + "data, intelligence reports, signals intelligence. DATA is standalone and foundational — if you deleted "
    + "all LOGIC and ACTION, DATA alone would still describe what exists in the world. DATA does not define "
    + "how entities relate (LOGIC), how state changes occur (ACTION), or who can access what (SECURITY).",
  analogy:
    "A library's catalog: it records what books exist, their titles, ISBNs, page counts, and shelf "
    + "locations — facts about the collection independent of how anyone uses or interprets them.",
  digitalTwinStage: "sense",
  digitalTwinRole:
    "SENSE: Multi-modal data integration captures the current state of reality. DATA entities are the "
    + "structured output of sensing — they reflect what the world looks like RIGHT NOW. In the LEARN "
    + "feedback path, ACTION outcomes produce new DATA (action logs, updated metrics, corrected predictions) "
    + "that become the next cycle's SENSE input. DATA also serves as the trusted query source for "
    + "LLM-grounded decisions (OAG Pattern 1).",
  commercialExamples: [
    {
      sector: "healthcare",
      concept: "Patient record — demographics (name, DOB, blood type), diagnoses (ICD-10 codes), vital signs (heart rate, BP, SpO2), lab results (CBC panel values)",
      reasoning: "A patient record describes what exists about a person in the healthcare system — stored facts independent of any clinical interpretation or treatment action",
    },
    {
      sector: "logistics",
      concept: "Warehouse — GPS coordinates (lat 40.7128, lon -74.0060), storage capacity (50,000 m³), throughput rate (200 pallets/hour), temperature zones (ambient, chilled -2C, frozen -18C)",
      reasoning: "A warehouse exists as a physical facility with measurable attributes — facts about the world independent of routing decisions or shipment dispatches",
    },
    {
      sector: "finance",
      concept: "Financial instrument — ticker symbol (AAPL), ISIN (US0378331005), market capitalization ($2.8T), sector (Technology), exchange (NASDAQ), currency (USD)",
      reasoning: "A security exists on an exchange with these attributes — they describe what is, not how to interpret risk or execute trades",
    },
    {
      sector: "education",
      concept: "Student enrollment — student ID (S-20260001), enrolled credits (15), cumulative GPA (3.7), degree program (Computer Science BS), academic standing (Good Standing)",
      reasoning: "A student's enrollment is a fact about their current state in the institution — stored ground truth independent of prerequisite reasoning or registration actions",
    },
    {
      sector: "manufacturing",
      concept: "CNC machine — serial number (CNC-4521), model (DMG MORI CMX 600V), axis count (5), spindle speed range (0-12000 RPM), tool magazine capacity (30), vibration sensor array (X/Y/Z accelerometers)",
      reasoning: "The machine exists with these engineering specifications — measurable physical facts about installed equipment on the factory floor",
    },
    {
      sector: "military",
      concept: "Intelligence report — classification level (SECRET), source reliability (B - Usually Reliable), content body, geolocation of origin (38.8977°N, 77.0365°W), corroboration status (Partially Corroborated)",
      reasoning: "The report exists as a collected artifact — its existence and attributes are facts, distinct from how analysts interpret or act on it",
    },
    {
      sector: "energy",
      concept: "Power generation unit — nameplate capacity (500 MW), fuel type (natural gas combined cycle), heat rate (6,200 BTU/kWh), grid connection point (Node-7A), emissions profile (CO2: 0.4 t/MWh), availability factor (92%)",
      reasoning: "The generator exists with these engineering parameters — physical facts about installed equipment independent of dispatch decisions or load balancing logic",
    },
  ],
  projectExamples: [
    { sector: "finance", concept: "NewsArticle — title, body, source, publishedAt, imageUrl, sentiment score", reasoning: "A news article exists with these journalistic attributes — factual content about a published item" },
    { sector: "finance", concept: "Stock — tickerSymbol, companyName, sector, marketCap, currentPrice", reasoning: "A stock entity stores observable market facts — the instrument exists with these properties" },
    { sector: "finance", concept: "ImpactChain — sourceArticleId, affectedStockId, impactDirection, confidence", reasoning: "Impact chain captures the data relationship between a news event and a stock — structural fact" },
    { sector: "finance", concept: "Explainer — generatedText, model, promptVersion, createdAt", reasoning: "An explainer record holds the generated explanation output — content artifact with metadata" },
  ],
  owns: [
    "ObjectType", "Property", "ValueType", "StructType", "SharedPropertyType",
    "GeoPointProperty", "GeoShapeProperty", "GeoTemporalProperty",
    "TimeSeriesProperty", "AttachmentProperty", "VectorProperty", "CipherProperty",
  ],
  reads: [],
  mustNotContain: [
    "LinkType", "Interface", "Query", "DerivedProperty", "Function",
    "Mutation", "Webhook", "Automation",
  ],
  classificationRules: [
    {
      id: "CR-DATA-01",
      concept: "GeoPoint property on a Warehouse entity",
      semanticTest: "Does the warehouse's physical location describe what EXISTS?",
      domain: "data",
      reasoning: "A GPS coordinate is a stored fact about where a physical facility is located — it exists independently of any routing logic or dispatch action",
    },
    {
      id: "CR-DATA-02",
      concept: "Cipher property storing an encrypted SSN",
      semanticTest: "Does the encrypted Social Security Number describe what EXISTS?",
      domain: "data",
      reasoning: "The encrypted value is stored state — the SSN exists as a fact about a person, encrypted at rest for compliance. Encryption is a storage concern, not reasoning or execution",
    },
    {
      id: "CR-DATA-03",
      concept: "Vector embedding on a Document entity",
      semanticTest: "Does the 1536-dimensional embedding describe what EXISTS?",
      domain: "data",
      reasoning: "The embedding is a stored numeric representation of the document's content — it exists as a computed artifact persisted alongside the document, not an active computation",
    },
    {
      id: "CR-DATA-04",
      concept: "Attachment property (X-ray DICOM image) on a Patient entity",
      semanticTest: "Does the X-ray file describe what EXISTS?",
      domain: "data",
      reasoning: "The image file exists as a stored binary asset — a fact about what was captured. Interpreting the X-ray (reading for fractures) would be LOGIC; the file itself is DATA",
    },
    {
      id: "CR-DATA-05",
      concept: "StructType (Address: street, city, state, zip, country)",
      semanticTest: "Does the address composite shape describe what EXISTS?",
      domain: "data",
      reasoning: "A struct defines how data is shaped — it is a schema-level fact about structure. The address exists as nested fields within an entity, not as an independent reasoning path",
    },
  ],
  hardConstraints: [
    {
      id: "HC-DATA-01",
      domain: "data",
      rule: "Cipher properties cannot be indexed or used in filters",
      severity: "error",
      source: ".claude/research/palantir/data/cipher.md",
      rationale: "Encrypted data cannot be compared, sorted, or filtered without decryption — indexing would require the plaintext, defeating the purpose of encryption at rest",
    },
    {
      id: "HC-DATA-02",
      domain: "data",
      rule: "Primary key property is immutable after object creation",
      severity: "error",
      source: ".claude/research/palantir/data/entities.md",
      rationale: "PK immutability ensures referential integrity across all links, indexes, and external references — changing a PK would orphan all downstream references",
    },
    {
      id: "HC-DATA-03",
      domain: "data",
      rule: "Maximum 2,000 properties per ObjectType (OSv2)",
      severity: "error",
      source: ".claude/research/palantir/architecture/ontology-model.md §ARCH-39 — Canonical Constraints",
      rationale: "Object Storage V2 hard limit — exceeding this causes schema compilation failure",
    },
    {
      id: "HC-DATA-04",
      domain: "data",
      rule: "KNN vector search maximum K=100 results",
      severity: "error",
      source: ".claude/research/palantir/data/vectors.md",
      rationale: "Platform limit on nearest-neighbor result count — requesting K>100 causes API error",
    },
    {
      id: "HC-DATA-05",
      domain: "data",
      rule: "KNN vector maximum 2,048 dimensions",
      severity: "error",
      source: ".claude/research/palantir/data/vectors.md",
      rationale: "Platform limit on embedding dimensionality — vectors exceeding 2048 dimensions cannot be indexed",
    },
  ],
  boundaryTestId: "DS-1",
} as const;

