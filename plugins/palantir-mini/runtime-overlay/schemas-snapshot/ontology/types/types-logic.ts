/**
 * Ontology Types — LOGIC Domain Export Shapes
 *
 * Split from legacy types.ts v1.13.1 (D4, 2026-04-19). LinkType, Interface,
 * Query, Function and the OntologyLogic barrel shape.
 *
 * Consumers MUST import from the parent barrel: `from "../types"`.
  * @owner palantirkc-ontology
 * @purpose LOGIC Domain Export Shapes
 */

import type { StructuralRule, BilingualDesc, LinkCardinality, QueryType, FunctionCategory, FunctionVersion } from "./types-core";
import type { Property, DerivedProperty } from "./types-data";

// =========================================================================
// LOGIC Domain Export Shapes
// =========================================================================

export interface LinkType {
  readonly apiName: string;
  readonly description: BilingualDesc;
  readonly sourceEntity: string;
  readonly targetEntity: string;
  readonly cardinality: LinkCardinality;
  readonly fkProperty?: string;
  readonly fkSide?: "source" | "target";
  readonly joinEntity?: string;
  readonly reverseApiName?: string;
}

export interface InterfaceLinkConstraint {
  readonly linkApiName: string;
  readonly targetType: string;
  readonly cardinality: "ONE" | "MANY";
  readonly required: boolean;
}

export interface OntologyInterface {
  readonly apiName: string;
  readonly description: BilingualDesc;
  readonly properties: readonly string[];
  readonly linkConstraints?: readonly InterfaceLinkConstraint[];
  readonly implementedBy: readonly string[];
}

export interface QueryFilterField {
  readonly propertyApiName: string;
  readonly operators: readonly string[];
}

export interface Parameter {
  readonly name: string;
  readonly type: string;
  readonly description?: BilingualDesc;
  readonly required?: boolean;
}

export interface OntologyQuery {
  readonly apiName: string;
  readonly description: BilingualDesc;
  readonly entityApiName: string;
  readonly queryType: QueryType;
  readonly filterFields?: readonly QueryFilterField[];
  readonly parameters?: readonly Parameter[];
  readonly returnType?: string;
  readonly traversalPath?: readonly string[];
}

export interface OntologyFunction {
  readonly apiName: string;
  readonly description: BilingualDesc;
  readonly category: FunctionCategory;
  readonly parameters: readonly Parameter[];
  readonly returnType: string;
  readonly operatesOn?: string;
  readonly pureLogic: string;
  /** Whether this function is exposed as an LLM-callable tool (Pattern 2: Logic Tool Handoff). */
  readonly toolExposure?: boolean;
  /** TypeScript function version — v2 recommended for ontology transactions. Source: logic/functions.md */
  readonly functionVersion?: FunctionVersion;
}

export interface OntologyLogic {
  readonly linkTypes: readonly LinkType[];
  readonly interfaces: readonly OntologyInterface[];
  readonly queries: readonly OntologyQuery[];
  readonly derivedProperties: readonly DerivedProperty[];
  readonly functions: readonly OntologyFunction[];
}

