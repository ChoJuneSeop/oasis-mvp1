# Governance OASIS + CBRA CARLA Pilot — Run5 Freeze

Status: **FROZEN BEFORE RUN5 EXECUTION**

Run5 preserves the original 54-unit Pilot matrix and all decision-system semantics. The only new rule is a pre-execution topology admission check required by the unchanged CARLA Gateway relation contract.

## Run4 diagnosis preserved

Run4 completed all 54 registered units. Fifteen units passed and thirty-nine units were classified `PRE_EXECUTION_SCENARIO_INVALID`. All thirty-nine invalid units exhausted the already-frozen counterpart distances `18/22/26/30/34m` without an approved front relation.

The direct diagnostic for seed `940001` established:

- ego spawn index: 108;
- ego road/lane: `466 / 2`;
- all frozen counterpart distances were physically forward;
- all targets remained lane `2`;
- all targets were on road `933`;
- therefore `SAME_LANE=True` and `SAME_ROAD=False` at every frozen distance.

The Gateway is not changed. Its strict current relation scope remains the reference contract.

## Run5 addition

Before any experimental Decision Epoch, the deterministic seed-shuffled ego-spawn search now admits a candidate only when at least one of the **already frozen** distances `18/22/26/30/34m`, evaluated through the same `nxt[0]` construction path used by the counterpart spawner, preserves both:

- the ego waypoint's `road_id`; and
- the ego waypoint's `lane_id`.

This is a scene-admission requirement. It does not redefine an OASIS relationship and it does not relax the Gateway.

After that topology admission, all prior Run3/Run4 admission checks remain active: clean baseline, Gateway-approved counterpart presence and kind, and absence again after counterpart removal. CHANGED_SCOPE still rehearses both vehicle and pedestrian.

## Explicitly unchanged

The following remain exactly fixed:

- 54 units = 3 arms × 6 failure classes × 3 relation contexts;
- all original scenario seeds;
- candidate distances `18/22/26/30/34m`;
- General Harness, Governance-No-CBRA, Governance+CBRA definitions;
- Gateway relation definition;
- choice policy and decision thresholds;
- U/I/V/T responsibility provenance;
- Closure rule;
- CBRA post-Closure side-path, strict as-of and provenance rules;
- no aggregate efficiency score;
- no invented energy values.

If no deterministic spawn candidate can satisfy the frozen topology and admission contract, the unit remains `PRE_EXECUTION_SCENARIO_INVALID`. Run5 does not introduce a new seed, distance, threshold, policy, Gateway relaxation, or post-result repair.

## Evidence boundary

Run5 remains a structural CARLA Pilot. The topology admission itself is not Pilot evidence. Run1 through Run4 remain preserved and are not overwritten. Passing Run5 cannot by itself establish universal superiority, confirmatory effectiveness, or real-world safety.
