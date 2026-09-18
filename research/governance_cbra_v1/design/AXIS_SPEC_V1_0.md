# CBRA v1.0 — Continuous Bidirectional Revalidation Axis Specification

Status: AXIS_SEMANTICS_FROZEN / NO COMPARATIVE EXPERIMENT EXECUTED

## Position in Governance OASIS

CBRA is a **separate Governance operator axis**, not a new fundamental OASIS axis. The six fixed OASIS axes remain unchanged.

Its task begins only after an ordinary Governance decision has completed:

current flow → participation YES/NO → possibilities → U/I/V/T → one realization → Closure → committed provenance

CBRA then performs:

committed provenance → later observations → repeated provenance-targeted revalidation checkpoints.

## What is continuously revalidated

Every checkpoint contains four distinct classes.

1. **Experience participation**
   - prior YES is revalidated against later decision-linked evidence;
   - prior NO is also revalidated;
   - NO review is evidence-consistency review, not an imagined counterfactual.

2. **Choice**
   - selected candidate receives realized-path revalidation;
   - every nonselected candidate keeps its nonselection provenance;
   - nonselected candidates are never assigned fictitious outcomes.

3. **Responsibility**
   - U, I, V and T are separate revalidation targets;
   - one axis may be REVISED while another is CONFIRMED or INCONCLUSIVE;
   - no responsibility scalar is generated.

4. **Causal attribution**
   - decision-linked,
   - exogenous,
   - mixed,
   - unresolved.

Exogenous evidence alone cannot revise the original Governance judgment.

## Typed state rule

CBRA keeps the existing typed states:

- CONFIRMED,
- REVISED,
- INCONCLUSIVE.

The state is derived only from provenance-linked **decision-linked** evidence. Conflicting decision-linked support and contradiction remains INCONCLUSIVE. Exogenous-only failure also remains INCONCLUSIVE with exogenous attribution.

This prevents "bad outcome = bad decision" collapse.

## Temporal rule

A CBRA checkpoint must satisfy:

- checkpoint time > Closure time;
- checkpoint times are strictly increasing;
- prior checkpoints are immutable;
- the sequence is never collapsed to one permanent score or one overwritten latest label.

A later Governance process may inspect this ordered evidence sequence under its current relation, but CBRA itself does not automatically force participation or exclusion.

## Bidirectional principle

CBRA formally implements the project's 양의신공 principle as symmetric provenance coverage:

- YES and NO,
- selected and nonselected,
- successful and failed realized outcomes,
- decision-linked and exogenous causes.

Symmetry does **not** mean claiming counterfactual knowledge. The unrealized side is reviewed only for evidentiary consistency.

## Boundary

CBRA v1.0 proves an executable provenance/revalidation contract only. It does not yet prove that this axis improves behavior. That requires the separately frozen failure-Completed-Experience comparative experiment.


## Formal hardening after kill search and error checks

The following rules are normative for v1.0:

- **As-of-time gate:** a later Governance decision may inspect only checkpoints with `observed_tau < decision_tau`.
- **Relation scope:** every evidence event names the same relation as the immutable decision provenance; cross-relation events are rejected.
- **Event uniqueness:** every evidence event has a stable event id; duplicate ids are rejected within a checkpoint and across the full axis history.
- **Lifecycle:** monitors are ACTIVE, DORMANT, or CLOSED. Dormant monitors may reopen without losing history. Closed monitors are terminal.
- **Obligation traceability:** U/I/V/T remain separate targets and each preserves obligation-level target ids.
- **NO/nonselected semantics:** a REVISED state on an unrealized path means the original rationale is contradicted by later decision-linked evidence; it never means the counterfactual action is known to have succeeded.
- **Conflict rule:** conflicting decision-linked support/contradiction remains INCONCLUSIVE; no majority vote and no latest-state overwrite.
- **Exogenous rule:** exogenous-only deterioration cannot revise an original decision judgment.

These rules close the formal definition, causal, and execution checks recorded in `validation/FORMAL_ERROR_CHECKS.md`.
