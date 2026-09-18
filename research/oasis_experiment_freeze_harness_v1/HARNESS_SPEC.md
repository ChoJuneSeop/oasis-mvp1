# OASIS Experiment Freeze Harness v1.0

## Purpose

This harness converts the OASIS research rule **design → kill-search → repair → full recheck → freeze → execution** into a fail-closed state machine. It exists to prevent a local repair, a green CI run, or a human declaration from being mistaken for experiment readiness.

A run is not considered designed merely because code exists. A run is not considered frozen merely because a branch name contains `freeze`. A run is not executable until all blocking contracts are present and pass.

## Authoritative states

`DRAFT → STATIC_KILLSEARCH → CAUSAL_KILLSEARCH → EXECUTION_KILLSEARCH → CROSS_ARM_GATE → ADVERSARIAL_RECHECK → FREEZE_READY → FROZEN → EXECUTION_READY → EXECUTED → ANALYSIS_ONLY`

Any newly discovered blocking defect before execution demotes the design to `DRAFT`. There is no legal transition that skips `FREEZE_READY`.

## Fail-closed semantics

For every required check, only `PASS` resolves the gate.

The following all block freezing:

- `FAIL`
- `UNVERIFIED`
- `BLOCKED`
- a missing required check
- a duplicate required check
- a check reported under the wrong category

The harness, not a prose statement, decides whether `FREEZE_READY` has been reached.

## Run5 profile

The first concrete profile audits Governance OASIS + CBRA CARLA Run5 before any execution. It deliberately distinguishes the declared **structural Pilot** from a future confirmatory effectiveness experiment. Therefore a controlled failure-class intervention is allowed only at the post-Closure evaluator boundary and may never enter scene admission or Governance decision operators.

The profile requires all of the following:

1. exact 54-unit Cartesian matrix and same seed across each three-arm scenario;
2. no predecision failure-label leakage;
3. fail-closed before/after unit world-isolation evidence;
4. realized cross-arm scenario identity, not seed equality alone;
5. control of ambient fields that participate in scope identity;
6. explicit binding between topology admitted before execution and the topology actually used by counterpart construction;
7. evaluator boundary consistent with the structural-only claim;
8. authoritative Closure after relation removal;
9. CBRA post-Closure lifecycle, strict as-of, duplicate and cross-relation rejection;
10. one coherent telemetry measurement window;
11. three-way freeze identity: manifest blob = source-freeze blob = execution-ref blob;
12. an immutable execution authority, separate from later-run design work;
13. an adversarial recheck after every earlier blocker is resolved.

## Freeze integrity

A moving branch is not sufficient as an execution authority. The final experiment must record an immutable `execution_freeze_commit` after the freeze manifest and all freeze checks exist. The harness then verifies that the execution ref equals that commit and that later-run design artifacts are not mixed into the execution authority.

## Operational rule

No OASIS experiment runner should be issued to the user unless its profile reports:

```text
UNRESOLVED = 0
STATE = FREEZE_READY
```

After the immutable freeze is created, the same passing report must accompany the transition to `FROZEN` and `EXECUTION_READY`.
