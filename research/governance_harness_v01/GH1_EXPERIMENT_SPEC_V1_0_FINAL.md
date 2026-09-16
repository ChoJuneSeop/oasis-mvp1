# GH-1 Experimental Specification v1.0 FINAL

Status: `FINAL / FROZEN`

## 1. Purpose

GH-1 validates selective re-participation without claiming that selective memory retrieval itself is novel.

The experiment is split into two independently reported layers:

- `GH-1A Structural & Causal Validation`
- `GH-1B Effectiveness & Efficiency Validation`

A GH-1A PASS does not imply performance superiority. A GH-1B non-supported result does not invalidate a valid GH-1A structural result.

## 2. Normative flow

Current reality flow -> current-flow-only Gap assessment ->

- Gap=NO: zero archive access; current-only possibilities/selection/action.
- Gap=YES: HistoryAccessPort access -> candidate Completed Experiences -> participation/nonparticipation -> participants-only view.

Both branches then continue through possibility composition -> dynamic responsibility -> responsibility-bound selection -> exactly one realization -> host-authoritative outcome -> Closure -> revalidation -> commit.

## 3. Arms

- `G1 Selective Governance`: Gap gates history access; after access, selective participation is applied.
- `G2 Always-Retrieve / Selectively-Participate`: the same Gap detector is executed and recorded, but history access proceeds regardless of Gap; the same participation procedure is applied.
- `G3 No-History`: the same Gap detector is executed and recorded, but history is never accessed.

The intended G1/G2 difference is only the Gap-controlled history-access permission.

Optional later ablations, if required by the result, are `G4 All-Participate` and `G5 Matched-Random Participation`; they are not part of the initial confirmatory run.

## 4. Controls

Paired comparisons use the same Core implementation/state, environment, scenario, initial world, observation schema, action space, possibility mechanism, responsibility mechanism, evaluator, archive contents/order, termination rules, and compute budget. Each arm starts in a fresh process.

## 5. Frozen decision archive

- `DECISION_ELIGIBLE_ARCHIVE = FROZEN`
- `RESULT_HISTORY_COMMIT = ENABLED`
- `NEWLY_COMMITTED_EXPERIENCE_REUSE = DISABLED`

New outcomes may be committed for v0.4 provenance/Closure semantics but do not become GH-1 decision inputs.

## 6. Feedback isolation

- `FEEDBACK_GENERATION = ENABLED`
- `FEEDBACK_PERSISTENCE = ENABLED`
- `FEEDBACK_DECISION_REUSE = DISABLED`

This prevents GH-3 outcome-feedback effects from contaminating GH-1 decisions.

## 7. Gap detector boundary

Gap is a current-flow anomaly assessment, not a comparison with past experience. The detector may use only frozen present/past-observed current-flow evidence up to decision time. It may not use archive contents, Completed Experiences, future information, scenario/anomaly labels, seeds, ground truth, outcome, Closure, or evaluator success/failure signals.

The detector must pass a separate validity gate before confirmatory execution.

## 8. Hard invariants

- Gap=NO => archive access, scan count, and bytes read are all zero.
- Nonparticipants are not exposed to Core decision computation.
- Future/evaluator-label leakage is forbidden.
- Real actuation count is <=1 per epoch.
- Post-observation is host-authoritative.
- Completed Experience cannot be created before Closure.
- Governance-selected possibility equals realized possibility.
- Recovery/finalization never re-actuates.
- The same actual Core is used across arms.
- No post-start rule or threshold changes.

## 9. GH-1A required cases

- `A-CASE-1 Normal Continuation`: Gap=NO and zero history access.
- `A-CASE-2 Relevant Historical Re-participation`: relevant completed experience may participate and affect the decision path.
- `A-CASE-3 Nonparticipant Isolation`: a strong nonparticipant canary has zero Core exposure and zero decision effect.
- `A-CASE-4 Context Reversal`: the same experience may participate in one current context and not participate in another; no permanent participation weight is permitted.

## 10. Counterfactual

Counterfactual evidence is `NON_ACTUATING DECISION COUNTERFACTUAL` only. It uses the same frozen pre-realization snapshot, modifies the participant view, and stops before realization. It never performs a second real actuation and cannot be reported as a second-world outcome.

## 11. GH-1B scenario classes

- `S1 familiar relation`
- `S2 surface-similar but relationally different`
- `S3 novel`

G1 vs G2 primarily tests the effect/cost of current-flow access gating. G1 vs G3 primarily tests whether permitted re-participation changes anomaly handling under the frozen conditions.

## 12. Repetition policy

Run a preregistered pilot first for structural pipeline checks and variance estimation only. Pilot scenarios/seeds are excluded from the confirmatory data set. The confirmatory repetition count is frozen from the pilot variance before confirmatory execution. No hypothesis, metric, history policy, detector semantics, participation rule, or PASS definition may be changed after the pilot; a design change requires v1.1.

## 13. Result states

Pre-run: `ADMISSION_BLOCKED`, `DETECTOR_INVALID`, `DESIGN_INVALID`.
During execution: `STRUCTURAL_FAIL`, `EXECUTION_FAIL`.
Valid GH-1B metric-level results: `SUPPORTED`, `NOT_SUPPORTED`, `INCONCLUSIVE`.
GH-1A is separately reported as PASS/FAIL.

## 14. Claim boundary

GH-1 supports claims only about selective re-participation structure/effects under the frozen experimental conditions. It does not establish full Governance superiority, GH-2 responsibility effects, GH-3 feedback effects, general AI safety, or industrial deployment validity.

The differentiation target is the combined sequence: `Current-flow-first -> Access gating -> Re-participation -> Decision-path isolation`, not selective retrieval by itself.
