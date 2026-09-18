# CBRA Failure-Completed-Experience Comparative Experiment v1

Status: FINAL_SPEC_FROZEN / PRE_EXECUTION

Axis base: CBRA v1.1 formal-ready commit `2b9754e3ef7007a79f616d4e73174d715afa894d`

## Scientific question

After a Governance decision has reached Closure and later authoritative evidence reveals a failure or contradiction, does CBRA's provenance-preserving bidirectional revalidation change a later Governance decision in a context-specific way, while avoiding false revision from exogenous failure and avoiding permanent global exclusion?

A second descriptive question asks how this closed-loop Governance behavior differs from the repository's ordinary `CanonicalHarnessV11`, which executes the same current observation/action opportunity but has no CBRA decision-provenance loop.

## Arms

### G1 — GOV_CBRA

- GovernanceHarnessV04
- selective Completed Experience participation
- current U/I/V/T responsibility
- single realization and Closure
- CBRA checkpoint generation
- later current-review projection is enabled

### G2 — GOV_CBRA_RECORD_ONLY

Identical to G1 except CBRA checkpoints are never allowed to alter later participation or responsibility. Checkpoints are still generated and stored.

This is the primary causal ablation.

### G3 — GENERAL_CANONICAL

- repository `CanonicalHarnessV11`
- same current observation and Core candidate opportunity
- one real realization
- execution/outcome log retained
- no Governance selective participation
- no CBRA
- no CBRA current-review projection

G3 is a descriptive architecture baseline, not the sole causal control for CBRA.

## Failure classes

1. **PARTICIPATION_COMMISSION**
   - a prior CE actually participated;
   - immediate Closure is acceptable;
   - later decision-linked evidence contradicts the prior YES rationale.

2. **PARTICIPATION_OMISSION**
   - a candidate CE was explicitly NO;
   - later decision-linked evidence contradicts the prior NO rationale;
   - no counterfactual outcome is asserted.

3. **RESPONSIBILITY_U**
   - later decision-linked evidence contradicts the uncertainty-side responsibility ground of the realized selection.

4. **EXOGENOUS**
   - later adverse evidence is explicitly exogenous;
   - CBRA must not convert this alone into an internal decision revision.

5. **DELAYED_CHOICE_FAILURE**
   - immediate post-Closure evidence is acceptable;
   - a later decision-linked observation contradicts the realized selected choice.

## Failure CE generation

G1 and G2 must generate the failed decision episode through the real `GovernanceHarnessV04` lifecycle:

current samples → Gap → archive candidate review → Core possibilities → responsibility → one realization → authoritative post-observation → Closure → atomic commit.

The resulting run-created Completed Experience is stored by the experiment HistoryPort with relation record, completion time, source entry id, selected possibility, and scope.

The immediate Governance revalidation is held acceptable. The failure signal is introduced only later through CBRA evidence, so ordinary same-Closure feedback cannot explain the G1/G2 difference.

G3 executes the same decision and post-observation schedule with `CanonicalHarnessV11` and stores an execution/outcome log, but does not convert it into Governance provenance.

## Re-entry contexts

Each confirmatory failure class is crossed with:

- SAME_SCOPE — same relation and same scope key;
- CHANGED_SCOPE — same relation, changed scope key;
- UNRELATED_RELATION — different relation.

A prior revision must not automatically become a global exclusion in the latter two contexts.

## Experimental history isolation

For a later Governance re-entry epoch the HistoryPort exposes only the prespecified target candidate:

- failure classes based on the run-created decision expose the run-created CE;
- PARTICIPATION_OMISSION exposes the previously excluded baseline CE.

This isolation is identical for G1 and G2 and prevents unrelated archive growth from masking the causal intervention.

## Current-review intervention

G1 may read only:

`axis.history_as_of(current_decision_tau)`.

The projection is ephemeral.

Rules are frozen:

- prior YES + same-context RECONSIDER → current participation is flipped to NO;
- prior NO + same-context RECONSIDER → current participation is flipped to YES;
- a run-created CE whose source selected-choice provenance is same-context RECONSIDER → current participation is NO;
- RESPONSIBILITY_U same-context RECONSIDER → the current responsibility operator selects the alternative member of the frozen two-candidate set;
- changed scope or unrelated relation receives no automatic prior-context directive;
- INCONCLUSIVE and exogenous-only evidence never trigger the intervention.

G2 computes the same CBRA records but never applies these projection rules.

## Candidate and responsibility contract

Current Core candidate ids must remain exactly:

- `continue-flow`
- `yield-space`

The experiment-specific responsibility mechanism uses U/I/V/T as separate burden sets and Pareto set dominance. No weighted sum or scalar responsibility score is permitted.

For the participation-sensitive contract:

- with current participating support, `continue-flow` has lower U burden than `yield-space`;
- without current participating support, `yield-space` has lower U burden than `continue-flow`;
- I/V/T remain current-observation obligations and are never converted into a permanent score.

The RESPONSIBILITY_U failure intervention is a prespecified causal ablation of current U binding, not a normative policy claim.

## Immediate Closure contract

All Governance initial episodes use a post-observation that:

- occurs after realization,
- ends the current front interaction,
- has lower speed than the decision observation,
- has heading error no worse than the decision observation.

Therefore the ordinary immediate revalidation is not the source of the later failure revision.

## Pilot

Purpose: **STRUCTURAL_SANITY_ONLY**.

Six prespecified chains:

- commission / SAME_SCOPE
- commission / CHANGED_SCOPE
- omission / SAME_SCOPE
- responsibility-U / SAME_SCOPE
- exogenous / SAME_SCOPE
- delayed-choice / SAME_SCOPE

Two decision epochs per chain per arm: initial and re-entry.

Counts:

- 6 chains × 2 decisions = 12 decisions per arm;
- 3 arms;
- 36 total decision-realization epochs.

Pilot computes no arm-effect metric and cannot alter Confirmatory size or rules.

## Confirmatory

A priori finite matrix:

5 failure classes × 3 re-entry contexts × 3 observation families = 45 chains per arm.

Two decision-realization epochs per chain.

- 90 decisions per arm
- 3 arms
- **270 total decision-realization epochs**

Observation families are frozen before Pilot:

- F1: speed 1.2, gap 9.0, closing 0.4, heading 0.00
- F2: speed 1.0, gap 8.0, closing 0.7, heading 0.10
- F3: speed 0.8, gap 10.0, closing 0.2, heading -0.10

The scope density is supplied by the re-entry context, not by evaluator truth.

## Prespecified confirmatory measurements

No aggregate winner score.

### G1 vs G2 — causal CBRA contrasts

- target participation decision difference rate;
- realized selection difference rate;
- prior-NO reconsideration event rate;
- run-created failed-CE suppression event rate;
- responsibility-U binding difference rate.

### CBRA correctness/stability

- exogenous false-revision intervention rate;
- changed-scope inappropriate carry-over rate;
- unrelated-relation carry-over rate;
- future-checkpoint leakage count;
- duplicate-evidence acceptance count;
- provenance continuity rate.

### General Harness descriptive comparison

- realized action sequence difference rate vs G1;
- availability/absence of YES/NO provenance;
- availability/absence of selected/nonselected provenance;
- availability/absence of U/I/V/T revalidation;
- availability/absence of post-Closure as-of current-review evidence.

## Evaluator separation

Failure-class truth, expected causal source, and confirmatory measurements are joined only after all worker arms return.

Runtime workers receive only the frozen runtime schedule and arm configuration.

## Claim boundary

A positive result can establish only a behaviorally distinguishable effect of the frozen CBRA mechanism in this finite synthetic experiment.

It cannot establish universal safety, moral correctness, real-world/CARLA superiority, or legal patentability.
