# Governance OASIS + CBRA CARLA Pilot — Run3 Freeze

Status: **FROZEN BEFORE RUN3 EXECUTION**

Run3 does not change the 54-unit scientific matrix. The same three arms, six failure classes, three relation contexts, and the same frozen seeds remain in force. No decision threshold, responsibility rule, CBRA rule, Closure rule, or failure label is changed in response to Run2.

## Why Run3 exists

Run1 failed before experimental execution because CARLA synchronous mode was validated before the frozen runtime settings were applied. That failure remains preserved.

Run2 progressed into real CARLA execution, but many units failed before a valid arm-level comparison because the staged seed relation did not reliably satisfy the actual Closure precondition. The gateway can observe other vehicle/walker actors on the same road/lane, so removing the intended counterpart does not necessarily imply `front_present=False`.

Run3 treats this as a **pre-execution scene-admission defect**, not as a Governance/CBRA outcome.

## Frozen Run3 admission gate

Before any Decision Epoch, realization, HistoryEntry, Completed Experience, evaluator event, or CBRA checkpoint exists, the runner must:

1. Configure and validate CARLA 0.9.16 / Town10HD_Opt / synchronous mode / 0.05 s fixed delta / no rendering.
2. Search the seed-shuffled spawn order deterministically.
3. Admit an ego spawn only if it has forward relation space and the approved gateway reports no pre-existing front relation.
4. Rehearse each counterpart kind required by the unit:
   - baseline: `front_present=False`;
   - staged counterpart: `front_present=True`;
   - staged `front_kind` matches the required kind;
   - after counterpart removal: `front_present=False`.
5. For CHANGED_SCOPE, rehearse both vehicle and pedestrian. For SAME_SCOPE and UNRELATED_RELATION, rehearse vehicle.
6. If any check fails, classify the unit as `PRE_EXECUTION_SCENARIO_INVALID`. No experimental decision epoch may start, and the runner must not repair the unit by changing seed, threshold, policy, or post-result logic.

The deterministic clean-lane search itself is part of this frozen pre-execution contract. It is not experimental evidence and may not inspect a failure label, evaluator truth, or post-outcome result.

## What remains unchanged

- 3 arms × 6 failure classes × 3 relation contexts = 54 units.
- Same `PILOT_MATRIX.json`.
- Same seeds per scenario across all three arms.
- Same General Harness comparator.
- Same Governance NO-CBRA arm.
- Same Governance + CBRA arm.
- Same selective re-participation, U/I/V/T responsibility provenance, single realization, Closure, strict as-of, and CBRA side-path rules.
- No aggregate efficiency score.
- Unavailable energy counters remain `UNAVAILABLE`; they are never estimated.

## Evidence boundary

Run3 is still a structural CARLA Pilot. Passing Run3 is not a universal superiority result, a confirmatory result, or a real-world safety claim.
