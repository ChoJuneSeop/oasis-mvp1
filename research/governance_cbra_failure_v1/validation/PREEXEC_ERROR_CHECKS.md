# CBRA Failure CE Experiment — Pre-execution Design Checks

Status: DESIGN_CHECK_PASS / IMPLEMENTATION_ADMISSION_PENDING

## Definition check

PASS.

- G1 vs G2 isolates only whether already-generated CBRA history can affect a later Governance decision.
- G3 is explicitly descriptive and is not used as the sole CBRA causal control.
- failed Completed Experience means an actually closed/committed Governance episode whose later evidence contradicts a prespecified provenance target.
- exogenous adverse outcomes are a separate failure class and must not be treated as internal decision error.
- no aggregate winner score exists.

## Causal check

PASS subject to implementation admission.

Required order:

initial current reality
→ initial Governance or Canonical decision
→ one realization
→ post observation
→ Governance Closure/commit or Canonical outcome log
→ later CBRA evidence
→ later as-of review
→ re-entry decision.

Forbidden:

- failure evidence before initial realization/Closure;
- ordinary immediate Governance revalidation used as the injected failure signal;
- G2 reading CBRA projection;
- G3 receiving Governance or CBRA provenance;
- evaluator truth entering runtime operators;
- future checkpoint reads;
- changed-scope revision automatically globalized.

## Execution check

Implementation must prove before Pilot:

1. three arms execute in fresh OS processes;
2. same frozen runtime chain schedule is supplied to all arms;
3. G1 and G2 use the same GovernanceHarnessV04/Core/history implementation;
4. the only G1/G2 behavioral intervention is current-review projection enablement;
5. every Governance initial and re-entry decision reaches Closure;
6. every decision has exactly one realization and selected==realized;
7. the initial Governance episode creates a run-created Completed Experience;
8. CBRA evidence occurs strictly after initial Closure and before the re-entry decision;
9. G2 generates the same CBRA checkpoint but does not read it;
10. G3 uses CanonicalHarnessV11 and preserves an execution/outcome log;
11. Pilot emits structural evidence only and imports no confirmatory evaluator.

No Pilot is permitted until these implementation-admission conditions pass.
