# CBRA v1.1 — Continuous Bidirectional Revalidation Axis Specification

Status: FORMAL_SEMANTICS_FROZEN / EXPERIMENT_NOT_RUN

CBRA remains a Governance auxiliary operator axis. It does not alter the six fixed OASIS axes.

## Causal start condition

CBRA may begin only from a committed Governance provenance snapshot after Closure.

Required order:

current decision
→ participation YES/NO
→ possibilities
→ U/I/V/T responsibility
→ exactly one realization
→ authoritative post-observation
→ Closure
→ committed provenance
→ CBRA monitoring.

No CBRA evidence can retroactively alter the realized past.

## Immutable original scope

Each monitored decision snapshot carries:

- entry_id,
- relation_id,
- scope_key,
- decision_tau,
- closure_tau,
- full participation YES/NO provenance,
- selected/nonselected candidate provenance,
- preserved U/I/V/T responsibility grounds and obligations.

The original relation_id and scope_key are immutable.

## Evidence contract

Every TargetEvidence must carry:

- evidence_id,
- its own observed_tau,
- relation_id,
- scope_key,
- target_kind and target_id,
- evidence direction,
- causal attribution,
- provenance evidence refs.

A checkpoint is valid only when:

closure_tau < evidence.observed_tau <= checkpoint.observed_tau

for every evidence item.

The same (evidence_id, target_kind, target_id) may enter the axis only once. One real event may legitimately address multiple distinct provenance targets.

## Context-bearing evidence rule

Only evidence matching the original decision's relation_id **and** scope_key may directly CONFIRM or REVISE that original judgment.

Evidence from another relation or another scope is retained as provenance but is non-decisive for the original judgment.

This rule prevents cross-relation pollution and prevents evidence from a changed context from rewriting what happened in the earlier context.

Changed-context evidence can later be considered by a new Governance decision under that new current context.

## Bidirectional target semantics

### Participation YES

Basis: DIRECT_REALIZED.

A finding refers to whether later evidence supports or contradicts the grounds under which the experience actually participated in the realized decision.

### Participation NO

Basis: EVIDENCE_CONSISTENCY.

CONFIRMED/REVISED refer only to consistency of the original nonparticipation rationale with later evidence. They do not assert what would have happened had the excluded experience participated.

### Selected choice

Basis: DIRECT_REALIZED.

The realized choice may be revalidated against later evidence.

### Nonselected choice

Basis: EVIDENCE_CONSISTENCY.

No unrealized outcome is invented. Findings concern only consistency of the recorded nonselection rationale/obligations.

## Responsibility

U/I/V/T remain separate first-class revalidation targets.

A checkpoint may therefore contain, for example:

- U = REVISED,
- I = CONFIRMED,
- V = INCONCLUSIVE,
- T = INCONCLUSIVE.

v1.1 validates axis-level U/I/V/T findings. It does not claim sub-obligation-level causal identification.

## Causal attribution

Evidence is typed as:

- DECISION_LINKED,
- EXOGENOUS,
- MIXED,
- UNRESOLVED.

Only context-matched DECISION_LINKED evidence can directly drive CONFIRMED or REVISED.

Exogenous-only evidence is INCONCLUSIVE for the original decision.

Mixed or unresolved evidence is not promoted to a definitive revision unless separately decomposed into decision-linked evidence items.

## Temporal continuity

Checkpoint time must be strictly increasing.

Every checkpoint is append-only.

CBRA stores the entire ordered sequence. It has no:

- permanent experience score,
- reward weight,
- trust score,
- decay scalar,
- overwritten latest-state field.

For later decision use, the safe read primitive is history_as_of(decision_tau), which returns only checkpoints with checkpoint.observed_tau < decision_tau.

## Monitoring lifetime

Monitoring is evidence-driven.

If no authoritative provenance-linked evidence is available, the axis may remain dormant and emits no empty checkpoint.

Dormancy does not delete or close the axis permanently. Monitoring may resume when a later provenance-linked observation becomes available.

## Downstream Governance rule

CBRA itself does not force later participation, exclusion, or selection.

Any behavioral effect must be produced by a separately frozen current-review projection that:

1. reads only history_as_of(current_decision_tau),
2. preserves the full underlying checkpoint sequence,
3. interprets that evidence under the then-current relation/scope,
4. remains ephemeral and does not overwrite stored CBRA history.

## Claim boundary

CBRA v1.1 can establish a mechanically enforced bidirectional provenance/revalidation contract.

It does not establish that the mechanism improves behavior. Behavioral effect requires the separately frozen failure-Completed-Experience comparative experiment.
