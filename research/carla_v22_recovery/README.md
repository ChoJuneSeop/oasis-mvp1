# OASIS-CARLA v2.2 / Harness v1.0 — Evidence-Constrained Reconstruction

## Status

This directory is a **reconstruction**, not the lost original source file.

The original execution artifact is evidenced by `integrity_report_20260911_014331.json`, which records:

- protocol: `OASIS-CARLA Paper Validation Protocol v2.2`
- harness: `OASIS-CARLA Paper Validation Harness v1.0`
- CARLA map: `Town10HD_Opt`
- fixed delta: `0.05 s`
- no-rendering mode: `true`
- replay epochs: `220`
- original decision-core SHA-256: `cbe905fbda1eba5c85a97aa5942f8aa06444f32d9348fc93f87d7ba3912719d7`
- G1 Harness Integrity: PASS, 220 epochs, 0 violations
- G2 Leakage Audit: PASS
- G3 Counterfactual Purity: PASS, 20 checks, 0 violations
- G4 Deterministic Replay: FAIL

The original source corresponding to the recorded SHA-256 has not been recovered from GitHub or the File Library. Therefore this reconstruction MUST NOT claim byte-for-byte or behavior-for-behavior identity with the lost original core.

## What is reconstructed from direct evidence

1. The exact approved observation schema visible in the integrity report:
   - `epoch`
   - `ego_speed_mps`
   - `front_present`
   - `front_gap_m`
   - `front_closing_mps`
   - `front_kind`
   - `local_heading_error_deg`
   - `local_density`
2. The four recorded probe interventions:
   - `FULL`
   - `NO_REACTIVATION`
   - `TIME_CENSORED`
   - `FIXED_RESPONSIBILITY`
3. Probe purity requirement: a counterfactual probe must not advance or mutate the real flow.
4. Decision record fields:
   - VehicleControl-compatible `throttle`, `brake`, `steer`
   - `reactivated_keys`
   - `compute_units`
   - responsibility vector
5. The recorded integrity gates and deterministic-replay failure boundary.

## What is NOT recovered

- The exact lost decision-core source code.
- The exact internal formula that produced responsibility values.
- The exact relation-reactivation implementation behind the four evidence keys.
- The exact source code that mapped the observation into throttle/brake/steer.
- The original CARLA spawning/replay implementation details that are not present in the surviving report.

These unknowns are represented as explicit interfaces, never silently guessed.

## Recovery rule

Any future CARLA work must follow:

`source snapshot -> SHA-256 -> Git commit -> run -> result artifact linked to source SHA`

A run without this chain is not considered paper-reproducible.
