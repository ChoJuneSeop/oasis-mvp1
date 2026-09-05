# OASIS Flow Core v0.3 Audit

## Scope

This branch implements only the first execution layer:

`M_t -> O_t -> f_t -> e_i -> h_t`

It intentionally does **not** implement:

- `a_t` relational re-participation probability
- `C_t` possibility-combination generation
- `kappa_t(U)` beyond an observation-interface hook
- `Psi_k(c)`
- `P_k(c)`
- choice/responsibility interaction
- minimum safety boundary
- `W` full relational-field rewrite

The purpose is to prevent unresolved theory from being silently replaced by arbitrary code.

## Fixed meanings represented in code

### M_t — Measurement
Raw values supplied by the environment/interface are preserved as measurements.

### O_t — Observation state
An observation is composed from the current measurement without inserting OASIS preference, reward, utility, or importance scores.

### f_t — Open relational flow
A flow is represented as an open ordered relational process.

A flow is **not** defined by:

- recent-N ticks
- fixed timeout
- similarity threshold
- reward score
- top-k memory selection

Elapsed time is retained only as descriptive information.

### e_i — Completed experience event
When a relational process is declared closed by the closure interface, the open flow becomes a completed event preserving:

- ordered relational path
- participants
- possibility snapshots observed during the process
- realized choices/events if supplied
- results if supplied
- start/end time and duration
- closure reason

This code does not yet claim a canonical mathematical definition of relational closure.

### h_t — Ordered history
Completed events are appended in completion order. History is not treated as an unordered set.

## Important non-assumptions

`relationExtractor` and `closureDetector` are dependency-injected hooks.

This is deliberate. The OASIS mathematical model has not yet supplied a canonical computational rule for either:

1. converting observation change into relational-flow transitions;
2. deciding that a relational process has formed a completed event/closure.

Therefore v0.3 does not invent thresholds, windows, similarity rules, or scores to fill those gaps.

## Tests

Local equivalent execution result:

`oasis-flow-core-v0.3: 8/8 tests passed`

Tests cover:

1. measurement and observation are separate layers;
2. a relation can remain open over arbitrarily long elapsed time;
3. time alone never closes a flow;
4. relational closure emits one completed event;
5. event history preserves order;
6. multiple relational processes can coexist;
7. closing one event does not terminate unrelated flows;
8. duration is recorded but is not used as a closure rule.

## Interpretation

Passing these tests does **not** validate OASIS as a whole.

It establishes only that the current code skeleton can preserve the newly fixed distinction:

> measurement is value; flow is an open relational change; experience is a relationally completed event.

## Next falsification target

Before implementing `a_t`, the next required algorithmic definition is the observation-to-flow boundary:

`O_t -> relational transition -> persistent f_t`

The implementation must distinguish meaningful relational change from sensor/value fluctuation without importing an arbitrary fixed numerical threshold.

A candidate algorithm must be rejected if it:

- converts every numeric fluctuation into a new relational event;
- requires a fixed recent-time window;
- identifies a flow only by symmetric entity co-occurrence;
- loses transition direction/order;
- closes flows because a timer expired;
- embeds task success, reward, survival, or a predefined historical answer into flow detection.
