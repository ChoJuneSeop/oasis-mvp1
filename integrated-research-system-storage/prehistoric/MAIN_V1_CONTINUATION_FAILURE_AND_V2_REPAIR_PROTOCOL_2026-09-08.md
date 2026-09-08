# OASIS Prehistoric Native-Memory Main v1 Continuation Failure and Main v2 Repair Protocol

Date: 2026-09-08

## Status of Main v1

Main v1 executed all 180 primary jobs (A0-A5 x 30 seeds) with parity and contamination checks passing at job level.
The blind aggregate found 153 observer-confirmed substantive trajectories and 27 trajectories that reached the 180-cycle software guard.
Those 27 are incomplete/censored engineering segments, not negative evidence and not substantive failures.

## Continuation attempt and failure classification

The preregistered rule required a software-guard trajectory to continue with the same process state and random-stream position.
A deterministic replay continuation was attempted by replaying cycle 0-180 from the same seed and source and requiring an exact cycle-180 checkpoint SHA before any post-180 evidence could be accepted.

The replay gate failed on multiple trajectories before post-180 continuation. For example, A0 seed 2 produced an observer termination before reaching the expected cycle-180 checkpoint during replay, although its original Main v1 trajectory had reached the cycle-180 guard. Therefore the assumption that a fresh GitHub runner can reconstruct the exact long-run trajectory by seed-only replay is false.

Source comparison between the original Main v1 commit and the continuation commit showed that only workflow files had been added; the experiment source files were unchanged. The precise low-level source of cross-run divergence is not asserted. Floating-point/libm/platform variation is one plausible mechanism, but is not treated as established without a separate diagnostic.

Classification:
- `CROSS_RUN_REPLAY_NONPORTABILITY` — fresh-run seed replay is not a valid exact continuation mechanism for this world.
- `CHECKPOINT_STATE_INCOMPLETE` — Main v1 artifacts did not persist the full internal state of every reference-memory/OASIS agent, so the original 27 guard trajectories cannot be exactly resumed from artifacts.
- This is an implementation/protocol infrastructure failure, not evidence for or against OASIS.

No failed replay output is admitted as research evidence.

## Why the 27 runs are not selectively restarted as primary replacements

Restarting only the 27 guard-selected seeds would condition the replacement sample on an observed outcome of Main v1 and could create selection bias. Therefore Main v1 is retained as a censored first execution and is not silently patched.

## Main v2 technical-repair protocol — fixed before viewing v2 outcomes

Main v2 reruns the full A0-A5 x 30-seed matrix from cycle 0. It is a technical rerun of the same Layer-A hypothesis, not a new hypothesis or a change designed to favor any group.

Fixed invariants retained from Main v1:
1. Same six groups A0-A5 and the same native-history definitions.
2. Same 30 seed strings: `prehistoric-native-memory-main-v1-seed-0` through `...-29`.
3. Same six neutral founders per world.
4. Same prehistoric physical world v1.1 and 11 primitive capability grammar.
5. Same external civilization observer and fixed E1-E4/relational-practice criteria.
6. Same no-import contamination rules.
7. Same OASIS memory-safe canonical semantics and neutral Choice-Axis experimental closure.
8. No reward/Q/future stream/target action/civilization goal is introduced.
9. Earlier civilization is descriptive only and is not defined as superiority.

Execution hardening:
1. A single GitHub job is assigned to each exogenous seed.
2. Within that job, A0-A5 are run on the same runner/Node environment, each in a clean independent world initialized from the same seed. This removes cross-group runner heterogeneity within a paired seed as far as the harness can control it.
3. An initial-world hash parity check is required inside every seed job before substantive execution.
4. The software guard is raised to 720 cycles. It remains an engineering guard only, never a negative research endpoint.
5. All six group outputs for a seed are preserved whether or not a group reaches the observer criterion.
6. Main v1 outcomes are not used to tune group behavior, observer criteria, Choice policy, physics, memory policy, or seed selection in Main v2.
7. If any Main v2 run still reaches the 720-cycle guard, it remains censored and will require a separate fully serialized checkpoint implementation; it will not be declared a failure.

## Interpretation boundary

Main v1 and Main v2 must not be pooled as if they were one homogeneous sample. Main v2 is the repaired primary execution for complete paired comparison. Main v1 remains an audit trail demonstrating the infrastructure failure that motivated the repair.
