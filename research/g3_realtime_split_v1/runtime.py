from __future__ import annotations

"""Reality/Action and decision-time snapshots (현재 행동과 결정 시점 불변 기록)."""

from copy import deepcopy
from dataclasses import asdict, dataclass, replace
from hashlib import sha256
import pickle
import time

from research.g3_2_sidecar.history import HistoryEntry
from research.g3_organic_flow_v1.runtime import OrganicHarness
from research.g3_realtime_split_v1.core import EpochSnapshotOrganicCore


@dataclass(frozen=True)
class DeferredProbes:
    """One immutable decision-time source for two independent deferred layers.

    Observation/Validation (관측·검증) expands ``snapshot`` into the full G3.2
    individual/joint probe record. Relation/Experience (관계·경험) never waits for
    that expansion: it uses only the compact decision-time facts below to close and
    admit a realized relation process. Empty G3.2 measurement fields in the relation
    HistoryEntry mean "not an input to relation admission", not "measured as zero".
    The full measurements remain in the independent validation ledger and are joined
    by ``digest`` for later analysis; they never rewrite an already admitted history.
    """

    snapshot: bytes
    digest: str
    distribution: tuple
    tau: float
    current_reality: tuple
    relation_refs: tuple

    @property
    def possibility_distribution(self):
        return dict(self.distribution)

    def complete_history_entry(
        self,
        *,
        entry_id: str,
        realized_tau: float,
        outcome_tau: float,
        relation_end_tau: float,
        selected_possibility_id: str,
        realization_ref: str,
        realization_count: int,
        outcome_description: str,
        closure_method: str,
        closure_evidence,
    ) -> HistoryEntry:
        if selected_possibility_id not in self.possibility_distribution:
            raise ValueError(
                "realized possibility was absent from the immutable decision distribution"
            )
        evidence = deepcopy(dict(closure_evidence))
        # Preserve genealogy without pretending the deferred ablation has already
        # measured participation. These are decision-time available relation refs,
        # not causal/participation labels.
        evidence["decision_snapshot_digest"] = self.digest
        evidence["decision_relation_refs"] = tuple(
            {
                "experience_id": experience_id,
                "relation_element_id": relation_element_id,
                "completed_at_tau": completed_at_tau,
            }
            for experience_id, relation_element_id, completed_at_tau in self.relation_refs
        )
        evidence["observational_validation"] = "independent_deferred"
        return HistoryEntry(
            entry_id=entry_id,
            decision_tau=float(self.tau),
            realized_tau=float(realized_tau),
            outcome_tau=float(outcome_tau),
            relation_end_tau=float(relation_end_tau),
            selected_possibility_id=selected_possibility_id,
            realization_ref=realization_ref,
            realization_count=int(realization_count),
            outcome_description=outcome_description,
            current_reality=dict(self.current_reality),
            participation=(),
            group_participation=(),
            reconstruction=(),
            provenance=(),
            closure_method=closure_method,
            closure_evidence=evidence,
        )


@dataclass(frozen=True)
class SnapshotFlow:
    frame: object

    def capture(self):
        return deepcopy(self.frame)


def capture_probes(core, frame, view):
    # Only evaluation state is copied. No growing responsibility ledger, live port,
    # execution journal, runtime worker, or CARLA handle enters the child process.
    probe_core = object.__new__(EpochSnapshotOrganicCore)
    for name in (
        "relation_builder",
        "candidate_provider",
        "relation_operator",
        "reconstruction_operator",
        "responsibility_operator",
    ):
        setattr(probe_core, name, getattr(core, name))
    probe_core._frame = frame
    probe_core._history = core._history_view()
    probe_core._epoch_history_snapshot = probe_core._history
    payload = pickle.dumps((probe_core, frame, view), protocol=pickle.HIGHEST_PROTOCOL)
    reality = tuple(sorted(asdict(frame.observation).items()))
    relation_refs = tuple(
        (
            str(relation.experience_id),
            str(relation.relation_element_id),
            float(relation.completed_at_tau),
        )
        for relation in view.relation_elements
    )
    return DeferredProbes(
        snapshot=payload,
        digest=sha256(payload).hexdigest(),
        distribution=tuple(view.possibility_distribution.items()),
        tau=float(frame.tau),
        current_reality=reality,
        relation_refs=relation_refs,
    )


def validate_result(result):
    """Reproduce all frozen individual/joint probes with no live flow access."""
    if result.execution is None:
        return result
    deferred = result.execution.recorder
    if not isinstance(deferred, DeferredProbes):
        return result  # Compatibility: callers may submit a fully recorded decision.
    if sha256(deferred.snapshot).hexdigest() != deferred.digest:
        raise ValueError("decision-time snapshot digest mismatch")
    core, frame, view = pickle.loads(deferred.snapshot)
    execution = result.execution
    if (
        frame.tau != execution.tau
        or frame.observation != execution.observation
        or frame.revision != execution.before_fingerprint
        or view.possibility_distribution != deferred.possibility_distribution
        or float(frame.tau) != float(deferred.tau)
        or tuple(sorted(asdict(frame.observation).items())) != deferred.current_reality
    ):
        raise ValueError("decision-time snapshot/execution binding mismatch")
    expected_refs = tuple(
        (
            str(relation.experience_id),
            str(relation.relation_element_id),
            float(relation.completed_at_tau),
        )
        for relation in view.relation_elements
    )
    if expected_refs != deferred.relation_refs:
        raise ValueError("decision-time relation provenance binding mismatch")
    if (
        core._evaluate(frame.observation).possibility_distribution
        != view.possibility_distribution
    ):
        raise ValueError("snapshot evaluation does not reproduce decision distribution")
    harness = OrganicHarness(core, None, authorize=None)
    recorder = harness._record_probes(SnapshotFlow(frame), frame=frame, view=view)
    return replace(result, execution=replace(execution, recorder=recorder))


class TimedFlow:
    def __init__(self, flow, metrics, started):
        self.flow, self.metrics, self.started = flow, metrics, started

    def capture(self):
        return self.flow.capture()

    def apply_if_current(self, *args, **kwargs):
        started = time.perf_counter()
        self.metrics["decision_latency_seconds"] = started - self.started
        try:
            return self.flow.apply_if_current(*args, **kwargs)
        finally:
            self.metrics["actuation_latency_seconds"] = time.perf_counter() - started


class RealtimeOrganicHarness(OrganicHarness):
    """Keep the frozen atomic dispatch contract; defer observational ablations."""

    def __init__(self, core, journal, *, authorize, worker):
        super().__init__(core, journal, authorize=authorize)
        self.worker = worker
        self.metrics = {}

    def _record_probes(self, flow, *, frame, view):
        started = time.perf_counter()
        snapshot = capture_probes(self.core, frame, view)
        self.metrics["snapshot_latency_seconds"] = time.perf_counter() - started
        self.metrics["snapshot_bytes"] = len(snapshot.snapshot)
        return snapshot

    def execute_decision_epoch(self, flow, **kwargs):
        self.worker.publish_available()
        self.worker._in_control = True
        started = time.perf_counter()
        self.metrics = {
            "decision_latency_seconds": None,
            "actuation_latency_seconds": None,
            "action_backlog": 0,
            "action_queue_delay_seconds": 0.0,
        }
        try:
            result = super().execute_decision_epoch(
                TimedFlow(flow, self.metrics, started), **kwargs
            )
            # Compatibility metric name retained. False means at least one deferred
            # layer rejected this event; the healthy layer may still have accepted it.
            self.metrics["validation_submission_accepted"] = self.worker.submit_begin(
                result
            )
            return result
        finally:
            self.metrics["action_path_latency_seconds"] = (
                time.perf_counter() - started
            )
            self.worker._in_control = False
