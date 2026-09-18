# Governance OASIS Scientific Proof Harness v1 — Self Audit

Status: **REDESIGN COMPLETE / FINAL REGRESSION REQUIRED**

This document records the error checks applied to the harness itself. The audit target is not CARLA runtime performance. It is whether the harness can prevent an experiment that is irrelevant, causally ambiguous, overclaimed, or weakly executed from being treated as Governance OASIS evidence.

## Audit 1 — Definition / purpose

### D-01 — execution integrity was mistaken for scientific purpose
**Found:** the original freeze harness primarily answered “can this experiment be executed without contamination?” It did not answer “does this experiment test a Governance OASIS claim?”

**Correction:** Scientific Proof Design Gate is now an independent upper gate. A valid experiment requires both scientific design validity and lower execution/freeze integrity.

### D-02 — claim coverage was implicit
**Found:** an axis could be named without declaring every claim that the axis is supposed to test.

**Correction:** required claim IDs are registered per axis. A1 requires behavior-change and effectiveness claims; A2 requires experience-identity and relation/order claims. Integrated confirmatory work also requires the integrated coexistence claim.

### D-03 — experiment completion could be confused with claim support
**Found:** a completed confirmatory experiment could have been counted as proof even when its result was null.

**Correction:** portfolio logic separates completion from support. Valid outcomes are SUPPORTS / DOES_NOT_SUPPORT / INCONCLUSIVE / INVALID. Null results remain valid evidence but never become proof support.

### D-04 — design-only and structural work could be overcounted
**Found:** design or structural artifacts could look mature enough to be treated as proof.

**Correction:** DESIGN_ONLY, STRUCTURAL_ONLY and PILOT_ONLY cannot close a proof axis.

### D-05 — official six-axis order could be skipped
**Found:** existing later-axis evidence could accidentally advance the official program beyond an earlier unresolved axis.

**Correction:** official progression is A1 → A2 → A3 → A4 → A5 → A6. Existing later-axis evidence is preserved, but the next official axis is always the first unsupported axis. A fake “replication” flag cannot skip into an unsupported later axis.

## Audit 2 — Causal design

### C-01 — A2 conflated identity, relation and order
**Found:** a single generic history contrast could satisfy traceability while failing to isolate which experience, which relation process, and which order history mattered.

**Correction:** A2 requires three distinct causal contrasts: experience identity, relation-process history, and order history. YES/NO participation provenance must remain visible.

### C-02 — A3 could log responsibility without proving causal binding
**Found:** responsibility metadata plus one generic contrast was insufficient.

**Correction:** A3 requires distinct binding-vs-record-only and content/staleness/permutation contrasts, non-scalar U/I/V/T, and selected/nonselected obligation preservation.

### C-03 — A4 could call changed-scope behavior “no overgeneralization”
**Found:** changed scope alone did not exclude global spillover.

**Correction:** SAME_SCOPE, CHANGED_SCOPE and UNRELATED_RELATION are all required, together with no-global-exclusion and participation YES/NO provenance.

### C-04 — A5 did not operationalize “conflict”
**Found:** simply storing two Completed Experiences did not prove they were genuinely conflicting.

**Correction:** the design must define conflict operationally, preserve both records and order/provenance, vary current relation context, forbid scalar/latest-wins overwrite in production, and use a conflict-specific causal contrast.

### C-05 — A6 presupposed the result
**Found:** “wrong_change_realized=True” encoded a scientific result inside the design.

**Correction:** A6 now defines endpoints, not outcomes. Wrongness/adversity is undefined at decision time. The behavior is realized first; an authoritative post-realization observation is then judged by a preregistered evaluator after worker output is sealed.

### C-06 — A6 recovery did not prove the initial problem was caused by prior experience
**Found:** a revalidation-vs-record-only contrast could show later change without proving that prior CE participation caused the adverse behavior in the first place.

**Correction:** A6 requires two distinct causal links: initial CE-exposed vs CE-hidden behavior effect, and revalidation-exposed vs revalidation-record-only recovery effect. DECISION_LINKED and EXOGENOUS attribution controls plus unrelated-relation control are mandatory.

### C-07 — full Governance flow was underspecified
**Found:** the first temporal contract omitted relation process, history-need gating, possibility distribution, responsibility and revalidation stages.

**Correction:** the mandatory flow is now:

CURRENT_FLOW
→ RELATION_PROCESS
→ HISTORY_NEED_GATE
→ PARTICIPATION
→ POSSIBILITY_DISTRIBUTION
→ RESPONSIBILITY
→ DECISION
→ SINGLE_REALIZATION
→ POST_OUTCOME_OBSERVATION
→ CLOSURE
→ REVALIDATION
→ COMMIT
→ LATER_CURRENT_FLOW
→ LATER_RELATION_PROCESS
→ LATER_HISTORY_NEED_GATE
→ LATER_PARTICIPATION
→ LATER_POSSIBILITY_DISTRIBUTION
→ LATER_RESPONSIBILITY
→ LATER_DECISION
→ LATER_SINGLE_REALIZATION

Ablation may alter only its declared mechanism; it may not silently delete the rest of the Governance flow.

### C-08 — production history invariants were not globally protected
**Found:** an experiment could use destructive NO semantics, permanent weights, or undeclared archive mutation.

**Correction:** production paths must be append-only, preserve NO without deletion, forbid permanent memory weights, and declare every comparator mutation.

## Audit 3 — Execution / freeze

### E-01 — a passing execution report from the wrong experiment could unlock a design
**Found:** scientific and execution gates were independent but not identity-bound.

**Correction:** every design has an exact execution_profile_id. Profile mismatch blocks readiness.

### E-02 — a matching profile could still be too weak
**Found:** merely matching profile names did not prove the lower harness checked the scientific design’s execution obligations.

**Correction:** each design declares required execution check IDs. The lower profile must contain every required check.

### E-03 — the required execution set itself could be arbitrarily weak
**Found:** a design could request only one harmless check.

**Correction:** all scientific designs must include the common mandatory baseline:
- source_freeze
- world_isolation
- cross_arm_identity
- future_leakage
- evaluator_postjoin
- single_realization
- provenance_integrity
- output_immutability

Experiment-specific profiles may add more checks but may not remove these.

### E-04 — component gates could be run separately and misread as overall readiness
**Found:** a user could run only the scientific design checker and mistake its PASS for execution readiness.

**Correction:** the canonical readiness gate now combines scientific design, official axis sequence, definition/causal/execution three-lens review, exact profile identity and execution-check coverage. The canonical CLI mode is --ready-check.

## Portfolio audit after redesign

The conservative current state is intentionally not “proof complete”:

- A1 behavior change/effectiveness: qualifying synthetic confirmatory support exists.
- A2 experience contribution traceability: partial evidence only; separate relation and order ablations remain open.
- A3 responsibility sensitivity: qualifying synthetic confirmatory support exists.
- A4 over-generalization prevention: partial evidence only; full same/changed/unrelated confirmatory closure remains open.
- A5 conflicting-experience handling: no empirical proof evidence.
- A6 wrong-behavior recovery: revalidation mechanism evidence exists, but the full experience-induced adverse-change → outcome → revalidation → later recovery causal chain remains open.
- integrated flow-preserving confirmatory: absent.

Official next axis: **A2_EXPERIENCE_CONTRIBUTION_TRACEABILITY**.

## Interpretation boundary

A green harness CI proves only that the harness rules and attack tests are internally consistent. It does not prove Governance OASIS itself. Governance OASIS scientific support can advance only through experiments that pass this harness and then produce qualifying confirmatory results under their frozen claim boundaries.
