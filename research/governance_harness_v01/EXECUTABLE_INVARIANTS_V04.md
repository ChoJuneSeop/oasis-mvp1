# Governance Harness Final Closure Specification v0.4

v0.2 and v0.3 remain normative. This document adds the final closure rules; a
v0.4 implementation is conforming only when ATK-01 through ATK-16, all prior
Governance tests, Canonical Harness tests, and Core/history tests pass.

## Required order and state

The only admitted order is current-flow capture, present-only gap assessment,
conditional history search, participation filtering, possibility composition,
dynamic U/I/V/T responsibility, causally bound selection, one realization,
authoritative post-flow observation, closure preparation, authenticity and
complete typed revalidation, atomic commit, and episode rotation.

The states are `EPISODE_OPEN`, `GAP_ASSESSED`, `CURRENT_ONLY` or
`REENGAGEMENT_ASSESSED`, `POSSIBILITIES_READY`, `RESPONSIBILITY_BOUND`,
`REALIZED`, `OUTCOME_PENDING`, `CLOSURE_PREPARED`, `REVALIDATED`, `COMMITTED`,
and `EPISODE_CLOSED`. Pre-realization failure is `ABORTED_PRE_REALIZATION`.
Any failure after real actuation is `RECOVERY_PENDING`; retry may finalize the
same realization but may never actuate again.

## Final closure invariants

1. Gap evaluation uses only a serializable `CurrentFlowEvidence` trace from the
   currently open relation episode. History, feedback, scenario/seed, future,
   raw actor identity, topology, fingerprints, integrity tokens, and labels are
   not semantic inputs. Arbitrary detector code/capabilities are not admitted.
2. Each sample is taken by one atomic host snapshot containing observation,
   current reality, tau, version, and fingerprint. Torn captures are rejected.
3. `HistoryAccessPort` is the sole history capability. The NO branch performs
   zero archive accesses and scans zero records. A Core receives only an
   immutable `ParticipatingExperienceView`; nonparticipants remain audit-only.
4. YES history candidates must be unique, existing completed experiences with
   valid provenance completed before the decision. YES/all-NO is valid.
5. Responsibility follows actual possibility composition, preserves dynamic
   U/I/V/T plus selected, nonselected, and unresolved obligations, and binds a
   mandatory `realize_selected` port. A Core without that port is not admitted.
6. Probes are pure and exactly one real actuation is allowed per decision epoch.
7. Production post observation accepts only the host flow. Outcome authenticity
   binds relation episode, selected candidate, realization reference, decision,
   realization and post tau, pre/post versions and fingerprints, and closure
   evidence to the same execution.
8. `prepare_closure` creates no HistoryEntry and clears no pending state.
   `commit_closure` atomically creates history, attaches the sidecar, commits
   contextual feedback, clears evaluator/Governance pending state, and rotates
   the trace. Sidecar, revalidation, or commit failure leaves no partial commit.
9. NO revalidates gap, choice, responsibility. YES additionally revalidates
   every participation and nonparticipation judgment. Values are typed as
   CONFIRMED, REVISED, or INCONCLUSIVE. Original and revised judgments are both
   retained in a provenance chain.
10. Feedback retains per-experience revalidation and is retrieved only for a
    related relation/provenance context. It never enters the gap detector.
11. Governance context is epoch-scoped and cleared on success, failure, and
    exception. Closure rotates only the active trace; history and feedback stay.
12. Per-epoch metrics include archive access count, scanned/read records and
    bytes, candidate/participant/Core exposure counts, stored versus active
    experience counts, operation counts by stage and total, CPU time, wall time,
    and peak memory.
13. `REAL_EXPERIMENT` remains `BLOCKED` unless admission verifies exclusive
    HistoryAccessPort use, causal selected realization, present-only inputs, no
    future leakage, pure probes, single realization, atomic capture, and closure.

## Attack-test mapping

`ATK-01` fake outcome injection; `ATK-02` false closure; `ATK-03` commit failure
recovery; `ATK-04` sidecar atomicity; `ATK-05` responsibility causality;
`ATK-06` hidden archive Core; `ATK-07` NO archive canary; `ATK-08`
nonparticipant canary; `ATK-09` detector alias/closure/global/class capability;
`ATK-10` cross-relation feedback pollution; `ATK-11` wrong participation
recovery; `ATK-12` wrong nonparticipation recovery; `ATK-13` repeated commit;
`ATK-14` context cleanup after exception; `ATK-15` torn snapshot; `ATK-16`
normal-anomaly-recovery-normal-new-anomaly driven only by host-flow changes.

The required semantic guarantee is:

> Governance Harness는 현재 현실흐름에서 먼저 간극을 판단하고, 필요할 때만 검증된 과거 완결경험을 선택적으로 재참여시키며, 실제 가능성에 대해 동적 책임이 실제 선택을 구속하고, 하나의 현실화 뒤 실제 현실 결과와 관계과정의 완결을 통해 간극·참여·비참여·선택·책임을 다시 검증하며, 그 원래 판단과 수정 결과를 삭제하지 않고 이후 관련 현실에 재사용할 수 있도록 보존한다.
