# Governance OASIS CBRA → CARLA Mapping Contract v1.0

Status: MAPPING_SPEC_FROZEN / REAL_CARLA_EXECUTION_NOT_YET_RUN

## Purpose

This contract maps the already-validated Governance+CBRA mechanism into the canonical CARLA v2.2 / Harness v1.1 boundary without changing frozen Core semantics or canonical CARLA actuation semantics.

The central object is **provenance-bound revalidation**, not free-form reflection.

## Frozen lineage

- Governance/CBRA evidence closure: `70615d25c855ac0f06ac8ce36d6cc54c1ab1dfc8`
- canonical CARLA source branch: `canonical/carla-v22-harness-v1.1-g32`
- canonical Harness v1.1 source blob SHA: `5fb087fce0ae67ee4e905813bd7304c496921211`
- canonical harness SHA-256 declared by source gate: `fe57064e10fd870ba9c3cf1ba0f5b95dc5a2bdd1337ae1b905a2f79bc450ce18`

The canonical Harness source is copied byte-for-byte into this mapping lineage. It is not rewritten.

## Current-flow mapping

Only the already-approved Protocol v2.2 observation fields enter current decision-time reality:

- epoch
- ego_speed_mps
- front_present
- front_gap_m
- front_closing_mps
- front_kind
- local_heading_error_deg
- local_density

No raw actor ID, full map topology, future trajectory, scenario label, hidden trigger, post-outcome state, or evaluator truth may enter decision time.

## Relation-context mapping

CBRA context identity is separated into:

- `relation_id`: provenance identity of the current relation process;
- `scope_signature = (front_present, front_kind, local_density)`.

No semantic threshold is introduced.

Definitions:
- same scope: same relation_id and exact same scope signature;
- changed scope: same relation_id and different scope signature;
- unrelated: different relation_id.

Dynamic geometry fields such as gap, closing speed, and heading error remain current-flow observables, not permanent relation identity.

## Completed Experience / Closure

A CARLA experience becomes CBRA-eligible only after the canonical Harness produces a `HistoryEntry` satisfying:

`decision_tau <= realized_tau <= outcome_tau <= relation_end_tau`

with:
- exactly one real realization,
- authoritative observed outcome,
- non-empty relation-process Closure method,
- non-empty Closure evidence.

CBRA may open only after `relation_end_tau`.
The CBRA snapshot Closure time must equal the canonical relation-process Closure time.

## Reflection = typed revalidation

CARLA does not emit free-form "lessons" into memory.

Each post-Closure signal must target exactly one preserved governance object:

- participation YES or NO,
- selected choice,
- nonselected choice rationale,
- U/I/V/T axis,
- U/I/V/T obligation.

Each signal must carry:
- relation_id,
- unique event_id,
- observed_tau,
- target kind/id,
- direction: SUPPORTS / CONTRADICTS / INDETERMINATE,
- attribution: DECISION_LINKED / EXOGENOUS / MIXED / UNRESOLVED,
- evidence references.

Bad outcome alone is not enough to mark a decision REVISED.

## Attribution rule

Attribution must come from host-authoritative/evaluator evidence generated only after realization.

The mapping layer may transport attribution but may not infer:
"bad result = decision error".

Exogenous-only deterioration therefore remains non-revising unless later decision-linked evidence exists.

## Delayed revalidation

Delayed failure must use at least two ordered post-Closure observations when scientifically tested:

1. earlier evidence that does not yet justify revision;
2. later evidence that does.

Each becomes an append-only CBRA checkpoint.
No checkpoint overwrites an earlier checkpoint.

## Later reuse / as-of gate

At later decision time `tau_next`, Governance may inspect only:

`checkpoint.observed_tau < tau_next`

No current or future checkpoint can affect an earlier decision.

## Monitor lifecycle

- ACTIVE: post-Closure evidence may create checkpoints.
- DORMANT: temporarily not monitored; history retained; may reopen.
- CLOSED: terminal monitoring state; cannot reopen.

Dormancy is not deletion and not a negative quality judgment.

## CARLA-native failure classes for Pilot

1. Participation-commission failure:
   a participating CE is later contradicted by decision-linked CARLA evidence.

2. Participation-omission failure:
   a prior NO rationale is later contradicted by evidence; no counterfactual success is asserted.

3. Responsibility-axis failure:
   later evidence contradicts a specific U/I/V/T obligation linked to the realized selection.

4. Exogenous failure:
   adverse outcome is attributable only to an externally injected/host-observed condition and must not automatically revise the decision.

5. Delayed failure:
   immediate post-Closure evidence is non-revising; later evidence becomes decision-linked contradiction.

Every class must be tested under same-scope, changed-scope, and unrelated-relation re-entry.

## Hard prohibitions

- no post-outcome leakage into decision-time Core;
- no reverse causality;
- no second realization in one decision epoch;
- no scalar memory importance;
- no latest-state overwrite;
- no permanent suppression after one failure;
- no cross-relation evidence contamination;
- no duplicate event replay as new evidence;
- no invented counterfactual result for NO/nonselected paths;
- no post-result threshold tuning.

## Efficiency and power validation

CARLA validation also includes a deployment-efficiency comparison under the separate frozen specification:
`research/governance_cbra_carla_mapping_v1/EFFICIENCY_ENERGY_VALIDATION_SPEC.md`.

Normative operational rule:

- the real-time Governance decision path is the hot path;
- CBRA is an event-driven post-Closure side path;
- CBRA is not required to execute every CARLA tick;
- CBRA may not receive evaluator/energy telemetry as decision-time input;
- GENERAL_HARNESS vs GOVERNANCE_NO_CBRA vs GOVERNANCE_PLUS_CBRA must be measured on matched runtime conditions;
- latency, utilization, storage, archive access, and energy are reported separately with no aggregate efficiency score.

A scientific CARLA Pilot is not considered complete unless functional invariants and the prespecified efficiency telemetry are both recorded.
