# Governance OASIS A2 — Experience Contribution Traceability v1

This package implements the preregistered A2 experiment without modifying the
frozen Scientific Proof Harness v1.

## Frozen bases

- Scientific Proof Harness freeze commit:
  `be6ec29f934e9e7b30199f0cb3c1286a94538477`
- Source freeze commit:
  `721f9cacbabb5457628ead61aa97bc3da9e364c4`
- Axis:
  `A2_EXPERIENCE_CONTRIBUTION_TRACEABILITY`
- Experiment:
  `GO_A2_RELATION_ORDER_TRACEABILITY_V1`

A green test run validates the A2 experiment machinery. It is not itself A2
confirmatory evidence.

## Operational definition

A Completed Experience counts as decision-linked contribution only when a
CE-derived input crosses the exact decision-operator input boundary for the
same `decision_invocation_id` before the single realization.

These states remain distinct:

`candidate != revalidated != participated != decision-consumed != behavior-changed`

Behavior improvement is not required by A2.

## Dual evidence architecture

The package deliberately separates:

1. **OASIS provenance plane** — `SystemTraceBuilder`
   records what Governance OASIS claims participated and was consumed.
2. **Reference instrumentation plane** — `ReferenceLedger` plus
   `DecisionBoundaryTap` independently records what actually crossed the
   decision-operator input boundary.

`adapter.py` and `ledger.py` do not import or read `SystemTraceBuilder`.
The evaluator compares the two planes only after the worker trace is sealed.

### Required integration point

At the production decision boundary, wrap the actual decision call:

```python
tap = DecisionBoundaryTap(reference_ledger)
decision = tap.invoke(actual_decision_operator, ce_input_envelopes)
```

`ce_input_envelopes` must be the actual CE-derived inputs passed into that
decision invocation. They must not be reconstructed from the OASIS trace.

Separately, Governance OASIS records its own provenance through
`SystemTraceBuilder`. After both pre-choice paths are complete:

```python
system_trace = system_builder.seal()
reference_ledger.seal_pre_realization(
    system_trace_digest=system_trace.digest()
)
reference_ledger.realize(action_id=selected_action)
```

No candidate/revalidation/participation/consumption event can be appended after
the seal. Realization must immediately follow the seal and may occur exactly
once.

## Confirmatory contrasts

- `A2-I`: CE identity binding only.
- `A2-R`: relation/process provenance only.
- `A2-O`: order-history provenance only.
- `A2-N`: three false-attribution controls:
  - N1 candidate, revalidation NO;
  - N2 revalidated YES, not participating;
  - N3 participating, not decision-consumed.

The frozen scenario matrix is in `SCENARIO_FIXTURES.json`. The CE identities are
in `CE_REGISTRY.json`. The confirmatory interpretation rules are in
`CONFIRMATORY_PLAN.json`.

## Integrity model

Reference events are SHA-256 hash chained with domain separation. The
pre-realization seal commits the already-sealed OASIS system-trace digest.
Evidence JSON files are create-only and cannot overwrite an existing path.

`EXECUTION_PROFILE.json` binds the exact:

- experiment definition;
- confirmatory plan;
- CE registry;
- scenario fixture;
- source-freeze worker identity;
- system-trace implementation;
- reference-recorder/preflight implementation;
- evaluator implementation.

Changing a bound artifact requires a new execution profile before any official
run.

## Pre-execution checks

The A2 preflight emits concrete PASS/FAIL results for the frozen mandatory
execution checks plus:

- dual-evidence independence;
- pre-realization seal;
- decision-invocation binding;
- fixture isolation;
- N1/N2/N3 coverage;
- hash-chain integrity;
- production choice-boundary identity.

The production choice-boundary check binds the reference instrumentation to
`research/choice_responsibility_v01/integration.py` at Git blob
`cc49c976db4494d7d25a2c6347fd80f651b3e056`, including the exact
`preference_operator.choose(context=..., eligible_ids=...)` call boundary.

Run:

```bash
python -m unittest -v   research.governance_oasis_a2_traceability_v1.test_a2_traceability

python -m research.governance_oasis_a2_traceability_v1
```

The module command is explicitly a **pre-execution self-test**, not confirmatory
evidence.

## Result semantics

Run and aggregate outcomes are limited to:

- `SUPPORTS`
- `DOES_NOT_SUPPORT`
- `INCONCLUSIVE`
- `INVALID`

A valid mismatch is `DOES_NOT_SUPPORT`, not `INVALID`. Integrity failure is
`INVALID`. A valid non-negative arm in which no CE reaches decision consumption
is `INCONCLUSIVE`. Contradictory valid confirmatory results aggregate to
`INCONCLUSIVE`.

`COMPLETE != SUPPORTS`.

## Official run boundary

Do not add A2 confirmatory results to the scientific evidence registry until:

1. the frozen execution profile verifies exactly;
2. the Scientific Proof Harness design gate passes;
3. A2 preflight is `FREEZE_READY`;
4. the actual Governance decision boundary is instrumented with
   `DecisionBoundaryTap`;
5. worker output is sealed before evaluator join;
6. all raw run artifacts are written immutably;
7. the independent evaluator classifies the preregistered matrix.

No result-dependent change to the claim, contribution definition, contrasts,
fixtures, or aggregation rule is permitted after execution starts.
