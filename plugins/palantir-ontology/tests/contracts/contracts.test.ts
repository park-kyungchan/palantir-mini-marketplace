// P330: scoped contract-schema test suite. Run in isolation with
// `bun test tests/contracts` (see package.json "test:contracts" script).
// One runContractSuite() call per contracts/*.contract.json schema; each
// call proves that contract's positive fixtures validate and its negative
// fixtures (malformed + missing-load-bearing-field cases) are rejected.

import fdeSessionSchema from "../../contracts/fde-session.contract.json";
import semanticIntentSchema from "../../contracts/semantic-intent.contract.json";
import digitalTwinChangeSchema from "../../contracts/digital-twin-change.contract.json";
import mutationAuthoritySchema from "../../contracts/mutation-authority.contract.json";
import ontologyBindingSchema from "../../contracts/ontology-binding.contract.json";
import memoryItemSchema from "../../contracts/memory-item.contract.json";
import eventEnvelopeSchema from "../../contracts/event-envelope.contract.json";
import migrationManifestSchema from "../../contracts/migration-manifest.contract.json";
import secondBrainInterchangeSchema from "../../contracts/second-brain-interchange.contract.json";
import secondBrainGraphSchema from "../../contracts/second-brain-graph.contract.json";
import { runContractSuite } from "../support/contract-suite";

runContractSuite("fde-session", fdeSessionSchema);
runContractSuite("semantic-intent", semanticIntentSchema);
runContractSuite("digital-twin-change", digitalTwinChangeSchema);
runContractSuite("mutation-authority", mutationAuthoritySchema);
runContractSuite("ontology-binding", ontologyBindingSchema);
runContractSuite("memory-item", memoryItemSchema);
runContractSuite("event-envelope", eventEnvelopeSchema);
runContractSuite("migration-manifest", migrationManifestSchema);
runContractSuite("second-brain-interchange", secondBrainInterchangeSchema);
runContractSuite("second-brain-graph", secondBrainGraphSchema);
