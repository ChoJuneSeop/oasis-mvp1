# GH-4 Claim and Execution Boundary

Status: STAGE_6_BOUNDARY_FROZEN

## What may be claimed if confirmatory evidence supports it

Only the following bounded proposition is in scope:

A persistent synthetic Governance OASIS execution can maintain current-flow-first selective re-participation, current responsibility binding, single realization, outcome-based revalidation, atomic experience/provenance accumulation and delayed later re-entry of run-created Completed Experiences over the prespecified long horizon; prespecified ablation arms can distinguish which integrated layer changes later participation or realization paths in that frozen system.

## What may not be claimed

The experiment cannot by itself establish:

- general intelligence,
- real-world safety,
- CARLA deployment safety,
- universal optimality,
- learned policy superiority,
- statistical population generalization,
- novelty of long-term memory, feedback, reflection or continual learning,
- that a specific U/I/V/T policy is normatively correct,
- that every accumulated experience should be reused.

## Frozen arms

- `H1_FULL_INTEGRATED`: growing decision-eligible archive + exposed provenance-bound feedback + selective contextual participation + current responsibility bound to realization.
- `H2_FROZEN_NEW_CE`: run-created experiences are committed and preserved but only frozen baseline experiences are decision-eligible.
- `H3_FEEDBACK_RECORD_ONLY`: growing archive is decision-eligible, but committed feedback is hidden from later participation decisions.
- `H4_RESPONSIBILITY_RECORD_ONLY`: growing archive and feedback are active; current U/I/V/T burdens are computed, but the responsibility-selected candidate is not bound and the frozen baseline candidate-order control is realized instead.
- `H5_NONSELECTIVE_HISTORY`: archive access remains Gap-gated, but every relation-matched retrieved experience participates, ignoring contextual participation exclusion.

No arm deletes committed evidence.

## Frozen experiment sizes

Pilot: 12 sequential epochs per arm × 5 arms = 60 decision-realization epochs. Pilot is structural only.

Confirmatory: 96 sequential epochs per arm × 5 arms = 480 decision-realization epochs. The horizon is fixed a priori and cannot be changed from Pilot results.

## Runtime separation

Each arm runs in a fresh OS process. Inside an arm there is exactly one persistent Core, one persistent GovernanceHarnessV04, one persistent HistoryAccessPort and one persistent host-flow instance. No within-arm reset is permitted.

## Evaluator separation

Worker inputs contain runtime observations only. Scientific truth labels are joined only after every arm worker has returned. Pilot does not invoke the scientific evaluator or compute confirmatory contrasts.

## Result discipline

There is no aggregate winner score. Results are reported as structural invariants and prespecified pairwise mechanism contrasts. Any implementation fault discovered before Pilot may be fixed with provenance and a new frozen version. Any scientific-rule change after Pilot requires a new experiment version and new Pilot.
