# CBRA v1.0 Formal Design Error Checks

Status: ALL REQUIRED PASSES CLOSED
Date: 2026-09-18

The checks below were performed after the kill search and before comparative experiment freeze.

## Pass 1 — Definition consistency

PASS after correction.

Detected risk: the initial axis definition allowed "REVISED" on NO/nonselected targets to be misread as proof that the unrealized alternative would have succeeded.

Correction:
- NO and nonselected targets use EVIDENCE_CONSISTENCY basis.
- They never receive a fabricated counterfactual outcome.
- REVISED means later decision-linked evidence contradicts the original exclusion/nonselection rationale.

No unresolved definition contradiction remains.

## Pass 2 — Causal-order consistency

PASS after correction.

Required order:
decision → realization → Closure → immutable provenance snapshot → later observation → CBRA checkpoint → only a later Governance decision may read eligible checkpoints.

Corrections:
- monitoring time must be strictly after Closure;
- checkpoint times must strictly increase;
- later Governance reads only history_as_of(decision_tau), where observed_tau < decision_tau;
- no checkpoint rewrites the original realization.

Reverse-causal paths are blocked.

## Pass 3 — Execution-boundary consistency

PASS after correction.

Corrections:
- evidence is relation-scoped and cross-relation evidence is rejected;
- unknown provenance targets are rejected;
- duplicate event IDs are rejected within and across checkpoints;
- monitor lifecycle is explicit ACTIVE / DORMANT / CLOSED;
- DORMANT may reopen; CLOSED is terminal.

## Pass 4 — Responsibility-resolution consistency

PASS after correction.

Detected risk: U/I/V/T axis-level labels were too coarse to identify which preserved obligation later failed.

Correction:
- U/I/V/T remain separate targets;
- obligation-level targets are explicitly addressable as axis:obligation;
- all four axes must preserve at least one obligation provenance item.

No scalar responsibility score is introduced.

## Pass 5 — Longitudinal-conflict consistency

PASS.

Conflicting later evidence is not resolved by majority vote or last-write-wins:
- decision-linked support + contradiction => INCONCLUSIVE;
- exogenous-only contradiction => INCONCLUSIVE;
- records remain ordered and append-only;
- no latest_state API exists.

A later Governance component may inspect the sequence under current relation context but CBRA does not force a global answer.

## Pass 6 — Exogenous/mixed attribution consistency

PASS.

Only decision-linked contradiction can independently produce REVISED.
Exogenous-only failure cannot revise the prior Governance judgment.
Mixed evidence preserves MIXED attribution; the typed state depends only on the decision-linked subset and remains INCONCLUSIVE when that subset conflicts or is absent.

## Pass 7 — Monitoring lifecycle consistency

PASS after correction.

- ACTIVE: new checkpoints permitted.
- DORMANT: no checkpoints; may later reopen if the relation becomes monitor-relevant.
- CLOSED: terminal; cannot reopen.

Dormancy does not delete history and is not an experience-quality judgment.

## Pass 8 — Anti-collapse and provenance integrity

PASS.

Prohibited:
- permanent memory weight,
- decay score,
- confidence scalar used as the decision rule,
- aggregate winner score,
- latest-state overwrite,
- cross-relation evidence pollution,
- duplicate event multiplication.

## Residual boundaries

The axis contract is now internally closed, but these remain empirical questions rather than design defects:
- whether CBRA changes behavior beneficially after failure;
- whether it reduces repeated failure without excessive nonparticipation;
- whether contextual re-entry is preserved;
- whether exogenous failures are separated correctly in a finite synthetic environment.

Those questions are assigned to the Failure Completed Experience comparative experiment.
