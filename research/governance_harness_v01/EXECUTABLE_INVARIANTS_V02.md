# Governance Harness v0.2 executable invariants

This specification is the implementation gate.  The identifiers below are normative;
`test_governance_attack.py` is their executable adversarial form.

| ID | Executable invariant |
|---|---|
| INV-01 | Changing archive content cannot change gap assessment. |
| INV-02 | Gap assessment receives the complete episode-local trace, not only its last sample. |
| INV-03 | Gap input has no future/scenario/seed/raw-actor/archive/history/fingerprint capability. |
| INV-04 | NO means no anomaly in this trace; a later real trace change may produce YES. |
| INV-05 | A NO epoch performs zero archive reads. |
| INV-06 | History/reengagement is invoked only after a YES assessment. |
| INV-07 | A `participate=False` experience cannot affect Core evaluation or choice. |
| INV-08 | Only YES experiences enter decision context; the full YES/NO set enters audit. |
| INV-09 | Responsibility runs only after the actual possibility distribution exists. |
| INV-10 | Responsibility contains dynamic U/I/V/T evidence linked to selected and rejected candidates; no scalar score is accepted or stored. |
| INV-11 | Exactly one real actuation is permitted per decision epoch. |
| INV-12 | Revalidation cannot run before post-realization closure. |
| INV-13 | Outcome realization reference, realization tau, observed tau, and live-flow fingerprint must agree. |
| INV-14 | No `HistoryEntry`/Completed Experience exists before closure. |
| INV-15 | Gap, every reengagement YES/NO, choice, and responsibility are all revalidated. |
| INV-16 | Original judgments are immutable and retained beside revisions in provenance. |
| INV-17 | Typed revalidation feedback is available to a later related judgment. |
| INV-18 | Governance decision context is epoch-scoped and cleared in `finally`, including failures. |
| INV-19 | Gap YES with zero participating candidates is valid and uses a current-only Core path. |
| INV-20 | Metrics separately count archive reads, reengagement candidates, participating experiences, Core-exposed experiences, and operation calls. |

The Canonical Harness contract remains unchanged.  Governance is an additive sidecar.
Gap detection receives only `CurrentFlowEvidence`; `FlowIntegrityGuard` remains private
to the harness.  Historical Core capability is narrowed before Core evaluation, rather
than filtering an already history-contaminated result.
