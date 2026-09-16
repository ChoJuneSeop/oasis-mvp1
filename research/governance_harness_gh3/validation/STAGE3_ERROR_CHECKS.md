# Stage 3 — Definition / causal / execution error checks

GH-3 cannot advance to literature-boundary review or FINAL design until all three error-check classes below are closed.

## Check 1 — Definition errors

PASS only if all are true:

- Revalidation is defined as post-realization, post-Closure judgment revision/confirmation, not reward or policy learning.
- `CONFIRMED`, `REVISED`, and `INCONCLUSIVE` remain typed categorical states; no scalar score is introduced.
- `REVISED` is not deletion, invalidation, punishment, permanent exclusion, or negative memory weight.
- `CONFIRMED` is not a permanent positive weight or unconditional repeat command.
- The revalidation target remains separately traceable for Gap, participation/nonparticipation, choice, and responsibility.
- Current flow remains first at the later epoch; feedback is contextual evidence only.
- Newly committed CE decision reuse is excluded from the primary GH-3 causal contrast.

Status: **PASS**.

## Check 2 — Causal errors

PASS only if the planned experiment preserves all of the following:

- Link A (`outcome -> revalidation`) and Link B (`revalidation feedback -> later governance`) are tested separately.
- Antecedent decisions are identical across feedback-exposure arms before the authoritative post-outcome is observed.
- For Link B, later current observation, frozen archive, Core, possibility set/distribution, responsibility contract, and scenario order are identical across arms.
- The primary arm difference is only whether correct provenance-bound feedback is available to the later Governance decision.
- `RECORD_ONLY` computes and persists the same revalidation but withholds it from the later decision.
- `PERMUTED_PROVENANCE` preserves feedback quantity/type while breaking relation/provenance identity.
- Evaluator truth and future outcome class never enter runtime, Core, responsibility, reengagement, or feedback-selection inputs.
- No same-epoch effect is allowed; revalidation produced at t can first influence t+1.
- No new CE can become a decision-eligible participant in the primary comparison.

Status: **PASS AS DESIGN CONSTRAINT**. Must be rechecked against implementation before experiment admission.

## Check 3 — Execution errors

Required executable invariants:

- exactly one real realization per live decision epoch;
- authoritative host snapshot after realization and before Closure/revalidation;
- Closure must be satisfied before revalidation and commit;
- outcome realization_ref, selected candidate, fingerprints, versions, and relation identity must match the realized epoch;
- every prior participation and nonparticipation judgment requires a revalidation entry;
- feedback must reference the committed prior entry/relation/provenance;
- no feedback object is visible before its commit completes;
- atomic commit failure leaves no partial history/feedback/sidecar state;
- fresh-process isolation for scientific arms;
- structural Pilot cannot compute Confirmatory outcome metrics;
- frozen GH-1/GH-1L/GH-2/Core files remain unchanged;
- post-result repair/tuning is prohibited.

Status: **PASS AS PRE-IMPLEMENTATION CONTRACT**. Must be proven by admission tests and CI before Pilot.

## Error-check conclusion
No contradiction was found between GH-3's proposed Outcome-based Revalidation principle and the existing Governance Harness v0.4 lifecycle. The existing harness already enforces the temporal order `realization -> post observation -> Closure -> revalidation -> atomic commit`; GH-3's unresolved research question is whether the resulting provenance-bound feedback has an independently measurable effect on a later governance epoch.

Stage 3 status: `DEFINITION_PASS / CAUSAL_CONTRACT_PASS / EXECUTION_CONTRACT_PASS`.
