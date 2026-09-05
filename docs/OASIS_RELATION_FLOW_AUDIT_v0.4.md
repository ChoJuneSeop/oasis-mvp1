# OASIS Relational Flow v0.4 Audit

## Scope

This step implements only:

`O_t -> observed relational state -> relational transition -> persistent f_t`

It does not implement `a_t`, possibility-combination generation, `Psi`, probability selection, responsibility, minimum safety boundary, or full event closure.

## Kill-search conclusion

Event-based temporal graphs, graph differencing, and process/event-stream segmentation already cover relation additions, updates, removals, and event-stream representations. Therefore v0.4 does **not** claim novelty for change detection itself.

The methodological need here is narrower: define a neutral observation-to-flow boundary so that OASIS-specific reward, preference, memory similarity, fixed time windows, or historical answers are not silently inserted into the observation layer.

## Representation boundary

A relational observation is supplied by the observation/perception interface as:

- `relationType`: the observed relation dimension/channel;
- `roles`: named participant roles, preserving direction and role assignment;
- `state`: the currently observed relational state;
- `evidence`: optional raw/numeric evidence supporting the observation;
- `present: false`: explicit observation that the relation is absent.

Example:

`relationType=proximity, roles={actor:A,target:B}, state=approaching, evidence={distance:9.998}`

The tracker does not infer `approaching` from distance. That inference belongs to the environment/perception interface and must be audited separately.

## Fixed algorithmic rules

1. Relation identity is `relationType + named roles`.
2. Role assignments are directional. `actor=A,target=B` is not equal to `actor=B,target=A`.
3. Repeated observation of the same relational state continues the same flow.
4. A changed relational state creates an ordered transition inside the same flow.
5. Numeric evidence changes do not themselves create a new semantic relation state.
6. Missing a relation from an observation means unknown/not observed; it does not terminate the flow.
7. Only explicitly observed absence terminates the relational flow.
8. Elapsed time never terminates a flow.
9. Reappearance after explicit cessation creates a new flow generation.
10. Multiple relations can remain active and evolve independently.

## Why evidence is separated from relation state

Raw sensor values can vary continuously or noisily. Treating every numeric delta as a new event would make `f_t` a sensor-noise stream rather than a relational flow.

v0.4 therefore records numeric values as `evidence` but does not use a fixed threshold to decide semantic change. Semantic relation state is supplied by the observation/perception boundary.

This avoids inserting an arbitrary OASIS threshold into the flow core, but it does **not** solve real-world perception. The perception layer remains a separate validation target.

## Critical construct-validity warning

The observation interface can itself become a hidden answer key.

If `relationType`, `roles`, or `state` are authored specifically to favor OASIS or encode future/task-success information, all downstream experiments are invalid.

Therefore future experiments must give comparator systems access to the same externally defined observable reality, and the relational observation adapter must be evaluated independently from the OASIS decision algorithm.

## Local falsification result

Local equivalent execution:

`oasis-relation-flow-v0.4: 10/10 tests passed`

Tests cover:

1. direction/role preservation;
2. deterministic role serialization;
3. relation emergence;
4. noisy numeric evidence without false semantic transition;
5. state transition within one persistent flow;
6. no time-based termination;
7. missing observation != relation cessation;
8. explicit absence terminates without timeout;
9. reappearance creates a new generation;
10. concurrent relation flows remain independent.

## What this does not prove

Passing these tests does not show that OASIS can discover meaningful relations from raw physical sensor values.

It proves only that, once a neutral observation layer supplies relational states, the flow tracker can preserve relational direction, continuity, transition order, uncertainty caused by missing observation, and duration without fixed windows or thresholds.

## Next falsification target

The next unresolved boundary is:

`M_t -> O_t relational representation`

The question is whether relation states can be produced from raw measurements without embedding OASIS-specific interpretation or arbitrary fixed decision thresholds.

A candidate must be rejected if it:

- uses task reward or desired outcome to label relations;
- uses future information;
- assigns relational meaning only for OASIS while comparators receive poorer observations;
- converts every sensor fluctuation into a relation transition;
- hides fixed arbitrary thresholds behind the adapter without justification;
- destroys participant roles/direction.
