# GH-4 Existing-Code Audit

Status: STAGE_5_COMPLETE

The existing GovernanceHarnessV04 already enforces the boundaries GH-4 requires: current snapshot capture, current-flow Gap detection before archive search, history-port-only archive access, explicit participation decisions, responsibility binding after actual Core possibilities exist, selected=realized through `realize_selected`, one real actuation, authoritative post-observation, Closure, typed revalidation, atomic commit, Completed Experience creation, and feedback/provenance persistence.

Therefore GH-4 must not modify the Core, Canonical Harness, GovernanceHarnessV04, GH-1/GH-1L, GH-2, or GH-3 frozen code. GH-4 is implemented as an experiment-side integration layer consisting of a controlled long-horizon host, HistoryAccessPort subclasses, a current-observation responsibility adapter, a selective re-participation operator, frozen synthetic scenarios, independent evaluator, and admission/preflight tests.

Important inherited behavior: `HistoryAccessPort.atomic_commit` appends each newly closed Completed Experience to the archive. This is precisely the previously untested integration boundary GH-4 will expose only at later epochs.
