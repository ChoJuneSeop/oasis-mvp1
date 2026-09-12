# CARLA v2.2 Harness Recovery Checkpoint

Date: 2026-09-12

## GitHub checkpoint

Branch: `recovery/carla-v22-harness-v1-evidence-constrained`

Evidence-bound reconstruction commit:
`f51bd53f08ecef19734bf7db915925cebf86e145`

Hash-recording workflow commit:
`1a52dbdc18c713daabdd0e291ea4cc5786fe51fd`

Reconstructed harness source SHA-256:
`2f235f91bef1b4e929955aa00f01ab2036dac8621f4aa472bec461a4a605c6c2`

GitHub Actions workflow:
`CARLA v2.2 recovery verification`

Run #4: compile PASS, 7/7 reconstruction tests PASS, source SHA-256 recorded successfully.

## Recovery finding

The surviving integrity report proves that an execution artifact named `OASIS-CARLA Paper Validation Harness v1.0` existed and ran under Protocol v2.2. It records the original decision-core SHA-256:

`cbe905fbda1eba5c85a97aa5942f8aa06444f32d9348fc93f87d7ba3912719d7`

The source file that produced that original hash has not been recovered. The reconstructed source hash above is intentionally different. Therefore:

- this branch is a structural/evidence-constrained reconstruction;
- it is NOT the original source;
- no original-source identity claim is permitted unless a future candidate file matches the recorded original SHA-256 exactly.

## Verified preserved evidence

- Protocol/harness names
- Town10HD_Opt
- fixed delta 0.05 s
- 220 replay epochs
- approved present-observation schema
- FULL / NO_REACTIVATION / TIME_CENSORED / FIXED_RESPONSIBILITY probes
- 20 recorded counterfactual-purity checks
- state-fingerprint non-mutation invariant
- four historical experience keys visible in the report
- G1 PASS
- G2 PASS
- G3 PASS
- G4 deterministic replay FAIL preserved as failure
- exact surviving values for the five recorded probe epochs are bound into regression tests

## Research boundary

The reconstruction does not invent the missing original responsibility formula, relation-reactivation algorithm, observation-to-control policy, or unlogged CARLA replay internals.

## Mandatory reproducibility order from this checkpoint

For every subsequent paper experiment:

1. source snapshot
2. source SHA-256
3. Git commit / immutable reference
4. preflight and CI
5. experiment execution
6. result artifact
7. result-to-source-hash linkage

## Gate

**DO NOT proceed to the next CARLA/G3.2 stage from this branch until the next work order is explicitly fixed.**
