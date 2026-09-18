# CBRA Failure CE v1.1 Post-run Structural Audit

Status: PASS / SCIENTIFICALLY ADMISSIBLE WITHIN FROZEN SYNTHETIC MECHANISM SCOPE

Confirmatory run: `35328613899`
Frozen scientific snapshot: `be6d3a88e60aba44f74738a8524bf0138f1613d1`

## Audit 1 — comparator separation

PASS.

GENERAL_HARNESS does not instantiate `ContinuousBidirectionalRevalidationAxis`.
Its output has:
- `cbra_instantiated = false`,
- `checkpoint_count = 0`,
- `as_of_count = 0`.

The governed arms alone instantiate CBRA.

## Audit 2 — operational family variation

PASS.

F1/F2/F3/F4 map to distinct runtime initial scopes 1/2/3/4.
The confirmatory output records `family_initial_scopes = [1,2,3,4]`.
Families are therefore not label-only duplicate rows.

## Audit 3 — delayed failure continuity

PASS.

For delayed cases in governed arms:
- first post-Closure checkpoint is INDETERMINATE at tau 12;
- second is decision-linked CONTRADICTS at tau 13;
- the intermediate as-of read can contain only the earlier checkpoint;
- the final later read can contain both.

GENERAL_HARNESS receives the later relation-level failure event without CBRA checkpoints.

## Audit 4 — counterfactual discipline

PASS.

No arm reports a fabricated counterfactual outcome. CBRA NO/nonselected paths retain evidence-consistency semantics only.

## Audit 5 — frozen execution

PASS.

The workflow checked out exact snapshot `be6d3a88e60aba44f74738a8524bf0138f1613d1`.
Pilot did not change confirmatory matrix, arms, rules, or metrics.
No post-result repair was made.

## Audit 6 — interpretation boundary

PASS with strict limitation.

This is a deterministic finite synthetic mechanism experiment. The comparison demonstrates behavior of three explicitly defined mechanisms under the frozen failure matrix. GENERAL_HARNESS is one specified relation-level episodic failure-memory comparator, not a representative sample of all agent harnesses.

No claim of universal superiority, real-world safety, CARLA validity, or statistical population generalization is admissible.
