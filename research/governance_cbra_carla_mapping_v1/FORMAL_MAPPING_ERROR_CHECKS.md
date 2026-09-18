# Governance CBRA → CARLA Mapping Error Checks

Status: ALL REQUIRED PASSES CLOSED
Validation run: `35331348088`
Validation job: `105556168031`

## Pass 1 — Definition

**PASS.**

Current flow, relation context, Closure, Completed Experience, CBRA evidence, and later reuse are distinct.

- dynamic geometry remains current-flow observation;
- relation identity is separate from scope signature;
- "reflection" is typed provenance-bound revalidation, not free-form memory rewriting;
- a NO/nonselected revision means its preserved rationale is contradicted, not that an unrealized alternative is known to have succeeded.

No unresolved definition contradiction remains.

## Pass 2 — Causal order

**PASS.**

Frozen order:

current observation
→ Governance participation/choice/responsibility
→ exactly one host actuation
→ host-authoritative outcome
→ relation-process Closure
→ CBRA post-Closure evidence
→ later as-of gated Governance reuse.

The canonical harness and mapping tests reject paths that place later evidence into an earlier decision.

## Pass 3 — Execution

**PASS.**

Verified:
- canonical `prepare_epoch` remains read-only;
- canonical counterfactual probes preserve host fingerprint/tau;
- exactly one `apply_one` is admitted per prepared epoch;
- HistoryEntry requires forward causal order and one realization;
- CBRA opens only against matching closed history;
- evidence identity and relation scope are checked.

## Pass 4 — Responsibility granularity

**PASS.**

U/I/V/T remain separate targets and obligation-level provenance remains addressable. No aggregate responsibility score is introduced.

## Pass 5 — Exogenous attribution

**PASS.**

The mapping transports explicit attribution rather than deriving "bad outcome = bad decision". EXOGENOUS-only contradictory outcome remains `INCONCLUSIVE`, not `REVISED`.

## Pass 6 — Delayed effect

**PASS.**

Multiple ordered post-Closure checkpoints are preserved. The earlier checkpoint remains in history after the later one is appended.

## Pass 7 — Contextual re-entry

**PASS.**

Context mapping is frozen as:
- same scope = same relation + exact scope signature;
- changed scope = same relation + different scope signature;
- unrelated = different relation.

No permanent global suppression is created by the mapping layer.

## Pass 8 — Temporal as-of integrity

**PASS.**

Only checkpoints satisfying:

`observed_tau < later_decision_tau`

are available through the later-decision interface. Validation explicitly confirmed one early checkpoint is visible while a later checkpoint remains unavailable until time advances.

## Pass 9 — Duplicate/cross-relation integrity

**PASS.**

The underlying CBRA invariants reject duplicate evidence event IDs, unknown targets, and cross-relation evidence contamination. The mapping regression suite passed unchanged CBRA tests.

## Pass 10 — Frozen-lineage compatibility

**PASS.**

Validation passed simultaneously for:
- new CARLA↔CBRA mapping tests;
- exact imported canonical CARLA Harness v1.1 regression;
- existing CBRA invariants;
- existing Governance v0.4 attack regression.

The canonical Harness source was imported from `canonical/carla-v22-harness-v1.1-g32` without semantic modification.

## Validation summary

Workflow `35331348088`:

- compile: PASS
- mapping admission tests: PASS
- canonical CARLA regression: PASS
- CBRA regression: PASS
- Governance regression: PASS

## Residual boundary

No real CARLA scientific Pilot has been executed by this mapping check.

The historical canonical CARLA gate still correctly states that a reproducible real CARLA run additionally requires frozen source identities for:
1. CARLA host port / Environment Actuator,
2. OASIS Core adapter,
3. Observation Gateway,
4. Independent Evaluator.

Therefore the mapping is structurally ready, while real CARLA execution remains gated on those concrete runtime source identities.
