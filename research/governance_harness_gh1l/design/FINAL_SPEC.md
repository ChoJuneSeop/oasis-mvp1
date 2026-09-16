# GH-1L Experimental Design v1.0.2 ACTION-CONTRACT FINAL

v1.0.2 preserves the v1.0.1 fresh-process/paired design and corrects one measurement-interface defect found by the first diagnostic pilot before any confirmatory execution. See `PILOT_ACTION_CONTRACT_AMENDMENT_V1_0_2.md`.

## Arms

| Arm | Archive access | Participation |
|---|---|---|
| G1 Selective Governance | Gap-gated | current relationship match |
| G2 Always-Retrieve / Selective-Participate | always | same rule as G1 |
| G3 No-History | never | none |
| G4 Gap-Gated All-Participate | Gap-gated | every retrieved experience |
| G5 Gap-Gated Permuted-Participation | Gap-gated | same count as G1, seed-fixed wrong identities |

## Frozen action contract

GH-1L scenario and prehistory labels are semantic labels. Before any v1.0.2 pilot decision or evaluation, the only admitted adapter is `research/governance_harness_gh1l/action_contract.py`.

- `continue` -> `continue-flow`
- `hold-course` -> `continue-flow`
- `continue-flow` -> `continue-flow`
- `yield-space` -> `yield-space`

Canonical Core possibilities also include the two heading-alignment actions. The adapter is arm-blind, outcome-blind, and future-blind. No action mapping may be changed after the v1.0.2 replacement pilot begins.

## Frozen execution contract

- Each arm run is executed in a newly spawned Python worker process. A worker refuses a second arm if process-local arm state is already populated.
- All five arms within one paired block receive the same environment seed, horizon, scenario generator, frozen archive, Core revision, evaluator contract, and action adapter.
- The replacement pilot consists of three paired blocks using seeds frozen in `FREEZE_MANIFEST.json`; the earlier v1.0.1 diagnostic pilot is invalid for confirmatory inference and count freeze.
- The primary paired metric remains `history_sensitive_resolution_rate_G1_minus_G3` over the same five frozen history-sensitive classes.
- Confirmatory block count is derived only after the replacement pilot from the frozen paired-difference variance formula and written once to `design/CONFIRMATORY_COUNT_FREEZE.json`.
- Confirmatory remains hard-locked while that replacement count-freeze file is absent or its spec version differs.

## Frozen invariants

- Prehistory Experiences must pass the actual GH-1 Governance/Closure path before the archive is frozen. All arms receive the same archive hash.
- Historical recommendations are canonicalized only through the frozen action adapter before being compared with the Core possibility distribution.
- Evaluator expected labels are canonicalized through the same adapter only after decisions exist.
- Runtime decision code never receives scenario class, expected action, future state, future anomaly timing, or evaluator outcome.
- Gap is computed only from current-flow fields. Age alone is unavailable to participation. The same experience may participate or not under a new context.
- Confirmatory Closure is provenance-only and cannot extend the decision-eligible archive.
- One live epoch has at most one actuation; counterfactual evaluation has zero.
- Structural PASS/FAIL is separate from effectiveness/resource metrics. No aggregate score or post-result rule repair is admitted.

No Core or frozen GH-1 file change is admitted. Any such diff is `ADMISSION_FAIL`.
