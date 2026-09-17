# GH-4 v1.0 FINAL SPEC — Integrated Long-Horizon Governance

Status: STAGE_7_DESIGN_FROZEN
Spec id: `GH4_EXPERIMENT_V1_0_FINAL`

## Scientific question

Can the already separated Governance OASIS causal layers operate continuously in one persistent execution while the archive grows, without violating current-first access, delayed experience eligibility, dynamic responsibility, single realization, Closure, revalidation or provenance?

## Arms

1. `H1_FULL_INTEGRATED`
2. `H2_FROZEN_NEW_CE`
3. `H3_FEEDBACK_RECORD_ONLY`
4. `H4_RESPONSIBILITY_RECORD_ONLY`
5. `H5_NONSELECTIVE_HISTORY`

All arms receive identical runtime observation sequences. Arm definitions are fixed before Pilot.

## Persistent execution contract

For each arm the runner constructs exactly once:

- one `CurrentRelationalCoreV11` through the frozen domain bundle,
- one `GovernanceHarnessV04`,
- one GH-4 HistoryAccessPort,
- one host flow.

The entire arm horizon is then executed without reset. Arms are isolated in separate OS processes.

## Archive initialization

The archive begins with exactly three baseline Completed Experiences, one for each frozen relation id:

- `GH4-REL-A`, scope density 1,
- `GH4-REL-B`, scope density 2,
- `GH4-REL-C`, scope density 3.

Each baseline CE has valid relational provenance and one historical longitudinal-relation record. No other initial experience exists.

## Run-created experience admission

Every completed epoch is atomically committed by the frozen Governance harness. GH-4 enriches only the committed CE copy inside the HistoryAccessPort boundary with:

- relation record,
- completed scope density,
- selected possibility,
- source entry id.

`H1/H3/H4/H5` may return these run-created CEs on a later search when `completed_tau < decision_tau` and relation id matches. `H2` commits them but does not return them to decision search.

Same-epoch CE reuse is prohibited.

## Selective participation

For `H1/H2/H3/H4`, each retrieved candidate receives a fresh current-context YES/NO participation decision.

Base contextual eligibility requires current scope density to be within one density unit of the candidate's completed scope. If provenance-matched feedback says `REVISED`, participation is blocked only when the current density exactly matches the candidate's completed scope. `CONFIRMED` and `INCONCLUSIVE` do not override current eligibility.

`H5` is the nonselective control: every relation-matched retrieved candidate participates.

There is no scalar experience score, decay, learned threshold or permanent exclusion.

## Responsibility

Actual Core possibility ids must be exactly `continue-flow` and `yield-space` in the frozen environment.

For `H1/H2/H3/H5`, responsibility is recomputed every epoch from present observation plus whether any experience currently participates. Candidate burdens are represented as U/I/V/T sets. Selection uses Pareto set dominance; a non-dominated tie is resolved by frozen candidate order. No weighted responsibility sum exists.

`H4` computes the same current U/I/V/T structure but realizes the frozen candidate-order baseline rather than binding the responsibility-selected candidate.

## Outcome revalidation

The frozen GH-3 typed mapping is reused:

- `CONFIRMED`: post speed lower than realized-decision speed AND absolute heading error not worse,
- `REVISED`: post speed not lower AND absolute heading error worse,
- `INCONCLUSIVE`: otherwise.

Feedback is committed only after Closure and is provenance-bound.

## Scenario matrix

### Pilot

12 sequential epochs per arm.

Construction: 3 relations × 2 observation families × 2 Gap modes. Outcome states are deterministically balanced across the sequence. Pilot and confirmatory episode ids and observation families are disjoint.

Pilot purpose: structural sanity only. No scientific contrast, no sample-size inference, no arm-effect claim.

### Confirmatory

96 sequential epochs per arm.

Construction: 4 rounds × 3 relations × 4 observation families × 2 Gap modes = 96 epochs. Outcome state is deterministically assigned from the frozen matrix and is joined only by the post-worker evaluator.

Total confirmatory decisions: 96 × 5 = 480.

## Frozen observation families

- `F1_CLEAR`: speed 1.4, front gap 12.0, closing 0.1, heading 0.00, density 1.
- `F2_SHARED`: speed 1.1, front gap 9.5, closing 0.4, heading 0.05, density 2.
- `F3_EXPOSED`: speed 0.9, front gap 7.0, closing 0.8, heading 0.20, density 3.
- `F4_MIXED`: speed 1.2, front gap 8.5, closing 0.6, heading -0.10, density 2.

Pilot uses separate `P1` and `P2` families.

Gap YES uses a pre-sample speed exactly 0.6 m/s above decision speed. Gap NO uses a pre-sample speed exactly 0.1 m/s above decision speed. Frozen Gap threshold remains 0.5.

## Prespecified confirmatory metrics

### Structural invariants

- all arms fresh-process isolated,
- 96 decisions and 96 closures per arm,
- selected equals realized every epoch,
- one realization per epoch,
- no searched CE has `completed_tau >= decision_tau`,
- no-gap archive access count is zero,
- every committed epoch advances persistent archive state,
- evaluator truth is absent from worker runtime inputs.

### H1 integrated-flow metrics

- run-created CE candidate recurrence count/rate on Gap epochs,
- run-created CE participation count/rate,
- provenance-matched REVISED block count/rate,
- no-gap zero-access rate,
- revalidation-state match rate.

### Prespecified pairwise mechanism contrasts

- H1 vs H2: participation-set difference rate and realized-selection difference rate — contribution of later eligibility of run-created CEs.
- H1 vs H3: participation-set difference rate and realized-selection difference rate — contribution of outcome feedback exposure.
- H1 vs H4: realized-selection difference rate — contribution of responsibility binding in the integrated flow.
- H1 vs H5: participation-set difference rate and realized-selection difference rate — contribution of selective rather than indiscriminate participation.

No direction of superiority is prespecified. A zero difference is a valid scientific result.

## Stability checks

- `REVISED` outside matching scope must not create global exclusion.
- `CONFIRMED` and `INCONCLUSIVE` must not automatically force participation.
- archive size may grow, but historical access remains Gap-gated.
- run-created CE identity and provenance remain distinct; experiences are never collapsed into one permanent score.

## Claim boundary

Confirmatory evidence can establish only behavior of this frozen synthetic integration. Real-world, CARLA, population-generalization and overall-superiority claims remain outside GH-4.
