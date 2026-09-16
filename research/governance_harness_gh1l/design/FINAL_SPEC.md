# GH-1L Experimental Design v1.0 FINAL

## Arms

| Arm | Archive access | Participation |
|---|---|---|
| G1 Selective Governance | Gap-gated | current relationship match |
| G2 Always-Retrieve / Selective-Participate | always | same rule as G1 |
| G3 No-History | never | none |
| G4 Gap-Gated All-Participate | Gap-gated | every retrieved experience |
| G5 Gap-Gated Permuted-Participation | Gap-gated | same count as G1, seed-fixed wrong identities |

## Frozen invariants

- Prehistory Experiences must pass the actual GH-1 Governance/Closure path before the
  archive is frozen. All five arms receive the same archive hash.
- Confirmatory Closure is provenance-only and cannot extend the decision-eligible
  archive. This prevents GH-3-style outcome feedback from entering GH-1L.
- Runtime code never receives scenario class, expected action, future state, or future
  anomaly timing. Evaluation joins labels only after decisions have been emitted.
- Gap is computed only from current-flow fields. Age alone is unavailable to the
  participation rule. The same experience may participate or not under a new context.
- One live epoch has at most one actuation. Counterfactual evaluation has zero.
- Structure PASS/FAIL is separate from resolution, unsafe/invalid, unresolved,
  latency, archive access, records scanned, bytes read, and operation cost.
- Pilot data is excluded from confirmatory data. Confirmatory count is frozen only
  after paired-design power analysis of pilot variance.
- After any gate failure, write a failure record and do not repair a rule from results.

No Core change is admitted. A Core hash difference is `ADMISSION_FAIL`.
