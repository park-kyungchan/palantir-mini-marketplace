/**
 * palantir-mini — Reducer primitive (prim-logic-05)
 *
 * Aggregation or fold over a collection. Critical for snapshot derivation from
 * events.jsonl: Reducer<EventEnvelope, OntologySnapshot> folds the log into
 * current state. Powers LEARN -> DATA derivation per DC5-06.
 *
 * PECS: Reducer<In, Out> — In is consumer-super (any event supertype), Out is
 * producer-extends (produces typed snapshot subtype).
 */

export interface ReducerDeclaration<In, Out> {
  readonly name: string;
  readonly description?: string;
  readonly initialState: Out;
  readonly step: (accumulator: Out, item: In) => Out;
}

/** Run a reducer over an iterable. */
export function runReducer<In, Out>(reducer: ReducerDeclaration<In, Out>, items: Iterable<In>): Out {
  let acc = reducer.initialState;
  for (const item of items) {
    acc = reducer.step(acc, item);
  }
  return acc;
}

/** Type utility: extract the output type of a reducer declaration */
export type ReducerOut<R> = R extends ReducerDeclaration<unknown, infer O> ? O : never;
export type ReducerIn<R>  = R extends ReducerDeclaration<infer I, unknown> ? I : never;
