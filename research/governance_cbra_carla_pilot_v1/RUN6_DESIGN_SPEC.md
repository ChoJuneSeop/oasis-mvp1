# Governance OASIS + CBRA CARLA — Run6 Prospective Replication Design

Status: **DESIGN ONLY — NOT FROZEN FOR EXECUTION**

Run6 is designed now, before Run5 results are available, so its replication seeds and structure cannot be selected from Run5 outcomes.

## Purpose

Run5 addresses whether the original 54-unit structural Pilot can be executed in CARLA under the unchanged Gateway relation contract without topology-invalid scenes. Run6 is not another scene repair. Its purpose is **independent-seed replication** of the already-defined mechanism under the same map, runtime, Gateway, topology admission, Governance, responsibility, Closure and CBRA semantics.

Run6 may be frozen for execution only if Run5 completes all 54 registered units with:

- zero `PRE_EXECUTION_SCENARIO_INVALID`;
- no CARLA runtime loss;
- no process errors;
- no structural unit failure requiring code correction.

If that gate is not met, Run6 remains design-only.

## Fixed replication structure

Run6 uses three prospective seed blocks that are declared before Run5 is executed:

- R1: `950001..950018`
- R2: `960001..960018`
- R3: `970001..970018`

Each block contains the same 18 scenario cells:

`6 failure classes × 3 relation contexts`

Each scenario cell uses the same seed for all three arms:

`GENERAL_HARNESS / GOVERNANCE_NO_CBRA / GOVERNANCE_PLUS_CBRA`

Therefore:

- 18 scenarios per block;
- 54 units per block;
- 3 blocks;
- **162 total units**.

The original Run5 seeds `940001..940018` are not reused as Run6 replication seeds.

## No semantic change from Run5

Run6 inherits without modification:

- CARLA 0.9.16, Town10HD_Opt;
- synchronous mode and 0.05 s fixed delta;
- RenderOffScreen + no-rendering mode;
- the frozen counterpart distances `18/22/26/30/34m`;
- strict Gateway same-`road_id`, same-`lane_id`, positive-longitudinal relation definition;
- deterministic clean-lane and Run5 topology admission;
- Gateway-approved counterpart construction;
- the three arms;
- all six failure classes and three relation contexts;
- decision thresholds and choice policy;
- U/I/V/T responsibility provenance;
- Closure;
- CBRA post-Closure side path, strict as-of, duplicate rejection, cross-relation isolation and monitor lifecycle.

## Primary mechanism endpoints

Run6 does not reduce the system to one score. It tests whether the same mechanism recurs across independent seed blocks:

1. participation YES/NO provenance remains preserved and current-context local;
2. U/I/V/T responsibility provenance remains bound to selected and nonselected choices;
3. CBRA never appears before Closure;
4. decision-linked contradictory evidence may revise only its provenance-bound target in an eligible scope;
5. exogenous contradiction is not converted into decision-linked revision;
6. unrelated relations do not inherit a CBRA revision;
7. delayed failure preserves ordered checkpoints and strict `history_as_of`.

Arm results are paired only within the same replicate/seed/failure/context cell. Report counts, rates, and exact intervals where appropriate. Latency and measured power are secondary descriptive outputs. Missing energy counters remain `UNAVAILABLE`.

## Integrity rules

Run6 seeds are already declared in `RUN6_DESIGN.json`. Run5 results may not be used to replace a Run6 seed, add a distance, change a threshold, relax the Gateway, change a responsibility rule, alter CBRA, or modify Closure.

A Run6 execution branch and immutable freeze manifest must be created separately after the Run5 entry gate is satisfied. Until that happens, this document is a prospective design only and must not be presented as executed or confirmatory evidence.
