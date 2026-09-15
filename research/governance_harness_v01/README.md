# Governance Harness v0.1

This prototype adds governance as a thin orchestration layer over
`CanonicalHarnessV11`; it does not replace the canonical memory, relation-history,
Completed Experience, probing, or single-realization paths.

The enforced order is:

1. Capture the present flow.
2. Detect abnormal output, relation change, or progress anomaly using only that
   present-flow snapshot.
3. On `NO`, run the canonical decision, single realization, and outcome observation.
4. On `YES`, and only then, assess Completed Experience reengagement and explicit
   responsibility for selection and non-selection.
5. Bind that context to a governance-aware core adapter when one is supplied, then
   run the unchanged canonical single-realization path.
6. Observe the realized outcome and revalidate the gap, every participation or
   non-participation judgment, the choice, and the responsibility judgment.

`CurrentFlowSnapshot` intentionally has no history field. This capability boundary,
plus the call-order tests, prevents gap detection from becoming a historical
comparison. The prototype records both positive and negative reengagement decisions
without creating a separate Completed Experience for a mere `NO` decision.
