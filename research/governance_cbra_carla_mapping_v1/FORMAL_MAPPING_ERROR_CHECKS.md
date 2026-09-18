# Governance CBRA → CARLA Mapping Error Checks

Status: REQUIRED PASSES DEFINED / EXECUTION VALIDATION PENDING

## Pass 1 — Definition

Check that current flow, relation context, Closure, Completed Experience, CBRA evidence, and later reuse have non-overlapping meanings.

Primary risks:
- treating dynamic geometry as permanent relation identity;
- treating "reflection" as free-form memory editing;
- treating NO revision as proof that the unrealized action would have succeeded.

Required result: zero unresolved definition contradiction.

## Pass 2 — Causal order

Required order:

current observation
→ Governance participation/choice/responsibility
→ exactly one host actuation
→ host-authoritative outcome
→ relation-process Closure
→ CBRA post-Closure evidence
→ later as-of gated Governance reuse.

Reject any path that places outcome/evaluator truth before realization.

## Pass 3 — Execution

Verify:
- canonical prepare_epoch is read-only;
- counterfactual probes do not advance CARLA time;
- exactly one apply_one occurs;
- HistoryEntry closes only after realization;
- CBRA cannot open before canonical Closure;
- evidence event IDs are unique;
- relation IDs match preserved provenance.

## Pass 4 — Responsibility granularity

U/I/V/T must remain separate.
Obligation-level provenance must remain addressable.
No aggregate responsibility score may replace them.

## Pass 5 — Exogenous attribution

Adverse CARLA outcome alone must not create REVISED.
EXOGENOUS-only evidence must remain non-revising.
MIXED/UNRESOLVED cases must remain explicit.

## Pass 6 — Delayed effect

A delayed adverse effect must be representable as multiple ordered post-Closure checkpoints.
The earlier checkpoint must remain visible in history and must not be overwritten by the later one.

## Pass 7 — Contextual re-entry

Verify exact relation/scope mapping:
- same scope can reuse relevant revision;
- changed scope must not be automatically globally suppressed;
- unrelated relation must not inherit relation-local revision.

## Pass 8 — Temporal as-of integrity

At later decision time, only checkpoints with observed_tau strictly earlier than decision time are readable.

## Pass 9 — Duplicate/cross-relation integrity

Reject duplicate event IDs and cross-relation evidence contamination.

## Pass 10 — Frozen-lineage compatibility

Canonical CARLA Harness behavior, G3.2 sidecar semantics, Governance Core, and CBRA semantics must remain unchanged.
Only mapping/adapters may be added.
