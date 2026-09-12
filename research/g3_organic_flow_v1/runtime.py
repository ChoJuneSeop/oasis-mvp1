from __future__ import annotations

"""Atomic current-flow harness joining G3.2 probes to choice and real actuation."""

from copy import deepcopy
from dataclasses import asdict, dataclass
import json
from typing import Protocol

from research.carla_v22_harness_v11.canonical_harness import (
    DecisionExecution,
    HarnessInvariantError,
    Realization,
)
from research.g3_2_sidecar.common import RelationElementRef, require_tau
from research.g3_2_sidecar.runtime_extension import G32EpochRecorder
from research.oasis_core_v11.current_relational_core import CoreV11InvariantError
from research.oasis_core_v12.contracts import CurrentFrame, require_text
from research.oasis_core_v12.runtime import (
    ApplicationReceipt,
    DuplicateDispatch,
    ExecutionJournal,
    StaleDecision,
)


class AtomicOrganicFlowPort(Protocol):
    def capture(self) -> CurrentFrame:
        """Atomically capture approved present observation, tau, revision and evidence."""
        ...

    def apply_if_current(
        self,
        realization: Realization,
        *,
        expected_revision: str,
        idempotency_key: str,
    ) -> ApplicationReceipt: ...


@dataclass(frozen=True)
class OrganicDecisionResult:
    decision_tau: float
    selected: Realization
    application_receipt: ApplicationReceipt
    execution: DecisionExecution | None
    responsibility_record: dict
    resource_plan: dict
    dispatch_key: str

    @property
    def realized(self) -> bool:
        return self.execution is not None and self.application_receipt.applied is True


class OrganicHarness:
    """Preserve probes, stale-premise checks, authority and one atomic realization."""

    def __init__(self, core, journal: ExecutionJournal, *, authorize):
        self.core = core
        self.journal = journal
        self.authorize = authorize

    @staticmethod
    def _relation_key(relation: RelationElementRef) -> tuple[str, str]:
        return (relation.experience_id, relation.relation_element_id)

    @staticmethod
    def _same_current(left: CurrentFrame, right: CurrentFrame) -> bool:
        return (
            float(left.tau) == float(right.tau)
            and left.revision == right.revision
            and left.observation == right.observation
            and left.evidence == right.evidence
        )

    def _assert_probe_preserved_flow(
        self, flow: AtomicOrganicFlowPort, initial: CurrentFrame
    ) -> CurrentFrame:
        current = flow.capture()
        if float(current.tau) < float(initial.tau):
            raise HarnessInvariantError("gateway time moved backwards during a probe")
        if not self._same_current(initial, current):
            raise HarnessInvariantError(
                "decision-time counterfactual probing changed or advanced the real flow"
            )
        return current

    def _record_probes(self, flow, *, frame: CurrentFrame, view):
        # current_reality is the approved present observation bound to this exact frame.
        # Raw world state, actor ids, seed and map topology never enter this record.
        recorder = G32EpochRecorder(
            tau=float(frame.tau),
            flow_fingerprint=frame.revision,
            current_reality=asdict(frame.observation),
            relation_elements=tuple(view.relation_elements),
            possibility_distribution=view.possibility_distribution,
        )

        for relation in view.relation_elements:
            ablated = self.core.ablate_relation(frame.observation, relation)
            self._assert_probe_preserved_flow(flow, frame)
            key = self._relation_key(relation)
            recorder.record_relation_probe(
                relation,
                before_fingerprint=frame.revision,
                after_fingerprint=frame.revision,
                relation_ablated_distribution=ablated,
                role_trace=view.role_trace_by_relation.get(key, ()),
                generated_possibilities=view.generated_by_relation.get(key, ()),
            )

        for reconstruction in view.reconstructions:
            if float(reconstruction.observed_at_tau) != float(frame.tau):
                raise HarnessInvariantError(
                    "reconstruction observed_at_tau must equal current host flow tau"
                )
            sources = tuple(link.source for link in reconstruction.source_links)
            if len(sources) > 1:
                group_ablated = self.core.ablate_relation_group(
                    frame.observation, sources
                )
                self._assert_probe_preserved_flow(flow, frame)
                generated = tuple(
                    possibility
                    for relation in sources
                    for possibility in view.generated_by_relation.get(
                        self._relation_key(relation), ()
                    )
                )
                recorder.record_group_probe(
                    sources,
                    before_fingerprint=frame.revision,
                    after_fingerprint=frame.revision,
                    group_ablated_distribution=group_ablated,
                    generated_possibilities=generated,
                )
            recorder.record_reconstruction(reconstruction)

        self._assert_probe_preserved_flow(flow, frame)
        return recorder

    def execute_decision_epoch(
        self,
        flow: AtomicOrganicFlowPort,
        *,
        run_id: str,
        subject_id: str,
        deadline_tau: float,
    ) -> OrganicDecisionResult:
        require_text(run_id, "run_id")
        require_text(subject_id, "subject_id")
        deadline = require_tau("deadline_tau", deadline_tau)

        # One atomic frame is the sole premise for this Decision Epoch.
        frame = flow.capture()
        tau = float(frame.tau)
        observation = frame.observation
        before = frame.revision
        key = json.dumps(
            [run_id, subject_id, observation.epoch], separators=(",", ":")
        )
        if self.journal.inspect(key) is not None:
            raise DuplicateDispatch(
                "this subject/decision epoch already has an actuation reservation"
            )
        if tau > deadline:
            self.journal.event(
                key, "deferred", {"reason": "decision deadline already elapsed"}
            )
            raise CoreV11InvariantError("decision deadline already elapsed")

        view = self.core.open_current_epoch(frame)
        recorder = self._record_probes(flow, frame=frame, view=view)

        selected = self.core.realize(observation)
        if selected.selected_possibility_id not in recorder.possibility_distribution:
            raise HarnessInvariantError(
                "selected possibility was absent from the current constructed distribution"
            )
        responsibility = self.core.responsibility_record()
        resource_plan = asdict(self.core.organic_resource_plan())
        self.journal.event(
            key,
            "selected",
            {
                "decision_tau": tau,
                "revision": before,
                "proposal": asdict(selected),
                "responsibility": responsibility,
                "resources": resource_plan,
            },
        )

        # Reality is not assumed frozen while reasoning. Re-capture atomically.
        current = flow.capture()
        if float(current.tau) < tau:
            raise CoreV11InvariantError("gateway clock moved backwards")
        if not self._same_current(frame, current):
            self.journal.event(
                key,
                "invalidated",
                {
                    "reason": "current premises changed before dispatch",
                    "tau": float(current.tau),
                },
            )
            raise StaleDecision(
                "current reality changed during reasoning; rebuild from the new current flow"
            )
        if float(current.tau) > deadline:
            self.journal.event(
                key,
                "deferred",
                {
                    "reason": "decision deadline elapsed before dispatch",
                    "tau": float(current.tau),
                },
            )
            raise CoreV11InvariantError("decision deadline elapsed before dispatch")
        if self.authorize(current.observation, selected) is not True:
            self.journal.event(key, "not_authorized", {"tau": float(current.tau)})
            raise CoreV11InvariantError("current proposal lacks execution authority")

        self.journal.reserve(
            key,
            {
                "decision_tau": tau,
                "attempt_tau": float(current.tau),
                "revision": current.revision,
                "proposal": asdict(selected),
                "resources": resource_plan,
            },
        )
        try:
            receipt = flow.apply_if_current(
                selected,
                expected_revision=current.revision,
                idempotency_key=key,
            )
            if not isinstance(receipt, ApplicationReceipt):
                raise CoreV11InvariantError(
                    "atomic flow port returned an invalid application receipt"
                )
            if receipt.observed_at_tau < float(current.tau):
                raise CoreV11InvariantError("application receipt is backdated")
        except Exception as exc:
            self.journal.event(
                key, "application_unknown", {"error_type": type(exc).__name__}
            )
            raise
        self.journal.receipt(key, receipt)

        execution = None
        if receipt.applied is True:
            # Post-application capture is observational provenance only; it is not fed
            # back into the just-completed decision.
            after = flow.capture()
            execution = DecisionExecution(
                tau=tau,
                realization_tau=float(receipt.observed_at_tau),
                observation=observation,
                recorder=recorder,
                realization=deepcopy(selected),
                realization_ref=receipt.realization_ref,
                before_fingerprint=before,
                after_realization_fingerprint=after.revision,
            )

        return OrganicDecisionResult(
            decision_tau=tau,
            selected=deepcopy(selected),
            application_receipt=deepcopy(receipt),
            execution=execution,
            responsibility_record=deepcopy(responsibility),
            resource_plan=deepcopy(resource_plan),
            dispatch_key=key,
        )
