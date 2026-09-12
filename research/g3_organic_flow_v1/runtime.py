from __future__ import annotations

"""Atomic current-flow harness joining G3.2 probes to choice and real actuation."""

from copy import deepcopy
from dataclasses import asdict, dataclass
import json
from typing import Protocol

from research.carla_v22_harness_v11.canonical_harness import (
    DecisionExecution,
    HarnessInvariantError,
    PresentObservation,
    Realization,
)
from research.g3_2_sidecar.common import RelationElementRef, require_tau
from research.g3_2_sidecar.runtime_extension import G32EpochRecorder
from research.integration_checkpoint.frame import current_frame_from_host
from research.oasis_core_v11.current_relational_core import CoreV11InvariantError
from research.oasis_core_v12.contracts import require_text
from research.oasis_core_v12.runtime import (
    ApplicationReceipt,
    DuplicateDispatch,
    ExecutionJournal,
    StaleDecision,
)


class AtomicOrganicFlowPort(Protocol):
    def current_tau(self) -> float: ...
    def present_observation(self): ...
    def current_reality(self): ...
    def flow_fingerprint(self) -> str: ...
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

    def _record_probes(self, flow, *, tau, observation, before, view):
        recorder = G32EpochRecorder(
            tau=tau,
            flow_fingerprint=before,
            current_reality=dict(flow.current_reality()),
            relation_elements=tuple(view.relation_elements),
            possibility_distribution=view.possibility_distribution,
        )

        for relation in view.relation_elements:
            ablated = self.core.ablate_relation(observation, relation)
            after_probe = flow.flow_fingerprint()
            key = self._relation_key(relation)
            recorder.record_relation_probe(
                relation,
                before_fingerprint=before,
                after_fingerprint=after_probe,
                relation_ablated_distribution=ablated,
                role_trace=view.role_trace_by_relation.get(key, ()),
                generated_possibilities=view.generated_by_relation.get(key, ()),
            )

        for reconstruction in view.reconstructions:
            if float(reconstruction.observed_at_tau) != float(tau):
                raise HarnessInvariantError(
                    "reconstruction observed_at_tau must equal current host flow tau"
                )
            sources = tuple(link.source for link in reconstruction.source_links)
            if len(sources) > 1:
                group_ablated = self.core.ablate_relation_group(observation, sources)
                after_group_probe = flow.flow_fingerprint()
                generated = tuple(
                    possibility
                    for relation in sources
                    for possibility in view.generated_by_relation.get(
                        self._relation_key(relation), ()
                    )
                )
                recorder.record_group_probe(
                    sources,
                    before_fingerprint=before,
                    after_fingerprint=after_group_probe,
                    group_ablated_distribution=group_ablated,
                    generated_possibilities=generated,
                )
            recorder.record_reconstruction(reconstruction)

        if flow.flow_fingerprint() != before or float(flow.current_tau()) != float(tau):
            raise HarnessInvariantError(
                "decision-time counterfactual probing changed or advanced the real flow"
            )
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

        tau = float(flow.current_tau())
        observation = PresentObservation.from_mapping(flow.present_observation())
        before = flow.flow_fingerprint()
        key = json.dumps(
            [run_id, subject_id, observation.epoch], separators=(",", ":")
        )
        if self.journal.inspect(key) is not None:
            raise DuplicateDispatch(
                "this subject/decision epoch already has an actuation reservation"
            )
        if tau > deadline:
            self.journal.event(key, "deferred", {"reason": "decision deadline already elapsed"})
            raise CoreV11InvariantError("decision deadline already elapsed")

        frame = current_frame_from_host(observation, tau=tau, revision=before)
        view = self.core.open_current_epoch(frame)
        recorder = self._record_probes(
            flow, tau=tau, observation=observation, before=before, view=view
        )

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

        current_tau = float(flow.current_tau())
        current_observation = PresentObservation.from_mapping(flow.present_observation())
        current_revision = flow.flow_fingerprint()
        if (
            current_tau < tau
            or current_revision != before
            or current_observation != observation
        ):
            self.journal.event(
                key,
                "invalidated",
                {"reason": "current premises changed before dispatch", "tau": current_tau},
            )
            raise StaleDecision(
                "current reality changed during reasoning; rebuild from the new current flow"
            )
        if current_tau > deadline:
            self.journal.event(
                key,
                "deferred",
                {"reason": "decision deadline elapsed before dispatch", "tau": current_tau},
            )
            raise CoreV11InvariantError("decision deadline elapsed before dispatch")
        if self.authorize(current_observation, selected) is not True:
            self.journal.event(key, "not_authorized", {"tau": current_tau})
            raise CoreV11InvariantError("current proposal lacks execution authority")

        self.journal.reserve(
            key,
            {
                "decision_tau": tau,
                "attempt_tau": current_tau,
                "revision": current_revision,
                "proposal": asdict(selected),
                "resources": resource_plan,
            },
        )
        try:
            receipt = flow.apply_if_current(
                selected,
                expected_revision=current_revision,
                idempotency_key=key,
            )
            if not isinstance(receipt, ApplicationReceipt):
                raise CoreV11InvariantError("atomic flow port returned an invalid application receipt")
            if receipt.observed_at_tau < current_tau:
                raise CoreV11InvariantError("application receipt is backdated")
        except Exception as exc:
            self.journal.event(
                key, "application_unknown", {"error_type": type(exc).__name__}
            )
            raise
        self.journal.receipt(key, receipt)

        execution = None
        if receipt.applied is True:
            execution = DecisionExecution(
                tau=tau,
                realization_tau=float(receipt.observed_at_tau),
                observation=observation,
                recorder=recorder,
                realization=deepcopy(selected),
                realization_ref=receipt.realization_ref,
                before_fingerprint=before,
                after_realization_fingerprint=flow.flow_fingerprint(),
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
