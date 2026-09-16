# GH-1L Experimental Design v1.0.1 PRE-PILOT FINAL

This version amends v1.0 only to align the actual execution path with the already-declared fresh-process and paired-pilot controls. The amendment occurred before any pilot or confirmatory execution. See `PREPILOT_AMENDMENT_V1_0_1.md`.

## Arms

| Arm | Archive access | Participation |
|---|---|---|
| G1 Selective Governance | Gap-gated | current relationship match |
| G2 Always-Retrieve / Selective-Participate | always | same rule as G1 |
| G3 No-History | never | none |
| G4 Gap-Gated All-Participate | Gap-gated | every retrieved experience |
| G5 Gap-Gated Permuted-Participation | Gap-gated | same count as G1, seed-fixed wrong identities |

## Frozen execution contract

- Each arm run is executed in a newly spawned Python worker process. A worker refuses a second arm if process-local arm state is already populated.
- All five arms within a block receive the same environment seed, horizon, scenario generator, frozen archive, Core revision, and evaluator contract.
- Pilot consists of three paired blocks using the frozen seeds in `FREEZE_MANIFEST.json`. Pilot data is excluded from confirmatory data.
- The primary pilot paired metric is `history_sensitive_resolution_rate_G1_minus_G3` over the five frozen history-sensitive scenario classes listed in the freeze manifest.
- Confirmatory block count is derived only after pilot from the frozen paired-difference variance formula. The result must be written once to `design/CONFIRMATORY_COUNT_FREEZE.json`.
- Confirmatory execution is hard-locked while that count-freeze file is absent.

## Frozen invariants

- Prehistory Experiences must pass the actual GH-1 Governance/Closure path before the archive is frozen. All five arms receive the same archive hash.
- Confirmatory Closure is provenance-only and cannot extend the decision-eligible archive. This prevents GH-3-style outcome feedback from entering GH-1L.
- Runtime decision code never receives scenario class, expected action, future state, or future anomaly timing. Evaluation joins labels only after decisions have been emitted.
- Gap is computed only from current-flow fields. Age alone is unavailable to the participation rule. The same experience may participate or not under a new context.
- One live epoch has at most one actuation. Counterfactual evaluation has zero.
- Structure PASS/FAIL is separate from resolution, unsafe/invalid, unresolved, latency, archive access, records scanned, bytes read, and operation cost.
- After any gate failure, write a failure record and do not repair a rule from results.

No Core change is admitted. A Core hash difference is `ADMISSION_FAIL`.
