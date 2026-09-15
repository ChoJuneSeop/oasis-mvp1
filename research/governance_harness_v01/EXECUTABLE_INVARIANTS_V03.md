# Governance Harness v0.3 executable invariants

All 20 v0.2 invariants in `EXECUTABLE_INVARIANTS_V02.md` remain normative. The
following lifecycle and boundary refinements are additive:

| ID | Executable refinement |
|---|---|
| INV-09A | Responsibility's selected candidate binds an optional Core `realize_selected` port; without that port, any Core mismatch fails inside `realize` before real-flow actuation. |
| INV-03A | A gap detector is invoked only through the pure `assess(CurrentFlowEvidence)` boundary and is rejected if it directly owns archive/history/catalog/reengagement/integrity/fingerprint/future-seed/scenario/raw-actor capability. |
| INV-21 | Closure removes the episode's active sample trace. Reusing a logical route starts a fresh trace, while repeated capture in an open episode remains continuous. |
| INV-22 | Episode trace rotation does not delete historical provenance or typed feedback and does not leave pending decision context behind. |

The Canonical Harness remains the sole real-flow actuator. Its public contract and
implementation are unchanged; Governance supplies only the pre-realization Core
boundary/selection adapter.
