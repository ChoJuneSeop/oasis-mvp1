# GH-1 Experimental Design v1.0 FINAL

Status: `DESIGN FROZEN`

## Objective

Test the causal and operational consequences of current-flow-first, Gap-gated access to Completed Experiences, followed by context-specific participation and decision-path isolation.

## Execution order

1. Actual Core Admission.
2. Gap Detector Validity Gate.
3. RNG Isolation Gate.
4. Fresh Process Gate.
5. Freeze code, detector, archive, scenario, run-order and seed manifests.
6. GH-1A structural/causal execution.
7. Non-actuating decision counterfactuals.
8. Pilot for variance estimation only.
9. Freeze confirmatory repetition count and confirmatory scenario/seed set.
10. GH-1B paired confirmatory execution.
11. Independent validation and reporting.

GH-1B cannot begin unless GH-1A passes.

## Experimental arms

### G1 Selective Governance
Gap=NO means zero history access. Gap=YES opens HistoryAccessPort and performs per-experience participation assessment. Only participants reach Core.

### G2 Always-Retrieve / Selectively-Participate
The same detector runs, but history is always accessed. The same participation procedure is then used. This isolates the value/cost of the Gap-controlled access permission.

### G3 No-History
The same detector runs, but no history is accessed. This isolates the contribution of eligible past experience under anomaly conditions.

## Controlled dynamic flow

The first GH-1 environment is intentionally controlled rather than a full complex CARLA experiment. The frozen scenario contains normal flow, anomaly, response/recovery, restored normal flow, and a later new anomaly. This verifies that Gap=NO is not permanent and that re-entry into the YES branch is driven by later current-flow evidence.

## Archive

The initial decision archive is frozen and contains relevant experiences, surface-similar but relationally wrong experiences, and irrelevant experiences. Evaluator-only class metadata is not exposed to runtime components.

## Structural cases

- A1 Normal Continuation.
- A2 Relevant Historical Re-participation.
- A3 Nonparticipant Isolation with a strong canary.
- A4 Context Reversal for the same Completed Experience.

## Counterfactuals

- CF-1 normal participant view.
- CF-2 remove a participant.
- CF-3 attempt to insert a nonparticipant.

All are non-actuating and stop before realization.

## Paired design

Every paired block uses matched scenario, initial condition, archive snapshot, subsystem seeds and Core/harness revision. Arm order is pre-generated and balanced. Each arm starts in a new process. Pilot cases/seeds never enter the confirmatory data set.

## Isolation controls

Subsystem RNG streams are independently seeded for environment, Core, history, participation, evaluator, and run order. Consuming history RNG must not advance environment/Core RNG. Feedback is generated and persisted but cannot be reused as decision input in GH-1. Newly committed experiences cannot become decision-eligible within GH-1.

## Logging

Every run must record at least: run_id, spec version, code SHA, branch, scenario identity, seed manifest identity, arm, archive hash, detector hash, initial-state hash, Gap output, archive access metrics, candidate/participation sets, possibility distribution, responsibility judgment, selected candidate, realization, host-authoritative outcome, Closure/revalidation state, resource metrics, and run status.

## No-post-hoc rule

After the confirmatory freeze, changing detector semantics, participation semantics, arm policy, outcome metric definitions, hypotheses, or PASS/FAIL criteria invalidates the frozen design and requires a new version.
