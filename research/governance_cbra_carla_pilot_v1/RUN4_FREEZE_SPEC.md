# Governance OASIS + CBRA CARLA Pilot — Run4 Freeze

Status: **FROZEN BEFORE RUN4 EXECUTION**

Run4 preserves the complete 54-unit scientific matrix, the same seeds, the same three arms, the same six failure classes, the same three relation contexts, and all Governance/CBRA/Closure decision rules.

## Run3 diagnosis preserved

Run3 completed all 54 registered units. Fifteen units passed and thirty-nine units were classified as `PRE_EXECUTION_SCENARIO_INVALID`. All thirty-nine invalid units shared the same admission cause:

`vehicle counterpart did not form an approved front relation`

The invalidity occurred in three-arm groups, so it is treated as a scene-construction defect before arm-level comparison, not as an arm result.

## Run4 correction boundary

Run4 changes only the pre-execution counterpart construction rule.

The candidate distances remain exactly:

`18m, 22m, 26m, 30m, 34m`

For each already-frozen candidate distance:

1. CARLA must physically spawn the requested counterpart.
2. One authoritative host tick is advanced.
3. The approved `ControlledOracleObservationGateway` observation must report `front_present=True`.
4. The observed `front_kind` must equal the requested kind.
5. Only then is that actor accepted as the Pilot counterpart.
6. If the Gateway does not approve the relation, that actor is destroyed, one host tick is advanced, and the runner proceeds to the next **already frozen** distance.
7. If all five frozen distances fail, the unit is `PRE_EXECUTION_SCENARIO_INVALID`.

No new distance may be introduced after Run3. No seed, threshold, responsibility rule, CBRA rule, Closure rule, failure class, or decision policy may be changed to make a unit pass.

## Inherited Run3 admission

The deterministic clean-lane spawn admission remains in force. Before any experimental Decision Epoch, the required relation kind is rehearsed and must satisfy baseline absence, staged relation presence and kind match, and absence again after counterpart removal. CHANGED_SCOPE still requires both vehicle and pedestrian rehearsal.

## Evidence boundary

Run4 pre-execution scene construction is diagnostic admission, not Pilot evidence. It cannot see failure labels, independent evaluator truth, later outcomes, or CBRA results. Run1, Run2, and Run3 outputs remain preserved and must not be overwritten.

Run4 remains a structural CARLA Pilot only. It is not confirmatory evidence and does not support a universal superiority or real-world safety claim.
